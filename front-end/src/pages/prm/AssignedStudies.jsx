import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import api from '../../api/api';
import { Search, FileDown, Calendar, Users, ArrowRight, Activity, Clock, Filter, Trash2, ChevronRight } from 'lucide-react';

// --- Helper Functions ---

const getStatusStyles = (status) => {
    const s = (status || '').toLowerCase();
    switch (s) {
        case 'fit': return { bg: '#d1fae5', text: '#065f46', label: 'Fit' };
        case 'unfit': return { bg: '#fee2e2', text: '#991b1b', label: 'Unfit' };
        case 'withdrew': return { bg: '#f3f4f6', text: '#374151', label: 'Withdrew' };
        case 'completed': return { bg: '#dbeafe', text: '#1e40af', label: 'Completed' };
        default: return { bg: '#fef3c7', text: '#92400e', label: status || 'Pending' };
    }
};

const getStudyStatus = (study) => {
    if (!study.startDate || !study.endDate) return 'ongoing';

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
            return { bg: '#3b82f6', light: '#eff6ff', text: 'white', label: 'Upcoming', icon: '📅', accent: '#2563eb' };
        case 'ongoing':
            return { bg: '#10b981', light: '#f0fdf4', text: 'white', label: 'Ongoing', icon: '▶', accent: '#059669' };
        case 'completed':
            return { bg: '#f59e0b', light: '#fffbeb', text: 'white', label: 'Completed', icon: '✓', accent: '#d97706' };
        default:
            return { bg: '#64748b', light: '#f8fafc', text: 'white', label: 'Active', icon: '⚡', accent: '#475569' };
    }
};

// --- Components ---

const VolunteerCard = ({ vol, onDelete }) => {
    const statusInfo = getStatusStyles(vol.status);
    const isWithdrawn = vol.status === 'withdrew';

    return (
        <div className="volunteer-card" style={{
            background: '#ffffff',
            border: '1px solid #f1f5f9',
            borderLeft: `3px solid ${statusInfo.text}`,
            padding: '1rem',
            borderRadius: '10px',
            display: 'flex',
            alignItems: 'center',
            gap: '1rem',
            transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
            opacity: isWithdrawn ? 0.7 : 1,
            position: 'relative',
            overflow: 'hidden'
        }}>
            {/* Subtle gradient overlay */}
            <div style={{
                position: 'absolute',
                top: 0,
                right: 0,
                width: '120px',
                height: '100%',
                background: `linear-gradient(90deg, transparent, ${statusInfo.bg}15)`,
                pointerEvents: 'none'
            }} />

            {/* Avatar */}
            <div style={{
                width: '42px',
                height: '42px',
                borderRadius: '10px',
                background: isWithdrawn ? '#9ca3af' : 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                color: 'white',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: '700',
                fontSize: '1rem',
                flexShrink: 0,
                boxShadow: '0 4px 12px rgba(99, 102, 241, 0.25)',
                position: 'relative',
                zIndex: 1
            }}>
                {vol.volunteer_name ? vol.volunteer_name[0].toUpperCase() : 'V'}
            </div>

            {/* Info */}
            <div style={{ flex: 1, minWidth: 0, position: 'relative', zIndex: 1 }}>
                <div style={{
                    fontWeight: '600',
                    fontSize: '0.9375rem',
                    color: '#0f172a',
                    textDecoration: isWithdrawn ? 'line-through' : 'none',
                    marginBottom: '0.25rem'
                }}>
                    {vol.volunteer_name}
                </div>
                <div style={{
                    fontSize: '0.75rem',
                    color: '#64748b',
                    fontFamily: 'ui-monospace, monospace',
                    fontWeight: '500'
                }}>
                    {vol.volunteer_id}
                </div>
            </div>

            {/* Status Badge */}
            <div style={{
                background: statusInfo.bg,
                color: statusInfo.text,
                padding: '0.375rem 0.875rem',
                borderRadius: '6px',
                fontSize: '0.75rem',
                fontWeight: '600',
                textTransform: 'capitalize',
                flexShrink: 0,
                position: 'relative',
                zIndex: 1
            }}>
                {statusInfo.label}
            </div>

            {/* Delete Button */}
            <button
                onClick={() => onDelete && onDelete(vol._id)}
                className="delete-btn"
                title="Remove volunteer"
                style={{
                    background: 'transparent',
                    color: '#ef4444',
                    border: 'none',
                    borderRadius: '8px',
                    padding: '0.5rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'all 0.2s',
                    flexShrink: 0,
                    position: 'relative',
                    zIndex: 1
                }}
            >
                <Trash2 size={17} />
            </button>

            <style>{`
                .volunteer-card:hover {
                    box-shadow: 0 4px 16px rgba(0,0,0,0.08);
                    transform: translateY(-1px);
                    border-color: #e2e8f0;
                }
                .delete-btn:hover {
                    background: #fef2f2;
                    color: #dc2626;
                }
            `}</style>
        </div>
    );
};

const StudyCard = ({ study, assignments, onAssignmentUpdate }) => {
    const [exportingStudy, setExportingStudy] = React.useState(false);
    const studyStatus = getStudyStatus(study);
    const statusBadge = getStudyStatusBadge(studyStatus);

    const handleVolunteerDelete = async (volunteerId) => {
        if (!window.confirm('Remove this volunteer from the study?')) return;

        try {
            await api.delete(`/assigned-studies/${volunteerId}`);
            onAssignmentUpdate();
        } catch (e) {
            console.error('Failed to delete:', e);
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
            link.setAttribute('download', `${study.studyCode}_${new Date().toISOString().split('T')[0]}.xlsx`);
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
        <div className="study-card" style={{
            background: '#ffffff',
            border: '1px solid #f1f5f9',
            borderRadius: '16px',
            marginBottom: '1.5rem',
            boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
            overflow: 'hidden',
            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            position: 'relative'
        }}>
            {/* Header */}
            <div style={{
                padding: '1.5rem',
                background: `linear-gradient(135deg, ${statusBadge.light} 0%, ${statusBadge.light}cc 100%)`,
                borderBottom: `1px solid ${statusBadge.bg}22`,
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                gap: '1.25rem',
                position: 'relative'
            }}>
                {/* Accent bar */}
                <div style={{
                    position: 'absolute',
                    left: 0,
                    top: 0,
                    bottom: 0,
                    width: '4px',
                    background: `linear-gradient(180deg, ${statusBadge.bg}, ${statusBadge.accent})`
                }} />

                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flex: 1, paddingLeft: '0.5rem' }}>
                    {/* Status Icon */}
                    <div style={{
                        width: '48px',
                        height: '48px',
                        borderRadius: '12px',
                        background: statusBadge.bg,
                        color: statusBadge.text,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '1.5rem',
                        fontWeight: '700',
                        boxShadow: `0 4px 16px ${statusBadge.bg}44`,
                        flexShrink: 0
                    }}>
                        {statusBadge.icon}
                    </div>

                    {/* Timeline Icon */}
                    {study.hasTimeline && (
                        <div style={{
                            width: '48px',
                            height: '48px',
                            borderRadius: '12px',
                            background: 'linear-gradient(135deg, #ec4899, #be185d)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            boxShadow: '0 4px 16px rgba(236, 72, 153, 0.3)',
                            flexShrink: 0
                        }} title="Has Timeline">
                            <Clock size={22} color="white" />
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
                            letterSpacing: '0.5px',
                            textTransform: 'uppercase',
                            marginBottom: '0.5rem',
                            fontFamily: 'ui-monospace, monospace',
                            padding: '0.375rem 0.875rem',
                            borderRadius: '6px',
                            boxShadow: `0 2px 8px ${statusBadge.bg}33`
                        }}>
                            {study.studyCode}
                        </div>
                        <div style={{
                            fontSize: '1.125rem',
                            fontWeight: '700',
                            color: '#0f172a',
                            marginBottom: '0.625rem',
                            lineHeight: '1.4'
                        }}>
                            {study.studyName}
                        </div>

                        {/* Meta Info Row */}
                        <div style={{ display: 'flex', gap: '1.25rem', fontSize: '0.8125rem', color: '#64748b', flexWrap: 'wrap', alignItems: 'center' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: '600' }}>
                                <Users size={15} style={{ color: '#94a3b8' }} />
                                <span><strong style={{ color: '#475569' }}>{assignments.length}</strong> Volunteers</span>
                            </div>
                            <div style={{
                                padding: '0.25rem 0.75rem',
                                background: statusBadge.bg,
                                color: statusBadge.text,
                                borderRadius: '6px',
                                fontSize: '0.75rem',
                                fontWeight: '700'
                            }}>
                                {statusBadge.label}
                            </div>
                        </div>

                        {/* Timeline Dates */}
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
                                color: '#64748b'
                            }}>
                                <Calendar size={14} style={{ color: '#94a3b8' }} />
                                {study.startDate && (
                                    <span style={{ color: '#10b981' }}>
                                        {new Date(study.startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                    </span>
                                )}
                                {study.startDate && study.endDate && (
                                    <ChevronRight size={12} style={{ color: '#cbd5e1' }} />
                                )}
                                {study.endDate && (
                                    <span style={{ color: '#f59e0b' }}>
                                        {new Date(study.endDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
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
                    className="export-btn"
                    style={{
                        background: '#10b981',
                        color: 'white',
                        border: 'none',
                        padding: '0.75rem 1.25rem',
                        borderRadius: '10px',
                        fontSize: '0.8125rem',
                        fontWeight: '600',
                        cursor: exportingStudy ? 'not-allowed' : 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        boxShadow: '0 2px 8px rgba(16, 185, 129, 0.3)',
                        transition: 'all 0.2s',
                        opacity: exportingStudy ? 0.6 : 1,
                        flexShrink: 0
                    }}
                >
                    <FileDown size={17} />
                    {exportingStudy ? 'Exporting...' : 'Export'}
                </button>
            </div>

            {/* Volunteers List */}
            {assignments.length === 0 ? (
                <div style={{
                    textAlign: 'center',
                    padding: '4rem 1.5rem',
                    color: '#94a3b8'
                }}>
                    <div style={{
                        width: '64px',
                        height: '64px',
                        margin: '0 auto 1rem',
                        borderRadius: '16px',
                        background: '#f8fafc',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                    }}>
                        <Users size={32} style={{ color: '#cbd5e1' }} />
                    </div>
                    <p style={{ fontWeight: '600', fontSize: '0.9375rem', color: '#64748b', margin: 0 }}>
                        No volunteers assigned
                    </p>
                </div>
            ) : (
                <>
                    <div style={{
                        padding: '1rem 1.5rem',
                        background: '#fafbfc',
                        borderBottom: '1px solid #f1f5f9',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center'
                    }}>
                        <div style={{
                            fontSize: '0.8125rem',
                            fontWeight: '700',
                            color: '#475569',
                            textTransform: 'uppercase',
                            letterSpacing: '0.5px'
                        }}>
                            Assigned Volunteers
                        </div>
                        <div style={{
                            padding: '0.25rem 0.75rem',
                            background: '#e5e7eb',
                            color: '#475569',
                            borderRadius: '12px',
                            fontSize: '0.75rem',
                            fontWeight: '700'
                        }}>
                            {assignments.length}
                        </div>
                    </div>
                    <div style={{
                        maxHeight: '400px',
                        overflowY: 'auto',
                        padding: '1.25rem',
                        background: '#fcfcfd'
                    }}>
                        <div style={{ display: 'grid', gap: '0.75rem' }}>
                            {assignments.map(vol => (
                                <VolunteerCard
                                    key={vol._id}
                                    vol={vol}
                                    onDelete={handleVolunteerDelete}
                                />
                            ))}
                        </div>
                    </div>
                </>
            )}

            <style>{`
                .study-card:hover {
                    box-shadow: 0 8px 24px rgba(0,0,0,0.12);
                    transform: translateY(-2px);
                }
                .export-btn:hover:not(:disabled) {
                    background: #059669;
                    box-shadow: 0 4px 16px rgba(16, 185, 129, 0.4);
                    transform: translateY(-1px);
                }
            `}</style>
        </div>
    );
};

// --- Main Component ---

const AssignedStudies = () => {
    const navigate = useNavigate();
    const { token } = useAuth();
    const [assignments, setAssignments] = useState([]);
    const [groupedStudies, setGroupedStudies] = useState({});
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');

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
                    startDate: curr.start_date || curr.visit_date,
                    endDate: curr.end_date,
                    visitDates: [],
                    assignments: []
                };
            }
            if (curr.visit_date) {
                groups[code].visitDates.push(new Date(curr.visit_date));
            }
            groups[code].assignments.push(curr);
        });

        Object.values(groups).forEach(group => {
            if (group.visitDates.length > 0) {
                const sorted = group.visitDates.sort((a, b) => a - b);
                if (!group.startDate) group.startDate = sorted[0].toISOString().split('T')[0];
                if (!group.endDate) group.endDate = sorted[sorted.length - 1].toISOString().split('T')[0];
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
            console.error('Failed to fetch:', err);
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
        <div style={{
            minHeight: '100vh',
            background: 'linear-gradient(180deg, #fafbfc 0%, #ffffff 100%)',
            padding: '2rem 3rem'
        }}>
            {/* Header */}
            <div style={{ marginBottom: '2rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem', gap: '1.5rem' }}>
                    <div>
                        <h1 style={{
                            fontSize: '2.25rem',
                            fontWeight: '800',
                            color: '#0f172a',
                            marginBottom: '0.5rem',
                            letterSpacing: '-0.025em',
                            background: 'linear-gradient(135deg, #0f172a 0%, #475569 100%)',
                            WebkitBackgroundClip: 'text',
                            WebkitTextFillColor: 'transparent'
                        }}>
                            Assigned Studies
                        </h1>
                        <p style={{ color: '#64748b', fontSize: '0.9375rem', fontWeight: '500', margin: 0 }}>
                            Track and manage volunteer assignments
                        </p>
                    </div>

                    {/* Search */}
                    <div style={{ position: 'relative', width: '100%', maxWidth: '400px' }}>
                        <Search size={18} style={{
                            position: 'absolute',
                            left: '1rem',
                            top: '50%',
                            transform: 'translateY(-50%)',
                            color: '#94a3b8'
                        }} />
                        <input
                            type="text"
                            placeholder="Search studies..."
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            style={{
                                width: '100%',
                                padding: '0.875rem 1rem 0.875rem 3rem',
                                borderRadius: '12px',
                                border: '1px solid #e2e8f0',
                                fontSize: '0.875rem',
                                fontWeight: '500',
                                boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                                transition: 'all 0.2s',
                                outline: 'none',
                                background: 'white'
                            }}
                        />
                    </div>
                </div>

                {/* Filter Tabs */}
                <div style={{ display: 'flex', gap: '0.625rem', flexWrap: 'wrap' }}>
                    {[
                        { key: 'all', label: 'All Studies', color: '#64748b' },
                        { key: 'ongoing', label: 'Ongoing', color: '#10b981' },
                        { key: 'upcoming', label: 'Upcoming', color: '#3b82f6' },
                        { key: 'completed', label: 'Completed', color: '#f59e0b' }
                    ].map(filter => (
                        <button
                            key={filter.key}
                            onClick={() => setStatusFilter(filter.key)}
                            className="filter-tab"
                            style={{
                                padding: '0.625rem 1.125rem',
                                borderRadius: '10px',
                                border: statusFilter === filter.key ? 'none' : '1px solid #e5e7eb',
                                background: statusFilter === filter.key ? filter.color : 'white',
                                color: statusFilter === filter.key ? 'white' : '#64748b',
                                fontSize: '0.8125rem',
                                fontWeight: '600',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.5rem',
                                transition: 'all 0.2s',
                                boxShadow: statusFilter === filter.key ? `0 2px 8px ${filter.color}33` : '0 1px 2px rgba(0,0,0,0.04)'
                            }}
                        >
                            {filter.label}
                            <span style={{
                                padding: '0.125rem 0.5rem',
                                background: statusFilter === filter.key ? 'rgba(255,255,255,0.25)' : '#f3f4f6',
                                borderRadius: '10px',
                                fontSize: '0.75rem',
                                fontWeight: '700',
                                minWidth: '1.5rem',
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
                <div style={{ textAlign: 'center', padding: '5rem' }}>
                    <div style={{
                        width: '56px',
                        height: '56px',
                        border: '4px solid #f1f5f9',
                        borderTop: '4px solid #6366f1',
                        borderRadius: '50%',
                        animation: 'spin 0.8s linear infinite',
                        margin: '0 auto'
                    }}></div>
                    <p style={{ marginTop: '1.5rem', color: '#64748b', fontSize: '0.9375rem', fontWeight: '600' }}>
                        Loading studies...
                    </p>
                </div>
            ) : filteredStudies.length === 0 ? (
                <div style={{
                    textAlign: 'center',
                    padding: '5rem 2rem',
                    background: 'white',
                    borderRadius: '16px',
                    border: '2px dashed #e5e7eb'
                }}>
                    <div style={{
                        width: '80px',
                        height: '80px',
                        margin: '0 auto 1.5rem',
                        borderRadius: '20px',
                        background: '#f8fafc',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                    }}>
                        <Activity size={40} style={{ color: '#cbd5e1' }} />
                    </div>
                    <p style={{ color: '#475569', fontWeight: '700', fontSize: '1.125rem', marginBottom: '0.5rem' }}>
                        {search ? `No studies match "${search}"` :
                            statusFilter !== 'all' ? `No ${statusFilter} studies` :
                                'No study assignments found'}
                    </p>
                    {(search || statusFilter !== 'all') && (
                        <button
                            onClick={() => { setSearch(''); setStatusFilter('all'); }}
                            style={{
                                marginTop: '1.25rem',
                                padding: '0.75rem 1.5rem',
                                background: 'white',
                                border: '1px solid #d1d5db',
                                borderRadius: '10px',
                                color: '#64748b',
                                cursor: 'pointer',
                                fontWeight: '600',
                                fontSize: '0.875rem',
                                transition: 'all 0.2s'
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
                
                input:focus {
                    border-color: #6366f1 !important;
                    box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1) !important;
                }
                
                .filter-tab:hover {
                    transform: translateY(-1px);
                }
                
                /* Scrollbar */
                div[style*="overflowY: auto"]::-webkit-scrollbar {
                    width: 8px;
                }
                
                div[style*="overflowY: auto"]::-webkit-scrollbar-track {
                    background: #f8fafc;
                    border-radius: 10px;
                }
                
                div[style*="overflowY: auto"]::-webkit-scrollbar-thumb {
                    background: #cbd5e1;
                    border-radius: 10px;
                }
                
                div[style*="overflowY: auto"]::-webkit-scrollbar-thumb:hover {
                    background: #94a3b8;
                }
            `}</style>
        </div>
    );
};

export default AssignedStudies;
