import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../api/api';
import { Search, FileText, ArrowRight, User, Phone, MapPin, Calendar, CheckCircle2, AlertCircle } from 'lucide-react';

const VolunteerSearch = () => {
    const [legacyId, setLegacyId] = useState('');
    const [legacyLoading, setLegacyLoading] = useState(false);
    const [legacyError, setLegacyError] = useState('');
    const [legacyResult, setLegacyResult] = useState(null);

    const [fieldContact, setFieldContact] = useState('');
    const [fieldLoading, setFieldLoading] = useState(false);
    const [fieldError, setFieldError] = useState('');
    const [fieldResult, setFieldResult] = useState(null);

    const navigate = useNavigate();

    const handleLegacySearch = async (e) => {
        e?.preventDefault();
        if (!legacyId.trim()) return;

        setLegacyLoading(true);
        setLegacyError('');
        setLegacyResult(null);
        try {
            const response = await api.get(`/volunteers/search/master?id=${legacyId}`);
            setLegacyResult(response.data);
        } catch (err) {
            setLegacyError(err.response?.data?.detail || 'Volunteer not found');
        } finally {
            setLegacyLoading(false);
        }
    };

    const handleFieldSearch = async (e) => {
        e?.preventDefault();
        if (!fieldContact.trim()) return;

        setFieldLoading(true);
        setFieldError('');
        setFieldResult(null);
        try {
            const response = await api.get(`/volunteers/search/field?id=${fieldContact}`);
            setFieldResult(response.data);
        } catch (err) {
            setFieldError(err.response?.data?.detail || 'Field Visit record not found');
        } finally {
            setFieldLoading(false);
        }
    };

    const ResultCard = ({ result, isField }) => {
        const name = result.pre_screening?.name || result.basic_info?.name || 'Unknown Volunteer';
        const contact = result.pre_screening?.contact || result.contact || result.basic_info?.contact || 'N/A';
        const gender = result.pre_screening?.gender || result.basic_info?.gender || 'Unknown';
        const address = result.pre_screening?.address || result.basic_info?.address;

        return (
            <div style={{
                background: 'white',
                border: '1px solid #f1f5f9',
                borderRadius: '14px',
                padding: '1.75rem',
                marginTop: '1.5rem',
                boxShadow: '0 4px 16px rgba(0,0,0,0.08)',
                transition: 'all 0.3s',
                animation: 'fadeIn 0.3s'
            }}>
                {/* Header */}
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '1.25rem',
                    paddingBottom: '1.25rem',
                    borderBottom: '1px solid #f1f5f9',
                    marginBottom: '1.25rem'
                }}>
                    <div style={{
                        width: '56px',
                        height: '56px',
                        borderRadius: '12px',
                        background: isField ? 'linear-gradient(135deg, #ec4899, #be185d)' : 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        boxShadow: isField ? '0 4px 16px rgba(236, 72, 153, 0.3)' : '0 4px 16px rgba(99, 102, 241, 0.3)',
                        flexShrink: 0
                    }}>
                        {isField ? <FileText size={28} color="white" /> : <User size={28} color="white" />}
                    </div>

                    <div style={{ flex: 1, minWidth: 0 }}>
                        <h3 style={{
                            fontSize: '1.25rem',
                            fontWeight: '700',
                            color: '#0f172a',
                            marginBottom: '0.375rem',
                            margin: 0
                        }}>
                            {name}
                        </h3>
                        {result.subject_code && !isField && (
                            <div style={{
                                display: 'inline-block',
                                background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                                color: 'white',
                                fontSize: '0.75rem',
                                fontWeight: '600',
                                padding: '0.25rem 0.625rem',
                                borderRadius: '6px',
                                marginTop: '0.375rem',
                                fontFamily: 'ui-monospace, monospace'
                            }}>
                                {result.subject_code}
                            </div>
                        )}
                        {result.volunteer_id && !isField && (
                            <div style={{
                                fontSize: '0.8125rem',
                                color: '#64748b',
                                fontWeight: '500',
                                marginTop: '0.375rem',
                                fontFamily: 'ui-monospace, monospace'
                            }}>
                                ID: {result.volunteer_id}
                            </div>
                        )}
                        {isField && (
                            <div style={{
                                display: 'inline-block',
                                background: '#fef3c7',
                                color: '#92400e',
                                fontSize: '0.75rem',
                                fontWeight: '600',
                                padding: '0.25rem 0.625rem',
                                borderRadius: '6px',
                                marginTop: '0.375rem'
                            }}>
                                Field Visit Record
                            </div>
                        )}
                    </div>
                </div>

                {/* Details Grid */}
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                    gap: '1.25rem',
                    marginBottom: '1.5rem'
                }}>
                    <div>
                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem',
                            marginBottom: '0.5rem'
                        }}>
                            <Phone size={16} style={{ color: '#6366f1' }} />
                            <p style={{
                                fontSize: '0.75rem',
                                fontWeight: '600',
                                color: '#64748b',
                                margin: 0,
                                textTransform: 'uppercase',
                                letterSpacing: '0.5px'
                            }}>
                                Contact Number
                            </p>
                        </div>
                        <p style={{
                            fontSize: '0.9375rem',
                            fontWeight: '600',
                            color: '#0f172a',
                            margin: 0,
                            fontFamily: 'ui-monospace, monospace'
                        }}>
                            {contact}
                        </p>
                    </div>

                    <div>
                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem',
                            marginBottom: '0.5rem'
                        }}>
                            <User size={16} style={{ color: '#10b981' }} />
                            <p style={{
                                fontSize: '0.75rem',
                                fontWeight: '600',
                                color: '#64748b',
                                margin: 0,
                                textTransform: 'uppercase',
                                letterSpacing: '0.5px'
                            }}>
                                Gender
                            </p>
                        </div>
                        <p style={{
                            fontSize: '0.9375rem',
                            fontWeight: '600',
                            color: '#0f172a',
                            margin: 0,
                            textTransform: 'capitalize'
                        }}>
                            {gender.replace(/_/g, ' ')}
                        </p>
                    </div>

                    {address && (
                        <div style={{ gridColumn: '1 / -1' }}>
                            <div style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.5rem',
                                marginBottom: '0.5rem'
                            }}>
                                <MapPin size={16} style={{ color: '#f59e0b' }} />
                                <p style={{
                                    fontSize: '0.75rem',
                                    fontWeight: '600',
                                    color: '#64748b',
                                    margin: 0,
                                    textTransform: 'uppercase',
                                    letterSpacing: '0.5px'
                                }}>
                                    Address
                                </p>
                            </div>
                            <p style={{
                                fontSize: '0.9375rem',
                                fontWeight: '500',
                                color: '#475569',
                                margin: 0
                            }}>
                                {address}
                            </p>
                        </div>
                    )}
                </div>

                {/* Action Button */}
                <button
                    onClick={() => {
                        if (isField) {
                            navigate(`/register`, { state: { prefill: result.pre_screening } });
                        } else {
                            navigate(`/registration/${result.volunteer_id}`, { state: { volunteer: result } });
                        }
                    }}
                    style={{
                        width: '100%',
                        padding: '0.875rem 1.25rem',
                        background: isField ? 'linear-gradient(135deg, #ec4899, #be185d)' : 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                        color: 'white',
                        border: 'none',
                        borderRadius: '10px',
                        fontSize: '0.9375rem',
                        fontWeight: '600',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '0.5rem',
                        transition: 'all 0.2s',
                        boxShadow: isField ? '0 2px 12px rgba(236, 72, 153, 0.3)' : '0 2px 12px rgba(99, 102, 241, 0.3)'
                    }}
                    onMouseEnter={(e) => {
                        e.currentTarget.style.transform = 'translateY(-2px)';
                        e.currentTarget.style.boxShadow = isField ? '0 6px 20px rgba(236, 72, 153, 0.4)' : '0 6px 20px rgba(99, 102, 241, 0.4)';
                    }}
                    onMouseLeave={(e) => {
                        e.currentTarget.style.transform = 'translateY(0)';
                        e.currentTarget.style.boxShadow = isField ? '0 2px 12px rgba(236, 72, 153, 0.3)' : '0 2px 12px rgba(99, 102, 241, 0.3)';
                    }}
                >
                    {isField ? 'Proceed to Enrollment' : 'Proceed to Register'}
                    <ArrowRight size={18} />
                </button>
            </div>
        );
    };

    return (
        <div style={{
            minHeight: '100vh',
            background: 'linear-gradient(180deg, #fafbfc 0%, #ffffff 100%)',
            padding: '2rem 3rem'
        }}>
            {/* Header */}
            <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
                marginBottom: '2.5rem'
            }}>
                <div>
                    <h1 style={{
                        fontSize: '2.25rem',
                        fontWeight: '800',
                        color: '#0f172a',
                        marginBottom: '0.5rem',
                        letterSpacing: '-0.025em',
                        background: 'linear-gradient(135deg, #0f172a 0%, #475569 100%)',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                        margin: 0
                    }}>
                        Search & Register
                    </h1>
                    <p style={{
                        color: '#64748b',
                        fontSize: '0.9375rem',
                        fontWeight: '500',
                        margin: '0.5rem 0 0 0'
                    }}>
                        Find volunteers from Legacy records or Field visits
                    </p>
                </div>

                <div style={{
                    padding: '0.625rem 1.125rem',
                    background: 'white',
                    border: '1px solid #e5e7eb',
                    borderRadius: '10px',
                    fontSize: '0.8125rem',
                    fontWeight: '600',
                    color: '#64748b',
                    boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
                }}>
                    System: <span style={{ color: '#6366f1' }}>Active Search</span>
                </div>
            </div>

            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 600px), 1fr))',
                gap: '2rem'
            }}>
                {/* Master Database Search */}
                <div style={{
                    background: 'white',
                    border: '1px solid #f1f5f9',
                    borderRadius: '16px',
                    padding: '2rem',
                    boxShadow: '0 4px 16px rgba(0,0,0,0.06)',
                    position: 'relative',
                    overflow: 'hidden'
                }}>
                    {/* Accent */}
                    <div style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        right: 0,
                        height: '4px',
                        background: 'linear-gradient(90deg, #6366f1, #8b5cf6)'
                    }} />

                    <h2 style={{
                        fontSize: '1.25rem',
                        fontWeight: '700',
                        color: '#6366f1',
                        marginBottom: '0.5rem',
                        margin: '0 0 0.5rem 0'
                    }}>
                        Search by Subject Code / Name / ID
                    </h2>
                    <p style={{
                        fontSize: '0.875rem',
                        color: '#64748b',
                        fontWeight: '500',
                        marginBottom: '1.5rem',
                        margin: '0 0 1.5rem 0'
                    }}>
                        Also supports searching by <span style={{ color: '#ec4899', fontWeight: '600' }}>Contact Number</span>
                    </p>

                    <form onSubmit={handleLegacySearch} style={{ display: 'flex', gap: '0.75rem', marginBottom: '1rem' }}>
                        <div style={{ flex: 1, position: 'relative' }}>
                            <Search size={18} style={{
                                position: 'absolute',
                                left: '1rem',
                                top: '50%',
                                transform: 'translateY(-50%)',
                                color: '#94a3b8'
                            }} />
                            <input
                                type="text"
                                placeholder="e.g. GUPSA, GUP10, Name, Contact..."
                                value={legacyId}
                                onChange={(e) => setLegacyId(e.target.value)}
                                style={{
                                    width: '100%',
                                    padding: '0.875rem 1rem 0.875rem 3rem',
                                    borderRadius: '10px',
                                    border: '1px solid #e2e8f0',
                                    fontSize: '0.875rem',
                                    fontWeight: '500',
                                    boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                                    transition: 'all 0.2s',
                                    outline: 'none'
                                }}
                                onFocus={(e) => {
                                    e.target.style.borderColor = '#6366f1';
                                    e.target.style.boxShadow = '0 0 0 3px rgba(99, 102, 241, 0.1)';
                                }}
                                onBlur={(e) => {
                                    e.target.style.borderColor = '#e2e8f0';
                                    e.target.style.boxShadow = '0 1px 2px rgba(0,0,0,0.05)';
                                }}
                            />
                        </div>
                        <button
                            type="submit"
                            disabled={legacyLoading || !legacyId.trim()}
                            style={{
                                padding: '0.875rem 1.75rem',
                                background: legacyLoading ? '#cbd5e1' : 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                                color: 'white',
                                border: 'none',
                                borderRadius: '10px',
                                fontSize: '0.875rem',
                                fontWeight: '600',
                                cursor: legacyLoading ? 'not-allowed' : 'pointer',
                                boxShadow: '0 2px 12px rgba(99, 102, 241, 0.3)',
                                transition: 'all 0.2s',
                                whiteSpace: 'nowrap'
                            }}
                        >
                            {legacyLoading ? 'Searching...' : 'Search Database'}
                        </button>
                    </form>

                    {legacyError && (
                        <div style={{
                            padding: '0.875rem 1rem',
                            background: '#fef2f2',
                            border: '1px solid #fecaca',
                            borderRadius: '10px',
                            color: '#dc2626',
                            fontSize: '0.875rem',
                            fontWeight: '500',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.625rem'
                        }}>
                            <AlertCircle size={18} />
                            {legacyError}
                        </div>
                    )}

                    {legacyResult && Array.isArray(legacyResult) && legacyResult.map((res, idx) => (
                        <ResultCard key={idx} result={res} isField={false} />
                    ))}
                    {legacyResult && !Array.isArray(legacyResult) && <ResultCard result={legacyResult} isField={false} />}
                    {legacyResult && Array.isArray(legacyResult) && legacyResult.length === 0 && (
                        <div style={{
                            textAlign: 'center',
                            padding: '3rem',
                            color: '#94a3b8',
                            fontSize: '0.9375rem'
                        }}>
                            No results found
                        </div>
                    )}
                </div>

                {/* Field Visit Search */}
                <div style={{
                    background: 'white',
                    border: '1px solid #f1f5f9',
                    borderRadius: '16px',
                    padding: '2rem',
                    boxShadow: '0 4px 16px rgba(0,0,0,0.06)',
                    position: 'relative',
                    overflow: 'hidden'
                }}>
                    {/* Accent */}
                    <div style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        right: 0,
                        height: '4px',
                        background: 'linear-gradient(90deg, #ec4899, #be185d)'
                    }} />

                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.625rem',
                        marginBottom: '0.5rem'
                    }}>
                        <FileText size={22} color="#ec4899" />
                        <h2 style={{
                            fontSize: '1.125rem',
                            fontWeight: '700',
                            color: '#0f172a',
                            margin: 0
                        }}>
                            Search Current Data (Field Visits)
                        </h2>
                    </div>
                    <p style={{
                        fontSize: '0.875rem',
                        color: '#64748b',
                        fontWeight: '500',
                        marginBottom: '1.5rem',
                        margin: '0.5rem 0 1.5rem 0'
                    }}>
                        Find active field visits or search by contact number.
                    </p>

                    <form onSubmit={handleFieldSearch} style={{ display: 'flex', gap: '0.75rem', marginBottom: '1rem' }}>
                        <div style={{ flex: 1, position: 'relative' }}>
                            <Search size={18} style={{
                                position: 'absolute',
                                left: '1rem',
                                top: '50%',
                                transform: 'translateY(-50%)',
                                color: '#94a3b8'
                            }} />
                            <input
                                type="text"
                                placeholder="Enter Contact Number or Participant Name"
                                value={fieldContact}
                                onChange={(e) => setFieldContact(e.target.value)}
                                style={{
                                    width: '100%',
                                    padding: '0.875rem 1rem 0.875rem 3rem',
                                    borderRadius: '10px',
                                    border: '1px solid #e2e8f0',
                                    fontSize: '0.875rem',
                                    fontWeight: '500',
                                    boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                                    transition: 'all 0.2s',
                                    outline: 'none'
                                }}
                                onFocus={(e) => {
                                    e.target.style.borderColor = '#ec4899';
                                    e.target.style.boxShadow = '0 0 0 3px rgba(236, 72, 153, 0.1)';
                                }}
                                onBlur={(e) => {
                                    e.target.style.borderColor = '#e2e8f0';
                                    e.target.style.boxShadow = '0 1px 2px rgba(0,0,0,0.05)';
                                }}
                            />
                        </div>
                        <button
                            type="submit"
                            disabled={fieldLoading || !fieldContact.trim()}
                            style={{
                                padding: '0.875rem 1.75rem',
                                background: fieldLoading ? '#cbd5e1' : 'linear-gradient(135deg, #ec4899, #be185d)',
                                color: 'white',
                                border: 'none',
                                borderRadius: '10px',
                                fontSize: '0.875rem',
                                fontWeight: '600',
                                cursor: fieldLoading ? 'not-allowed' : 'pointer',
                                boxShadow: '0 2px 12px rgba(236, 72, 153, 0.3)',
                                transition: 'all 0.2s',
                                whiteSpace: 'nowrap'
                            }}
                        >
                            {fieldLoading ? 'Searching...' : 'Search Current Data'}
                        </button>
                    </form>

                    {fieldError && (
                        <div style={{
                            padding: '0.875rem 1rem',
                            background: '#fef2f2',
                            border: '1px solid #fecaca',
                            borderRadius: '10px',
                            color: '#dc2626',
                            fontSize: '0.875rem',
                            fontWeight: '500',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.625rem'
                        }}>
                            <AlertCircle size={18} />
                            {fieldError}
                        </div>
                    )}

                    {fieldResult && <ResultCard result={fieldResult} isField={true} />}
                </div>
            </div>

            <style>{`
                @keyframes fadeIn {
                    from { opacity: 0; transform: translateY(10px); }
                    to { opacity: 1; transform: translateY(0); }
                }
            `}</style>
        </div>
    );
};

export default VolunteerSearch;
