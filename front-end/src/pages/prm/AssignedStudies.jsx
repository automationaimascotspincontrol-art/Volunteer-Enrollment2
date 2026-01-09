import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import api from '../../api/api';
import { Search, FileDown, Calendar, Users, ArrowRight, Activity, Clock, Filter } from 'lucide-react';

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

// Helper to determine study status based on dates
const getStudyStatus = (study) => {
    if (!study.startDate || !study.endDate) return 'ongoing'; // Default if no dates

    const now = new Date();
    const start = new Date(study.startDate);
    const end = new Date(study.endDate);

    if (now < start) return 'upcoming';
    if (now > end) return 'completed';
    return 'ongoing';
};

const getStudyStatusBadge = (status) => {
    switch (status) {
        case 'upcoming':
            return {
                bg: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
                text: 'white',
                label: 'Upcoming',
                icon: '📅'
            };
        case 'ongoing':
            return {
                bg: 'linear-gradient(135deg, #64748b 0%, #475569 100%)',
                text: 'white',
                label: 'Ongoing',
                icon: '🔄'
            };
        case 'completed':
            return {
                bg: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                text: 'white',
                label: 'Completed',
                icon: '✓'
            };
        default:
            return {
                bg: 'linear-gradient(135deg, #64748b 0%, #475569 100%)',
                text: 'white',
                label: 'Active',
                icon: '⚡'
            };
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

            {/* Status Badge */}
            <div style={{
                background: statusStyles.bg,
                color: statusStyles.text,
                padding: '0.4rem 0.8rem',
                borderRadius: '8px',
                fontSize: '0.75rem',
                fontWeight: '700',
                textTransform: 'capitalize',
                flexShrink: 0,
                border: `1px solid ${statusStyles.border}`
            }}>
                {vol.status}
            </div>
        </div>
    );
};

const StudyCard = ({ study, assignments, onAssignmentUpdate }) => {
    const [exportingStudy, setExportingStudy] = React.useState(false);
    const studyStatus = getStudyStatus(study);
    const statusBadge = getStudyStatusBadge(studyStatus);

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

    const handleStudyExport = async () => {
        try {
            setExportingStudy(true);
            const response = await api.get(`/assigned-studies/export/${study.studyCode}`, { responseType: 'blob' });
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `${study.studyCode}_Volunteers_${new Date().toISOString().split('T')[0]}.xlsx`);
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(url);
        } catch (e) {
            console.error('Export failed:', e);
            alert("Download failed");
        } finally {
            setExportingStudy(false);
        }
    };

    return (
        <div style={{
            background: 'white',
            border: '2px solid #d1fae5',
            borderRadius: '18px',
            marginBottom: '1.75rem',
            boxShadow: '0 10px 40px rgba(16, 185, 129, 0.12)',
            overflow: 'hidden',
            transition: 'all 0.3s ease'
        }}
            onMouseEnter={(e) => {
                e.currentTarget.style.boxShadow = '0 15px 50px rgba(16, 185, 129, 0.18)';
                e.currentTarget.style.transform = 'translateY(-3px)';
            }}
            onMouseLeave={(e) => {
                e.currentTarget.style.boxShadow = '0 10px 40px rgba(16, 185, 129, 0.12)';
                e.currentTarget.style.transform = 'translateY(0)';
            }}
        >
            {/* Study Header */}
            <div style={{
                padding: '1.75rem 2rem',
                background: 'linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%)',
                borderBottom: '3px solid #10b981',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                gap: '1.5rem'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', flex: 1 }}>
                    {/* Study Status Badge */}
                    <div style={{
                        padding: '0.6rem',
                        background: statusBadge.bg,
                        borderRadius: '10px',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
                    }} title={statusBadge.label}>
                        <span style={{ fontSize: '1.2rem' }}>{statusBadge.icon}</span>
                    </div>

                    {/* Timeline Indicator */}
                    {study.hasTimeline && (
                        <div style={{
                            padding: '0.6rem',
                            background: 'linear-gradient(135deg, #ec4899, #be185d)',
                            borderRadius: '10px',
                            boxShadow: '0 4px 12px rgba(236, 72, 153, 0.3)'
                        }} title="Has Timeline">
                            <Clock size={20} color="white" />
                        </div>
                    )}

                    <div style={{ flex: 1 }}>
                        <div style={{
                            display: 'inline-block',
                            background: 'linear-gradient(135deg, #10b981, #059669)',
                            color: 'white',
                            fontSize: '0.85rem',
                            fontWeight: '800',
                            letterSpacing: '0.5px',
                            textTransform: 'uppercase',
                            marginBottom: '0.6rem',
                            fontFamily: 'monospace',
                            padding: '0.5rem 1rem',
                            borderRadius: '10px',
                            boxShadow: '0 4px 15px rgba(16, 185, 129, 0.35)'
                        }}>
                            {study.studyCode}
                        </div>
                        <div style={{
                            fontSize: '1.15rem',
                            fontWeight: '800',
                            color: '#1e293b',
                            marginBottom: '0.5rem'
                        }}>
                            {study.studyName}
                        </div>
                        <div style={{ display: 'flex', gap: '1.5rem', fontSize: '0.85rem', color: '#64748b' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: '600' }}>
                                <Users size={15} style={{ color: '#667eea' }} />
                                <span><strong style={{ color: '#334155' }}>{assignments.length}</strong> Total Volunteers</span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: '600' }}>
                                <div style={{
                                    padding: '0.25rem 0.6rem',
                                    background: statusBadge.bg,
                                    color: statusBadge.text,
                                    borderRadius: '6px',
                                    fontSize: '0.75rem',
                                    fontWeight: '700'
                                }}>
                                    {statusBadge.label}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Export Excel Button */}
                <button
                    onClick={handleStudyExport}
                    disabled={exportingStudy}
                    style={{
                        background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                        color: 'white',
                        border: 'none',
                        padding: '0.7rem 1.25rem',
                        borderRadius: '10px',
                        fontSize: '0.85rem',
                        fontWeight: '700',
                        cursor: exportingStudy ? 'not-allowed' : 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)',
                        transition: 'all 0.2s',
                        opacity: exportingStudy ? 0.6 : 1
                    }}
                >
                    <FileDown size={17} />
                    {exportingStudy ? 'Exporting...' : 'Export Excel'}
                </button>
            </div>

            {/* Volunteers List */}
            <div style={{ padding: '0' }}>
                {assignments.length === 0 ? (
                    <div style={{
                        textAlign: 'center',
                        padding: '3rem',
                        margin: '1.5rem',
                        color: '#94a3b8',
                        background: '#f8fafc',
                        borderRadius: '12px',
                        border: '2px dashed #cbd5e1'
                    }}>
                        <Users size={48} style={{ marginBottom: '1rem', color: '#cbd5e1' }} />
                        <p style={{ fontWeight: '600', fontSize: '1rem' }}>No volunteers assigned yet</p>
                    </div>
                ) : (
                    <div>
                        <div style={{
                            padding: '1.25rem 1.75rem 0.75rem',
                            background: 'linear-gradient(to right, #f0fdf4, #dcfce7)',
                            borderBottom: '2px solid #bbf7d0',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center'
                        }}>
                            <div style={{
                                fontSize: '0.9rem',
                                fontWeight: '700',
                                color: '#047857',
                                textTransform: 'uppercase',
                                letterSpacing: '0.5px'
                            }}>
                                Assigned Volunteers
                            </div>
                            <div style={{
                                padding: '0.35rem 0.75rem',
                                background: '#10b981',
                                color: 'white',
                                borderRadius: '20px',
                                fontSize: '0.8rem',
                                fontWeight: '800'
                            }}>
                                {assignments.length}
                            </div>
                        </div>
                        <div style={{
                            maxHeight: '400px',
                            overflowY: 'auto',
                            padding: '1rem 1.5rem 1.5rem',
                            background: 'linear-gradient(to bottom, #ffffff, #f9fafb)'
                        }}>
                            <div style={{ display: 'grid', gap: '0.75rem' }}>
                                {assignments.map(vol => (
                                    <VolunteerCard
                                        key={vol._id}
                                        vol={vol}
                                        onStatusChange={handleStatusChange}
                                        onAttendanceToggle={handleAttendanceToggle}
                                    />
                                ))}
                            </div>
                        </div>
                    </div>
                )}
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
    const [statusFilter, setStatusFilter] = useState('all'); // all, ongoing, upcoming, completed
    const [error, setError] = useState(null);

    useEffect(() => {
        fetchAssignments();
    }, [token]);

    useEffect(() => {
        // Group assignments by Study Code
        const groups = {};
        assignments.forEach(curr => {
            const code = curr.study_code || 'UNKNOWN';
            if (!groups[code]) {
                groups[code] = {
                    studyCode: code,
                    studyName: curr.study_name,
                    hasTimeline: curr.has_timeline,
                    startDate: curr.start_date,
                    endDate: curr.end_date,
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
            const response = await api.get('/assigned-studies'); // Fixed: removed /prm prefix
            setAssignments(response.data.data || []); // Backend returns 'data' not 'assignments'
        } catch (err) {
            console.error('Failed to fetch assignments:', err);
            setError(err.response?.data?.detail || 'Failed to load assignments');
        } finally {
            setLoading(false);
        }
    };

    // Filter studies by study code and status
    const filteredStudies = Object.values(groupedStudies).filter(study => {
        // Search filter
        const matchesSearch = !search ||
            study.studyCode.toLowerCase().includes(search.toLowerCase()) ||
            study.studyName.toLowerCase().includes(search.toLowerCase());

        // Status filter
        const studyStatus = getStudyStatus(study);
        const matchesStatus = statusFilter === 'all' || studyStatus === statusFilter;

        return matchesSearch && matchesStatus;
    });

    // Count studies by status
    const statusCounts = Object.values(groupedStudies).reduce((acc, study) => {
        const status = getStudyStatus(study);
        acc[status] = (acc[status] || 0) + 1;
        acc.all = (acc.all || 0) + 1;
        return acc;
    }, {});

    return (
        <div className="animate-fade-in" style={{ paddingBottom: '3rem', maxWidth: '1600px', margin: '0 auto', padding: '2rem' }}>
            {/* Page Header */}
            <div style={{ marginBottom: '2.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                    <div>
                        <h1 style={{
                            fontSize: '2.8rem', fontWeight: '900', color: '#1e293b',
                            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
                            letterSpacing: '-1.5px',
                            marginBottom: '0.5rem'
                        }}>
                            Assigned Studies
                        </h1>
                        <p style={{ color: '#64748b', fontSize: '1.1rem', fontWeight: '500' }}>
                            Track and manage volunteer assignments
                        </p>
                    </div>

                    {/* Search by Study Code */}
                    <div style={{ position: 'relative', minWidth: '400px' }}>
                        <Search size={20} style={{
                            position: 'absolute',
                            left: '1.2rem',
                            top: '50%',
                            transform: 'translateY(-50%)',
                            color: '#94a3b8'
                        }} />
                        <input
                            type="text"
                            placeholder="Search by Study Code..."
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            style={{
                                width: '100%',
                                padding: '0.9rem 1.2rem 0.9rem 3.2rem',
                                borderRadius: '14px',
                                border: '2px solid #cbd5e1',
                                fontSize: '0.95rem',
                                fontWeight: '500',
                                boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
                                transition: 'all 0.2s'
                            }}
                        />
                    </div>
                </div>

                {/* Status Filter Buttons */}
                <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                    {[
                        { key: 'all', label: 'All Studies', icon: ' 📚', color: '#64748b' },
                        { key: 'ongoing', label: 'Ongoing', icon: '🔄', color: '#64748b' },
                        { key: 'upcoming', label: 'Upcoming', icon: '📅', color: '#3b82f6' },
                        { key: 'completed', label: 'Completed', icon: '✓', color: '#f59e0b' }
                    ].map(filter => (
                        <button
                            key={filter.key}
                            onClick={() => setStatusFilter(filter.key)}
                            style={{
                                padding: '0.7rem 1.25rem',
                                borderRadius: '12px',
                                border: statusFilter === filter.key ? 'none' : '2px solid #e2e8f0',
                                background: statusFilter === filter.key
                                    ? `linear-gradient(135deg, ${filter.color}, ${filter.color}dd)`
                                    : 'white',
                                color: statusFilter === filter.key ? 'white' : '#64748b',
                                fontSize: '0.9rem',
                                fontWeight: '700',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.5rem',
                                transition: 'all 0.2s',
                                boxShadow: statusFilter === filter.key ? '0 4px 12px rgba(0,0,0,0.15)' : 'none'
                            }}
                            onMouseEnter={(e) => {
                                if (statusFilter !== filter.key) {
                                    e.currentTarget.style.borderColor = filter.color;
                                    e.currentTarget.style.color = filter.color;
                                }
                            }}
                            onMouseLeave={(e) => {
                                if (statusFilter !== filter.key) {
                                    e.currentTarget.style.borderColor = '#e2e8f0';
                                    e.currentTarget.style.color = '#64748b';
                                }
                            }}
                        >
                            <span style={{ fontSize: '1.1rem' }}>{filter.icon}</span>
                            {filter.label}
                            <span style={{
                                padding: '0.15rem 0.5rem',
                                background: statusFilter === filter.key ? 'rgba(255,255,255,0.2)' : '#f1f5f9',
                                borderRadius: '8px',
                                fontSize: '0.75rem',
                                fontWeight: '800'
                            }}>
                                {statusCounts[filter.key] || 0}
                            </span>
                        </button>
                    ))}
                </div>
            </div>

            {loading ? (
                <div style={{ textAlign: 'center', padding: '4rem' }}>
                    <div style={{
                        width: '50px',
                        height: '50px',
                        border: '4px solid #f3f4f6',
                        borderTop: '4px solid #667eea',
                        borderRadius: '50%',
                        animation: 'spin 1s linear infinite',
                        margin: '0 auto'
                    }}></div>
                    <p style={{ marginTop: '1.5rem', color: '#64748b', fontSize: '1.05rem', fontWeight: '600' }}>
                        Loading assignments...
                    </p>
                </div>
            ) : filteredStudies.length === 0 ? (
                <div style={{
                    textAlign: 'center',
                    padding: '6rem 0',
                    background: 'white',
                    borderRadius: '20px',
                    border: '2px dashed #cbd5e1',
                    boxShadow: '0 4px 20px rgba(0,0,0,0.05)'
                }}>
                    <Activity size={60} style={{ color: '#cbd5e1', marginBottom: '1.5rem' }} />
                    <p style={{ color: '#64748b', fontWeight: '700', fontSize: '1.15rem', marginBottom: '0.5rem' }}>
                        {search ? `No studies match "${search}"` :
                            statusFilter !== 'all' ? `No ${statusFilter} studies found` :
                                'No active study assignments found'}
                    </p>
                    {(search || statusFilter !== 'all') && (
                        <button
                            onClick={() => {
                                setSearch('');
                                setStatusFilter('all');
                            }}
                            style={{
                                marginTop: '1.5rem',
                                padding: '0.7rem 1.5rem',
                                background: 'transparent',
                                border: '2px solid #cbd5e1',
                                borderRadius: '10px',
                                color: '#64748b',
                                cursor: 'pointer',
                                fontWeight: '600',
                                fontSize: '0.9rem'
                            }}
                        >
                            Clear Filters
                        </button>
                    )}
                </div>
            ) : (
                filteredStudies.map(study => (
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
                
                /* Custom Scrollbar Styling */
                div[style*="overflowY: auto"]::-webkit-scrollbar {
                    width: 10px;
                }
                
                div[style*="overflowY: auto"]::-webkit-scrollbar-track {
                    background: #f0fdf4;
                    border-radius: 10px;
                }
                
                div[style*="overflowY: auto"]::-webkit-scrollbar-thumb {
                    background: linear-gradient(135deg, #10b981, #059669);
                    border-radius: 10px;
                    border: 2px solid #f0fdf4;
                }
                
                div[style*="overflowY: auto"]::-webkit-scrollbar-thumb:hover {
                    background: linear-gradient(135deg, #059669, #047857);
                }
            `}</style>
        </div>
    );
};

export default AssignedStudies;
