import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../api/api';
import { Input, Select, Button, TextArea } from '../../components/ui';
import { MapPin, Save, AlertCircle, CheckCircle, PlusCircle, Sparkles } from 'lucide-react';

const FieldForm = () => {
    const [formData, setFormData] = useState({
        date_of_registration: new Date().toISOString().split('T')[0],
        first_name: '',
        middle_name: '',
        surname: '',
        address: '',
        location: '',
        dob: '',
        contact: '',
        gender: ''
    });
    const [loading, setLoading] = useState(false);
    const [checking, setChecking] = useState(false);
    const [duplicateInfo, setDuplicateInfo] = useState(null);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);

    // Check for duplicates when contact changes
    useEffect(() => {
        const delayDebounceFn = setTimeout(async () => {
            if (formData.contact.length >= 9 && formData.contact.length <= 10) {
                setChecking(true);
                try {
                    const response = await api.get(`/field/check-duplicate?contact=${formData.contact}`);
                    if (response.data.exists) {
                        setDuplicateInfo(response.data);
                    } else {
                        setDuplicateInfo(null);
                    }
                } catch (err) {
                    console.error('Error checking duplicate:', err);
                    setDuplicateInfo(null);
                } finally {
                    setChecking(false);
                }
            } else {
                setDuplicateInfo(null);
            }
        }, 300);

        return () => clearTimeout(delayDebounceFn);
    }, [formData.contact]);

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (formData.contact.length < 9 || formData.contact.length > 10) {
            setError('Please enter a valid 10-digit contact number.');
            return;
        }
        if (duplicateInfo) {
            setError('Cannot submit: Duplicate contact found.');
            return;
        }
        setLoading(true);
        setError('');

        try {
            await api.post('/field/visit', formData);
            setSuccess(true);
        } catch (err) {
            setError(err.response?.data?.detail || 'Failed to save field visit');
        } finally {
            setLoading(false);
        }
    };

    const resetForm = () => {
        setFormData({
            date_of_registration: new Date().toISOString().split('T')[0],
            first_name: '',
            middle_name: '',
            surname: '',
            address: '',
            location: '',
            dob: '',
            contact: '',
            gender: ''
        });
        setDuplicateInfo(null);
        setError('');
        setSuccess(false);
    };

    if (success) {
        return (
            <div style={{
                minHeight: '100vh',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '2rem',
                background: '#f8fafc'
            }}>
                <style>{`
                    @keyframes checkmark {
                        0% { transform: scale(0); opacity: 0; }
                        50% { transform: scale(1.2); }
                        100% { transform: scale(1); opacity: 1; }
                    }
                    @keyframes fadeIn {
                        from { opacity: 0; transform: translateY(20px); }
                        to { opacity: 1; transform: translateY(0); }
                    }
                `}</style>

                <div style={{
                    maxWidth: '500px',
                    width: '100%',
                    textAlign: 'center',
                    padding: '3rem 2rem',
                    background: 'white',
                    borderRadius: '24px',
                    boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08)',
                    animation: 'fadeIn 0.5s ease-out'
                }}>
                    <div style={{
                        width: '100px',
                        height: '100px',
                        margin: '0 auto 2rem',
                        background: 'linear-gradient(135deg, #10b981 0%, #14b8a6 100%)',
                        borderRadius: '50%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        boxShadow: '0 10px 30px rgba(16, 185, 129, 0.3)',
                        animation: 'checkmark 0.6s cubic-bezier(0.68, -0.55, 0.265, 1.55) 0.2s both'
                    }}>
                        <CheckCircle size={56} color="white" strokeWidth={3} />
                    </div>

                    <h2 style={{
                        fontSize: '2.2rem',
                        fontWeight: '900',
                        color: '#0f172a',
                        margin: '0 0 1rem 0',
                        letterSpacing: '-0.02em'
                    }}>
                        Visit Recorded!
                    </h2>

                    <p style={{
                        color: '#64748b',
                        fontSize: '1.1rem',
                        margin: '0 0 2.5rem 0',
                        lineHeight: '1.6'
                    }}>
                        Field visit data has been successfully saved to the database.
                    </p>

                    <Button
                        onClick={resetForm}
                        icon={PlusCircle}
                        style={{
                            width: '100%',
                            padding: '1rem',
                            background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
                            border: 'none',
                            borderRadius: '16px',
                            color: 'white',
                            fontSize: '1.05rem',
                            fontWeight: '700',
                            boxShadow: '0 8px 24px rgba(99, 102, 241, 0.3)',
                            transition: 'all 0.3s ease'
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
                        onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
                    >
                        Add Another Visitor
                    </Button>
                </div>
            </div>
        );
    }

    return (
        <div style={{
            minHeight: '100vh',
            background: '#f8fafc',
            padding: '2rem',
            fontFamily: "'Outfit', sans-serif"
        }}>
            <style>{`
                @keyframes fadeIn {
                    from { opacity: 0; transform: translateY(20px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                @keyframes slideDown {
                    from { opacity: 0; transform: translateY(-10px); }
                    to { opacity: 1; transform: translateY(0); }
                }
            `}</style>

            <div style={{
                maxWidth: '900px',
                margin: '0 auto',
                animation: 'fadeIn 0.6s ease-out'
            }}>
                {/* Header Section with Gradient */}
                <div style={{
                    background: 'linear-gradient(135deg, #ec4899 0%, #8b5cf6 50%, #6366f1 100%)',
                    borderRadius: '24px 24px 0 0',
                    padding: '2.5rem 2rem',
                    position: 'relative',
                    overflow: 'hidden',
                    marginBottom: '-1px'
                }}>
                    {/* Background Pattern */}
                    <div style={{
                        position: 'absolute',
                        top: '-50%',
                        right: '-10%',
                        width: '300px',
                        height: '300px',
                        background: 'radial-gradient(circle, rgba(255,255,255,0.1) 0%, transparent 70%)',
                        borderRadius: '50%'
                    }} />

                    <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', position: 'relative', zIndex: 1 }}>
                        <div style={{
                            padding: '1.2rem',
                            background: 'rgba(255, 255, 255, 0.2)',
                            backdropFilter: 'blur(10px)',
                            borderRadius: '18px',
                            border: '1px solid rgba(255, 255, 255, 0.3)'
                        }}>
                            <MapPin color="white" size={32} strokeWidth={2.5} />
                        </div>
                        <div>
                            <div style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '0.5rem',
                                padding: '0.4rem 1rem',
                                background: 'rgba(255, 255, 255, 0.15)',
                                borderRadius: '50px',
                                marginBottom: '0.75rem',
                                border: '1px solid rgba(255, 255, 255, 0.2)'
                            }}>
                                <Sparkles size={14} color="white" />
                                <span style={{ fontSize: '0.75rem', color: 'white', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                    Field Data Collection
                                </span>
                            </div>
                            <h2 style={{
                                fontSize: '2.5rem',
                                fontWeight: '950',
                                color: 'white',
                                margin: '0 0 0.3rem 0',
                                letterSpacing: '-0.03em'
                            }}>
                                Field Visit Entry
                            </h2>
                            <p style={{
                                color: 'rgba(255, 255, 255, 0.9)',
                                fontSize: '1.05rem',
                                margin: 0
                            }}>
                                Register new visitors from ground-level outreach
                            </p>
                        </div>
                    </div>
                </div>

                {/* Form Card */}
                <div style={{
                    background: 'white',
                    borderRadius: '0 0 24px 24px',
                    padding: '3rem 2.5rem',
                    boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08)'
                }}>
                    {error && (
                        <div style={{
                            backgroundColor: 'rgba(244, 63, 94, 0.08)',
                            color: '#dc2626',
                            padding: '1rem 1.25rem',
                            borderRadius: '16px',
                            marginBottom: '2rem',
                            border: '1px solid rgba(244, 63, 94, 0.2)',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.75rem',
                            animation: 'slideDown 0.3s ease-out'
                        }}>
                            <AlertCircle size={20} />
                            <span style={{ fontWeight: '600' }}>{error}</span>
                        </div>
                    )}

                    <form onSubmit={handleSubmit}>
                        {/* Name Section */}
                        <div style={{ marginBottom: '2.5rem' }}>
                            <h3 style={{
                                fontSize: '1.1rem',
                                fontWeight: '700',
                                color: '#0f172a',
                                marginBottom: '1.5rem',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.5rem'
                            }}>
                                <div style={{ width: '4px', height: '20px', background: '#ec4899', borderRadius: '2px' }} />
                                Personal Information
                            </h3>

                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 220px), 1fr))', gap: '1.5rem' }}>
                                <Input label="Date of Registration" name="date_of_registration" type="date" value={formData.date_of_registration} onChange={handleChange} required />
                                <Input label="First Name" name="first_name" value={formData.first_name} onChange={handleChange} required placeholder="First Name" />
                                <Input label="Middle Name" name="middle_name" value={formData.middle_name} onChange={handleChange} placeholder="Middle Name" />
                                <Input label="Surname" name="surname" value={formData.surname} onChange={handleChange} required placeholder="Surname" />
                            </div>
                        </div>

                        {/* Contact Details */}
                        <div style={{ marginBottom: '2.5rem' }}>
                            <h3 style={{
                                fontSize: '1.1rem',
                                fontWeight: '700',
                                color: '#0f172a',
                                marginBottom: '1.5rem',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.5rem'
                            }}>
                                <div style={{ width: '4px', height: '20px', background: '#8b5cf6', borderRadius: '2px' }} />
                                Contact \u0026 Demographics
                            </h3>

                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 220px), 1fr))', gap: '1.5rem' }}>
                                <Input label="Date of Birth" name="dob" type="date" value={formData.dob} onChange={handleChange} required />

                                <div style={{ position: 'relative' }}>
                                    <Input
                                        label="Contact Number"
                                        name="contact"
                                        value={formData.contact}
                                        onChange={handleChange}
                                        required
                                        icon={checking ? null : (duplicateInfo || formData.contact.length > 10 ? AlertCircle : null)}
                                        placeholder="10-digit Mobile"
                                    />
                                    {checking && <div className="spinner-small" style={{ position: 'absolute', right: '1rem', top: '2.5rem' }} />}

                                    {(formData.contact.length > 0 && (formData.contact.length < 9 || formData.contact.length > 10)) && (
                                        <p style={{ fontSize: '0.8rem', color: '#dc2626', marginTop: '0.4rem', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                                            <AlertCircle size={14} /> Incorrect number
                                        </p>
                                    )}

                                    {duplicateInfo && (
                                        <p style={{ fontSize: '0.8rem', color: '#dc2626', marginTop: '0.4rem', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                                            <AlertCircle size={14} /> Already Registered
                                        </p>
                                    )}
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
                            </div>
                        </div>

                        {/* Location & Address */}
                        <div style={{ marginBottom: '3rem' }}>
                            <h3 style={{
                                fontSize: '1.1rem',
                                fontWeight: '700',
                                color: '#0f172a',
                                marginBottom: '1.5rem',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.5rem'
                            }}>
                                <div style={{ width: '4px', height: '20px', background: '#6366f1', borderRadius: '2px' }} />
                                Location Details
                            </h3>

                            <div style={{ marginBottom: '1.5rem' }}>
                                <Input label="Location" name="location" value={formData.location} onChange={handleChange} required placeholder="Area / City" />
                            </div>

                            <TextArea label="Address" name="address" value={formData.address} onChange={handleChange} required placeholder="Full residential address" />
                        </div>

                        <Button
                            type="submit"
                            loading={loading}
                            icon={Save}
                            disabled={!!duplicateInfo || checking}
                            style={{
                                width: '100%',
                                padding: '1.1rem',
                                background: loading || duplicateInfo || checking ? '#cbd5e1' : 'linear-gradient(135deg, #ec4899 0%, #8b5cf6 50%, #6366f1 100%)',
                                border: 'none',
                                borderRadius: '16px',
                                color: 'white',
                                fontSize: '1.1rem',
                                fontWeight: '700',
                                cursor: (loading || duplicateInfo || checking) ? 'not-allowed' : 'pointer',
                                boxShadow: (loading || duplicateInfo || checking) ? 'none' : '0 8px 24px rgba(236, 72, 153, 0.3)',
                                transition: 'all 0.3s ease'
                            }}
                            onMouseEnter={(e) => !(loading || duplicateInfo || checking) && (e.currentTarget.style.transform = 'translateY(-2px)')}
                            onMouseLeave={(e) => !(loading || duplicateInfo || checking) && (e.currentTarget.style.transform = 'translateY(0)')}
                        >
                            {loading ? 'Saving...' : 'Save Visit'}
                        </Button>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default FieldForm;
