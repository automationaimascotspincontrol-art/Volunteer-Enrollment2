import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Home, PlusCircle, CheckCircle2, FileText, User } from 'lucide-react';

const RegistrationSuccess = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const volunteerId = location.state?.volunteerId || 'N/A';
    const subjectCode = location.state?.subjectCode;
    const status = location.state?.status === 'yes' ? 'Approved' : 'Rejected';
    const isApproved = location.state?.status === 'yes';

    return (
        <div style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            minHeight: '80vh',
            padding: '2rem'
        }}>
            <div style={{
                maxWidth: '550px',
                width: '100%',
                background: 'white',
                borderRadius: '20px',
                padding: '2.5rem',
                boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
                textAlign: 'center'
            }}>
                {/* Success Icon */}
                <div style={{
                    width: '80px',
                    height: '80px',
                    margin: '0 auto 1.5rem',
                    background: isApproved ? '#10b981' : '#ef4444',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                }}>
                    <CheckCircle2 size={48} color="white" strokeWidth={2.5} />
                </div>

                {/* Title */}
                <h2 style={{
                    fontSize: '1.75rem',
                    fontWeight: '800',
                    marginBottom: '0.5rem',
                    color: '#0f172a'
                }}>
                    Registration Complete
                </h2>

                <p style={{
                    fontSize: '0.95rem',
                    color: '#64748b',
                    marginBottom: '2rem'
                }}>
                    Volunteer status has been finalized.
                </p>

                {/* ID Cards */}
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: subjectCode ? 'repeat(3, 1fr)' : 'repeat(2, 1fr)',
                    gap: '0.75rem',
                    marginBottom: '2rem'
                }}>
                    {/* Subject Code */}
                    {subjectCode && (
                        <div style={{
                            padding: '1.25rem 0.75rem',
                            background: 'linear-gradient(135deg, #ec4899, #8b5cf6)',
                            borderRadius: '12px',
                            transition: 'transform 0.2s'
                        }}>
                            <FileText size={24} color="white" style={{ marginBottom: '0.5rem' }} strokeWidth={2.5} />
                            <p style={{
                                fontSize: '0.65rem',
                                color: 'rgba(255,255,255,0.85)',
                                fontWeight: '700',
                                textTransform: 'uppercase',
                                marginBottom: '0.4rem'
                            }}>
                                Subject Code
                            </p>
                            <p style={{
                                fontSize: '1.15rem',
                                color: 'white',
                                fontWeight: '800',
                                fontFamily: 'monospace'
                            }}>
                                {subjectCode}
                            </p>
                        </div>
                    )}

                    {/* Volunteer ID */}
                    <div style={{
                        padding: '1.25rem 0.75rem',
                        background: 'linear-gradient(135deg, #6366f1, #4f46e5)',
                        borderRadius: '12px',
                        transition: 'transform 0.2s'
                    }}>
                        <User size={24} color="white" style={{ marginBottom: '0.5rem' }} strokeWidth={2.5} />
                        <p style={{
                            fontSize: '0.65rem',
                            color: 'rgba(255,255,255,0.85)',
                            fontWeight: '700',
                            textTransform: 'uppercase',
                            marginBottom: '0.4rem'
                        }}>
                            Volunteer ID
                        </p>
                        <p style={{
                            fontSize: '0.85rem',
                            color: 'white',
                            fontWeight: '800',
                            fontFamily: 'monospace'
                        }}>
                            {volunteerId}
                        </p>
                    </div>

                    {/* Status */}
                    <div style={{
                        padding: '1.25rem 0.75rem',
                        background: isApproved
                            ? 'linear-gradient(135deg, #10b981, #059669)'
                            : 'linear-gradient(135deg, #ef4444, #dc2626)',
                        borderRadius: '12px',
                        transition: 'transform 0.2s'
                    }}>
                        <CheckCircle2 size={24} color="white" style={{ marginBottom: '0.5rem' }} strokeWidth={2.5} />
                        <p style={{
                            fontSize: '0.65rem',
                            color: 'rgba(255,255,255,0.85)',
                            fontWeight: '700',
                            textTransform: 'uppercase',
                            marginBottom: '0.4rem'
                        }}>
                            Status
                        </p>
                        <p style={{
                            fontSize: '1.15rem',
                            color: 'white',
                            fontWeight: '800'
                        }}>
                            {status}
                        </p>
                    </div>
                </div>

                {/* Buttons */}
                <div style={{ display: 'flex', gap: '0.75rem', flexDirection: 'column' }}>
                    <button
                        onClick={() => navigate('/prescreening')}
                        style={{
                            padding: '0.85rem',
                            background: 'linear-gradient(135deg, #667eea, #764ba2)',
                            color: 'white',
                            border: 'none',
                            borderRadius: '10px',
                            fontSize: '0.95rem',
                            fontWeight: '700',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '0.5rem',
                            transition: 'transform 0.2s'
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.02)'}
                        onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
                    >
                        <PlusCircle size={18} />
                        Add Another Visitor
                    </button>

                    <button
                        onClick={() => navigate('/')}
                        style={{
                            padding: '0.85rem',
                            background: 'white',
                            color: '#667eea',
                            border: '2px solid #e2e8f0',
                            borderRadius: '10px',
                            fontSize: '0.95rem',
                            fontWeight: '600',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '0.5rem',
                            transition: 'all 0.2s'
                        }}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.background = '#f8fafc';
                            e.currentTarget.style.borderColor = '#667eea';
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.background = 'white';
                            e.currentTarget.style.borderColor = '#e2e8f0';
                        }}
                    >
                        <Home size={18} />
                        Return to Home
                    </button>
                </div>
            </div>
        </div>
    );
};

export default RegistrationSuccess;
