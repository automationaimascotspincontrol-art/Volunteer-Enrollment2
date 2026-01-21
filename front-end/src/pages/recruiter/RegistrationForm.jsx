import React, { useState, useEffect } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import api from '../../api/api';
import { Input, Select, TextArea, Button, MultiSelect } from '../../components/ui';
import { ClipboardCheck, ShieldCheck } from 'lucide-react';
import '../../styles/RegistrationForm.css';

const RegistrationForm = () => {
    const { id } = useParams();
    const location = useLocation();
    const navigate = useNavigate();
    const [volunteer, setVolunteer] = useState(location.state?.volunteer || null);
    const [loading, setLoading] = useState(!volunteer);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');

    const [formData, setFormData] = useState({
        date_of_registration: new Date().toISOString().split('T')[0],
        fit_status: '',
        remarks: '',
        study_assigned: [],
        gender: '',
        address: '',
        age: '',
        dob: '',
        contact: '',
        id_proof_type: '',
        id_proof_number: ''
    });

    const [clinicalStudies, setClinicalStudies] = useState([]);

    useEffect(() => {
        const loadInitialData = async () => {
            try {
                const [volunteerRes, studiesRes] = await Promise.all([
                    volunteer ? Promise.resolve({ data: volunteer }) : api.get(`/volunteers/search/master?id=${id}`),
                    api.get('/clinical/clinical-studies')  // Changed to clinical-studies endpoint
                ]);

                let volData = volunteerRes.data;
                // Fix: Search API returns an array, but we need a single object
                if (Array.isArray(volData)) {
                    if (volData.length > 0) {
                        volData = volData[0];
                    } else {
                        throw new Error("Volunteer not found");
                    }
                }

                if (!volunteer) setVolunteer(volData);
                // Handle new endpoint structure { studies: [], total: N }
                setClinicalStudies(studiesRes.data.studies || []);

                // Pre-fill fields
                let calculatedAge = '';
                if (volData.pre_screening?.dob) {
                    try {
                        const birthYear = new Date(volData.pre_screening.dob).getFullYear();
                        const currentYear = new Date().getFullYear();
                        calculatedAge = (currentYear - birthYear).toString();
                    } catch (e) { console.error("Age calc error", e); }
                }

                setFormData(prev => ({
                    ...prev,
                    gender: prev.gender || (volData.pre_screening?.gender === 'unknown' ? '' : volData.pre_screening?.gender) || '',
                    age: prev.age || calculatedAge,
                    dob: prev.dob || volData.pre_screening?.dob || '',
                    contact: prev.contact || volData.pre_screening?.contact || volData.basic_info?.contact || '',
                    address: prev.address || volData.pre_screening?.address || volData.basic_info?.address || '',
                    id_proof_type: prev.id_proof_type || volData.id_proof_type || volData.pre_screening?.id_proof_type || '',
                    id_proof_number: prev.id_proof_number || volData.id_proof_number || volData.pre_screening?.id_proof_number || ''
                }));

            } catch (err) {
                console.error("Error loading data:", err);
                setError('Could not load required data (Volunteer or Studies)');
            } finally {
                setLoading(false);
            }
        };
        loadInitialData();
    }, [id]); // Removed 'volunteer' to prevent re-fetching when volunteer updates

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSubmitting(true);
        setError('');
        try {
            const response = await api.patch(`/registration/${id}`, formData);
            navigate('/registration-success', {
                state: {
                    volunteerId: id,
                    subjectCode: response.data?.subject_code,
                    status: formData.fit_status
                }
            });
        } catch (err) {
            setError(err.response?.data?.detail || 'Failed to update registration');
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) return <div className="container" style={{ textAlign: 'center', padding: '2rem' }}>Loading...</div>;

    const needsGender = !volunteer.pre_screening.gender || volunteer.pre_screening.gender === 'N/A' || volunteer.pre_screening.gender === '';
    const needsDob = !volunteer.pre_screening.dob || volunteer.pre_screening.dob === '';
    const needsContact = !volunteer.pre_screening.contact || volunteer.pre_screening.contact === 'N/A' || volunteer.pre_screening.contact === '';
    const needsAddress = !volunteer.pre_screening.address || volunteer.pre_screening.address === 'N/A' || volunteer.pre_screening.address === '';

    const needsIdProof = !volunteer.pre_screening.id_proof_type || volunteer.pre_screening.id_proof_type === '' || volunteer.pre_screening.id_proof_type === 'N/A';

    return (
        <div className="registration-container animate-fade-in">
            {/* ... (header and stuff - keeping context is hard with replace_file_content if I don't include it, but I'll target the block) ... */}
            {/* Actually, it's safer to replace the whole return statement or large chunk to insert the variable and the condition cleanly */}
            <div className="registration-header mobile-flex-center">
                <div className="mobile-text-center">
                    <h1 className="page-title-gradient">
                        Medical Registration
                    </h1>
                    <p className="text-muted" style={{ fontWeight: '500', opacity: 0.9 }}>
                        Complete the fit check and study assignment
                    </p>
                </div>
                <div className="volunteer-id-badge hover-lift mobile-flex-center">
                    <span className="text-muted" style={{ fontWeight: '500' }}>ID:</span>
                    <span style={{ color: 'var(--primary)', fontWeight: '900', letterSpacing: '0.5px' }}>{id}</span>
                </div>
            </div>

            <div className="registration-layout">
                {/* Read-only Pre-screening info */}
                <div className="glass-card prescreening-card">
                    <h3 style={{ fontSize: '1.2rem', fontWeight: '800', marginBottom: '1rem', color: 'var(--primary)', letterSpacing: '0.5px' }} className="mobile-text-center">PRE-SCREENING DATA</h3>
                    <div className="info-grid mobile-flex-center">
                        <div className="mobile-text-center"><strong>Name:</strong> {volunteer.pre_screening.name}</div>
                        <div className="mobile-text-center"><strong>ID:</strong> {volunteer.volunteer_id}</div>
                        <div className="mobile-text-center"><strong>DOB:</strong> {volunteer.pre_screening.dob}</div>
                        <div className="mobile-text-center"><strong>Gender:</strong> <span style={{ color: needsGender ? 'var(--error)' : 'inherit' }}>{volunteer.pre_screening.gender || 'Not Provided'}</span></div>
                    </div>
                    <div className="info-note mobile-text-center">
                        <strong style={{ color: 'var(--primary)' }}>Note:</strong> If information is missing above, please update it in the registration form fields.
                    </div>
                </div>

                {/* Registration Form */}
                <div className="glass-card form-card">
                    <div className="form-header mobile-flex-center">
                        <div className="form-icon-wrapper hide-mobile">
                            <ClipboardCheck color="white" size={30} />
                        </div>
                        <div className="mobile-text-center">
                            <h2 style={{ fontSize: '1.6rem', fontWeight: '800', letterSpacing: '0.5px', marginBottom: '0.2rem' }}>Medical Registration</h2>
                            <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', fontWeight: '500' }}>Based on Doctor Advice</p>
                        </div>
                    </div>

                    {error && (
                        <div style={{ backgroundColor: 'rgba(244, 63, 94, 0.1)', color: 'var(--error)', padding: '1.2rem', borderRadius: '16px', marginBottom: '2.5rem', border: '1px solid rgba(244, 63, 94, 0.2)', fontSize: '0.95rem' }} className="mobile-text-center">
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} style={{ flex: 1, display: 'flex', flexDirection: 'column', width: '100%' }}>
                        <div className="form-fields-grid mobile-flex-center registration-grid-inner">
                            <Input
                                label="Date of Registration"
                                name="date_of_registration"
                                type="date"
                                value={formData.date_of_registration}
                                onChange={handleChange}
                                required
                            />
                            <Select
                                label="Fit Status (Doctor Advice)"
                                name="fit_status"
                                value={formData.fit_status}
                                onChange={handleChange}
                                options={[
                                    { label: 'Fit (Yes)', value: 'yes' },
                                    { label: 'Unfit (No)', value: 'no' }
                                ]}
                                required
                            />
                            <Input
                                label="Age"
                                name="age"
                                type="number"
                                value={formData.age}
                                onChange={handleChange}
                                placeholder="Age"
                            />
                        </div>

                        {needsGender && (
                            <div className="missing-field-alert mobile-flex-center">
                                <p className="alert-title">Gender is missing from pre-screening. Please provide it:</p>
                                <Select
                                    label="Gender (Required for Master Record)"
                                    name="gender"
                                    value={formData.gender}
                                    onChange={handleChange}
                                    options={[
                                        { label: 'Male', value: 'male' },
                                        { label: 'Female', value: 'female' },
                                        { label: 'Minor (7-11 yrs)', value: 'kids_7_11' },
                                        { label: 'Female Minor', value: 'female_minor' },
                                        { label: 'Male Minor', value: 'male_minor' }
                                    ]}
                                    required
                                />
                            </div>
                        )}

                        {needsDob && (
                            <div className="missing-field-alert mobile-flex-center">
                                <p className="alert-title">DOB is missing. Please provide it:</p>
                                <Input label="Date of Birth" name="dob" type="date" value={formData.dob} onChange={handleChange} required />
                            </div>
                        )}

                        {needsContact && (
                            <div className="missing-field-alert mobile-flex-center">
                                <p className="alert-title">Contact Number is missing. Please provide it:</p>
                                <Input label="Contact Number" name="contact" value={formData.contact} onChange={handleChange} required />
                            </div>
                        )}

                        {needsAddress && (
                            <div className="missing-field-alert mobile-flex-center">
                                <p className="alert-title">Address is missing. Please provide it:</p>
                                <TextArea label="Address / Location" name="address" value={formData.address} onChange={handleChange} required />
                            </div>
                        )}

                        {/* Assignments - Moved UP as important field */}
                        <div style={{ marginBottom: '2rem' }} className="mobile-flex-center">
                            <MultiSelect
                                label="Assigned Study/Studies (Critical)"
                                name="study_assigned"
                                value={formData.study_assigned}
                                onChange={handleChange}
                                options={clinicalStudies.map(s => {
                                    const studyName = s.enteredStudyName || s.studyName || s.study_name || "Unnamed Study";
                                    const studyCode = s.enteredStudyCode || s.studyInstanceCode || s.study_code;
                                    return {
                                        label: studyCode ? `${studyName} (${studyCode})` : studyName,
                                        value: studyCode
                                    };
                                })}
                                required
                            />
                        </div>

                        {/* ID Proof Section - Only if missing */}
                        {needsIdProof && (
                            <div className="missing-field-alert mobile-flex-center" style={{ marginBottom: '2rem' }}>
                                <p className="alert-title">ID Proof is missing. Please add it if available:</p>
                                <div style={{ display: 'grid', gap: '1.5rem', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', width: '100%' }}>
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
                                        placeholder="Select ID Proof"
                                    />
                                    {formData.id_proof_type && (
                                        <Input label="ID Proof Number" name="id_proof_number" value={formData.id_proof_number} onChange={handleChange} placeholder="Enter ID Number" required />
                                    )}
                                </div>
                            </div>
                        )}

                        <div className="mobile-flex-center">
                            <TextArea label="Remarks (Doctor Advice Summary)" name="remarks" placeholder="Summarize the physical advice/chit..." value={formData.remarks} onChange={handleChange} required />
                        </div>

                        <div className="form-actions">
                            <Button
                                type="submit"
                                loading={submitting}
                                icon={ShieldCheck}
                                className="btn-primary w-full-mobile submit-btn"
                            >
                                Finalize Registration
                            </Button>
                        </div>
                    </form>
                </div>
            </div >
        </div >
    );
};

export default RegistrationForm;
