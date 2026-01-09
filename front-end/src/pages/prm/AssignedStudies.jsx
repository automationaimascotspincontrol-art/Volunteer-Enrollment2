import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import api from '../../api/api';
import { Search, FileDown, Calendar, Users, ArrowRight, Activity, Clock } from 'lucide-react';

// --- Styled Components & Helpers ---

const getStatusStyles = (status) => {
    const s = (status || '').toLowerCase();
    switch (s) {
        case 'fit': return { bg: '#dcfce7', text: '#166534', border: '#bbf7d0' };
        case 'unfit': return { bg: '#fee2e2', text: '#991b1b', border: '#fecaca' };
        case 'withdrew': return { bg: '#f3f4f6', text: '#374151', border: '#d1d5db' };
        case 'completed': return { bg: '#e0f2fe', text: '#0369a1', border: '#bae6fd' };
        default: return { bg: '#fef3c7', text: '#b45309', border: '#fde68a' };
    }
};

const VolunteerCard = ({ vol, onStatusChange, onAttendanceToggle }) => {
    const statusStyles = getStatusStyles(vol.status);
    const isWithdrawn = vol.status === 'withdrew';
    const [isPresent, setIsPresent] = React.useState(vol.attendance_status === 'present');

    const handleAttendanceToggle = async () => {
        const newStatus = !isPresent;
        setIsPresent(newStatus);
        if (onAttendanceToggle) {
            await onAttendanceToggle(vol._id, newStatus ? 'present' : 'absent');
        }
    };

    return (
        <div style={{
            background: isWithdrawn ? '#f9fafb' : 'white',
            border: `1px solid ${statusStyles.border}`,
            borderLeft: `4px solid ${statusStyles.text}`,
            padding: '1rem 1.25rem',
            borderRadius: '8px',
            display: 'flex',
            alignItems: 'center',
            gap: '1rem',
            boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
            transition: 'all 0.2s',
            opacity: isWithdrawn ? 0.65 : 1,
            minHeight: '70px'
        }}>
            {/* Volunteer Name - Takes most space */}
            <div style={{ flex: '1 1 auto', minWidth: 0, display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div style={{
                    width: '40px', height: '40px', borderRadius: '8px',
                    background: isWithdrawn ? '#9ca3af' : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontWeight: '800', fontSize: '1rem', flexShrink: 0
                }}>
                    {vol.volunteer_name ? vol.volunteer_name[0].toUpperCase() : 'V'}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{
                        fontWeight: '700', fontSize: '0.95rem', color: '#111827',
                        textDecoration: isWithdrawn ? 'line-through' : 'none',
                        marginBottom: '0.15rem'
                    }}>
                        {vol.volunteer_name}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: '#6b7280', fontFamily: 'monospace' }}>
                        {vol.volunteer_id}
                    </div>
                </div>
            </div>

            {/* Attendance Toggle */}
            {!isWithdrawn && (
                <button
                    onClick={handleAttendanceToggle}
                    title={isPresent ? "Mark as Absent" : "Mark as Present"}
                    style={{
                        background: isPresent ? '#10b981' : '#e5e7eb',
                        color: isPresent ? 'white' : '#6b7280',
                        border: 'none',
                        borderRadius: '20px',
                        padding: '0.4rem 0.9rem',
                        fontSize: '0.75rem',
                        fontWeight: '600',
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.4rem',
                        flexShrink: 0,
                        boxShadow: isPresent ? '0 2px 4px rgba(16, 185, 129, 0.3)' : 'none'
                    }}
                >
                    <div style={{
                        width: '8px',
                        height: '8px',
                        borderRadius: '50%',
                        background: isPresent ? 'white' : '#9ca3af'
                    }} />
                    {isPresent ? 'Present' : 'Absent'}
                </button>
            )}

            {/* Status Dropdown */}
            <select
                value={vol.status || 'assigned'}
                onChange={(e) => onStatusChange(vol._id, e.target.value)}
                style={{
                    fontSize: '0.75rem', fontWeight: '600',
                    padding: '0.4rem 0.6rem', borderRadius: '6px',
                    background: statusStyles.bg, color: statusStyles.text,
                    border: `1px solid ${statusStyles.border}`,
                    cursor: 'pointer', outline: 'none',
                    flexShrink: 0,
                    minWidth: '100px'
                }}
            >
                <option value="assigned">Assigned</option>
                <option value="fit">Fit</option>
                <option value="unfit">Unfit</option>
                <option value="withdrew">Withdrew</option>
                <option value="completed">Completed</option>
            </select>
        </div>
    );
};

const StudyCard = ({ study, assignments, onAssignmentUpdate }) => {
    const handleStatusChange = async (id, newStatus) => {
        try {
            await api.patch(`/assigned-studies/${id}`, { status: newStatus });
            onAssignmentUpdate(); // Refresh the parent list
        } catch (e) {
            alert("Failed to update status");
        }
    };

    const handleAttendanceToggle = async (id, attendanceStatus) => {
        try {
            // Call attendance API here when implemented
            console.log(`Toggle attendance for ${id}: ${attendanceStatus}`);
        } catch (e) {
            console.error("Failed to toggle attendance", e);
        }
    };

    return (
        <div style={{
            background: 'white', border: '1px solid #e5e7eb', borderRadius: '16px',
            marginBottom: '2rem', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)',
            overflow: 'hidden'
        }}>
            {/* Study Header */}
            <div style={{
                padding: '1.5rem',
                borderBottom: '1px solid #f3f4f6',
                background: 'linear-gradient(to right, #ffffff, #f9fafb)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <div style={{
                        background: '#e0e7ff', color: '#4338ca', fontWeight: '800',
                        padding: '0.5rem 1rem', borderRadius: '12px', fontSize: '1rem', letterSpacing: '-0.5px'
                    }}>
                        {study.studyCode}
                    </div>
                    <div>
                        <h2 style={{ fontSize: '1.5rem', fontWeight: '800', color: '#111827', letterSpacing: '-0.5px' }}>
                            {study.studyName}
                        </h2>
                        <div style={{ display: 'flex', gap: '1rem', fontSize: '0.85rem', color: '#6b7280', marginTop: '0.25rem' }}>
                            <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                                <Users size={14} /> {assignments.length} Total Volunteers
                            </span>
                            <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                                <Activity size={14} /> Active Study
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Volunteers List */}
            <div style={{ padding: '1.5rem', background: '#f8fafc' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    {assignments.length === 0 ? (
                        <div style={{
                            textAlign: 'center',
                            padding: '3rem 0',
                            color: '#cbd5e1',
                            background: 'white',
                            borderRadius: '12px',
                            border: '1px dashed #e2e8f0'
                        }}>
                            <Activity size={32} style={{ margin: '0 auto 0.5rem' }} />
                            <p style={{ fontWeight: '600' }}>No volunteers assigned yet</p>
                        </div>
                    ) : (
                        assignments.map(vol => (
                            <VolunteerCard
                                key={vol._id}
                                vol={vol}
                                onStatusChange={handleStatusChange}
                                onAttendanceToggle={handleAttendanceToggle}
                            />
                        ))
                    )}
                </div>
            </div>
        </div>
    );
};

// --- Main Page Component ---

const AssignedStudies = () => {
    const navigate = useNavigate();
    const { token } = useAuth();
    const [assignments, setAssignments] = useState([]);
    const [groupedStudies, setGroupedStudies] = useState({});
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [downloading, setDownloading] = useState(false);
    const [error, setError] = useState(null);

    useEffect(() => {
        fetchAssignments();
    }, [token, search]);

    useEffect(() => {
        // Group assignments by Study Code
        const groups = {};
        assignments.forEach(curr => {
            const code = curr.study_code || 'UNKNOWN';
            if (!groups[code]) {
                groups[code] = {
                    studyCode: code,
                    studyName: curr.study_name,
                    assignments: [] // List of volunteers
                };
            }
            groups[code].assignments.push(curr);
        });
        setGroupedStudies(groups);
    }, [assignments]);

    const fetchAssignments = async () => {
        try {
            setLoading(true);
            console.log('[AssignedStudies] Fetching assignments...');
            console.log('[AssignedStudies] Token exists:', !!token);
            console.log('[AssignedStudies] Search query:', search);

            const res = await api.get(`/assigned-studies?search=${search || ''}`);

            console.log('[AssignedStudies] API Response:', res.data);
            console.log('[AssignedStudies] Success:', res.data.success);
            console.log('[AssignedStudies] Data count:', res.data.data?.length);

            if (res.data.success) {
                setAssignments(res.data.data);
                console.log('[AssignedStudies] Assignments set:', res.data.data.length);
                setError(null);
            } else {
                console.warn('[AssignedStudies] API returned success=false');
            }
        } catch (e) {
            console.error("[AssignedStudies] Failed to fetch assignments:", e);
            console.error("[AssignedStudies] Error response:", e.response?.data);
            console.error("[AssignedStudies] Error status:", e.response?.status);
            setError("Failed to load assignments");
        } finally {
            setLoading(false);
        }
    };

    // Download logic
    const handleDownload = async () => {
        try {
            setDownloading(true);
            const response = await api.get('/assigned-studies/export', { responseType: 'blob' });
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `AssignedStudies_${new Date().toISOString().split('T')[0]}.xlsx`);
            document.body.appendChild(link);
            link.click();
            link.remove();
        } catch (e) {
            alert("Download failed");
        } finally {
            setDownloading(false);
        }
    };

    return (
        <div className="animate-fade-in" style={{ paddingBottom: '3rem', maxWidth: '1600px', margin: '0 auto', padding: '2rem' }}>
            {/* Page Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '3rem' }}>
                <div>
                    <h1 style={{
                        fontSize: '2.5rem', fontWeight: '900', color: '#1e293b',
                        background: 'linear-gradient(135deg, #1e293b 0%, #334155 100%)',
                        WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
                        letterSpacing: '-1px'
                    }}>
                        Assigned Studies
                    </h1>
                    <p style={{ color: '#64748b', fontSize: '1.1rem', marginTop: '0.5rem' }}>Track and manage volunteer assignments</p>
                </div>
                <div style={{ display: 'flex', gap: '1rem' }}>
                    <div style={{ position: 'relative' }}>
                        <Search size={20} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                        <input
                            type="text"
                            placeholder="Search volunteers..."
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            style={{
                                padding: '0.8rem 1rem 0.8rem 3rem', borderRadius: '12px', border: '1px solid #cbd5e1',
                                fontSize: '0.95rem', minWidth: '300px', boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
                            }}
                        />
                    </div>
                    <button
                        onClick={handleDownload}
                        disabled={downloading}
                        style={{
                            background: '#0f172a', color: 'white', border: 'none', padding: '0.8rem 1.5rem',
                            borderRadius: '12px', fontWeight: '700', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem'
                        }}
                    >
                        <FileDown size={18} /> Export
                    </button>
                </div>
            </div>

            {loading ? (
                <div style={{ textAlign: 'center', padding: '4rem' }}>
                    <div style={{ width: '40px', height: '40px', border: '3px solid #f3f4f6', borderTop: '3px solid #4f46e5', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto' }}></div>
                    <p style={{ marginTop: '1rem', color: '#64748b' }}>Refreshing data...</p>
                </div>
            ) : Object.keys(groupedStudies).length === 0 ? (
                <div style={{ textAlign: 'center', padding: '6rem 0', background: 'white', borderRadius: '20px', border: '1px dashed #cbd5e1' }}>
                    <Activity size={48} style={{ color: '#cbd5e1', marginBottom: '1rem' }} />
                    <p style={{ color: '#64748b', fontWeight: '600' }}>No active study assignments found</p>
                </div>
            ) : (
                Object.values(groupedStudies).map(study => (
                    <StudyCard
                        key={study.studyCode}
                        study={study}
                        assignments={study.assignments}
                        onAssignmentUpdate={fetchAssignments}
                    />
                ))
            )}

            <style>{`
                @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
            `}</style>
        </div>
    );
};

export default AssignedStudies;
