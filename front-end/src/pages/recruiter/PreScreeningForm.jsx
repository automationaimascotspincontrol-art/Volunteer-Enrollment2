import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import api from '../../api/api';
import { Input, Select, Button } from '../../components/ui';
import { UserPlus, Save, AlertCircle } from 'lucide-react';
import '../../styles/PreScreeningForm.css';

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
                source: 'field' // Default source if imported from field visit
            }));
        }
    }, [location.state]);

    // Check for duplicates when contact or ID number changes
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
                    if (response.data.exists) {
                        setDuplicateInfo(response.data);
                    } else {
                        setDuplicateInfo(null);
                    }
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

    const handleChange = (e) => {
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
    };

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

    return (
        <div className="prescreening-container animate-fade-in">
            <div className="prescreening-header mobile-flex-center">
                <div className="mobile-text-center">
                    <h1 className="prescreening-title">
                        Volunteer Intake
                    </h1>
                    <p className="text-muted" style={{ fontSize: '0.95rem' }}>Initial pre-screening for study eligibility</p>
                </div>
                <div className="status-badge mobile-flex-center">
                    <span className="text-muted">Status: </span>
                    <span className="text-success" style={{ fontWeight: '600' }}>Active Enrollment</span>
                </div>
            </div>

            <div className="glass-card prescreening-card">
                <div className="section-header mobile-flex-center">
                    <div className="icon-box hide-mobile">
                        <UserPlus color="white" size={24} />
                    </div>
                    <div className="mobile-text-center">
                        <h2 style={{ fontSize: '1.5rem', fontWeight: '700' }}>New Volunteer</h2>
                        <p className="text-muted">Field Enrollment Form</p>
                    </div>
                </div>

                {error && (
                    <div style={{ backgroundColor: 'rgba(244, 63, 94, 0.1)', color: 'var(--error)', padding: '0.8rem', borderRadius: '12px', marginBottom: '1.5rem', border: '1px solid rgba(244, 63, 94, 0.2)' }}>
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit}>
                    <div className="form-grid-3">
                        <Input label="First Name" name="first_name" value={formData.first_name} onChange={handleChange} required placeholder="Enter first name" />
                        <Input label="Middle Name" name="middle_name" value={formData.middle_name} onChange={handleChange} placeholder="Enter middle name (optional)" />
                        <Input label="Surname" name="surname" value={formData.surname} onChange={handleChange} required placeholder="Enter surname" />
                        <div style={{ display: 'flex', gap: '1rem' }}>
                            <div style={{ flex: 1 }}>
                                <Input label="Date of Birth" name="dob" type="date" value={formData.dob} onChange={handleChange} required />
                            </div>
                            <div style={{ width: '80px' }}>
                                <Input
                                    label="Age"
                                    name="age"
                                    value={formData.age}
                                    readOnly
                                    placeholder="Cal"
                                    style={{ backgroundColor: 'rgba(255,255,255,0.05)', cursor: 'default' }}
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
                        <div style={{ position: 'relative' }}>
                            <Input
                                label="Contact Number"
                                name="contact"
                                value={formData.contact}
                                onChange={handleChange}
                                required
                                icon={checking ? null : (duplicateInfo || formData.contact.length > 10 ? AlertCircle : null)}
                            />
                            {checking && <div className="spinner-small" style={{ position: 'absolute', right: '1rem', top: '2.5rem' }} />}
                            {formData.contact.length > 10 && (
                                <p style={{ fontSize: '0.8rem', color: 'var(--error)', marginTop: '0.4rem', fontWeight: '600' }}>
                                    ⚠️ Incorrect number
                                </p>
                            )}
                            {duplicateInfo && formData.contact.length <= 10 && (
                                <div className={`duplicate-alert ${duplicateInfo.location === 'field' ? 'duplicate-field' : 'duplicate-master'}`}>
                                    <p style={{
                                        fontSize: '0.8rem',
                                        color: duplicateInfo.location === 'field' ? '#00bbff' : 'var(--accent)',
                                        fontWeight: '600',
                                        marginBottom: '0.5rem'
                                    }}>
                                        {duplicateInfo.location === 'field'
                                            ? 'ℹ️ Existing Field Visit Record Found'
                                            : '⚠️ Already in Master Database'}
                                    </p>
                                    {duplicateInfo.location === 'field' ? (
                                        <button
                                            type="button"
                                            onClick={() => {
                                                if (duplicateInfo.draft) {
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
                                            }}
                                            className="use-field-btn"
                                        >
                                            ⬇️ Use Field Data
                                        </button>
                                    ) : (
                                        <Link to="/search" state={{ highlight: duplicateInfo.master_id }} style={{ fontSize: '0.75rem', color: 'white', textDecoration: 'underline', fontWeight: '500' }}>
                                            Check in Search & Register →
                                        </Link>
                                    )}
                                </div>
                            )}
                        </div>
                        <Input label="Date of Enrolling" name="date_of_enrolling" type="date" value={formData.date_of_enrolling} onChange={handleChange} required />
                        <Input label="Occupation" name="occupation" value={formData.occupation} onChange={handleChange} required />
                        <Select
                            label="Source"
                            name="source"
                            value={formData.source}
                            onChange={handleChange}
                            options={[
                                { label: 'Word of Mouth', value: 'word_of_mouth' },
                                { label: 'Field', value: 'field' },
                                { label: 'Referral', value: 'referral' }
                            ]}
                            required
                        ></Select>

                        <div style={{ gridColumn: '1 / -1', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2.5rem' }}>
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
                            <div style={{ position: 'relative' }}>
                                <Input
                                    label="ID Proof Number"
                                    name="id_proof_number"
                                    value={formData.id_proof_number}
                                    onChange={handleChange}
                                    placeholder="Enter ID Number"
                                    icon={checking ? null : (duplicateInfo?.match_type === 'id_proof' ? AlertCircle : null)}
                                />
                                {duplicateInfo?.match_type === 'id_proof' && (
                                    <div className="duplicate-alert duplicate-master">
                                        <p style={{
                                            fontSize: '0.8rem',
                                            color: 'var(--accent)',
                                            fontWeight: '600',
                                            marginBottom: '0.5rem'
                                        }}>
                                            ⚠️ ID Proof Already Registered
                                        </p>
                                        <Link to="/search" state={{ highlight: duplicateInfo.master_id }} style={{ fontSize: '0.75rem', color: 'white', textDecoration: 'underline', fontWeight: '500' }}>
                                            View Existing Record →
                                        </Link>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    <div style={{ marginTop: '1.5rem' }}>
                        <Input label="Location" name="location" value={formData.location} onChange={handleChange} required placeholder="City, Area or Locality" />
                    </div>

                    <div style={{ marginTop: '1.5rem' }}>
                        <Input label="Address" name="address" value={formData.address} onChange={handleChange} required placeholder="Full detailed address" />
                    </div>

                    <div className="submit-container">
                        <Button
                            type="submit"
                            loading={loading}
                            icon={Save}
                            disabled={(duplicateInfo && duplicateInfo.location === 'master') || checking || (formData.age && parseInt(formData.age) > 50)}
                            className="w-full-mobile submit-btn"
                        >
                            Save Enrollment
                        </Button>
                    </div>
                </form>
            </div >
        </div >
    );
};

export default PreScreeningForm;
