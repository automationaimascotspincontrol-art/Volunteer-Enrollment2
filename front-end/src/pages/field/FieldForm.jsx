import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../api/api';
import { Input, Select, Button, TextArea } from '../../components/ui';
import { MapPin, Save, AlertCircle, CheckCircle, PlusCircle } from 'lucide-react';

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
            <div className="container animate-fade-in" style={{ textAlign: 'center', marginTop: '5rem' }}>
                <div className="glass-card" style={{ maxWidth: '400px', margin: '0 auto' }}>
                    <CheckCircle size={64} color="var(--accent)" style={{ marginBottom: '1.5rem' }} />
                    <h2 style={{ fontSize: '2rem', fontWeight: '700', marginBottom: '1rem' }}>Visit Recorded!</h2>
                    <p style={{ color: 'var(--text-muted)', marginBottom: '2rem' }}>Field visit data has been successfully saved.</p>

                    <div style={{ display: 'flex', justifyContent: 'center', marginTop: '1rem' }}>
                        <Button onClick={resetForm} variant="primary" icon={PlusCircle}>
                            Add Another Visitor
                        </Button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="container animate-fade-in" style={{ paddingBottom: '4rem' }}>
            <div className="glass-card">
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '2rem' }}>
                    <div style={{ padding: '0.8rem', background: 'var(--secondary)', borderRadius: '12px' }}>
                        <MapPin color="white" size={24} />
                    </div>
                    <div>
                        <h2 style={{ fontSize: '1.5rem', fontWeight: '700' }}>Field Visit Entry</h2>
                        <p style={{ color: 'var(--text-muted)' }}>Ground-level data collection</p>
                    </div>
                </div>

                {error && (
                    <div style={{ backgroundColor: 'rgba(244, 63, 94, 0.1)', color: 'var(--error)', padding: '0.8rem', borderRadius: '12px', marginBottom: '1.5rem', border: '1px solid rgba(244, 63, 94, 0.2)' }}>
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit}>
                    {/* Name Section */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 200px), 1fr))', gap: '1.5rem', marginBottom: '1.5rem' }}>
                        <Input label="Date of Registration" name="date_of_registration" type="date" value={formData.date_of_registration} onChange={handleChange} required />
                        <Input label="First Name" name="first_name" value={formData.first_name} onChange={handleChange} required placeholder="First Name" />
                        <Input label="Middle Name" name="middle_name" value={formData.middle_name} onChange={handleChange} placeholder="Middle Name" />
                        <Input label="Surname" name="surname" value={formData.surname} onChange={handleChange} required placeholder="Surname" />
                    </div>

                    {/* Personal Details */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 200px), 1fr))', gap: '1.5rem', marginBottom: '1.5rem' }}>
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
                                <p style={{ fontSize: '0.8rem', color: 'red', marginTop: '0.4rem', fontWeight: '600' }}>
                                    ⚠️ Incorrect number
                                </p>
                            )}

                            {duplicateInfo && (
                                <p style={{ fontSize: '0.8rem', color: 'red', marginTop: '0.4rem', fontWeight: '600' }}>
                                    ⚠️ Already Registered
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

                    {/* Location & Address */}
                    <div style={{ marginBottom: '1.5rem' }}>
                        <Input label="Location" name="location" value={formData.location} onChange={handleChange} required placeholder="Area / City" />
                    </div>

                    <div style={{ marginBottom: '2.5rem' }}>
                        <TextArea label="Address" name="address" value={formData.address} onChange={handleChange} required placeholder="Full residential address" />
                    </div>

                    <div style={{ marginTop: '2.5rem' }}>
                        <Button
                            type="submit"
                            loading={loading}
                            icon={Save}
                            disabled={!!duplicateInfo || checking}
                            className="w-full-mobile"
                            style={{ width: '100%' }}
                        >
                            Save Visit
                        </Button>
                    </div>
                </form>
            </div>

        </div>
    );
};

export default FieldForm;
