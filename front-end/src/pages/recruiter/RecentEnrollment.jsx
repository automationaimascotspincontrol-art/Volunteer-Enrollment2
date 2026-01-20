import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../../api/api';
import { Users, CheckCircle, Clock, Calendar, X, ArrowRight, Phone, MapPin, User, Cake, Briefcase, AlertCircle, Search, FileText, UserCheck } from 'lucide-react';
import WashoutWarningModal from '../../components/WashoutWarningModal';

const RecentEnrollment = () => {
    const [data, setData] = useState({ screening: [], prescreening: [], approved: [] });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [selectedVolunteer, setSelectedVolunteer] = useState(null);
    const [screeningSearch, setScreeningSearch] = useState('');
    const [prescreeningSearch, setPrescreeningSearch] = useState('');
    const [approvedSearch, setApprovedSearch] = useState('');
    const navigate = useNavigate();

    useEffect(() => {
        fetchRecentEnrollments();
    }, []);

    const fetchRecentEnrollments = async () => {
        try {
            const response = await api.get('/enrollment/recent');
            setData(response.data);
        } catch (err) {
            setError(err.response?.data?.detail || 'Failed to load recent enrollments');
        } finally {
            setLoading(false);
        }
    };

    const formatDate = (dateString) => {
        if (!dateString) return 'N/A';
        const date = new Date(dateString);
        return date.toLocaleDateString('en-IN', {
            day: '2-digit',
            month: 'short',
            year: 'numeric'
        });
    };

    const VolunteerCard = ({ volunteer, status }) => {
        const getStatusConfig = () => {
            switch (status) {
                case 'prescreening':
                    return {
                        color: '#6366f1',
                        bg: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                        label: '📋 Pre-screening',
                        bgLight: 'rgba(99, 102, 241, 0.08)'
                    };
                case 'screening':
                    return {
                        color: '#f59e0b',
                        bg: 'linear-gradient(135deg, #f59e0b, #d97706)',
                        label: '⏱ Screening',
                        bgLight: 'rgba(245, 158, 11, 0.08)'
                    };
                case 'approved':
                    return {
                        color: '#10b981',
                        bg: 'linear-gradient(135deg, #10b981, #059669)',
                        label: '✓ Approved',
                        bgLight: 'rgba(16, 185, 129, 0.08)'
                    };
                default:
                    return {
                        color: '#94a3b8',
                        bg: '#94a3b8',
                        label: status,
                        bgLight: 'rgba(148, 163, 184, 0.08)'
                    };
            }
        };

        const statusConfig = getStatusConfig();

        return (
            <div style={{
                padding: '1.25rem',
                marginBottom: '0.75rem',
                borderRadius: '16px',
                background: 'white',
                border: `2px solid ${statusConfig.bgLight}`,
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                cursor: 'pointer',
                position: 'relative',
                overflow: 'hidden',
                boxShadow: '0 2px 8px rgba(0,0,0,0.04)'
            }}
                onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateY(-2px)';
                    e.currentTarget.style.boxShadow = '0 8px 20px rgba(0,0,0,0.1)';
                    e.currentTarget.style.borderColor = statusConfig.color;
                }}
                onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.04)';
                    e.currentTarget.style.borderColor = statusConfig.bgLight;
                }}
            >
                {/* Gradient Accent Bar */}
                <div style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    height: '3px',
                    background: statusConfig.bg
                }} />

                {/* Status Badge */}
                <div style={{
                    position: 'absolute',
                    top: '1rem',
                    right: '1rem',
                    padding: '0.35rem 0.75rem',
                    borderRadius: '50px',
                    fontSize: '0.65rem',
                    fontWeight: '800',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                    background: statusConfig.bg,
                    color: 'white',
                    boxShadow: `0 2px 8px ${statusConfig.color}40`
                }}>
                    {statusConfig.label}
                </div>

                <div style={{ paddingRight: '6rem' }}>
                    {/* Name */}
                    <h3 style={{
                        fontSize: '1.15rem',
                        fontWeight: '800',
                        marginBottom: '0.75rem',
                        color: '#0f172a',
                        letterSpacing: '-0.02em',
                        lineHeight: '1.2'
                    }}>
                        {volunteer.basic_info?.name || 'N/A'}
                    </h3>

                    {/* ID Section - Compact */}
                    <div style={{
                        display: 'flex',
                        gap: '0.5rem',
                        marginBottom: '0.75rem',
                        flexWrap: 'wrap'
                    }}>
                        {/* Subject Code Badge - Compact */}
                        {volunteer.subject_code && (
                            <div style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '0.35rem',
                                padding: '0.4rem 0.65rem',
                                background: 'linear-gradient(135deg, #ec4899 0%, #8b5cf6 100%)',
                                borderRadius: '8px',
                                boxShadow: '0 2px 8px rgba(236, 72, 153, 0.2)'
                            }}>
                                <FileText size={13} color="white" strokeWidth={2.5} />
                                <div>
                                    <div style={{ fontSize: '0.55rem', color: 'rgba(255,255,255,0.75)', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.3px' }}>
                                        Subject
                                    </div>
                                    <div style={{ fontSize: '0.8rem', color: 'white', fontWeight: '800', fontFamily: 'monospace', letterSpacing: '0.3px' }}>
                                        {volunteer.subject_code}
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Volunteer ID Badge - Compact */}
                        <div style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.35rem',
                            padding: '0.4rem 0.65rem',
                            background: statusConfig.bgLight,
                            borderRadius: '8px',
                            border: `1.5px solid ${statusConfig.color}30`
                        }}>
                            <User size={13} color={statusConfig.color} strokeWidth={2.5} />
                            <div>
                                <div style={{ fontSize: '0.55rem', color: '#64748b', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.3px' }}>
                                    Vol ID
                                </div>
                                <div style={{ fontSize: '0.8rem', color: statusConfig.color, fontWeight: '800', fontFamily: 'monospace', letterSpacing: '0.3px' }}>
                                    {volunteer.volunteer_id}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Details Grid - Compact */}
                    <div style={{
                        display: 'flex',
                        gap: '1rem',
                        marginBottom: '0.75rem',
                        flexWrap: 'wrap'
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                            <Phone size={14} style={{ color: '#10b981' }} />
                            <span style={{ fontSize: '0.8rem', color: '#334155', fontWeight: '600' }}>
                                {volunteer.contact || volunteer.basic_info?.contact}
                            </span>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                            <Users size={14} style={{ color: '#6366f1' }} />
                            <span style={{ fontSize: '0.8rem', color: '#334155', fontWeight: '600', textTransform: 'capitalize' }}>
                                {volunteer.basic_info?.gender?.replace('_', ' ')}
                            </span>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                            <Calendar size={14} style={{ color: '#94a3b8' }} />
                            <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: '500' }}>
                                {formatDate(volunteer.audit?.created_at)}
                            </span>
                        </div>
                    </div>
                </div>

                {/* View Details Button - Compact */}
                <button
                    onClick={() => setSelectedVolunteer(volunteer)}
                    style={{
                        position: 'absolute',
                        bottom: '1rem',
                        right: '1rem',
                        padding: '0.55rem 1rem',
                        background: statusConfig.bg,
                        color: 'white',
                        border: 'none',
                        borderRadius: '10px',
                        fontSize: '0.8rem',
                        fontWeight: '700',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease',
                        boxShadow: `0 2px 8px ${statusConfig.color}30`,
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.4rem',
                        letterSpacing: '0.3px'
                    }}
                    onMouseEnter={(e) => {
                        e.currentTarget.style.transform = 'scale(1.05)';
                        e.currentTarget.style.boxShadow = `0 4px 12px ${statusConfig.color}50`;
                    }}
                    onMouseLeave={(e) => {
                        e.currentTarget.style.transform = 'scale(1)';
                        e.currentTarget.style.boxShadow = `0 2px 8px ${statusConfig.color}30`;
                    }}
                >
                    View
                    <ArrowRight size={15} strokeWidth={2.5} />
                </button>
            </div>
        );
    };

    const DetailModal = ({ volunteer, onClose }) => {
        if (!volunteer) return null;

        const isScreening = volunteer.current_status === 'screening';
        const isPrescreening = volunteer.current_status === 'prescreening';
        const [showStudySelection, setShowStudySelection] = useState(false);
        const [studies, setStudies] = useState([]);
        const [loadingStudies, setLoadingStudies] = useState(false);
        const [selectedStudy, setSelectedStudy] = useState(null);
        const [assigning, setAssigning] = useState(false);
        const [errorMessage, setErrorMessage] = useState('');
        const [showWashoutWarning, setShowWashoutWarning] = useState(false);
        const [activeStudies, setActiveStudies] = useState([]);
        const [checkingWashout, setCheckingWashout] = useState(false);

        const fetchOngoingStudies = async () => {
            setLoadingStudies(true);
            try {
                const response = await api.get('/clinical/ongoing-studies');
                setStudies(response.data.studies || []);
            } catch (err) {
                console.error('Failed to fetch studies:', err);
            } finally {
                setLoadingStudies(false);
            }
        };

        const checkActiveStudies = async () => {
            setCheckingWashout(true);
            try {
                const response = await api.get(`/prm/assignments/volunteers/${volunteer.volunteer_id}/active-studies`);
                if (response.data.active_studies && response.data.active_studies.length > 0) {
                    setActiveStudies(response.data.active_studies);
                    setShowWashoutWarning(true);
                    return true; // Has active studies
                }
                return false; // No active studies
            } catch (err) {
                console.error('Failed to check active studies:', err);
                return false; // Proceed anyway if check fails
            } finally {
                setCheckingWashout(false);
            }
        };

        const handleAssignToStudy = async () => {
            if (!selectedStudy) return;

            // First check if volunteer has active studies
            const hasActiveStudies = await checkActiveStudies();

            // If has active studies, warning modal will show - wait for user decision
            if (hasActiveStudies) {
                return; // Modal is now showing, user will click proceed or cancel
            }

            // No active studies, proceed directly
            await proceedWithAssignment();
        };

        const proceedWithAssignment = async () => {
            setAssigning(true);
            setErrorMessage('');
            try {
                await api.post('/clinical/assign-to-study', {
                    volunteer_id: volunteer.volunteer_id,
                    study_id: selectedStudy._id || selectedStudy.id,
                    study_name: selectedStudy.studyName || selectedStudy.study_name
                });

                // Dismiss modal and navigate immediately
                setShowStudySelection(false);
                setShowWashoutWarning(false);
                onClose();
                navigate('/prm/assigned-studies');
            } catch (err) {
                setErrorMessage(err.response?.data?.detail || 'Failed to assign volunteer to study');
            } finally {
                setAssigning(false);
            }
        };

        return (
            <div style={{
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                background: 'rgba(0, 0, 0, 0.7)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 1000,
                padding: '1rem'
            }} onClick={onClose}>
                <div className="glass-card" style={{
                    maxWidth: '600px',
                    width: '100%',
                    maxHeight: '90vh',
                    overflowY: 'auto',
                    padding: '2rem',
                    position: 'relative'
                }} onClick={(e) => e.stopPropagation()}>
                    {/* Close Button */}
                    <button
                        onClick={onClose}
                        style={{
                            position: 'absolute',
                            top: '1rem',
                            right: '1rem',
                            background: 'rgba(255, 255, 255, 0.1)',
                            border: 'none',
                            borderRadius: '8px',
                            padding: '0.5rem',
                            cursor: 'pointer',
                            color: 'var(--text-muted)'
                        }}
                    >
                        <X size={20} />
                    </button>

                    {/* Header */}
                    <div style={{ marginBottom: '2rem' }}>
                        <h2 style={{ fontSize: '1.8rem', fontWeight: '800', marginBottom: '0.5rem' }}>
                            {volunteer.basic_info?.name}
                        </h2>
                        <div style={{
                            display: 'inline-block',
                            padding: '0.4rem 0.8rem',
                            borderRadius: '8px',
                            fontSize: '0.8rem',
                            fontWeight: '600',
                            background: isScreening ? 'rgba(99, 102, 241, 0.2)' : isPrescreening ? 'rgba(255, 171, 0, 0.2)' : 'rgba(34, 197, 94, 0.2)',
                            color: isScreening ? 'var(--primary)' : isPrescreening ? 'var(--accent)' : 'var(--success)'
                        }}>
                            {isPrescreening ? 'Screening' : isPrescreening ? 'Pre-screening' : 'Approved'}
                        </div>
                    </div>

                    {/* Details Grid */}
                    <div style={{ display: 'grid', gap: '1.5rem', marginBottom: '2rem' }}>
                        <div style={{ display: 'flex', gap: '1rem', alignItems: 'start' }}>
                            <div style={{
                                padding: '0.6rem',
                                background: 'var(--primary)',
                                borderRadius: '8px',
                                flexShrink: 0
                            }}>
                                <User size={20} color="white" />
                            </div>
                            <div style={{ flex: 1 }}>
                                {/* Subject Code */}
                                {volunteer.subject_code && (
                                    <>
                                        <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.3rem' }}>Subject Code</p>
                                        <p style={{
                                            fontSize: '1.1rem',
                                            fontWeight: '800',
                                            fontFamily: 'monospace',
                                            color: '#ec4899',
                                            marginBottom: '0.8rem',
                                            letterSpacing: '0.5px'
                                        }}>
                                            {volunteer.subject_code}
                                        </p>
                                    </>
                                )}
                                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.3rem' }}>Volunteer ID</p>
                                <p style={{ fontSize: '1rem', fontWeight: '600' }}>{volunteer.volunteer_id}</p>
                                {volunteer.legacy_id && (
                                    <p style={{
                                        fontSize: '0.85rem',
                                        color: '#f59e0b',
                                        marginTop: '0.4rem',
                                        fontWeight: '600',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '0.4rem'
                                    }}>
                                        <span style={{
                                            padding: '0.2rem 0.5rem',
                                            background: 'rgba(245, 158, 11, 0.1)',
                                            borderRadius: '6px',
                                            fontSize: '0.75rem',
                                            textTransform: 'uppercase',
                                            letterSpacing: '0.5px'
                                        }}>Legacy</span>
                                        {volunteer.legacy_id}
                                    </p>
                                )}
                            </div>
                        </div>

                        <div style={{ display: 'flex', gap: '1rem', alignItems: 'start' }}>
                            <div style={{
                                padding: '0.6rem',
                                background: 'var(--secondary)',
                                borderRadius: '8px',
                                flexShrink: 0
                            }}>
                                <Phone size={20} color="white" />
                            </div>
                            <div>
                                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.3rem' }}>Contact Number</p>
                                <p style={{ fontSize: '1rem', fontWeight: '600' }}>{volunteer.contact || volunteer.basic_info?.contact}</p>
                            </div>
                        </div>

                        <div style={{ display: 'flex', gap: '1rem', alignItems: 'start' }}>
                            <div style={{
                                padding: '0.6rem',
                                background: 'var(--accent)',
                                borderRadius: '8px',
                                flexShrink: 0
                            }}>
                                <Cake size={20} color="white" />
                            </div>
                            <div>
                                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.3rem' }}>Date of Birth</p>
                                <p style={{ fontSize: '1rem', fontWeight: '600' }}>{formatDate(volunteer.basic_info?.dob)}</p>
                            </div>
                        </div>

                        <div style={{ display: 'flex', gap: '1rem', alignItems: 'start' }}>
                            <div style={{
                                padding: '0.6rem',
                                background: 'var(--success)',
                                borderRadius: '8px',
                                flexShrink: 0
                            }}>
                                <User size={20} color="white" />
                            </div>
                            <div>
                                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.3rem' }}>Gender</p>
                                <p style={{ fontSize: '1rem', fontWeight: '600', textTransform: 'capitalize' }}>
                                    {volunteer.basic_info?.gender?.replace('_', ' ')}
                                </p>
                            </div>
                        </div>

                        {volunteer.basic_info?.location && (
                            <div style={{ display: 'flex', gap: '1rem', alignItems: 'start' }}>
                                <div style={{
                                    padding: '0.6rem',
                                    background: 'var(--primary)',
                                    borderRadius: '8px',
                                    flexShrink: 0
                                }}>
                                    <MapPin size={20} color="white" />
                                </div>
                                <div>
                                    <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.3rem' }}>Location</p>
                                    <p style={{ fontSize: '1rem', fontWeight: '600' }}>{volunteer.basic_info.location}</p>
                                </div>
                            </div>
                        )}

                        {volunteer.basic_info?.address && (
                            <div style={{ display: 'flex', gap: '1rem', alignItems: 'start' }}>
                                <div style={{
                                    padding: '0.6rem',
                                    background: 'var(--secondary)',
                                    borderRadius: '8px',
                                    flexShrink: 0
                                }}>
                                    <MapPin size={20} color="white" />
                                </div>
                                <div>
                                    <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.3rem' }}>Address</p>
                                    <p style={{ fontSize: '1rem', fontWeight: '600' }}>{volunteer.basic_info.address}</p>
                                </div>
                            </div>
                        )}

                        {volunteer.basic_info?.occupation && (
                            <div style={{ display: 'flex', gap: '1rem', alignItems: 'start' }}>
                                <div style={{
                                    padding: '0.6rem',
                                    background: 'var(--accent)',
                                    borderRadius: '8px',
                                    flexShrink: 0
                                }}>
                                    <Briefcase size={20} color="white" />
                                </div>
                                <div>
                                    <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.3rem' }}>Occupation</p>
                                    <p style={{ fontSize: '1rem', fontWeight: '600' }}>{volunteer.basic_info.occupation}</p>
                                </div>
                            </div>
                        )}

                        <div style={{ display: 'flex', gap: '1rem', alignItems: 'start' }}>
                            <div style={{
                                padding: '0.6rem',
                                background: 'var(--success)',
                                borderRadius: '8px',
                                flexShrink: 0
                            }}>
                                <Calendar size={20} color="white" />
                            </div>
                            <div>
                                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.3rem' }}>Enrolled On</p>
                                <p style={{ fontSize: '1rem', fontWeight: '600' }}>{formatDate(volunteer.audit?.created_at)}</p>
                            </div>
                        </div>
                    </div>

                    {/* Action Buttons */}
                    {isPrescreening ? (
                        <button
                            onClick={() => navigate(`/registration/${volunteer.volunteer_id}`)}
                            style={{
                                width: '100%',
                                padding: '1rem',
                                background: 'linear-gradient(90deg, var(--primary), var(--secondary))',
                                color: 'white',
                                border: 'none',
                                borderRadius: '12px',
                                fontSize: '1rem',
                                fontWeight: '700',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '0.5rem',
                                boxShadow: '0 4px 15px rgba(99, 102, 241, 0.3)',
                                transition: 'all 0.2s'
                            }}
                        >
                            Proceed to Registration
                            <ArrowRight size={20} />
                        </button>
                    ) : isScreening ? (
                        <div style={{ display: 'flex', gap: '0.75rem' }}>
                            <button
                                onClick={async () => {
                                    try {
                                        await api.post(`/enrollment/approve/${volunteer.volunteer_id}`);
                                        onClose();
                                        window.location.reload();
                                    } catch (err) {
                                        alert(err.response?.data?.detail || 'Failed to approve volunteer');
                                    }
                                }}
                                style={{
                                    flex: 1,
                                    padding: '1rem',
                                    background: 'linear-gradient(90deg, #10b981, #059669)',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '12px',
                                    fontSize: '1rem',
                                    fontWeight: '700',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '0.5rem',
                                    boxShadow: '0 4px 15px rgba(16, 185, 129, 0.3)',
                                    transition: 'all 0.2s'
                                }}
                            >
                                Approve
                                <UserCheck size={20} />
                            </button>
                            <button
                                onClick={async () => {
                                    if (!confirm('Are you sure you want to reject this volunteer?')) return;
                                    try {
                                        await api.post(`/enrollment/reject/${volunteer.volunteer_id}`);
                                        onClose();
                                        window.location.reload();
                                    } catch (err) {
                                        alert(err.response?.data?.detail || 'Failed to reject volunteer');
                                    }
                                }}
                                style={{
                                    flex: 1,
                                    padding: '1rem',
                                    background: 'linear-gradient(90deg, #ef4444, #dc2626)',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '12px',
                                    fontSize: '1rem',
                                    fontWeight: '700',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '0.5rem',
                                    boxShadow: '0 4px 15px rgba(239, 68, 68, 0.3)',
                                    transition: 'all 0.2s'
                                }}
                            >
                                Reject
                                <X size={20} />
                            </button>
                        </div>
                    ) : (
                        <>
                            {!showStudySelection ? (
                                <div style={{ display: 'flex', gap: '0.75rem' }}>
                                    <button
                                        onClick={() => {
                                            setShowStudySelection(true);
                                            fetchOngoingStudies();
                                        }}
                                        style={{
                                            flex: 1,
                                        padding: '1rem',
                                        background: 'linear-gradient(90deg, var(--primary), var(--secondary))',
                                        color: 'white',
                                        border: 'none',
                                        borderRadius: '12px',
                                        fontSize: '1rem',
                                        fontWeight: '700',
                                        cursor: 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        gap: '0.5rem',
                                        boxShadow: '0 4px 15px rgba(99, 102, 241, 0.3)',
                                        transition: 'all 0.2s'
                                    }}
                                >
                                    Assign to Study
                                    <ArrowRight size={20} />
                                </button>
                            ) : (
                                <div style={{ marginTop: '1rem' }}>
                                    <h3 style={{ fontSize: '1.2rem', fontWeight: '700', marginBottom: '1rem' }}>
                                        Select Ongoing Study
                                    </h3>

                                    {loadingStudies ? (
                                        <div style={{ textAlign: 'center', padding: '2rem' }}>
                                            <div className="spinner" />
                                        </div>
                                    ) : studies.length === 0 ? (
                                        <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '2rem' }}>
                                            No ongoing studies available
                                        </p>
                                    ) : (
                                        <div style={{ display: 'grid', gap: '0.75rem', marginBottom: '1rem' }}>
                                            {studies.map((study) => (
                                                <div
                                                    key={study.studyID || study.study_id || study.studyInstanceCode}
                                                    onClick={() => setSelectedStudy(study)}
                                                    style={{
                                                        padding: '1rem',
                                                        border: `2px solid ${selectedStudy?.studyID === study.studyID ? 'var(--primary)' : 'var(--border-color)'}`,
                                                        borderRadius: '8px',
                                                        cursor: 'pointer',
                                                        background: selectedStudy?.studyID === study.studyID ? 'rgba(99, 102, 241, 0.1)' : 'transparent',
                                                        transition: 'all 0.2s'
                                                    }}
                                                >
                                                    <p style={{ fontWeight: '700', fontSize: '1.1rem', marginBottom: '0.5rem' }}>
                                                        {study.enteredStudyCode || study.studyInstanceCode || study.studyID || study.study_id || study.studyName}
                                                    </p>
                                                    <p style={{ fontWeight: '700', fontSize: '0.95rem', color: '#3b82f6', marginBottom: '0.3rem' }}>
                                                        {study.studyName || study.study_name}
                                                    </p>
                                                    <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
                                                        {study.startDate && (
                                                            <p style={{ fontSize: '0.85rem', color: '#ef4444', fontWeight: '600', margin: 0 }}>
                                                                {study.startDate}
                                                                {study.drtWashoutDate && ` to ${study.drtWashoutDate}`}
                                                            </p>
                                                        )}
                                                        {study.volunteersPlanned && (
                                                            <p style={{ fontSize: '0.85rem', color: '#10b981', fontWeight: '600', margin: 0 }}>
                                                                👥 {study.volunteersPlanned} volunteers needed
                                                            </p>
                                                        )}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}

                                    {errorMessage && (
                                        <div style={{
                                            padding: '1rem',
                                            marginBottom: '1rem',
                                            backgroundColor: 'rgba(239, 68, 68, 0.15)',
                                            border: '1px solid #ef4444',
                                            borderRadius: '12px',
                                            color: '#ef4444',
                                            fontSize: '0.95rem',
                                            fontWeight: '500',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '0.75rem',
                                            animation: 'fadeIn 0.3s ease-in'
                                        }}>
                                            <AlertCircle size={20} style={{ flexShrink: 0 }} />
                                            <span>{errorMessage}</span>
                                        </div>
                                    )}

                                    <div style={{ display: 'flex', gap: '0.75rem' }}>
                                        <button
                                            onClick={() => setShowStudySelection(false)}
                                            style={{
                                                flex: 1,
                                                padding: '0.75rem',
                                                background: 'transparent',
                                                color: 'var(--text-muted)',
                                                border: '1px solid var(--border-color)',
                                                borderRadius: '8px',
                                                cursor: 'pointer',
                                                fontWeight: '600'
                                            }}
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            onClick={handleAssignToStudy}
                                            disabled={!selectedStudy || assigning}
                                            style={{
                                                flex: 1,
                                                padding: '0.75rem',
                                                background: selectedStudy && !assigning ? 'var(--primary)' : 'var(--border-color)',
                                                color: 'white',
                                                border: 'none',
                                                borderRadius: '8px',
                                                cursor: selectedStudy && !assigning ? 'pointer' : 'not-allowed',
                                                fontWeight: '700'
                                            }}
                                        >
                                            {assigning ? 'Assigning...' : 'Confirm Assignment'}
                                        </button>
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>
        );
    };

    if (loading) {
        return (
            <div className="container" style={{ textAlign: 'center', padding: '4rem' }}>
                <div className="spinner" />
                <p style={{ marginTop: '1rem', color: 'var(--text-muted)' }}>Loading recent enrollments...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="container" style={{ padding: '2rem' }}>
                <div style={{ backgroundColor: 'rgba(244, 63, 94, 0.1)', color: 'var(--error)', padding: '1rem', borderRadius: '12px' }}>
                    {error}
                </div>
            </div>
        );
    }

    return (
        <>
            <div className="container animate-fade-in" style={{ paddingBottom: '4rem', padding: '0 3rem 4rem 3rem', maxWidth: '100%' }}>
                <div style={{ marginBottom: '2.5rem' }}>
                    <h1 style={{
                        fontSize: 'clamp(2rem, 5vw, 3rem)',
                        fontWeight: '850',
                        marginBottom: '0.5rem',
                        background: 'linear-gradient(90deg, #6366f1, #ec4899)',
                        WebkitBackgroundClip: 'text',
                        backgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                        letterSpacing: '-1px'
                    }}>
                        Recent Enrollment
                    </h1>
                    <p style={{ color: 'var(--text-muted)', fontSize: '1rem' }}>
                        Latest volunteer registrations and approvals
                    </p>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 500px), 1fr))', gap: '2rem' }}>
                    {/* Screening Card */}
                    <div>
                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.8rem',
                            marginBottom: '1.5rem',
                            padding: '1.25rem',
                            background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.15) 0%, rgba(139, 92, 246, 0.1) 100%)',
                            borderRadius: '16px',
                            border: '2px solid rgba(99, 102, 241, 0.2)',
                            boxShadow: '0 4px 15px rgba(99, 102, 241, 0.1)'
                        }}>
                            <div style={{
                                padding: '0.75rem',
                                background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                                borderRadius: '12px',
                                boxShadow: '0 4px 12px rgba(99, 102, 241, 0.3)'
                            }}>
                                <FileText color="white" size={28} />
                            </div>
                            <div style={{ flex: 1 }}>
                                <h2 style={{ fontSize: '1.4rem', fontWeight: '800', marginBottom: '0.3rem', color: '#1e293b', letterSpacing: '-0.5px' }}>
                                    Screening
                                </h2>
                                <p style={{ fontSize: '0.9rem', color: '#64748b', fontWeight: '600' }}>
                                    {data.screening.filter(v =>
                                        !screeningSearch ||
                                        v.basic_info?.name?.toLowerCase().includes(screeningSearch.toLowerCase()) ||
                                        v.volunteer_id?.toLowerCase().includes(screeningSearch.toLowerCase()) ||
                                        v.contact?.includes(screeningSearch)
                                    ).length} initial enrollments
                                </p>
                            </div>
                        </div>

                        {/* Search Bar for Screening */}
                        <div style={{
                            position: 'relative',
                            marginBottom: '1.5rem',
                            animation: 'fadeIn 0.3s ease-in'
                        }}>
                            <Search
                                size={18}
                                style={{
                                    position: 'absolute',
                                    left: '1rem',
                                    top: '50%',
                                    transform: 'translateY(-50%)',
                                    color: '#94a3b8',
                                    zIndex: 1
                                }}
                            />
                            <input
                                type="text"
                                placeholder="Search by name, ID, or contact..."
                                value={screeningSearch}
                                onChange={(e) => setScreeningSearch(e.target.value)}
                                style={{
                                    width: '100%',
                                    padding: '0.85rem 1rem 0.85rem 3rem',
                                    border: '2px solid #e2e8f0',
                                    borderRadius: '12px',
                                    fontSize: '0.9rem',
                                    fontWeight: '500',
                                    background: 'white',
                                    transition: 'all 0.2s',
                                    boxShadow: '0 2px 8px rgba(0,0,0,0.04)'
                                }}
                                onFocus={(e) => {
                                    e.target.style.borderColor = '#6366f1';
                                    e.target.style.boxShadow = '0 4px 12px rgba(99, 102, 241, 0.15)';
                                }}
                                onBlur={(e) => {
                                    e.target.style.borderColor = '#e2e8f0';
                                    e.target.style.boxShadow = '0 2px 8px rgba(0,0,0,0.04)';
                                }}
                            />
                        </div>

                        {data.screening.filter(v =>
                            !screeningSearch ||
                            v.basic_info?.name?.toLowerCase().includes(screeningSearch.toLowerCase()) ||
                            v.volunteer_id?.toLowerCase().includes(screeningSearch.toLowerCase()) ||
                            v.contact?.includes(screeningSearch)
                        ).length === 0 ? (
                            <div className="glass-card" style={{ padding: '3rem 2rem', textAlign: 'center', background: 'linear-gradient(135deg, rgba(255,255,255,0.9) 0%, rgba(255,255,255,0.7) 100%)' }}>
                                <Users size={56} color="#cbd5e1" style={{ marginBottom: '1rem' }} />
                                <p style={{ color: '#64748b', fontSize: '1rem', fontWeight: '600' }}>
                                    {screeningSearch ? 'No matching volunteers found' : 'No screening volunteers'}
                                </p>
                                {screeningSearch && (
                                    <button
                                        onClick={() => setScreeningSearch('')}
                                        style={{
                                            marginTop: '1rem',
                                            padding: '0.5rem 1rem',
                                            background: 'transparent',
                                            border: '2px solid #e2e8f0',
                                            borderRadius: '8px',
                                            color: '#64748b',
                                            cursor: 'pointer',
                                            fontWeight: '600',
                                            fontSize: '0.85rem'
                                        }}
                                    >
                                        Clear Search
                                    </button>
                                )}
                            </div>
                        ) : (
                            <div style={{ maxHeight: '600px', overflowY: 'auto', paddingRight: '0.5rem' }}>
                                {data.screening.filter(v =>
                                    !screeningSearch ||
                                    v.basic_info?.name?.toLowerCase().includes(screeningSearch.toLowerCase()) ||
                                    v.volunteer_id?.toLowerCase().includes(screeningSearch.toLowerCase()) ||
                                    v.contact?.includes(screeningSearch)
                                ).map((volunteer) => (
                                    <VolunteerCard key={volunteer.volunteer_id} volunteer={volunteer} status="screening" />
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Pre-screening Card */}
                    <div>
                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.8rem',
                            marginBottom: '1.5rem',
                            padding: '1.25rem',
                            background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.15) 0%, rgba(251, 191, 36, 0.1) 100%)',
                            borderRadius: '16px',
                            border: '2px solid rgba(245, 158, 11, 0.2)',
                            boxShadow: '0 4px 15px rgba(245, 158, 11, 0.1)'
                        }}>
                            <div style={{
                                padding: '0.75rem',
                                background: 'linear-gradient(135deg, #f59e0b, #d97706)',
                                borderRadius: '12px',
                                boxShadow: '0 4px 12px rgba(245, 158, 11, 0.3)'
                            }}>
                                <Clock color="white" size={28} />
                            </div>
                            <div style={{ flex: 1 }}>
                                <h2 style={{ fontSize: '1.4rem', fontWeight: '800', marginBottom: '0.3rem', color: '#1e293b', letterSpacing: '-0.5px' }}>
                                    Pre-screening
                                </h2>
                                <p style={{ fontSize: '0.9rem', color: '#64748b', fontWeight: '600' }}>
                                    {data.prescreening.filter(v =>
                                        !prescreeningSearch ||
                                        v.basic_info?.name?.toLowerCase().includes(prescreeningSearch.toLowerCase()) ||
                                        v.volunteer_id?.toLowerCase().includes(prescreeningSearch.toLowerCase()) ||
                                        v.contact?.includes(prescreeningSearch)
                                    ).length} pending approval
                                </p>
                            </div>
                        </div>

                        {/* Search Bar for Pre-screening */}
                        <div style={{
                            position: 'relative',
                            marginBottom: '1.5rem',
                            animation: 'fadeIn 0.3s ease-in'
                        }}>
                            <Search
                                size={18}
                                style={{
                                    position: 'absolute',
                                    left: '1rem',
                                    top: '50%',
                                    transform: 'translateY(-50%)',
                                    color: '#94a3b8',
                                    zIndex: 1
                                }}
                            />
                            <input
                                type="text"
                                placeholder="Search by name, ID, or contact..."
                                value={prescreeningSearch}
                                onChange={(e) => setPrescreeningSearch(e.target.value)}
                                style={{
                                    width: '100%',
                                    padding: '0.85rem 1rem 0.85rem 3rem',
                                    border: '2px solid #e2e8f0',
                                    borderRadius: '12px',
                                    fontSize: '0.9rem',
                                    fontWeight: '500',
                                    background: 'white',
                                    transition: 'all 0.2s',
                                    boxShadow: '0 2px 8px rgba(0,0,0,0.04)'
                                }}
                                onFocus={(e) => {
                                    e.target.style.borderColor = '#f59e0b';
                                    e.target.style.boxShadow = '0 4px 12px rgba(245, 158, 11, 0.15)';
                                }}
                                onBlur={(e) => {
                                    e.target.style.borderColor = '#e2e8f0';
                                    e.target.style.boxShadow = '0 2px 8px rgba(0,0,0,0.04)';
                                }}
                            />
                        </div>

                        {data.prescreening.filter(v =>
                            !prescreeningSearch ||
                            v.basic_info?.name?.toLowerCase().includes(prescreeningSearch.toLowerCase()) ||
                            v.volunteer_id?.toLowerCase().includes(prescreeningSearch.toLowerCase()) ||
                            v.contact?.includes(prescreeningSearch)
                        ).length === 0 ? (
                            <div className="glass-card" style={{ padding: '3rem 2rem', textAlign: 'center', background: 'linear-gradient(135deg, rgba(255,255,255,0.9) 0%, rgba(255,255,255,0.7) 100%)' }}>
                                <Users size={56} color="#cbd5e1" style={{ marginBottom: '1rem' }} />
                                <p style={{ color: '#64748b', fontSize: '1rem', fontWeight: '600' }}>
                                    {prescreeningSearch ? 'No matching volunteers found' : 'No pre-screening volunteers'}
                                </p>
                                {prescreeningSearch && (
                                    <button
                                        onClick={() => setPrescreeningSearch('')}
                                        style={{
                                            marginTop: '1rem',
                                            padding: '0.5rem 1rem',
                                            background: 'transparent',
                                            border: '2px solid #e2e8f0',
                                            borderRadius: '8px',
                                            color: '#64748b',
                                            cursor: 'pointer',
                                            fontWeight: '600',
                                            fontSize: '0.85rem'
                                        }}
                                    >
                                        Clear Search
                                    </button>
                                )}
                            </div>
                        ) : (
                            <div style={{ maxHeight: '600px', overflowY: 'auto', paddingRight: '0.5rem' }}>
                                {data.prescreening.filter(v =>
                                    !prescreeningSearch ||
                                    v.basic_info?.name?.toLowerCase().includes(prescreeningSearch.toLowerCase()) ||
                                    v.volunteer_id?.toLowerCase().includes(prescreeningSearch.toLowerCase()) ||
                                    v.contact?.includes(prescreeningSearch)
                                ).map((volunteer) => (
                                    <VolunteerCard key={volunteer.volunteer_id} volunteer={volunteer} status="prescreening" />
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Approved Card */}
                    <div>
                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.8rem',
                            marginBottom: '1.5rem',
                            padding: '1.25rem',
                            background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.15) 0%, rgba(5, 150, 105, 0.1) 100%)',
                            borderRadius: '16px',
                            border: '2px solid rgba(16, 185, 129, 0.2)',
                            boxShadow: '0 4px 15px rgba(16, 185, 129, 0.1)'
                        }}>
                            <div style={{
                                padding: '0.75rem',
                                background: 'linear-gradient(135deg, #10b981, #059669)',
                                borderRadius: '12px',
                                boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)'
                            }}>
                                <CheckCircle color="white" size={28} />
                            </div>
                            <div style={{ flex: 1 }}>
                                <h2 style={{ fontSize: '1.4rem', fontWeight: '800', marginBottom: '0.3rem', color: '#1e293b', letterSpacing: '-0.5px' }}>
                                    Approved
                                </h2>
                                <p style={{ fontSize: '0.9rem', color: '#64748b', fontWeight: '600' }}>
                                    {data.approved.filter(v =>
                                        !approvedSearch ||
                                        v.basic_info?.name?.toLowerCase().includes(approvedSearch.toLowerCase()) ||
                                        v.volunteer_id?.toLowerCase().includes(approvedSearch.toLowerCase()) ||
                                        v.contact?.includes(approvedSearch)
                                    ).length} recently approved
                                </p>
                            </div>
                        </div>

                        {/* Search Bar for Approved */}
                        <div style={{
                            position: 'relative',
                            marginBottom: '1.5rem',
                            animation: 'fadeIn 0.3s ease-in'
                        }}>
                            <Search
                                size={18}
                                style={{
                                    position: 'absolute',
                                    left: '1rem',
                                    top: '50%',
                                    transform: 'translateY(-50%)',
                                    color: '#94a3b8',
                                    zIndex: 1
                                }}
                            />
                            <input
                                type="text"
                                placeholder="Search by name, ID, or contact..."
                                value={approvedSearch}
                                onChange={(e) => setApprovedSearch(e.target.value)}
                                style={{
                                    width: '100%',
                                    padding: '0.85rem 1rem 0.85rem 3rem',
                                    border: '2px solid #e2e8f0',
                                    borderRadius: '12px',
                                    fontSize: '0.9rem',
                                    fontWeight: '500',
                                    background: 'white',
                                    transition: 'all 0.2s',
                                    boxShadow: '0 2px 8px rgba(0,0,0,0.04)'
                                }}
                                onFocus={(e) => {
                                    e.target.style.borderColor = '#10b981';
                                    e.target.style.boxShadow = '0 4px 12px rgba(16, 185, 129, 0.15)';
                                }}
                                onBlur={(e) => {
                                    e.target.style.borderColor = '#e2e8f0';
                                    e.target.style.boxShadow = '0 2px 8px rgba(0,0,0,0.04)';
                                }}
                            />
                        </div>

                        {data.approved.filter(v =>
                            !approvedSearch ||
                            v.basic_info?.name?.toLowerCase().includes(approvedSearch.toLowerCase()) ||
                            v.volunteer_id?.toLowerCase().includes(approvedSearch.toLowerCase()) ||
                            v.contact?.includes(approvedSearch)
                        ).length === 0 ? (
                            <div className="glass-card" style={{ padding: '3rem 2rem', textAlign: 'center', background: 'linear-gradient(135deg, rgba(255,255,255,0.9) 0%, rgba(255,255,255,0.7) 100%)' }}>
                                <CheckCircle size={56} color="#cbd5e1" style={{ marginBottom: '1rem' }} />
                                <p style={{ color: '#64748b', fontSize: '1rem', fontWeight: '600' }}>
                                    {approvedSearch ? 'No matching volunteers found' : 'No approved volunteers yet'}
                                </p>
                                {approvedSearch && (
                                    <button
                                        onClick={() => setApprovedSearch('')}
                                        style={{
                                            marginTop: '1rem',
                                            padding: '0.5rem 1rem',
                                            background: 'transparent',
                                            border: '2px solid #e2e8f0',
                                            borderRadius: '8px',
                                            color: '#64748b',
                                            cursor: 'pointer',
                                            fontWeight: '600',
                                            fontSize: '0.85rem'
                                        }}
                                    >
                                        Clear Search
                                    </button>
                                )}
                            </div>
                        ) : (
                            <div style={{ maxHeight: '600px', overflowY: 'auto', paddingRight: '0.5rem' }}>
                                {data.approved.filter(v =>
                                    !approvedSearch ||
                                    v.basic_info?.name?.toLowerCase().includes(approvedSearch.toLowerCase()) ||
                                    v.volunteer_id?.toLowerCase().includes(approvedSearch.toLowerCase()) ||
                                    v.contact?.includes(approvedSearch)
                                ).map((volunteer) => (
                                    <VolunteerCard key={volunteer.volunteer_id} volunteer={volunteer} status="approved" />
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Detail Modal */}
            {selectedVolunteer && (
                <DetailModal volunteer={selectedVolunteer} onClose={() => setSelectedVolunteer(null)} />
            )}
        </>
    );
};

export default RecentEnrollment;
