
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import interactionPlugin from '@fullcalendar/interaction';
import { Plus, Calendar as CalendarIcon, X, Sparkles, Trash2, AlertTriangle, Users, FileText, Activity, LayoutDashboard, Edit2 } from 'lucide-react';
import CreateStudyModal from '../../components/prm/CreateStudyModal';

const PRMCalendar = () => {
    const { token } = useAuth();
    const navigate = useNavigate();
    const [events, setEvents] = useState([]);
    const [metrics, setMetrics] = useState({ upcoming: 0, ongoing: 0, completed: 0, drt: 0 });
    const [activeFilter, setActiveFilter] = useState('ALL');
    const [isModalOpen, setIsModalOpen] = useState(false);

    // Edit Mode State
    const [isEditMode, setIsEditMode] = useState(false);
    const [editStudyData, setEditStudyData] = useState(null);

    const [selectedDate, setSelectedDate] = useState(null);
    const [selectedEvent, setSelectedEvent] = useState(null);
    const [studyDetails, setStudyDetails] = useState(null);
    const [isDeleting, setIsDeleting] = useState(false);

    useEffect(() => {
        fetchEvents();
        fetchMetrics();
    }, []);

    const fetchMetrics = async () => {
        try {
            const res = await axios.get('http://localhost:8000/api/v1/calendar/metrics', {
                headers: { Authorization: `Bearer ${token}` }
            });
            setMetrics(res.data);
        } catch (err) {
            console.error("Error fetching metrics:", err);
        }
    };

    const fetchEvents = async () => {
        try {
            const res = await axios.get('http://localhost:8000/api/v1/calendar-events', {
                headers: { Authorization: `Bearer ${token}` }
            });
            setEvents(res.data);
        } catch (err) {
            console.error("Error fetching calendar events:", err);
        }
    };

    const handleDateClick = (arg) => {
        setSelectedDate(new Date(arg.date));
        setIsModalOpen(true);
    };

    const handleEventClick = async (info) => {
        setSelectedEvent(info.event);
        setStudyDetails(null);
        setIsDeleting(false);

        try {
            const studyId = info.event.extendedProps.studyInstanceId;
            if (studyId) {
                const res = await axios.get(`http://localhost:8000/api/v1/study-instance/${studyId}`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                setStudyDetails(res.data);
            }
        } catch (err) {
            console.error("Fetch details error", err);
        }
    };

    const handleDeleteStudy = async () => {
        if (!selectedEvent) return;
        try {
            const studyId = selectedEvent.extendedProps?.studyInstanceId;
            if (!studyId) return;

            await axios.delete(`http://localhost:8000/api/v1/study-instance/${studyId}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setSelectedEvent(null);
            fetchEvents();
            fetchMetrics();
        } catch (err) {
            alert("Failed to delete study");
        }
    };

    const handleStudyCreated = () => {
        fetchEvents();
        fetchMetrics();
    };

    const filteredEvents = events.filter(event => {
        if (activeFilter === 'ALL') return true;

        const props = event.extendedProps || {};

        if (activeFilter === 'DRT') {
            return props.isDRT === true;
        }

        const studyStatus = (props.studyStatus || '').toUpperCase();

        if (activeFilter === 'UPCOMING') return studyStatus === 'UPCOMING';
        if (activeFilter === 'ONGOING') return studyStatus === 'ONGOING';
        if (activeFilter === 'COMPLETED') return studyStatus === 'COMPLETED';

        return true;
    });

    return (
        <div style={{
            minHeight: '100vh',
            background: 'linear-gradient(135deg, #f8fafc 0%, #e0e7ff 50%, #f8fafc 100%)',
            padding: '2rem',
            fontFamily: 'Outfit, sans-serif'
        }}>

            {/* Page Header */}
            <div style={{
                maxWidth: '1400px',
                margin: '0 auto 2rem',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '1.5rem'
            }}>
                <div>
                    <h1 style={{
                        fontSize: 'clamp(2.5rem, 5vw, 3.5rem)',
                        fontWeight: '900',
                        background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                        marginBottom: '0.5rem',
                        letterSpacing: '-1px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '1rem'
                    }}>
                        <Sparkles size={40} style={{ color: '#6366f1' }} />
                        PRM Calendar
                    </h1>
                    <p style={{ color: '#64748b', fontSize: '1.1rem', fontWeight: '500' }}>
                        Manage study timelines and daily visits
                    </p>
                </div>

                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
                    {/* Legend / Filters - Enhanced */}
                    <div style={{
                        padding: '0.5rem',
                        background: 'rgba(255, 255, 255, 0.7)',
                        backdropFilter: 'blur(10px)',
                        border: '2px solid rgba(226, 232, 240, 0.6)',
                        borderRadius: '16px',
                        display: 'flex',
                        gap: '0.5rem',
                        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.08), 0 0 1px rgba(0, 0, 0, 0.1)'
                    }}>
                        {[
                            { id: 'UPCOMING', label: 'Upcoming', count: metrics.upcoming, color: '#3b82f6', gradient: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)' },
                            { id: 'ONGOING', label: 'Ongoing', count: metrics.ongoing, color: '#10b981', gradient: 'linear-gradient(135deg, #10b981 0%, #059669 100%)' },
                            { id: 'COMPLETED', label: 'Completed', count: metrics.completed, color: '#fb923c', gradient: 'linear-gradient(135deg, #fb923c 0%, #f97316 100%)' },
                            { id: 'DRT', label: 'DRT', count: metrics.drt, color: '#ef4444', gradient: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)' }
                        ].map(item => (
                            <div
                                key={item.id}
                                onClick={() => setActiveFilter(activeFilter === item.id ? 'ALL' : item.id)}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.5rem',
                                    padding: '0.65rem 1.1rem',
                                    borderRadius: '12px',
                                    background: activeFilter === item.id
                                        ? `linear-gradient(135deg, ${item.color}20 0%, ${item.color}10 100%)`
                                        : 'rgba(255, 255, 255, 0.5)',
                                    border: activeFilter === item.id
                                        ? `2px solid ${item.color}`
                                        : '2px solid transparent',
                                    cursor: 'pointer',
                                    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                                    opacity: activeFilter === 'ALL' || activeFilter === item.id ? 1 : 0.6,
                                    transform: activeFilter === item.id ? 'scale(1.02)' : 'scale(1)',
                                    boxShadow: activeFilter === item.id
                                        ? `0 4px 12px ${item.color}30, 0 0 20px ${item.color}15`
                                        : '0 2px 4px rgba(0, 0, 0, 0.05)',
                                    position: 'relative',
                                    overflow: 'hidden'
                                }}
                                onMouseEnter={(e) => {
                                    if (activeFilter !== item.id) {
                                        e.currentTarget.style.transform = 'translateY(-2px) scale(1.02)';
                                        e.currentTarget.style.boxShadow = `0 6px 16px rgba(0, 0, 0, 0.12)`;
                                        e.currentTarget.style.background = `linear-gradient(135deg, ${item.color}15 0%, ${item.color}08 100%)`;
                                    }
                                }}
                                onMouseLeave={(e) => {
                                    if (activeFilter !== item.id) {
                                        e.currentTarget.style.transform = 'scale(1)';
                                        e.currentTarget.style.boxShadow = '0 2px 4px rgba(0, 0, 0, 0.05)';
                                        e.currentTarget.style.background = 'rgba(255, 255, 255, 0.5)';
                                    }
                                }}
                            >
                                {/* Animated glow effect for active filter */}
                                {activeFilter === item.id && (
                                    <div style={{
                                        position: 'absolute',
                                        inset: 0,
                                        background: item.gradient,
                                        opacity: 0.05,
                                        animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite'
                                    }}></div>
                                )}

                                <div style={{
                                    width: '10px',
                                    height: '10px',
                                    borderRadius: '50%',
                                    background: item.gradient,
                                    boxShadow: `0 0 8px ${item.color}40`,
                                    animation: activeFilter === item.id ? 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite' : 'none'
                                }}></div>
                                <span style={{
                                    color: '#334155',
                                    fontSize: '0.875rem',
                                    fontWeight: '700',
                                    position: 'relative',
                                    zIndex: 1
                                }}>
                                    {item.label}
                                </span>
                                <span style={{
                                    marginLeft: '4px',
                                    background: activeFilter === item.id
                                        ? `linear-gradient(135deg, ${item.color} 0%, ${item.color}dd 100%)`
                                        : '#f1f5f9',
                                    color: activeFilter === item.id ? '#fff' : '#64748b',
                                    padding: '3px 8px',
                                    borderRadius: '8px',
                                    fontSize: '0.75rem',
                                    fontWeight: '800',
                                    minWidth: '20px',
                                    textAlign: 'center',
                                    boxShadow: activeFilter === item.id
                                        ? `0 2px 8px ${item.color}40`
                                        : 'none',
                                    transition: 'all 0.3s',
                                    position: 'relative',
                                    zIndex: 1
                                }}>{item.count}</span>
                            </div>
                        ))}
                    </div>

                    {/* Create Button - Enhanced */}
                    <button
                        onClick={() => { setSelectedDate(new Date()); setIsModalOpen(true); }}
                        style={{
                            padding: '0.95rem 2rem',
                            background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
                            color: '#fff',
                            border: 'none',
                            borderRadius: '14px',
                            fontSize: '1rem',
                            fontWeight: '700',
                            cursor: 'pointer',
                            boxShadow: '0 6px 20px rgba(99, 102, 241, 0.35), 0 0 40px rgba(99, 102, 241, 0.15)',
                            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.6rem',
                            fontFamily: 'Outfit, sans-serif',
                            position: 'relative',
                            overflow: 'hidden'
                        }}
                        onMouseEnter={(e) => {
                            e.target.style.transform = 'translateY(-3px) scale(1.02)';
                            e.target.style.boxShadow = '0 12px 28px rgba(99, 102, 241, 0.45), 0 0 60px rgba(99, 102, 241, 0.25)';
                        }}
                        onMouseLeave={(e) => {
                            e.target.style.transform = 'translateY(0) scale(1)';
                            e.target.style.boxShadow = '0 6px 20px rgba(99, 102, 241, 0.35), 0 0 40px rgba(99, 102, 241, 0.15)';
                        }}
                    >
                        <div style={{
                            position: 'absolute',
                            inset: 0,
                            background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.2) 0%, rgba(255, 255, 255, 0) 100%)',
                            pointerEvents: 'none'
                        }}></div>
                        <Plus size={22} strokeWidth={3} style={{ position: 'relative', zIndex: 1 }} />
                        <span style={{ position: 'relative', zIndex: 1 }}>Create Study</span>
                    </button>
                </div>
            </div>

            {/* Calendar Container */}
            <div style={{
                maxWidth: '1400px',
                margin: '0 auto',
                background: '#ffffff',
                border: '2px solid #e2e8f0',
                borderRadius: '24px',
                padding: '2rem',
                boxShadow: '0 10px 40px rgba(0, 0, 0, 0.06)',
                position: 'relative',
                overflow: 'hidden'
            }}>
                {/* Subtle gradient overlay */}
                <div style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    height: '180px',
                    background: 'linear-gradient(to bottom, rgba(99, 102, 241, 0.02) 0%, transparent 100%)',
                    pointerEvents: 'none'
                }}></div>

                <div style={{ position: 'relative', zIndex: 1 }}>
                    <style>{`
                        /* Keyframe Animations */
                        @keyframes pulse {
                            0%, 100% {
                                opacity: 1;
                            }
                            50% {
                                opacity: 0.6;
                            }
                        }
                        
                        @keyframes fadeInUp {
                            from {
                                opacity: 0;
                                transform: translateY(10px);
                            }
                            to {
                                opacity: 1;
                                transform: translateY(0);
                            }
                        }
                        
                        @keyframes shimmer {
                            0% {
                                background-position: -1000px 0;
                            }
                            100% {
                                background-position: 1000px 0;
                            }
                        }
                        
                        /* Calendar Container */
                        .fc {
                            background: transparent;
                            border-radius: 16px;
                            padding: 1rem;
                            animation: fadeInUp 0.6s ease-out;
                        }
                        
                        /* Toolbar */
                        .fc .fc-toolbar {
                            margin-bottom: 1.5rem !important;
                        }
                        
                        .fc .fc-toolbar-title {
                            font-family: 'Outfit', sans-serif !important;
                            font-weight: 800 !important;
                            font-size: 1.75rem !important;
                            color: #1e293b !important;
                            letter-spacing: -0.5px;
                        }
                        
                        /* Buttons */
                        .fc .fc-button-primary {
                            background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%) !important;
                            border: 2px solid #e2e8f0 !important;
                            color: #475569 !important;
                            font-weight: 600 !important;
                            text-transform: capitalize !important;
                            padding: 0.625rem 1.25rem !important;
                            borderRadius: 12px !important;
                            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1) !important;
                            box-shadow: 0 2px 4px rgba(0,0,0,0.06) !important;
                            font-family: 'Outfit', sans-serif !important;
                        }
                        
                        .fc .fc-button-primary:hover {
                            background: linear-gradient(135deg, #e2e8f0 0%, #cbd5e1 100%) !important;
                            border-color: #cbd5e1 !important;
                            color: #1e293b !important;
                            transform: translateY(-2px) !important;
                            box-shadow: 0 6px 12px rgba(0,0,0,0.1) !important;
                        }
                        
                        .fc .fc-button-active,
                        .fc .fc-button-primary:not(:disabled):active {
                            background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%) !important;
                            border-color: #6366f1 !important;
                            color: #fff !important;
                            box-shadow: 0 4px 16px rgba(99, 102, 241, 0.4), 0 0 20px rgba(99, 102, 241, 0.2) !important;
                        }
                        
                        /* Table borders */
                        .fc .fc-scrollgrid {
                            border-color: #e2e8f0 !important;
                            border-radius: 12px;
                            overflow: hidden;
                        }
                        
                        .fc-theme-standard td,
                        .fc-theme-standard th {
                            border-color: #e2e8f0 !important;
                        }
                        
                        /* Header cells */
                        .fc .fc-col-header-cell {
                            background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%) !important;
                            padding: 1rem 0 !important;
                            border-bottom: 2px solid #e2e8f0 !important;
                        }
                        
                        .fc .fc-col-header-cell-cushion {
                            color: #64748b !important;
                            font-weight: 700 !important;
                            text-transform: uppercase !important;
                            font-size: 0.75rem !important;
                            letter-spacing: 1px !important;
                        }
                        
                        /* Day cells */
                        .fc .fc-daygrid-day {
                            background: #ffffff;
                            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                        }
                        
                        .fc .fc-daygrid-day:hover {
                            background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
                            cursor: pointer;
                        }
                        
                        .fc .fc-daygrid-day-number {
                            color: #475569 !important;
                            font-weight: 600 !important;
                            font-size: 1rem !important;
                            padding: 0.75rem !important;
                        }
                        
                        /* Today */
                        .fc .fc-day-today {
                            background: linear-gradient(135deg, #ede9fe 0%, #ddd6fe 100%) !important;
                            position: relative;
                        }
                        
                        .fc .fc-day-today::before {
                            content: '';
                            position: absolute;
                            inset: 0;
                            background: linear-gradient(135deg, rgba(99, 102, 241, 0.1) 0%, rgba(139, 92, 246, 0.1) 100%);
                            pointer-events: none;
                        }
                        
                        .fc .fc-day-today .fc-daygrid-day-number {
                            color: #6366f1 !important;
                            font-weight: 800 !important;
                            background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
                            -webkit-background-clip: text !important;
                            -webkit-text-fill-color: transparent !important;
                        }
                        
                        /* Events - Fixed to show colors */
                        .fc-event {
                            border-radius: 8px !important;
                            border: none !important;
                            padding: 5px 9px !important;
                            font-size: 0.8125rem !important;
                            font-weight: 600 !important;
                            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1) !important;
                            cursor: pointer !important;
                            box-shadow: 0 2px 6px rgba(0, 0, 0, 0.15), 0 1px 3px rgba(0, 0, 0, 0.1) !important;
                            position: relative;
                            overflow: visible;
                            opacity: 0.95;
                        }
                        
                        .fc-event:hover {
                            transform: translateY(-2px) scale(1.02) !important;
                            box-shadow: 0 6px 16px rgba(0, 0, 0, 0.2), 0 3px 6px rgba(0, 0, 0, 0.15) !important;
                            z-index: 10 !important;
                            opacity: 1;
                        }
                        
                        /* Popover for more events */
                        .fc .fc-popover {
                            background: rgba(255, 255, 255, 0.95) !important;
                            backdrop-filter: blur(12px) !important;
                            border: 2px solid #e2e8f0 !important;
                            box-shadow: 0 20px 40px rgba(0, 0, 0, 0.15) !important;
                            border-radius: 16px !important;
                        }
                        
                        .fc .fc-popover-header {
                            background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%) !important;
                            color: #1e293b !important;
                            font-weight: 700 !important;
                            padding: 1rem !important;
                            border-bottom: 2px solid #e2e8f0 !important;
                        }
                        
                        .fc .fc-popover-body {
                            padding: 0.75rem !important;
                        }
                        
                        /* More link */
                        .fc .fc-daygrid-more-link {
                            color: #6366f1 !important;
                            font-weight: 600 !important;
                            transition: all 0.2s !important;
                        }
                        
                        .fc .fc-daygrid-more-link:hover {
                            color: #8b5cf6 !important;
                            transform: scale(1.05);
                        }
                        
                        /* Scrollbar */
                        .fc-scroller::-webkit-scrollbar {
                            width: 8px;
                        }
                        
                        .fc-scroller::-webkit-scrollbar-track {
                            background: #f1f5f9;
                            border-radius: 4px;
                        }
                        
                        .fc-scroller::-webkit-scrollbar-thumb {
                            background: linear-gradient(135deg, #cbd5e1 0%, #94a3b8 100%);
                            border-radius: 4px;
                        }
                        
                        .fc-scroller::-webkit-scrollbar-thumb:hover {
                            background: linear-gradient(135deg, #94a3b8 0%, #64748b 100%);
                        }
                    `}</style>

                    <FullCalendar
                        plugins={[dayGridPlugin, interactionPlugin]}
                        initialView="dayGridMonth"
                        headerToolbar={{
                            left: 'prev,next today',
                            center: 'title',
                            right: 'dayGridMonth,dayGridWeek'
                        }}
                        events={filteredEvents}
                        height="75vh"
                        dateClick={handleDateClick}
                        eventClick={handleEventClick}
                        dayMaxEvents={3}
                        firstDay={1}
                    />
                </div>
            </div>

            {/* Modals */}
            <CreateStudyModal
                isOpen={isModalOpen}
                onClose={() => {
                    setIsModalOpen(false);
                    setIsEditMode(false);
                    setEditStudyData(null);
                }}
                date={selectedDate}
                onStudyCreated={fetchEvents}
                isEdit={isEditMode}
                initialData={editStudyData}
                onStudyUpdated={() => {
                    fetchEvents();
                    // Optionally reopen details? For now just refresh calendar
                }}
            />

            {/* Visit Details Modal */}
            {selectedEvent && (
                <div style={{
                    position: 'fixed',
                    inset: 0,
                    zIndex: 99999,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '20px',
                    background: 'rgba(0, 0, 0, 0.4)',
                    backdropFilter: 'blur(4px)'
                }}>
                    <div style={{
                        width: '100%',
                        maxWidth: '600px',
                        background: '#ffffff',
                        borderRadius: '24px',
                        padding: '2rem',
                        border: '2px solid #e2e8f0',
                        boxShadow: '0 25px 50px rgba(0, 0, 0, 0.15)',
                        position: 'relative',
                        overflow: 'hidden'
                    }}>
                        {/* Header */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '1.5rem' }}>
                            <div>
                                <h3 style={{ fontSize: '1.5rem', fontWeight: '800', color: '#1e293b', marginBottom: '0.25rem', lineHeight: 1.2 }}>
                                    {studyDetails?.studyName || selectedEvent.title.split(' — ')[0]}
                                </h3>
                                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                    <span style={{
                                        display: 'inline-block',
                                        padding: '0.25rem 0.5rem',
                                        background: '#ede9fe',
                                        border: '1px solid #ddd6fe',
                                        borderRadius: '6px',
                                        color: '#6366f1',
                                        fontSize: '0.7rem',
                                        fontWeight: '700',
                                        fontFamily: 'monospace',
                                    }}>
                                        {studyDetails?.studyInstanceCode || selectedEvent.extendedProps?.studyCode || 'N/A'}
                                    </span>
                                    <div style={{ padding: '2px 8px', borderRadius: '100px', background: '#ecfccb', color: '#4d7c0f', fontSize: '0.7rem', fontWeight: '700', border: '1px solid #d9f99d' }}>
                                        {studyDetails ? 'ONGOING' : 'LOADING...'}
                                    </div>
                                </div>
                            </div>
                            <button
                                onClick={() => setSelectedEvent(null)}
                                style={{
                                    width: '32px', height: '32px',
                                    borderRadius: '8px',
                                    border: 'none',
                                    background: '#f1f5f9',
                                    color: '#64748b',
                                    cursor: 'pointer',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                                }}
                            >
                                <X size={18} />
                            </button>
                        </div>

                        {/* Details Grid */}
                        <div style={{
                            display: 'grid',
                            gridTemplateColumns: '1fr 1fr',
                            gap: '1rem',
                            marginBottom: '1.5rem',
                            padding: '1rem',
                            background: '#f8fafc',
                            borderRadius: '16px',
                            border: '1px solid #e2e8f0'
                        }}>
                            <div>
                                <label style={{ fontSize: '0.7rem', fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase' }}>REFERENCE ID</label>
                                <div style={{ fontSize: '0.9rem', fontWeight: '600', color: '#334155' }}>
                                    {studyDetails?.studyID || studyDetails?._id || '...'}
                                </div>
                            </div>
                            <div>
                                <label style={{ fontSize: '0.7rem', fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase' }}>START DATE</label>
                                <div style={{ fontSize: '0.9rem', fontWeight: '600', color: '#334155' }}>
                                    {studyDetails?.startDate ? new Date(studyDetails.startDate).toLocaleDateString() : '...'}
                                </div>
                            </div>
                            <div>
                                <label style={{ fontSize: '0.7rem', fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase' }}>VOLUNTEERS</label>
                                <div style={{ fontSize: '0.9rem', fontWeight: '600', color: '#334155', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                    <Users size={14} />
                                    {studyDetails?.volunteersPlanned || '0'}
                                </div>
                            </div>
                            <div>
                                <label style={{ fontSize: '0.7rem', fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase' }}>AGE RANGE</label>
                                <div style={{ fontSize: '0.9rem', fontWeight: '600', color: '#334155' }}>
                                    {studyDetails?.ageRange ? `${studyDetails.ageRange.from} - ${studyDetails.ageRange.to} years` : '...'}
                                </div>
                            </div>
                            <div>
                                <label style={{ fontSize: '0.7rem', fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase' }}>DRT</label>
                                <div style={{ fontSize: '0.9rem', fontWeight: '700', color: '#ef4444', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                    <CalendarIcon size={14} color="#ef4444" />
                                    {studyDetails?.drtWashoutDate ? new Date(studyDetails.drtWashoutDate).toLocaleDateString() : 'Not set'}
                                </div>
                            </div>
                            <div style={{ gridColumn: '1 / -1' }}>
                                <label style={{ fontSize: '0.7rem', fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase' }}>GENDER RATIO</label>
                                <div style={{ fontSize: '0.85rem', fontWeight: '500', color: '#475569', display: 'flex', gap: '12px' }}>
                                    {studyDetails?.genderRatio ? (
                                        <>
                                            <span style={{ color: '#ec4899' }}>Female: {studyDetails.genderRatio.female}%</span>
                                            <span style={{ width: '1px', background: '#cbd5e1' }}></span>
                                            <span style={{ color: '#3b82f6' }}>Male: {studyDetails.genderRatio.male}%</span>
                                            <span style={{ width: '1px', background: '#cbd5e1' }}></span>
                                            <span style={{ color: '#8b5cf6' }}>Minor: {studyDetails.genderRatio.minor}%</span>
                                        </>
                                    ) : '...'}
                                </div>
                            </div>
                            <div style={{ gridColumn: '1 / -1' }}>
                                <label style={{ fontSize: '0.7rem', fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase' }}>REMARKS</label>
                                <div style={{ fontSize: '0.85rem', fontWeight: '400', color: '#475569', fontStyle: studyDetails?.remarks ? 'normal' : 'italic' }}>
                                    {studyDetails?.remarks || 'No remarks provided.'}
                                </div>
                            </div>
                        </div>

                        {/* Selected Visit Section */}
                        <div style={{ marginBottom: '1.5rem' }}>
                            <label style={{ fontSize: '0.7rem', fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase', marginBottom: '4px', display: 'block' }}>SELECTED VISIT</label>
                            <div style={{
                                padding: '0.75rem',
                                background: '#fff',
                                borderRadius: '12px',
                                border: '1px solid #e2e8f0',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between'
                            }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                    <div style={{
                                        width: '36px', height: '36px', borderRadius: '8px', background: '#ede9fe', color: '#6366f1',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center'
                                    }}>
                                        <CalendarIcon size={18} />
                                    </div>
                                    <div>
                                        <div style={{ fontSize: '0.9rem', fontWeight: '700', color: '#1e293b' }}>
                                            {selectedEvent.title.split(' — ')[1] || 'Visit'}
                                        </div>
                                        <div style={{ fontSize: '0.8rem', color: '#64748b' }}>
                                            {selectedEvent.start?.toLocaleDateString()}
                                        </div>
                                    </div>
                                </div>
                                <div style={{
                                    padding: '4px 8px', borderRadius: '6px', background: '#f1f5f9', color: '#64748b', fontSize: '0.75rem', fontWeight: '600'
                                }}>
                                    {selectedEvent.extendedProps?.status || 'UPCOMING'}
                                </div>
                            </div>
                        </div>

                        {/* Footer / Delete */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '1rem', borderTop: '1px solid #f1f5f9' }}>
                            {isDeleting ? (
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', width: '100%', animation: 'fadeIn 0.2s ease' }}>
                                    <AlertTriangle size={18} color="#ef4444" />
                                    <span style={{ fontSize: '0.9rem', color: '#ef4444', fontWeight: '600', flex: 1 }}>Delete this study?</span>
                                    <button
                                        onClick={() => setIsDeleting(false)}
                                        style={{ padding: '6px 12px', background: '#f1f5f9', borderRadius: '8px', fontWeight: '600', fontSize: '0.85rem', color: '#64748b', border: 'none', cursor: 'pointer' }}>
                                        Cancel
                                    </button>
                                    <button
                                        onClick={handleDeleteStudy}
                                        style={{ padding: '6px 12px', background: '#ef4444', borderRadius: '8px', fontWeight: '600', fontSize: '0.85rem', color: '#fff', border: 'none', cursor: 'pointer' }}>
                                        Permenant Delete
                                    </button>
                                </div>
                            ) : (
                                <>
                                    <div style={{ display: 'flex', gap: '10px' }}>
                                        <button
                                            onClick={() => setIsDeleting(true)}
                                            style={{
                                                padding: '0.6rem 1rem',
                                                background: '#fff',
                                                color: '#ef4444',
                                                border: '1px solid #fecaca',
                                                borderRadius: '10px',
                                                fontSize: '0.9rem',
                                                fontWeight: '600',
                                                cursor: 'pointer',
                                                display: 'flex', alignItems: 'center', gap: '6px',
                                                transition: 'all 0.2s'
                                            }}
                                            onMouseEnter={e => e.target.style.background = '#fef2f2'}
                                            onMouseLeave={e => e.target.style.background = '#fff'}
                                        >
                                            <Trash2 size={16} />
                                            Delete
                                        </button>
                                        <button
                                            onClick={() => {
                                                const code = studyDetails?.studyCode || studyDetails?.studyInstanceCode || selectedEvent.extendedProps?.studyCode;
                                                // Handle potential undefined studyCode
                                                if (code) navigate(`/prm/dashboard/${code}`);
                                                else alert("Study Code not found");
                                            }}
                                            style={{
                                                padding: '0.6rem 1rem',
                                                background: '#f8fafc',
                                                color: '#6366f1',
                                                border: '1px solid #e2e8f0',
                                                borderRadius: '10px',
                                                fontSize: '0.9rem',
                                                fontWeight: '600',
                                                cursor: 'pointer',
                                                display: 'flex', alignItems: 'center', gap: '6px',
                                                transition: 'all 0.2s'
                                            }}
                                            onMouseEnter={e => e.target.style.background = '#eff6ff'}
                                            onMouseLeave={e => e.target.style.background = '#f8fafc'}
                                        >
                                            <LayoutDashboard size={16} />
                                            View Board
                                        </button>
                                        <button
                                            onClick={() => {
                                                // Open Edit Modal
                                                setEditStudyData(studyDetails);
                                                setIsEditMode(true);
                                                setIsModalOpen(true);
                                                setSelectedEvent(null); // Close detail modal
                                            }}
                                            style={{
                                                padding: '0.6rem 1rem',
                                                background: '#f8fafc',
                                                color: '#0f172a',
                                                border: '1px solid #e2e8f0',
                                                borderRadius: '10px',
                                                fontSize: '0.9rem',
                                                fontWeight: '600',
                                                cursor: 'pointer',
                                                display: 'flex', alignItems: 'center', gap: '6px',
                                                transition: 'all 0.2s'
                                            }}
                                            onMouseEnter={e => e.target.style.background = '#e2e8f0'}
                                            onMouseLeave={e => e.target.style.background = '#f8fafc'}
                                        >
                                            <Edit2 size={16} />
                                            Edit
                                        </button>
                                    </div>
                                    <button
                                        onClick={() => setSelectedEvent(null)}
                                        style={{
                                            padding: '0.6rem 1.5rem',
                                            background: '#1e293b',
                                            color: '#fff',
                                            border: 'none',
                                            borderRadius: '10px',
                                            fontSize: '0.9rem',
                                            fontWeight: '600',
                                            cursor: 'pointer',
                                            boxShadow: '0 4px 12px rgba(30, 41, 59, 0.2)'
                                        }}
                                    >
                                        Close
                                    </button>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default PRMCalendar;
