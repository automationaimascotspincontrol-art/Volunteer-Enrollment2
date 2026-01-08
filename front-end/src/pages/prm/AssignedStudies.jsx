import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import api from '../../api/api';
import { Search, FileDown, Calendar, Users, ArrowRight, Activity, Clock, ChevronRight, User } from 'lucide-react';

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

const VolunteerCard = ({ vol, onPush, isLast, onStatusChange }) => {
    const statusStyles = getStatusStyles(vol.status);
    const isWithdrawn = vol.status === 'withdrew';

    return (
        <div style={{
            background: isWithdrawn ? '#f9fafb' : 'white',
            border: `1px solid ${statusStyles.border}`,
            padding: '1rem',
            borderRadius: '12px',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.75rem',
            boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
            transition: 'transform 0.2s',
            opacity: isWithdrawn ? 0.7 : 1,
            ':hover': { transform: 'translateY(-2px)' }
        }}>
            <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                <div style={{
                    width: '32px', height: '32px', borderRadius: '50%',
                    background: isWithdrawn ? '#9ca3af' : '#4f46e5',
                    color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontWeight: 'bold', fontSize: '0.8rem'
                }}>
                    {vol.volunteer_name ? vol.volunteer_name[0].toUpperCase() : <User size={14} />}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{
                        fontWeight: '700', fontSize: '0.9rem', color: '#111827',
                        whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                        textDecoration: isWithdrawn ? 'line-through' : 'none'
                    }}>
                        {vol.volunteer_name}
                    </div>
                    <div style={{ fontSize: '0.7rem', color: '#6b7280' }}>ID: {vol.volunteer_id}</div>
                </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <select
                    value={vol.status || 'assigned'}
                    onChange={(e) => onStatusChange(vol._id, e.target.value)}
                    style={{
                        fontSize: '0.7rem', fontWeight: '600',
                        padding: '0.2rem 0.4rem', borderRadius: '6px',
                        background: statusStyles.bg, color: statusStyles.text,
                        border: 'none', cursor: 'pointer', outline: 'none'
                    }}
                >
                    <option value="assigned">Assigned</option>
                    <option value="fit">Fit</option>
                    <option value="unfit">Unfit</option>
                    <option value="withdrew">Withdrew</option>
                    <option value="completed">Completed</option>
                </select>

                {!isWithdrawn && !isLast && (
                    <button
                        onClick={() => onPush(vol)}
                        title="Push to Next Visit"
                        style={{
                            background: '#eff6ff', color: '#3b82f6',
                            border: 'none', borderRadius: '50%',
                            width: '28px', height: '28px',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            cursor: 'pointer', transition: 'background 0.2s'
                        }}
                    >
                        <ArrowRight size={14} />
                    </button>
                )}
            </div>
        </div>
    );
};

const StudyCard = ({ study, assignments, onAssignmentUpdate }) => {
    const [visits, setVisits] = useState([]);
    const [loadingVisits, setLoadingVisits] = useState(true);

    useEffect(() => {
        const fetchVisits = async () => {
            try {
                // Find study instance to get visits
                const searchRes = await api.get(`/prm-dashboard/search?q=${study.studyCode}&type=study`);
                if (searchRes.data.success && searchRes.data.data.length > 0) {
                    const instId = searchRes.data.data[0].id;
                    const res = await api.get(`/study-instance/${instId}`);
                    if (res.data && res.data.visits) {
                        const sorted = res.data.visits.sort((a, b) => new Date(a.plannedDate) - new Date(b.plannedDate));
                        setVisits(sorted);
                    }
                }
            } catch (err) {
                console.error("Failed to fetch visits for timeline", err);
            } finally {
                setLoadingVisits(false);
            }
        };
        fetchVisits();
    }, [study.studyCode]);

    // Group volunteers by date string
    const getBuckets = () => {
        const buckets = {};

        // Initialize from visits
        visits.forEach(v => {
            const d = v.plannedDate ? (typeof v.plannedDate === 'string' ? v.plannedDate.split('T')[0] : new Date(v.plannedDate).toISOString().split('T')[0]) : 'TBD';
            if (!buckets[d]) {
                buckets[d] = {
                    date: d,
                    label: v.visitLabel,
                    color: v.color || '#4f46e5',
                    volunteers: []
                };
            }
        });

        // Add "Pending" if no visits or for stray volunteers
        if (visits.length === 0) {
            buckets['pending'] = { date: 'TBD', label: 'Unscheduled', color: '#9ca3af', volunteers: [] };
        }

        // Place volunteers
        assignments.forEach(vol => {
            const vDate = vol.visit_date; // Backend maps assignment_date to visit_date string
            if (vDate && buckets[vDate]) {
                buckets[vDate].volunteers.push(vol);
            } else {
                // Default to first visit bucket if not matched
                const firstKey = Object.keys(buckets)[0];
                if (firstKey) buckets[firstKey].volunteers.push(vol);
            }
        });

        return buckets;
    };

    const handlePushNext = async (vol) => {
        const buckets = getBuckets();
        const dates = Object.keys(buckets).sort();
        const currentIdx = dates.indexOf(vol.visit_date);

        if (currentIdx > -1 && currentIdx < dates.length - 1) {
            const nextDate = dates[currentIdx + 1];
            try {
                await api.patch(`/assigned-studies/${vol._id}`, { visit_date: nextDate });
                onAssignmentUpdate(); // Refresh the parent list
            } catch (err) {
                alert("Failed to move volunteer to next date");
            }
        }
    };

    const buckets = getBuckets();
    const sortedDates = Object.keys(buckets).sort();

    return (
        <div style={{
            background: 'white', border: '1px solid #e5e7eb', borderRadius: '16px',
            marginBottom: '2rem', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)',
            display: 'flex', flexDirection: 'column'
        }}>
            <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid #f3f4f6', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <div style={{
                        background: '#e0e7ff', color: '#4338ca', fontWeight: '800',
                        padding: '0.3rem 0.6rem', borderRadius: '8px', fontSize: '0.85rem'
                    }}>
                        {study.studyCode}
                    </div>
                    <h3 style={{ fontSize: '1.1rem', fontWeight: '700', color: '#111827' }}>{study.studyName}</h3>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', color: '#6b7280', fontSize: '0.8rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}><Users size={14} /> {assignments.length} Total</div>
                </div>
            </div>

            <div style={{
                display: 'flex', overflowX: 'auto', padding: '1.5rem', gap: '1.25rem',
                background: '#f8fafc', minHeight: '350px'
            }}>
                {loadingVisits ? (
                    <div style={{ padding: '2rem', color: '#6b7280', fontSize: '0.9rem' }}>Loading timeline...</div>
                ) : (
                    sortedDates.map((date, idx) => {
                        const b = buckets[date];
                        const isToday = new Date().toISOString().split('T')[0] === b.date;

                        return (
                            <div key={date} style={{
                                minWidth: '280px', maxWidth: '280px', flexShrink: 0,
                                background: 'white', borderRadius: '12px', border: isToday ? '2px solid #4f46e5' : '1px solid #e2e8f0',
                                display: 'flex', flexDirection: 'column', height: 'fit-content'
                            }}>
                                <div style={{
                                    padding: '0.75rem 1rem', borderTop: `4px solid ${b.color}`,
                                    background: isToday ? '#eff6ff' : 'white', borderRadius: '10px 10px 0 0',
                                    borderBottom: '1px solid #f1f5f9'
                                }}>
                                    <div style={{ fontWeight: '800', fontSize: '0.75rem', color: '#334155', textTransform: 'uppercase' }}>{b.label}</div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.8rem', color: '#64748b', marginTop: '0.2rem' }}>
                                        <Calendar size={12} /> {b.date === 'TBD' ? 'TBD' : new Date(b.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                                    </div>
                                </div>
                                <div style={{ padding: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.75rem', maxHeight: '500px', overflowY: 'auto' }}>
                                    {b.volunteers.length === 0 ? (
                                        <div style={{ textAlign: 'center', color: '#cbd5e1', fontSize: '0.8rem', padding: '1.5rem 0' }}>No volunteers</div>
                                    ) : (
                                        b.volunteers.map(vol => (
                                            <VolunteerCard
                                                key={vol._id}
                                                vol={vol}
                                                onStatusChange={async (id, s) => {
                                                    try {
                                                        await api.patch(`/assigned-studies/${id}`, { status: s });
                                                        onAssignmentUpdate();
                                                    } catch (e) { alert("Failed to update status"); }
                                                }}
                                                onPush={handlePushNext}
                                                isLast={idx === sortedDates.length - 1}
                                            />
                                        ))
                                    )}
                                </div>
                            </div>
                        );
                    })
                )}
            </div>
        </div>
    );
};

const AssignedStudies = () => {
    const [assignments, setAssignments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [downloading, setDownloading] = useState(false);
    const { token } = useAuth();

    useEffect(() => {
        fetchAssignments();
    }, [token, search]);

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
            } else {
                console.warn('[AssignedStudies] API returned success=false');
            }
        } catch (e) {
            console.error("[AssignedStudies] Failed to fetch assignments:", e);
            console.error("[AssignedStudies] Error response:", e.response?.data);
            console.error("[AssignedStudies] Error status:", e.response?.status);
        } finally {
            setLoading(false);
        }
    };

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
            alert("Export failed");
        } finally {
            setDownloading(false);
        }
    };

    // Grouping logic for the main cards
    const grouped = assignments.reduce((acc, curr) => {
        const code = curr.study_code || 'UNKNOWN';
        if (!acc[code]) {
            acc[code] = {
                studyCode: code,
                studyName: curr.study_name,
                assignments: []
            };
        }
        acc[code].assignments.push(curr);
        return acc;
    }, {});

    return (
        <div style={{ padding: '2rem', maxWidth: '1600px', margin: '0 auto', minHeight: '100vh', background: '#f8fafc' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                <div>
                    <h1 style={{ fontSize: '2rem', fontWeight: '900', color: '#1e293b', letterSpacing: '-1px' }}>Assigned Studies Timeline</h1>
                    <p style={{ color: '#64748b', fontSize: '0.9rem' }}>Track volunteer progress across study visits</p>
                </div>
                <div style={{ display: 'flex', gap: '1rem' }}>
                    <div style={{ position: 'relative' }}>
                        <Search size={18} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                        <input
                            type="text"
                            placeholder="Search volunteers or studies..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            style={{
                                padding: '0.6rem 0.75rem 0.6rem 2.5rem', borderRadius: '10px',
                                border: '1px solid #e2e8f0', fontSize: '0.9rem', width: '280px',
                                outline: 'none', background: 'white'
                            }}
                        />
                    </div>
                    <button
                        onClick={handleDownload}
                        disabled={downloading}
                        style={{
                            display: 'flex', alignItems: 'center', gap: '0.5rem',
                            padding: '0.6rem 1rem', background: '#4f46e5', color: 'white',
                            border: 'none', borderRadius: '10px', fontWeight: '600',
                            cursor: 'pointer', opacity: downloading ? 0.7 : 1
                        }}
                    >
                        <FileDown size={18} />
                        {downloading ? 'Exporting...' : 'Export Excel'}
                    </button>
                </div>
            </div>

            {loading ? (
                <div style={{ textAlign: 'center', padding: '10rem 0' }}>
                    <div style={{ width: '40px', height: '40px', border: '3px solid #f3f4f6', borderTop: '3px solid #4f46e5', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto' }}></div>
                    <p style={{ marginTop: '1rem', color: '#64748b' }}>Refreshing timeline data...</p>
                </div>
            ) : Object.keys(grouped).length === 0 ? (
                <div style={{ textAlign: 'center', padding: '6rem 0', background: 'white', borderRadius: '20px', border: '1px dashed #cbd5e1' }}>
                    <Activity size={48} style={{ color: '#cbd5e1', marginBottom: '1rem' }} />
                    <p style={{ color: '#64748b', fontWeight: '600' }}>No active study assignments found</p>
                </div>
            ) : (
                Object.values(grouped).map(study => (
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
