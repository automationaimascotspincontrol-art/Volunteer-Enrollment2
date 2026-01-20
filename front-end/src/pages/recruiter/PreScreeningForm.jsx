import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import api from '../../api/api';
import { Input, Select, Button } from '../../components/ui';
import { UserPlus, Save, AlertCircle, CheckCircle, Loader, Sparkles } from 'lucide-react';

// Memoized duplicate alert component for better performance
const DuplicateAlert = React.memo(({ duplicateInfo, onUseFieldData }) => {
    if (!duplicateInfo) return null;

    return (
        <div className={`duplicate-alert animate-fade-in ${duplicateInfo.location === 'field' ? 'duplicate-field' : 'duplicate-master'}`}
            style={{
                background: duplicateInfo.location === 'field'
                    ? 'linear-gradient(135deg, rgba(6, 182, 212, 0.1) 0%, rgba(34, 211, 238, 0.1) 100%)'
                    : 'linear-gradient(135deg, rgba(245, 158, 11, 0.1) 0%, rgba(251, 191, 36, 0.1) 100%)',
                border: `1px solid ${duplicateInfo.location === 'field' ? 'rgba(6, 182, 212, 0.3)' : 'rgba(245, 158, 11, 0.3)'}`,
                borderRadius: '12px',
                padding: '1rem',
                marginTop: '0.5rem',
                boxShadow: duplicateInfo.location === 'field'
                    ? '0 4px 15px rgba(6, 182, 212, 0.15)'
                    : '0 4px 15px rgba(245, 158, 11, 0.15)'
            }}>
            <p style={{
                fontSize: '0.85rem',
                color: duplicateInfo.location === 'field' ? '#06b6d4' : '#f59e0b',
                fontWeight: '700',
                marginBottom: '0.5rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem'
            }}>
                {duplicateInfo.location === 'field'
                    ? <><AlertCircle size={16} /> Existing Field Visit Record Found</>
                    : <><AlertCircle size={16} /> Already in Master Database</>}
            </p>
            {duplicateInfo.location === 'field' ? (
                <button
                    type="button"
                    onClick={onUseFieldData}
                    style={{
                        background: 'linear-gradient(135deg, #06b6d4, #22d3ee)',
                        border: 'none',
                        color: 'white',
                        padding: '0.6rem 1.2rem',
                        borderRadius: '8px',
                        fontSize: '0.85rem',
                        fontWeight: '600',
                        cursor: 'pointer',
                        boxShadow: '0 4px 15px rgba(6, 182, 212, 0.3)',
                        transition: 'all 0.2s',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem'
                    }}
                    onMouseEnter={(e) => {
                        e.currentTarget.style.transform = 'translateY(-2px)';
                        e.currentTarget.style.boxShadow = '0 6px 20px rgba(6, 182,212, 0.4)';
                    }}
                    onMouseLeave={(e) => {
                        e.currentTarget.style.transform = 'translateY(0)';
                        e.currentTarget.style.boxShadow = '0 4px 15px rgba(6, 182, 212, 0.3)';
                    }}
                >
                    <CheckCircle size={16} /> Use Field Data
                </button>
            ) : (
                <Link to="/search" state={{ highlight: duplicateInfo.master_id }}
                    style={{
                        fontSize: '0.85rem',
                        color: '#f59e0b',
                        textDecoration: 'underline',
                        fontWeight: '600',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.3rem'
                    }}>
                    Check in Search & Register →
                </Link>
            )}
        </div>
    );
});

const PreScreeningForm = () => {
    const navigate = useNavigate();
    const location = useLocation();

    const [formData, setFormData] = useState({
        first_name: '',
        middle_name: '',
        surname: '',
        dob: '',
        gender: '',
        contact: '',
        location: '',
        address: '',
        occupation: '',
        source: '',
        field_area: '',
        date_of_enrolling: new Date().toISOString().split('T')[0],
        age: '',
        id_proof_type: '',
        id_proof_number: ''
    });
    const [loading, setLoading] = useState(false);
    const [checking, setChecking] = useState(false);
    const [duplicateInfo, setDuplicateInfo] = useState(null);
    const [error, setError] = useState('');

    // Handle pre-fill from Search or other sources
    useEffect(() => {
        if (location.state?.prefill) {
            const data = location.state.prefill;
            setFormData(prev => ({
                ...prev,
                first_name: data.first_name || '',
                middle_name: data.middle_name || '',
                surname: data.surname || '',
                dob: data.dob || '',
                gender: data.gender || '',
                contact: data.contact || '',
                location: data.location || '',
                address: data.address || '',
                source: 'field'
            }));
        }
    }, [location.state]);

    // Optimized duplicate check with debouncing
    useEffect(() => {
        const delayDebounceFn = setTimeout(async () => {
            const hasContact = formData.contact.length >= 10;
            const hasId = formData.id_proof_number && formData.id_proof_number.length > 5;

            if (hasContact || hasId) {
                setChecking(true);
                try {
                    const queryParams = new URLSearchParams();
                    if (hasContact) queryParams.append('contact', formData.contact);
                    if (hasId) queryParams.append('id_proof_number', formData.id_proof_number);

                    const response = await api.get(`/field/check-duplicate?${queryParams.toString()}`);
                    setDuplicateInfo(response.data.exists ? response.data : null);
                } catch (err) {
                    console.error('Error checking duplicate:', err);
                } finally {
                    setChecking(false);
                }
            } else {
                setDuplicateInfo(null);
            }
        }, 500);

        return () => clearTimeout(delayDebounceFn);
    }, [formData.contact, formData.id_proof_number]);

    // Memoized handlers for better performance
    const handleChange = useCallback((e) => {
        const { name, value } = e.target;
        setFormData(prev => {
            const newData = { ...prev, [name]: value };

            // Calculate age if DOB changes
            if (name === 'dob' && value) {
                const birthDate = new Date(value);
                const today = new Date();
                let age = today.getFullYear() - birthDate.getFullYear();
                const m = today.getMonth() - birthDate.getMonth();
                if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
                    age--;
                }
                newData.age = age >= 0 ? age.toString() : '';

                if (age > 50) {
                    setError("Volunteer age cannot exceed 50 years.");
                } else {
                    setError("");
                }
            }
            return newData;
        });
    }, []);

    const handleUseFieldData = useCallback(() => {
        if (duplicateInfo?.draft) {
            const d = duplicateInfo.draft;
            setFormData(prev => {
                const newData = {
                    ...prev,
                    first_name: d.first_name || prev.first_name,
                    middle_name: d.middle_name || prev.middle_name,
                    surname: d.surname || prev.surname,
                    dob: d.dob || prev.dob,
                    gender: d.gender || prev.gender,
                    location: d.location || prev.location,
                    address: d.address || prev.address,
                    source: 'field'
                };

                // Calc age immediately
                if (d.dob) {
                    const birthDate = new Date(d.dob);
                    const today = new Date();
                    let age = today.getFullYear() - birthDate.getFullYear();
                    const m = today.getMonth() - birthDate.getMonth();
                    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
                        age--;
                    }
                    newData.age = age >= 0 ? age.toString() : '';
                }
                return newData;
            });
        }
    }, [duplicateInfo]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (formData.contact.length > 10) {
            setError('Please enter a valid 10-digit contact number.');
            return;
        }
        if (duplicateInfo && duplicateInfo.location === 'master') {
            setError('This person is already in the system. Use Search & Register.');
            return;
        }
        setLoading(true);
        setError('');
        try {
            const response = await api.post('/prescreening/', formData);
            navigate('/prescreening-success', { state: { volunteerId: response.data.volunteer_id } });
        } catch (err) {
            setError(err.response?.data?.detail || 'Failed to save pre-screening record');
        } finally {
            setLoading(false);
        }
    };

    // Check if form is valid
    const isFormValid = useMemo(() => {
        return formData.first_name && formData.surname && formData.dob &&
            formData.gender && formData.contact && formData.location &&
            formData.address && formData.occupation && formData.source &&
            !loading && !checking &&
            !(duplicateInfo && duplicateInfo.location === 'master') &&
            !(formData.age && parseInt(formData.age) > 50) &&
            formData.contact.length <= 10;
    }, [formData, loading, checking, duplicateInfo]);

    return (
        <div className="prescreening-container animate-fade-in" style={{ paddingBottom: '4rem' }}>
            <style>{`
                @keyframes gradient-shift {
                    0%, 100% { background-position: 0% 50%; }
                    50% { background-position: 100% 50%; }
                }

                .gradient-card {
                    background: linear-gradient(135deg, rgba(99, 102, 241, 0.05) 0%, rgba(236, 72, 153, 0.05) 100%);
                    border: 1px solid rgba(99, 102, 241, 0.2);
                    border-radius: 24px;
                    overflow: hidden;
                    box-shadow: 0 4px 20px rgba(99, 102, 241, 0.08);
                }

                .form-section {
                    background: white;
                    border-radius: 20px;
                    padding: 2rem;
                    border: 1px solid rgba(99, 102, 241, 0.1);
                    box-shadow: 0 2px 10px rgba(99, 102, 241, 0.05);
                    transition: all 0.3s ease;
                }

                .form-section:hover {
                    box-shadow: 0 8px 25px rgba(99, 102, 241, 0.12);
                    transform: translateY(-2px);
                }

                .input-wrapper {
                    position: relative;
                }

                .spinner-small {
                    width: 16px;
                    height: 16px;
                    border: 2px solid rgba(99, 102, 241, 0.1);
                    border-top-color: #6366f1;
                    border-radius: 50%;
                    animation: spin 0.6s linear infinite;
                }

                @keyframes spin {
                    to { transform: rotate(360deg); }
                }

                @keyframes fade-in {
                    from { opacity: 0; transform: translateY(10px); }
                    to { opacity: 1; transform: translateY(0); }
                }

                .animate-fade-in {
                    animation: fade-in 0.4s ease-out;
                }
            `}</style>

            {/* Enhanced Header */}
            <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '2.5rem',
                flexWrap: 'wrap',
                gap: '1.5rem'
            }}>
                <div>
                    <h1 style={{
                        fontSize: 'clamp(2rem, 6vw, 3.5rem)',
                        fontWeight: '900',
                        marginBottom: '0.3rem',
                        background: 'linear-gradient(135deg, #6366f1 0%, #ec4899 100%)',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                        letterSpacing: '-1.5px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '1rem'
                    }}>
                        <Sparkles size={40} color="#6366f1" />
                        Volunteer Intake
                    </h1>
                    <p style={{ color: '#6b7280', fontSize: '1.05rem', fontWeight: '500' }}>
                        Pre-screening for study eligibility
                    </p>
                </div>
                <div style={{
                    padding: '1rem 1.5rem',
                    borderRadius: '16px',
                    background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.1) 0%, rgba(20, 184, 166, 0.1) 100%)',
                    border: '1px solid rgba(16, 185, 129, 0.3)',
                    boxShadow: '0 4px 15px rgba(16, 185, 129, 0.15)'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.7rem' }}>
                        <div style={{
                            width: '10px',
                            height: '10px',
                            borderRadius: '50%',
                            background: '#10b981',
                            boxShadow: '0 0 10px rgba(16, 185, 129, 0.5)',
                            animation: 'pulse 2s ease-in-out infinite'
                        }} />
                        <span style={{ color: '#10b981', fontWeight: '700', fontSize: '0.95rem' }}>
                            Active Enrollment
                        </span>
                    </div>
                </div>
            </div>

            {/* Main Form Card */}
            <div className="gradient-card">
                {/* Card Header */}
                <div style={{
                    padding: '2rem 2.5rem',
                    background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.12) 0%, rgba(236, 72, 153, 0.12) 100%)',
                    borderBottom: '1px solid rgba(99, 102, 241, 0.2)'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <div style={{
                            width: '60px',
                            height: '60px',
                            borderRadius: '16px',
                            background: 'linear-gradient(135deg, #6366f1, #ec4899)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            boxShadow: '0 8px 20px rgba(99, 102, 241, 0.4)'
                        }}>
                            <UserPlus color="white" size={30} />
                        </div>
                        <div>
                            <h2 style={{ fontSize: '1.8rem', fontWeight: '800', margin: 0, marginBottom: '0.3rem' }}>
                                New Volunteer
                            </h2>
                            <p style={{ color: '#6b7280', fontSize: '0.95rem', margin: 0 }}>
                                Field Enrollment Form
                            </p>
                        </div>
                    </div>
                </div>

                {/* Error Alert */}
                {error && (
                    <div className="animate-fade-in" style={{
                        margin: '2rem 2.5rem 0',
                        backgroundColor: 'rgba(239, 68, 68, 0.1)',
                        color: '#ef4444',
                        padding: '1rem 1.2rem',
                        borderRadius: '12px',
                        border: '1px solid rgba(239, 68, 68, 0.3)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.8rem',
                        fontWeight: '600',
                        boxShadow: '0 4px 15px rgba(239, 68, 68, 0.15)'
                    }}>
                        <AlertCircle size={20} />
                        {error}
                    </div>
                )}

                {/* Form */}
                <form onSubmit={handleSubmit} style={{ padding: '2.5rem' }}>
                    {/* Personal Information Section */}
                    <div className="form-section">
                        <h3 style={{
                            fontSize: '1.3rem',
                            fontWeight: '700',
                            marginBottom: '1.5rem',
                            color: '#111827',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem'
                        }}>
                            <div style={{
                                width: '4px',
                                height: '20px',
                                background: 'linear-gradient(to bottom, #6366f1, #ec4899)',
                                borderRadius: '2px'
                            }} />
                            Personal Information
                        </h3>
                        <div style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                            gap: '1.5rem'
                        }}>
                            <Input label="First Name" name="first_name" value={formData.first_name}
                                onChange={handleChange} required placeholder="Enter first name" />
                            <Input label="Middle Name" name="middle_name" value={formData.middle_name}
                                onChange={handleChange} placeholder="Enter middle name (optional)" />
                            <Input label="Surname" name="surname" value={formData.surname}
                                onChange={handleChange} required placeholder="Enter surname" />

                            <div style={{ display: 'flex', gap: '1rem' }}>
                                <div style={{ flex: 1 }}>
                                    <Input label="Date of Birth" name="dob" type="date"
                                        value={formData.dob} onChange={handleChange} required />
                                </div>
                                <div style={{ width: '90px' }}>
                                    <Input
                                        label="Age"
                                        name="age"
                                        value={formData.age}
                                        readOnly
                                        placeholder="Auto"
                                        style={{
                                            background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.05), rgba(236, 72, 153, 0.05))',
                                            cursor: 'default',
                                            textAlign: 'center',
                                            fontWeight: '700'
                                        }}
                                    />
                                </div>
                            </div>

                            <Select
                                label="Gender"
                                name="gender"
                                value={formData.gender}
                                onChange={handleChange}
                                options={[
                                    { label: 'Male', value: 'male' },
                                    { label: 'Female', value: 'female' },
                                    { label: 'Kids (7 to 11)', value: 'kids_7_11' },
                                    { label: 'Female Minor', value: 'female_minor' },
                                    { label: 'Male Minor', value: 'male_minor' }
                                ]}
                                required
                            />

                            <div className="input-wrapper">
                                <Input
                                    label="Contact Number"
                                    name="contact"
                                    value={formData.contact}
                                    onChange={handleChange}
                                    required
                                    icon={checking ? null : (duplicateInfo || formData.contact.length > 10 ? AlertCircle : null)}
                                />
                                {checking && (
                                    <div className="spinner-small" style={{
                                        position: 'absolute',
                                        right: '1rem',
                                        top: '2.5rem'
                                    }} />
                                )}
                                {formData.contact.length > 10 && (
                                    <p style={{
                                        fontSize: '0.85rem',
                                        color: '#ef4444',
                                        marginTop: '0.5rem',
                                        fontWeight: '600',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '0.3rem'
                                    }}>
                                        <AlertCircle size={14} /> Incorrect number
                                    </p>
                                )}
                                {formData.contact.length <= 10 && (
                                    <DuplicateAlert
                                        duplicateInfo={duplicateInfo}
                                        onUseFieldData={handleUseFieldData}
                                    />
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Enrollment Details Section */}
                    <div className="form-section" style={{ marginTop: '2rem' }}>
                        <h3 style={{
                            fontSize: '1.3rem',
                            fontWeight: '700',
                            marginBottom: '1.5rem',
                            color: '#111827',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem'
                        }}>
                            <div style={{
                                width: '4px',
                                height: '20px',
                                background: 'linear-gradient(to bottom, #10b981, #14b8a6)',
                                borderRadius: '2px'
                            }} />
                            Enrollment Details
                        </h3>
                        <div style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                            gap: '1.5rem'
                        }}>
                            <Input label="Date of Enrolling" name="date_of_enrolling" type="date"
                                value={formData.date_of_enrolling} onChange={handleChange} required />
                            <Input label="Occupation" name="occupation" value={formData.occupation}
                                onChange={handleChange} required />
                            <Select
                                label="Source"
                                name="source"
                                value={formData.source}
                                onChange={handleChange}
                                options={[
                                    { label: 'Website', value: 'website' },
                                    { label: 'Field', value: 'field' },
                                    { label: 'Referral', value: 'referral' }
                                ]}
                                required
                            />
                        </div>
                    </div>

                    {/* ID Verification Section */}
                    <div className="form-section" style={{ marginTop: '2rem' }}>
                        <h3 style={{
                            fontSize: '1.3rem',
                            fontWeight: '700',
                            marginBottom: '1.5rem',
                            color: '#111827',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem'
                        }}>
                            <div style={{
                                width: '4px',
                                height: '20px',
                                background: 'linear-gradient(to bottom, #f59e0b, #fbbf24)',
                                borderRadius: '2px'
                            }} />
                            ID Verification
                        </h3>
                        <div style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
                            gap: '1.5rem'
                        }}>
                            <Select
                                label="ID Proof Type"
                                name="id_proof_type"
                                value={formData.id_proof_type}
                                onChange={handleChange}
                                options={[
                                    { label: 'Aadhar Card', value: 'aadhar' },
                                    { label: 'PAN Card', value: 'pan' },
                                    { label: 'College ID', value: 'college_id' },
                                    { label: 'Voter ID', value: 'voter_id' },
                                    { label: 'Driving License', value: 'driving_license' },
                                    { label: 'Other', value: 'other' }
                                ]}
                            />
                            <div className="input-wrapper">
                                <Input
                                    label="ID Proof Number"
                                    name="id_proof_number"
                                    value={formData.id_proof_number}
                                    onChange={handleChange}
                                    placeholder="Enter ID Number"
                                    icon={checking ? null : (duplicateInfo?.match_type === 'id_proof' ? AlertCircle : null)}
                                />
                                {duplicateInfo?.match_type === 'id_proof' && (
                                    <div className="duplicate-alert duplicate-master" style={{
                                        marginTop: '0.5rem',
                                        padding: '0.8rem',
                                        borderRadius: '12px',
                                        background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.1) 0%, rgba(251, 191, 36, 0.1) 100%)',
                                        border: '1px solid rgba(245, 158, 11, 0.3)'
                                    }}>
                                        <p style={{
                                            fontSize: '0.85rem',
                                            color: '#f59e0b',
                                            fontWeight: '700',
                                            marginBottom: '0.5rem'
                                        }}>
                                            <AlertCircle size={16} style={{ display: 'inline', marginRight: '0.3rem' }} />
                                            ID Proof Already Registered
                                        </p>
                                        <Link to="/search" state={{ highlight: duplicateInfo.master_id }}
                                            style={{
                                                fontSize: '0.85rem',
                                                color: '#f59e0b',
                                                textDecoration: 'underline',
                                                fontWeight: '600'
                                            }}>
                                            View Existing Record →
                                        </Link>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Location Section */}
                    <div className="form-section" style={{ marginTop: '2rem' }}>
                        <h3 style={{
                            fontSize: '1.3rem',
                            fontWeight: '700',
                            marginBottom: '1.5rem',
                            color: '#111827',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem'
                        }}>
                            <div style={{
                                width: '4px',
                                height: '20px',
                                background: 'linear-gradient(to bottom, #ec4899, #f472b6)',
                                borderRadius: '2px'
                            }} />
                            Location Information
                        </h3>
                        <div style={{ display: 'grid', gap: '1.5rem' }}>
                            <Input label="Location" name="location" value={formData.location}
                                onChange={handleChange} required placeholder="City, Area or Locality" />
                            <Input label="Address" name="address" value={formData.address}
                                onChange={handleChange} required placeholder="Full detailed address" />
                        </div>
                    </div>

                    {/* Submit Button */}
                    <div style={{
                        marginTop: '3rem',
                        display: 'flex',
                        justifyContent: 'center',
                        alignItems: 'center'
                    }}>
                        <button
                            type="submit"
                            disabled={!isFormValid}
                            style={{
                                width: '100%',
                                maxWidth: '500px',
                                padding: '1.3rem 2.5rem',
                                background: isFormValid
                                    ? 'linear-gradient(135deg, #6366f1 0%, #ec4899 100%)'
                                    : 'rgba(107, 114, 128, 0.3)',
                                border: 'none',
                                borderRadius: '16px',
                                color: 'white',
                                fontSize: '1.1rem',
                                fontWeight: '800',
                                cursor: isFormValid ? 'pointer' : 'not-allowed',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '0.8rem',
                                boxShadow: isFormValid
                                    ? '0 8px 25px rgba(99, 102, 241, 0.4)'
                                    : 'none',
                                transition: 'all 0.3s ease',
                                textTransform: 'uppercase',
                                letterSpacing: '0.5px'
                            }}
                            onMouseEnter={(e) => {
                                if (isFormValid) {
                                    e.currentTarget.style.transform = 'translateY(-3px)';
                                    e.currentTarget.style.boxShadow = '0 12px 35px rgba(99, 102, 241, 0.5)';
                                }
                            }}
                            onMouseLeave={(e) => {
                                if (isFormValid) {
                                    e.currentTarget.style.transform = 'translateY(0)';
                                    e.currentTarget.style.boxShadow = '0 8px 25px rgba(99, 102, 241, 0.4)';
                                }
                            }}
                        >
                            {loading ? (
                                <>
                                    <Loader className="spinner-small" style={{ animation: 'spin 0.6s linear infinite' }} size={20} />
                                    Saving...
                                </>
                            ) : (
                                <>
                                    <Save size={22} />
                                    Save Enrollment
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default PreScreeningForm;
