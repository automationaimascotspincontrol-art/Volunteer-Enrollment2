import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import api from '../../api/api';
import { Search, FileDown, Calendar, Users, ArrowRight, Activity, Clock, Filter, Trash2 } from 'lucide-react';

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
                bg: '#3b82f6',
                light: '#dbeafe',
                text: 'white',
                label: 'Upcoming',
                icon: '📅'
            };
        case 'ongoing':
            return {
                bg: '#10b981',
                light: '#d1fae5',
                text: 'white',
                label: 'Ongoing',
                icon: '▶'
            };
        case 'completed':
            return {
                bg: '#f59e0b',
                light: '#fef3c7',
                text: 'white',
                label: 'Completed',
                icon: '✓'
            };
        default:
            return {
                bg: '#64748b',
                light: '#f1f5f9',
                text: 'white',
                label: 'Active',
                icon: '⚡'
            };
    }
};

const VolunteerCard = ({ vol, onDelete }) => {
    const statusStyles = getStatusStyles(vol.status);
    const isWithdrawn = vol.status === 'withdrew';

    return (
        <div style={{
            background: 'white',
            border: '1px solid #e5e7eb',
            borderLeft: `3px solid ${statusStyles.text}`,
            padding: '0.875rem 1.125rem',
            borderRadius: '8px',
            display: 'flex',
            alignItems: 'center',
            gap: '0.875rem',
            boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
            transition: 'all 0.15s',
            opacity: isWithdrawn ? 0.6 : 1,
            minHeight: '64px'
        }}>
            {/* Volunteer Avatar */}
            <div style={{
                width: '38px', height: '38px', borderRadius: '8px',
                background: isWithdrawn ? '#9ca3af' : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontWeight: '700', fontSize: '0.9rem', flexShrink: 0,
                boxShadow: '0 2px 4px rgba(102, 126, 234, 0.2)'
            }}>
                {vol.volunteer_name ? vol.volunteer_name[0].toUpperCase() : 'V'}
            </div>

            {/* Volunteer Info */}
            <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{
                    fontWeight: '600', fontSize: '0.9rem', color: '#111827',
                    textDecoration: isWithdrawn ? 'line-through' : 'none',
                    marginBottom: '0.125rem'
                }}>
                    {vol.volunteer_name}
                </div>
                <div style={{ fontSize: '0.72rem', color: '#6b7280', fontFamily: 'monospace', fontWeight: '500' }}>
                    {vol.volunteer_id}
                </div>
            </div>

            {/* Status Badge */}
            <div style={{
                background: statusStyles.bg,
                color: statusStyles.text,
                padding: '0.375rem 0.75rem',
                borderRadius: '6px',
                fontSize: '0.72rem',
                fontWeight: '600',
                textTransform: 'capitalize',
                flexShrink: 0
            }}>
                {vol.status}
            </div>

            {/* Delete Button */}
            <button
                onClick={() => onDelete && onDelete(vol._id)}
                title="Remove volunteer from study"
                style={{
                    background: 'transparent',
                    color: '#ef4444',
                    border: '1px solid #fecaca',
                    borderRadius: '6px',
                    padding: '0.5rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'all 0.15s',
                    flexShrink: 0
                }}
                onMouseEnter={(e) => {
                    e.currentTarget.style.background = '#fef2f2';
                    e.currentTarget.style.borderColor = '#ef4444';
                }}
                onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'transparent';
                    e.currentTarget.style.borderColor = '#fecaca';
                }}
            >
                <Trash2 size={16} />
            </button>
        </div>
    );
};

const StudyCard = ({ study, assignments, onAssignmentUpdate }) => {
    const [exportingStudy, setExportingStudy] = React.useState(false);
    const studyStatus = getStudyStatus(study);
    const statusBadge = getStudyStatusBadge(studyStatus);

    const handleVolunteerDelete = async (volunteerId) => {
        if (!window.confirm('Are you sure you want to remove this volunteer from the study?')) {
            return;
        }

        try {
            await api.delete(`/assigned-studies/${volunteerId}`);
            onAssignmentUpdate();
        } catch (e) {
            console.error('Failed to delete volunteer:', e);
            alert("Failed to remove volunteer");
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
            border: '1px solid #e5e7eb',
            borderRadius: '12px',
            marginBottom: '1.5rem',
            boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
            overflow: 'hidden',
            transition: 'all 0.2s ease'
        }}
            onMouseEnter={(e) => {
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)';
                e.currentTarget.style.transform = 'translateY(-2px)';
            }}
            onMouseLeave={(e) => {
                e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.08)';
                e.currentTarget.style.transform = 'translateY(0)';
            }}
        >
            {/* Study Header */}
            <div style={{
                padding: '1.5rem',
                background: `linear-gradient(135deg, ${statusBadge.light}55 0%, ${statusBadge.light}22 100%)`,
                borderBottom: `2px solid ${statusBadge.bg}`,
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                gap: '1.25rem'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flex: 1 }}>
                    {/* Status Badge Icon */}
                    <div style={{
                        width: '44px',
                        height: '44px',
                        borderRadius: '10px',
                        background: statusBadge.bg,
                        color: statusBadge.text,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '1.25rem',
                        fontWeight: '700',
                        boxShadow: `0 4px 12px ${statusBadge.bg}44`,
                        flexShrink: 0
                    }}>
                        {statusBadge.icon}
                    </div>

                    {/* Timeline Indicator */}
                    {study.hasTimeline && (
                        <div style={{
                            width: '44px',
                            height: '44px',
                            borderRadius: '10px',
                            background: 'linear-gradient(135deg, #ec4899, #be185d)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            boxShadow: '0 4px 12px rgba(236, 72, 153, 0.3)',
                            flexShrink: 0
                        }} title="Has Timeline">
                            <Clock size={20} color="white" />
                        </div>
                    )}

                    {/* Study Info */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{
                            display: 'inline-block',
                            background: statusBadge.bg,
                            color: statusBadge.text,
                            fontSize: '0.75rem',
                            fontWeight: '700',
                            letterSpacing: '0.3px',
                            textTransform: 'uppercase',
                            marginBottom: '0.5rem',
                            fontFamily: 'monospace',
                            padding: '0.35rem 0.75rem',
                            borderRadius: '6px',
                            boxShadow: `0 2px 8px ${statusBadge.bg}33`
                        }}>
                            {study.studyCode}
                        </div>
                        <div style={{
                            fontSize: '1.125rem',
                            fontWeight: '700',
                            color: '#111827',
                            marginBottom: '0.5rem',
                            lineHeight: '1.4'
                        }}>
                            {study.studyName}
                        </div>
                        <div style={{ display: 'flex', gap: '1.25rem', fontSize: '0.8rem', color: '#64748b', flexWrap: 'wrap' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontWeight: '600' }}>
                                <Users size={14} style={{ color: '#94a3b8' }} />
                                <span><strong style={{ color: '#475569' }}>{assignments.length}</strong> Volunteers</span>
                            </div>
                            <div style={{
                                padding: '0.25rem 0.625rem',
                                background: statusBadge.bg,
                                color: statusBadge.text,
                                borderRadius: '6px',
                                fontSize: '0.72rem',
                                fontWeight: '700'
                            }}>
                                {statusBadge.label}
                            </div>
                        </div>

                        {/* Timeline Dates Block */}
                        {(study.startDate || study.endDate) && (
                            <div style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '0.5rem',
                                marginTop: '0.75rem',
                                padding: '0.5rem 0.875rem',
                                background: 'white',
                                border: '1px solid #e5e7eb',
                                borderRadius: '8px',
                                fontSize: '0.75rem',
                                fontWeight: '600',
                                color: '#64748b',
                                boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
                            }}>
                                <Calendar size={14} style={{ color: '#94a3b8' }} />
                                {study.startDate && (
                                    <span style={{ color: '#10b981' }}>
                                        {new Date(study.startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                                    </span>
                                )}
                                {study.startDate && study.endDate && (
                                    <ArrowRight size={12} style={{ color: '#cbd5e1' }} />
                                )}
                                {study.endDate && (
                                    <span style={{ color: '#f59e0b' }}>
                                        {new Date(study.endDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                                    </span>
                                )}
                            </div>
                        )}
                    </div>
                </div>

                {/* Export Button */}
                <button
                    onClick={handleStudyExport}
                    disabled={exportingStudy}
                    style={{
                        background: '#10b981',
                        color: 'white',
                        border: 'none',
                        padding: '0.625rem 1.125rem',
                        borderRadius: '8px',
                        fontSize: '0.8rem',
                        fontWeight: '600',
                        cursor: exportingStudy ? 'not-allowed' : 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        boxShadow: '0 2px 8px rgba(16, 185, 129, 0.3)',
                        transition: 'all 0.15s',
                        opacity: exportingStudy ? 0.6 : 1,
                        flexShrink: 0
                    }}
                >
                    <FileDown size={16} />
                    {exportingStudy ? 'Exporting...' : 'Export'}
                </button>
            </div>

            {/* Volunteers List */}
            {assignments.length === 0 ? (
                <div style={{
                    textAlign: 'center',
                    padding: '3rem 1.5rem',
                    color: '#94a3b8'
                }}>
                    <Users size={44} style={{ marginBottom: '0.75rem', color: '#cbd5e1' }} />
                    <p style={{ fontWeight: '600', fontSize: '0.9rem', color: '#64748b' }}>No volunteers assigned</p>
                </div>
            ) : (
                <div>
                    <div style={{
                        padding: '0.875rem 1.5rem',
                        background: '#f9fafb',
                        borderBottom: '1px solid #e5e7eb',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center'
                    }}>
                        <div style={{
                            fontSize: '0.8rem',
                            fontWeight: '700',
                            color: '#374151',
                            textTransform: 'uppercase',
                            letterSpacing: '0.3px'
                        }}>
                            Assigned Volunteers
                        </div>
                        <div style={{
                            padding: '0.25rem 0.625rem',
                            background: '#e5e7eb',
                            color: '#374151',
                            borderRadius: '12px',
                            fontSize: '0.72rem',
                            fontWeight: '700'
                        }}>
                            {assignments.length}
                        </div>
                    </div>
                    <div style={{
                        maxHeight: '360px',
                        overflowY: 'auto',
                        padding: '1rem 1.25rem',
                        background: '#fafbfc'
                    }}>
                        <div style={{ display: 'grid', gap: '0.625rem' }}>
                            {assignments.map(vol => (
                                <VolunteerCard
                                    key={vol._id}
                                    vol={vol}
                                    onDelete={handleVolunteerDelete}
                                />
                            ))}
                        </div>
                    </div>
                </div>
            )}
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
    const [statusFilter, setStatusFilter] = useState('all');
    const [error, setError] = useState(null);

    useEffect(() => {
        fetchAssignments();
    }, [token]);

    useEffect(() => {
        const groups = {};
        assignments.forEach(curr => {
            const code = curr.study_code || 'UNKNOWN';
            if (!groups[code]) {
                groups[code] = {
                    studyCode: code,
                    studyName: curr.study_name,
                    hasTimeline: curr.has_timeline,
                    startDate: curr.start_date || curr.visit_date, // Use visit_date as fallback
                    endDate: curr.end_date,
                    visitDates: [],
                    assignments: []
                };
            }
            // Collect all visit dates
            if (curr.visit_date) {
                groups[code].visitDates.push(new Date(curr.visit_date));
            }
            groups[code].assignments.push(curr);
        });

        // Calculate min and max dates from visit dates if no explicit start/end
        Object.values(groups).forEach(group => {
            if (group.visitDates.length > 0) {
                const sortedDates = group.visitDates.sort((a, b) => a - b);
                if (!group.startDate) {
                    group.startDate = sortedDates[0].toISOString().split('T')[0];
                }
                if (!group.endDate) {
                    group.endDate = sortedDates[sortedDates.length - 1].toISOString().split('T')[0];
                }
            }
        });

        setGroupedStudies(groups);
    }, [assignments]);

    const fetchAssignments = async () => {
        try {
            setLoading(true);
            const response = await api.get('/assigned-studies');
            setAssignments(response.data.data || []);
        } catch (err) {
            console.error('Failed to fetch assignments:', err);
            setError(err.response?.data?.detail || 'Failed to load assignments');
        } finally {
            setLoading(false);
        }
    };

    const filteredStudies = Object.values(groupedStudies).filter(study => {
        const matchesSearch = !search ||
            study.studyCode.toLowerCase().includes(search.toLowerCase()) ||
            study.studyName.toLowerCase().includes(search.toLowerCase());

        const studyStatus = getStudyStatus(study);
        const matchesStatus = statusFilter === 'all' || studyStatus === statusFilter;

        return matchesSearch && matchesStatus;
    });

    const statusCounts = Object.values(groupedStudies).reduce((acc, study) => {
        const status = getStudyStatus(study);
        acc[status] = (acc[status] || 0) + 1;
        acc.all = (acc.all || 0) + 1;
        return acc;
    }, {});

    return (
        <div className="animate-fade-in" style={{ maxWidth: '1600px', margin: '0 auto', padding: '2rem' }}>
            {/* Page Header */}
            <div style={{ marginBottom: '2rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.25rem' }}>
                    <div>
                        <h1 style={{
                            fontSize: '2rem',
                            fontWeight: '800',
                            color: '#111827',
                            marginBottom: '0.375rem',
                            letterSpacing: '-0.025em'
                        }}>
                            Assigned Studies
                        </h1>
                        <p style={{ color: '#64748b', fontSize: '0.9375rem', fontWeight: '500' }}>
                            Track and manage volunteer assignments
                        </p>
                    </div>

                    {/* Search Bar */}
                    <div style={{ position: 'relative', width: '380px' }}>
                        <Search size={18} style={{
                            position: 'absolute',
                            left: '1rem',
                            top: '50%',
                            transform: 'translateY(-50%)',
                            color: '#9ca3af'
                        }} />
                        <input
                            type="text"
                            placeholder="Search by study code..."
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            style={{
                                width: '100%',
                                padding: '0.75rem 1rem 0.75rem 3rem',
                                borderRadius: '10px',
                                border: '1px solid #d1d5db',
                                fontSize: '0.875rem',
                                fontWeight: '500',
                                boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                                transition: 'all 0.15s',
                                outline: 'none'
                            }}
                            onFocus={(e) => {
                                e.target.style.borderColor = '#3b82f6';
                                e.target.style.boxShadow = '0 0 0 3px rgba(59, 130, 246, 0.1)';
                            }}
                            onBlur={(e) => {
                                e.target.style.borderColor = '#d1d5db';
                                e.target.style.boxShadow = '0 1px 2px rgba(0,0,0,0.05)';
                            }}
                        />
                    </div>
                </div>

                {/* Status Filter Tabs */}
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                    {[
                        { key: 'all', label: 'All Studies', color: '#64748b' },
                        { key: 'ongoing', label: 'Ongoing', color: '#10b981' },
                        { key: 'upcoming', label: 'Upcoming', color: '#3b82f6' },
                        { key: 'completed', label: 'Completed', color: '#f59e0b' }
                    ].map(filter => (
                        <button
                            key={filter.key}
                            onClick={() => setStatusFilter(filter.key)}
                            style={{
                                padding: '0.625rem 1.125rem',
                                borderRadius: '8px',
                                border: statusFilter === filter.key ? 'none' : '1px solid #e5e7eb',
                                background: statusFilter === filter.key ? filter.color : 'white',
                                color: statusFilter === filter.key ? 'white' : '#64748b',
                                fontSize: '0.8125rem',
                                fontWeight: '600',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.5rem',
                                transition: 'all 0.15s',
                                boxShadow: statusFilter === filter.key ? `0 2px 8px ${filter.color}33` : 'none'
                            }}
                            onMouseEnter={(e) => {
                                if (statusFilter !== filter.key) {
                                    e.currentTarget.style.borderColor = filter.color;
                                    e.currentTarget.style.color = filter.color;
                                }
                            }}
                            onMouseLeave={(e) => {
                                if (statusFilter !== filter.key) {
                                    e.currentTarget.style.borderColor = '#e5e7eb';
                                    e.currentTarget.style.color = '#64748b';
                                }
                            }}
                        >
                            {filter.label}
                            <span style={{
                                padding: '0.125rem 0.5rem',
                                background: statusFilter === filter.key ? 'rgba(255,255,255,0.2)' : '#f3f4f6',
                                borderRadius: '10px',
                                fontSize: '0.7rem',
                                fontWeight: '700',
                                minWidth: '1.25rem',
                                textAlign: 'center'
                            }}>
                                {statusCounts[filter.key] || 0}
                            </span>
                        </button>
                    ))}
                </div>
            </div>

            {/* Content */}
            {loading ? (
                <div style={{ textAlign: 'center', padding: '4rem' }}>
                    <div style={{
                        width: '48px',
                        height: '48px',
                        border: '4px solid #f3f4f6',
                        borderTop: '4px solid #3b82f6',
                        borderRadius: '50%',
                        animation: 'spin 0.8s linear infinite',
                        margin: '0 auto'
                    }}></div>
                    <p style={{ marginTop: '1.25rem', color: '#64748b', fontSize: '0.9375rem', fontWeight: '500' }}>
                        Loading studies...
                    </p>
                </div>
            ) : filteredStudies.length === 0 ? (
                <div style={{
                    textAlign: 'center',
                    padding: '5rem 0',
                    background: 'white',
                    borderRadius: '12px',
                    border: '1px dashed #cbd5e1'
                }}>
                    <Activity size={56} style={{ color: '#cbd5e1', marginBottom: '1.25rem' }} />
                    <p style={{ color: '#64748b', fontWeight: '600', fontSize: '1.0625rem', marginBottom: '0.5rem' }}>
                        {search ? `No studies match "${search}"` :
                            statusFilter !== 'all' ? `No ${statusFilter} studies found` :
                                'No study assignments found'}
                    </p>
                    {(search || statusFilter !== 'all') && (
                        <button
                            onClick={() => {
                                setSearch('');
                                setStatusFilter('all');
                            }}
                            style={{
                                marginTop: '1.25rem',
                                padding: '0.625rem 1.25rem',
                                background: 'white',
                                border: '1px solid #d1d5db',
                                borderRadius: '8px',
                                color: '#64748b',
                                cursor: 'pointer',
                                fontWeight: '600',
                                fontSize: '0.8125rem',
                                transition: 'all 0.15s'
                            }}
                            onMouseEnter={(e) => {
                                e.currentTarget.style.borderColor = '#3b82f6';
                                e.currentTarget.style.color = '#3b82f6';
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.borderColor = '#d1d5db';
                                e.currentTarget.style.color = '#64748b';
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
                
                /* Custom Scrollbar */
                div[style*="overflowY: auto"]::-webkit-scrollbar {
                    width: 8px;
                }
                
                div[style*="overflowY: auto"]::-webkit-scrollbar-track {
                    background: #f3f4f6;
                    border-radius: 10px;
                }
                
                div[style*="overflowY: auto"]::-webkit-scrollbar-thumb {
                    background: #cbd5e1;
                    border-radius: 10px;
                }
                
                div[style*="overflowY: auto"]::-webkit-scrollbar-thumb:hover {
                    background: #9ca3af;
                }
            `}</style>
        </div>
    );
};

export default AssignedStudies;
