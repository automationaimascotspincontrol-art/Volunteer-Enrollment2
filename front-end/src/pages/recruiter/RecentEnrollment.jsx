import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../../api/api';
import { Users, CheckCircle, Clock, Calendar, X, ArrowRight, Phone, MapPin, User, Cake, Briefcase, AlertCircle } from 'lucide-react';

const RecentEnrollment = () => {
    const [data, setData] = useState({ prescreening: [], approved: [] });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [selectedVolunteer, setSelectedVolunteer] = useState(null);
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

    const VolunteerCard = ({ volunteer, status }) => (
        <div className="glass-card" style={{
            padding: '1rem',
            marginBottom: '1rem',
            borderLeft: `4px solid ${status === 'approved' ? 'var(--success)' : 'var(--accent)'}`,
            transition: 'all 0.3s ease'
        }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                <div style={{ flex: 1 }}>
                    <h3 style={{ fontSize: '1.1rem', fontWeight: '700', marginBottom: '0.5rem' }}>
                        {volunteer.basic_info?.name || 'N/A'}
                    </h3>
                    <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                        <span><strong>ID:</strong> {volunteer.volunteer_id}</span>
                        <span><strong>Contact:</strong> {volunteer.contact || volunteer.basic_info?.contact}</span>
                        <span><strong>Gender:</strong> {volunteer.basic_info?.gender}</span>
                    </div>
                    <div style={{ marginTop: '0.5rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                        <Calendar size={14} style={{ display: 'inline', marginRight: '0.3rem' }} />
                        Enrolled: {formatDate(volunteer.audit?.created_at)}
                    </div>
                </div>
                <button
                    onClick={() => setSelectedVolunteer(volunteer)}
                    style={{
                        padding: '0.5rem 1rem',
                        background: 'var(--primary)',
                        color: 'white',
                        border: 'none',
                        borderRadius: '8px',
                        fontSize: '0.85rem',
                        fontWeight: '600',
                        cursor: 'pointer',
                        transition: 'all 0.2s'
                    }}
                >
                    View Details
                </button>
            </div>
        </div>
    );

    const DetailModal = ({ volunteer, onClose }) => {
        if (!volunteer) return null;

        const isPrescreening = volunteer.current_status === 'submitted';
        const [showStudySelection, setShowStudySelection] = useState(false);
        const [studies, setStudies] = useState([]);
        const [loadingStudies, setLoadingStudies] = useState(false);
        const [selectedStudy, setSelectedStudy] = useState(null);
        const [assigning, setAssigning] = useState(false);
        const [errorMessage, setErrorMessage] = useState('');

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

        const handleAssignToStudy = async () => {
            if (!selectedStudy) return;

            setAssigning(true);
            setErrorMessage(''); // Clear previous errors
            try {
                await api.post('/clinical/assign-to-study', {
                    volunteer_id: volunteer.volunteer_id,
                    study_id: selectedStudy._id || selectedStudy.id,
                    study_name: selectedStudy.studyName || selectedStudy.study_name
                });

                // Dismiss modal and navigate immediately
                setShowStudySelection(false);
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
                            background: isPrescreening ? 'rgba(255, 171, 0, 0.2)' : 'rgba(34, 197, 94, 0.2)',
                            color: isPrescreening ? 'var(--accent)' : 'var(--success)'
                        }}>
                            {isPrescreening ? 'Pre-screening' : 'Approved'}
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
                            <div>
                                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.3rem' }}>Volunteer ID</p>
                                <p style={{ fontSize: '1rem', fontWeight: '600' }}>{volunteer.volunteer_id}</p>
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
                    ) : (
                        <>
                            {!showStudySelection ? (
                                <button
                                    onClick={() => {
                                        setShowStudySelection(true);
                                        fetchOngoingStudies();
                                    }}
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
            <div className="container animate-fade-in" style={{ paddingBottom: '4rem' }}>
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
                    {/* Pre-screening Card */}
                    <div>
                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.8rem',
                            marginBottom: '1.5rem',
                            padding: '1rem',
                            background: 'rgba(255, 171, 0, 0.1)',
                            borderRadius: '12px',
                            border: '1px solid rgba(255, 171, 0, 0.2)'
                        }}>
                            <div style={{ padding: '0.6rem', background: 'var(--accent)', borderRadius: '10px' }}>
                                <Clock color="white" size={24} />
                            </div>
                            <div>
                                <h2 style={{ fontSize: '1.3rem', fontWeight: '700', marginBottom: '0.2rem' }}>
                                    Pre-screening
                                </h2>
                                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                                    {data.prescreening.length} pending approval
                                </p>
                            </div>
                        </div>

                        {data.prescreening.length === 0 ? (
                            <div className="glass-card" style={{ padding: '2rem', textAlign: 'center' }}>
                                <Users size={48} color="var(--text-muted)" style={{ marginBottom: '1rem' }} />
                                <p style={{ color: 'var(--text-muted)' }}>No pre-screening volunteers</p>
                            </div>
                        ) : (
                            <div style={{ maxHeight: '500px', overflowY: 'auto', paddingRight: '0.5rem' }}>
                                {data.prescreening.map((volunteer) => (
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
                            padding: '1rem',
                            background: 'rgba(34, 197, 94, 0.1)',
                            borderRadius: '12px',
                            border: '1px solid rgba(34, 197, 94, 0.2)'
                        }}>
                            <div style={{ padding: '0.6rem', background: 'var(--success)', borderRadius: '10px' }}>
                                <CheckCircle color="white" size={24} />
                            </div>
                            <div>
                                <h2 style={{ fontSize: '1.3rem', fontWeight: '700', marginBottom: '0.2rem' }}>
                                    Approved
                                </h2>
                                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                                    {data.approved.length} recently approved
                                </p>
                            </div>
                        </div>

                        {data.approved.length === 0 ? (
                            <div className="glass-card" style={{ padding: '2rem', textAlign: 'center' }}>
                                <CheckCircle size={48} color="var(--text-muted)" style={{ marginBottom: '1rem' }} />
                                <p style={{ color: 'var(--text-muted)' }}>No approved volunteers yet</p>
                            </div>
                        ) : (
                            <div style={{ maxHeight: '500px', overflowY: 'auto', paddingRight: '0.5rem' }}>
                                {data.approved.map((volunteer) => (
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
