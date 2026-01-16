/**
 * Create/Edit Study Modal
 * Form for creating or editing study instances
 * STRICT PORT - CLEAN WHITE THEME EDITION
 */

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import { X, Calendar as CalendarIcon, Users, Clock, AlertCircle, Plus, Trash2 } from 'lucide-react';
import MultiSelect from '../common/MultiSelect';

// Simple API wrapper
const createApiWrapper = (token) => ({
    studies: {
        getMasters: () => axios.get('http://localhost:8000/api/v1/study-masters', {
            headers: { Authorization: `Bearer ${token}` }
        }),
        previewTimeline: (data) => axios.post('http://localhost:8000/api/v1/timeline-preview', data, {
            headers: { Authorization: `Bearer ${token}` }
        }),
        createInstance: (data) => axios.post('http://localhost:8000/api/v1/study-instance', data, {
            headers: { Authorization: `Bearer ${token}` }
        }),
        updateInstance: (id, data) => axios.put(`http://localhost:8000/api/v1/study-instance/${id}`, data, {
            headers: { Authorization: `Bearer ${token}` }
        })
    }
});

const CreateStudyModal = ({ isOpen, onClose, date, onStudyCreated, isEdit = false, initialData = null, onStudyUpdated }) => {
    const { token } = useAuth();
    const api = createApiWrapper(token);

    const [studyMasters, setStudyMasters] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const [formData, setFormData] = useState({
        enteredStudyCode: '',
        selectedStudies: [],
        volunteersPlanned: '',
        genderRatio: { female: 50, male: 50, minor: 0 },
        ageRange: { from: 18, to: 65 },
        remarks: '',
        drtWashoutDate: '',
        washoutPeriod: ''
    });

    const [timelinePreviews, setTimelinePreviews] = useState({});

    // Fetch Masters on Open
    useEffect(() => {
        if (isOpen) {
            fetchStudyMasters();
        }
    }, [isOpen]);

    // Handle Init (Reset or Edit Load)
    useEffect(() => {
        if (isOpen) {
            setError('');

            if (isEdit && initialData) {
                // Pre-fill for Edit
                setFormData({
                    enteredStudyCode: initialData.studyInstanceCode || initialData.enteredStudyCode || '',
                    selectedStudies: [{
                        _id: initialData._id, // Use instance ID as key for compatibility with timelinePreviews
                        studyName: initialData.studyName,
                        studyCode: initialData.studyInstanceCode,
                        isMock: true // tag to identify
                    }],
                    volunteersPlanned: initialData.volunteersPlanned || '',
                    genderRatio: initialData.genderRatio || { female: 50, male: 50, minor: 0 },
                    ageRange: initialData.ageRange || { from: 18, to: 65 },
                    remarks: initialData.remarks || '',
                    drtWashoutDate: initialData.drtWashoutDate ? new Date(initialData.drtWashoutDate).toISOString().split('T')[0] : '',
                    washoutPeriod: initialData.washoutPeriod || ''
                });

                // Pre-fill Timeline from existing visits
                if (initialData.visits && initialData.visits.length > 0) {
                    // Sort visits by date
                    const sortedVisits = [...initialData.visits].sort((a, b) => new Date(a.plannedDate) - new Date(b.plannedDate));
                    setTimelinePreviews({
                        [initialData._id]: sortedVisits
                    });
                } else {
                    setTimelinePreviews({});
                }

            } else if (date) {
                // Reset for Create
                setFormData(prev => ({
                    ...prev,
                    enteredStudyCode: '',
                    selectedStudies: [],
                    volunteersPlanned: '',
                    genderRatio: { female: 50, male: 50, minor: 0 },
                    ageRange: { from: 18, to: 65 },
                    remarks: '',
                    drtWashoutDate: '',
                    washoutPeriod: ''
                }));
                setTimelinePreviews({});
            }
        }
    }, [isOpen, date, isEdit, initialData]);

    // Timeline Generation (Only for Create or New Selected Studies)
    useEffect(() => {
        const fetchPreviews = async () => {
            if (isEdit) return; // Don't auto-regenerate on Edit unless requested (currently blocking auto-regen)

            if (!date || formData.selectedStudies.length === 0) {
                setTimelinePreviews({});
                return;
            }
            const newPreviews = {};
            const dateStr = new Date(date.getTime() - (date.getTimezoneOffset() * 60000)).toISOString().split('T')[0];

            for (const study of formData.selectedStudies) {
                console.log('[Timeline] Processing study:', study.studyName, 'Template:', study.timelineTemplate);
                try {
                    if (!study.timelineTemplate) {
                        console.warn('[Timeline] No timeline template for study:', study.studyName);
                        continue;
                    }
                    const response = await api.studies.previewTimeline({
                        startDate: dateStr,
                        timelineTemplate: study.timelineTemplate
                    });
                    console.log('[Timeline] Preview received for:', study.studyName, response.data);
                    newPreviews[study._id] = response.data;
                } catch (err) {
                    console.error('[Timeline] Failed to fetch timeline preview for', study.studyName, err);
                }
            }
            console.log('[Timeline] All previews:', newPreviews);
            setTimelinePreviews(newPreviews);
        };
        fetchPreviews();
    }, [formData.selectedStudies, date, isEdit]);

    const fetchStudyMasters = async () => {
        try {
            const response = await api.studies.getMasters();
            setStudyMasters(response.data || []);
        } catch (err) {
            console.error(err);
            setError('Failed to load study types');
        }
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleGenderRatioChange = (gender, value) => {
        setFormData(prev => ({
            ...prev,
            genderRatio: { ...prev.genderRatio, [gender]: parseInt(value) || 0 }
        }));
    };

    const handleAgeRangeChange = (field, value) => {
        setFormData(prev => ({
            ...prev,
            ageRange: { ...prev.ageRange, [field]: value }
        }));
    };

    const handleVisitDateChange = (studyId, index, newDate) => {
        setTimelinePreviews(prev => {
            const studyVisits = [...(prev[studyId] || [])];
            if (studyVisits[index]) {
                studyVisits[index] = { ...studyVisits[index], plannedDate: newDate };
            }
            return { ...prev, [studyId]: studyVisits };
        });
    };

    const handleAddVisit = (studyId) => {
        setTimelinePreviews(prev => {
            const currentVisits = prev[studyId] || [];
            // Default to tomorrow or day after last visit
            let nextDate = new Date();
            if (currentVisits.length > 0) {
                const lastDate = new Date(currentVisits[currentVisits.length - 1].plannedDate);
                if (!isNaN(lastDate)) {
                    nextDate = new Date(lastDate);
                    nextDate.setDate(nextDate.getDate() + 7); // Default 1 week later
                }
            } else if (date) {
                nextDate = new Date(date);
            }

            const newVisit = {
                plannedDate: nextDate.toISOString().split('T')[0],
                visitLabel: 'New Visit',
                color: '#8b5cf6', // Violet default
                visitType: 'MANUAL',
                status: 'UPCOMING'
            };

            return { ...prev, [studyId]: [...currentVisits, newVisit] };
        });
    };

    const handleDeleteVisit = (studyId, index) => {
        setTimelinePreviews(prev => {
            const currentVisits = [...(prev[studyId] || [])];
            currentVisits.splice(index, 1);
            return { ...prev, [studyId]: currentVisits };
        });
    };

    const handleVisitLabelChange = (studyId, index, newLabel) => {
        setTimelinePreviews(prev => {
            const studyVisits = [...(prev[studyId] || [])];
            if (studyVisits[index]) {
                studyVisits[index] = { ...studyVisits[index], visitLabel: newLabel };
            }
            return { ...prev, [studyId]: studyVisits };
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        // ====== COMPREHENSIVE VALIDATION ======
        const validationErrors = [];

        // 1. Gender Ratio Validation
        const totalGender = formData.genderRatio.female + formData.genderRatio.male + formData.genderRatio.minor;
        if (totalGender !== 100) {
            validationErrors.push(`Gender ratio must total 100% (currently ${totalGender}%)`);
        }

        // 2. Study Selection Validation
        if (formData.selectedStudies.length === 0) {
            validationErrors.push('Please select at least one study type');
        }

        // 3. Volunteer Count Validation
        const volunteerCount = parseInt(formData.volunteersPlanned);
        if (!volunteerCount || volunteerCount <= 0) {
            validationErrors.push('Volunteers planned must be greater than 0');
        }
        if (volunteerCount > 1000) {
            validationErrors.push('Volunteers planned seems too high (max 1000)');
        }

        // 4. Age Range Validation
        const ageFrom = parseInt(formData.ageRange.from);
        const ageTo = parseInt(formData.ageRange.to);
        if (!ageFrom || !ageTo) {
            validationErrors.push('Age range must be specified');
        } else if (ageFrom < 0 || ageTo < 0) {
            validationErrors.push('Age range cannot be negative');
        } else if (ageFrom >= ageTo) {
            validationErrors.push(`Age range invalid: "From" (${ageFrom}) must be less than "To" (${ageTo})`);
        } else if (ageTo > 120) {
            validationErrors.push('Age "To" seems unrealistic (max 120)');
        }

        // 5. Study Code Validation
        if (!formData.enteredStudyCode || formData.enteredStudyCode.trim().length < 3) {
            validationErrors.push('Study code must be at least 3 characters');
        }
        if (formData.enteredStudyCode && !/^[A-Za-z0-9-_]+$/.test(formData.enteredStudyCode)) {
            validationErrors.push('Study code can only contain letters, numbers, hyphens, and underscores');
        }

        // 6. Timeline/Visits Validation
        for (const study of formData.selectedStudies) {
            const visits = timelinePreviews[study._id];
            if (!visits || visits.length === 0) {
                validationErrors.push(`No timeline generated for "${study.studyName}". Please wait for timeline to load/add visits.`);
            }

            // Check visit dates are in order
            if (visits && visits.length > 1) {
                for (let i = 1; i < visits.length; i++) {
                    const prevDate = new Date(visits[i - 1].plannedDate);
                    const currDate = new Date(visits[i].plannedDate);
                    if (currDate <= prevDate) {
                        validationErrors.push(`Visit dates must be in chronological order for "${study.studyName}"`);
                        break;
                    }
                }
            }
        }

        // 7. DRT Date Validation (if provided)
        if (formData.drtWashoutDate) {
            const drtDate = new Date(formData.drtWashoutDate);
            const studyStartDate = date ? new Date(date) : (initialData ? new Date(initialData.startDate) : null);

            if (studyStartDate && drtDate < studyStartDate) {
                validationErrors.push('DRT washout date cannot be before study start date');
            }

            // Check if DRT is at least after all visits
            for (const study of formData.selectedStudies) {
                const visits = timelinePreviews[study._id];
                if (visits && visits.length > 0) {
                    const lastVisit = visits[visits.length - 1];
                    const lastVisitDate = new Date(lastVisit.plannedDate);
                    if (drtDate < lastVisitDate) {
                        validationErrors.push('DRT washout date should be after the last study visit');
                        break;
                    }
                }
            }
        }

        // If any validation errors, show them and stop
        if (validationErrors.length > 0) {
            setError(validationErrors.join(' • '));
            setLoading(false);
            return;
        }

        // ====== PROCEED WITH SUBMISSION ======
        try {
            // Edit Mode Submit
            if (isEdit) {
                const study = formData.selectedStudies[0]; // Should only be one in Edit
                const customVisits = timelinePreviews[study._id];

                const payload = {
                    studyInstance: {
                        studyName: study.studyName, // Should match?
                        enteredStudyCode: formData.enteredStudyCode,
                        studyInstanceCode: formData.enteredStudyCode,
                        volunteersPlanned: parseInt(formData.volunteersPlanned),
                        genderRatio: formData.genderRatio,
                        ageRange: formData.ageRange,
                        remarks: formData.remarks,
                        drtWashoutDate: formData.drtWashoutDate || null,
                        washoutPeriod: parseInt(formData.washoutPeriod) || 0,
                        status: initialData.status // Preserve status
                    },
                    visits: customVisits
                };

                await api.studies.updateInstance(initialData._id, payload);

                if (onStudyUpdated) onStudyUpdated();
                onClose();

            } else {
                // Create Mode Submit
                const dateStr = new Date(date.getTime() - (date.getTimezoneOffset() * 60000)).toISOString().split('T')[0];

                const promises = formData.selectedStudies.map(async (studyMaster) => {
                    const customVisits = timelinePreviews[studyMaster._id];

                    const payload = {
                        studyInstance: {
                            studyID: studyMaster.studyID || studyMaster.studyCode,
                            studyName: studyMaster.studyName,
                            enteredStudyCode: formData.enteredStudyCode,
                            studyInstanceCode: formData.enteredStudyCode,
                            startDate: dateStr,
                            volunteersPlanned: parseInt(formData.volunteersPlanned),
                            genderRatio: formData.genderRatio,
                            ageRange: formData.ageRange,
                            remarks: formData.remarks,
                            drtWashoutDate: formData.drtWashoutDate || null,
                            washoutPeriod: parseInt(formData.washoutPeriod) || 0
                        },
                        visits: customVisits
                    };

                    return api.studies.createInstance(payload);
                });

                await Promise.all(promises);

                setFormData({
                    enteredStudyCode: '',
                    selectedStudies: [],
                    volunteersPlanned: '',
                    genderRatio: { female: 50, male: 50, minor: 0 },
                    ageRange: { from: 18, to: 65 },
                    remarks: '',
                    drtWashoutDate: ''
                });
                setTimelinePreviews({});

                if (onStudyCreated) onStudyCreated();
                onClose();
            }
        } catch (err) {
            console.error("Submit Error:", err);
            // Better error message from backend if available
            const errorMessage = err.response?.data?.detail || err.message || 'Failed to save study';
            setError(errorMessage);
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    // --- WHITE THEME STYLES ---
    const overlayStyle = {
        position: 'fixed',
        inset: 0,
        zIndex: 99999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
        background: 'rgba(0, 0, 0, 0.5)',
        backdropFilter: 'blur(4px)',
        animation: 'fadeIn 0.2s ease-out'
    };

    const modalStyle = {
        width: '100%',
        maxWidth: '900px',
        maxHeight: '92vh',
        background: '#ffffff', // PURE WHITE
        borderRadius: '24px',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        color: '#1e293b', // Slate 800
        fontFamily: 'Outfit, sans-serif'
    };

    const headerStyle = {
        padding: '24px 32px',
        borderBottom: '1px solid #f1f5f9', // slate-100
        background: '#ffffff',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
    };

    const sectionLabelStyle = {
        display: 'block',
        marginBottom: '8px',
        fontSize: '0.85rem',
        fontWeight: '600',
        color: '#64748b', // slate-500
        letterSpacing: '0.02em',
        textTransform: 'uppercase'
    };

    const inputStyle = {
        width: '100%',
        padding: '12px 16px',
        fontSize: '15px',
        borderRadius: '12px',
        border: '1px solid #e2e8f0', // slate-200
        background: '#f8fafc', // slate-50
        color: '#0f172a', // slate-900
        outline: 'none',
        transition: 'all 0.2s ease',
        fontFamily: 'inherit'
    };

    const cardStyle = {
        padding: '24px',
        borderRadius: '20px',
        background: '#ffffff',
        border: '1px solid #e2e8f0',
        marginBottom: '20px',
        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.02)'
    };

    return (
        <div style={overlayStyle}>
            <div style={modalStyle}>
                {/* Header */}
                <div style={headerStyle}>
                    <div>
                        <h2 style={{ fontSize: '1.75rem', fontWeight: '700', color: '#0f172a', marginBottom: '4px', letterSpacing: '-0.02em' }}>
                            {isEdit ? 'Edit Study Details' : 'Create New Study'}
                        </h2>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#64748b', fontSize: '0.9rem' }}>
                            <CalendarIcon size={16} />
                            <span>
                                {isEdit && initialData
                                    ? `Started: ${new Date(initialData.startDate).toLocaleDateString()}`
                                    : `Starting: ${date ? new Date(date).toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }) : ''}`}
                            </span>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        style={{
                            background: '#f1f5f9',
                            border: 'none',
                            color: '#64748b',
                            cursor: 'pointer',
                            padding: '10px',
                            borderRadius: '12px',
                            transition: 'background 0.2s'
                        }}
                        onMouseEnter={(e) => { e.target.style.background = '#e2e8f0'; e.target.style.color = '#334155'; }}
                        onMouseLeave={(e) => { e.target.style.background = '#f1f5f9'; e.target.style.color = '#64748b'; }}
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Content */}
                <div style={{ flex: 1, overflowY: 'auto', padding: '32px', background: '#f8fafc' /* Very light grey for content area */ }}>
                    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>

                        {/* Primary Inputs */}
                        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '24px', marginBottom: '16px' }}>
                            <div>
                                <label style={sectionLabelStyle}>Study Code <span style={{ color: '#ef4444' }}>*</span></label>
                                <input
                                    name="enteredStudyCode"
                                    value={formData.enteredStudyCode}
                                    onChange={handleChange}
                                    placeholder="e.g. ST-2026-001"
                                    required
                                    style={inputStyle}
                                    onFocus={(e) => { e.target.style.borderColor = '#6366f1'; e.target.style.background = '#ffffff'; e.target.style.boxShadow = '0 0 0 4px rgba(99,102,241,0.1)'; }}
                                    onBlur={(e) => { e.target.style.borderColor = '#e2e8f0'; e.target.style.background = '#f8fafc'; e.target.style.boxShadow = 'none'; }}
                                />
                            </div>
                            <div>
                                <label style={sectionLabelStyle}>Start Date</label>
                                <div style={{ position: 'relative' }}>
                                    <CalendarIcon size={18} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: '#6366f1' }} />
                                    <input
                                        type="date"
                                        value={
                                            isEdit && initialData
                                                ? new Date(initialData.startDate).toISOString().split('T')[0]
                                                : (date ? new Date(date.getTime() - (date.getTimezoneOffset() * 60000)).toISOString().split('T')[0] : '')
                                        }
                                        disabled
                                        style={{ ...inputStyle, paddingLeft: '46px', opacity: 0.7, cursor: 'not-allowed', background: '#f1f5f9' }}
                                    />
                                </div>
                            </div>
                        </div>

                        {/* MultiSelect (Locked in Edit) */}
                        <div style={{ marginBottom: '16px' }}>
                            {isEdit ? (
                                <div>
                                    <label style={sectionLabelStyle}>Study Name (Locked)</label>
                                    <input
                                        value={formData.selectedStudies[0]?.studyName || ''}
                                        disabled
                                        style={{ ...inputStyle, background: '#f1f5f9', color: '#64748b' }}
                                    />
                                </div>
                            ) : (
                                <MultiSelect
                                    label="Study Name(s)"
                                    options={studyMasters}
                                    value={formData.selectedStudies}
                                    onChange={(val) => setFormData(prev => ({ ...prev, selectedStudies: val }))}
                                    required
                                    placeholder="Search and select studies..."
                                />
                            )}
                        </div>

                        {/* Volunteers Card */}
                        <div style={cardStyle}>
                            <h3 style={{ fontSize: '1rem', fontWeight: '600', color: '#1e293b', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <Users size={20} color="#6366f1" /> Volunteer Configuration
                            </h3>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr 1fr', gap: '24px' }}>
                                <div>
                                    <label style={sectionLabelStyle}>Total Count</label>
                                    <input
                                        type="number"
                                        name="volunteersPlanned"
                                        value={formData.volunteersPlanned}
                                        onChange={handleChange}
                                        min="1"
                                        required
                                        style={{ ...inputStyle, textAlign: 'center', fontSize: '16px', fontWeight: '600' }}
                                    />
                                </div>
                                <div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                                        <label style={{ ...sectionLabelStyle, marginBottom: 0 }}>Gender Ratio (%)</label>
                                        <select
                                            onChange={(e) => {
                                                const val = e.target.value;
                                                if (!val) return;

                                                let newRatio = { female: 0, male: 0, minor: 0 };
                                                if (val === 'all-female') newRatio = { female: 100, male: 0, minor: 0 };
                                                else if (val === 'all-male') newRatio = { female: 0, male: 100, minor: 0 };
                                                else if (val === '50-50') newRatio = { female: 50, male: 50, minor: 0 };
                                                else if (val === 'minor-female') newRatio = { female: 0, male: 0, minor: 100 };
                                                else if (val === 'minor-male') newRatio = { female: 0, male: 0, minor: 100 };

                                                setFormData(prev => ({ ...prev, genderRatio: newRatio }));
                                            }}
                                            style={{
                                                background: 'transparent',
                                                border: 'none',
                                                color: '#6366f1',
                                                fontSize: '0.8rem',
                                                fontWeight: '600',
                                                cursor: 'pointer',
                                                outline: 'none',
                                                textAlign: 'right'
                                            }}
                                            defaultValue=""
                                        >
                                            <option value="" disabled>Select Preset</option>
                                            <option value="all-female">All Female</option>
                                            <option value="all-male">All Male</option>
                                            <option value="50-50">50 Female / 50 Male</option>
                                            <option value="minor-female">Minor (All Female)</option>
                                            <option value="minor-male">Minor (All Male)</option>
                                        </select>
                                    </div>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
                                        <div style={{ position: 'relative' }}>
                                            <input type="number" placeholder="50" value={formData.genderRatio.female} onChange={e => handleGenderRatioChange('female', e.target.value)} style={{ ...inputStyle, paddingRight: '2px' }} />
                                            <span style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', fontSize: '10px', color: '#94a3b8' }}>FEMALE</span>
                                        </div>
                                        <div style={{ position: 'relative' }}>
                                            <input type="number" placeholder="50" value={formData.genderRatio.male} onChange={e => handleGenderRatioChange('male', e.target.value)} style={inputStyle} />
                                            <span style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', fontSize: '10px', color: '#94a3b8' }}>MALE</span>
                                        </div>
                                        <div style={{ position: 'relative' }}>
                                            <input type="number" placeholder="0" value={formData.genderRatio.minor} onChange={e => handleGenderRatioChange('minor', e.target.value)} style={inputStyle} />
                                            <span style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', fontSize: '10px', color: '#94a3b8' }}>MINOR</span>
                                        </div>
                                    </div>
                                </div>
                                <div>
                                    <label style={sectionLabelStyle}>Age Range</label>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <input value={formData.ageRange.from} onChange={e => handleAgeRangeChange('from', e.target.value)} style={{ ...inputStyle, textAlign: 'center' }} />
                                        <span style={{ color: '#94a3b8' }}>-</span>
                                        <input value={formData.ageRange.to} onChange={e => handleAgeRangeChange('to', e.target.value)} style={{ ...inputStyle, textAlign: 'center' }} />
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Timeline Editor Section */}
                        {formData.selectedStudies.length > 0 && (
                            <div style={{ ...cardStyle, background: '#fffbeb', borderColor: '#fde68a' }}>
                                <h3 style={{ fontSize: '1rem', fontWeight: '600', color: '#d97706', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <Clock size={20} /> {isEdit ? 'Edit Visits Timeline' : 'Timeline Preview'}
                                </h3>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                                    {formData.selectedStudies.map(study => (
                                        <div key={study._id}>
                                            <div style={{
                                                fontSize: '0.9rem',
                                                fontWeight: '600',
                                                marginBottom: '12px',
                                                color: '#475569',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'space-between',
                                                gap: '10px'
                                            }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                    <span style={{
                                                        background: '#ffffff',
                                                        padding: '4px 10px',
                                                        borderRadius: '6px',
                                                        fontSize: '0.8rem',
                                                        fontFamily: 'monospace',
                                                        border: '1px solid #e2e8f0'
                                                    }}>
                                                        {formData.enteredStudyCode || study.studyCode}
                                                    </span>
                                                    {study.studyName}
                                                </div>
                                                <button
                                                    type="button"
                                                    onClick={() => handleAddVisit(study._id)}
                                                    style={{
                                                        background: '#ecfdf5',
                                                        color: '#059669',
                                                        border: '1px solid #a7f3d0',
                                                        padding: '6px 12px',
                                                        borderRadius: '8px',
                                                        fontSize: '0.8rem',
                                                        fontWeight: '600',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        gap: '6px',
                                                        cursor: 'pointer',
                                                        transition: 'all 0.2s'
                                                    }}
                                                    onMouseEnter={e => e.target.style.background = '#d1fae5'}
                                                    onMouseLeave={e => e.target.style.background = '#ecfdf5'}
                                                >
                                                    <Plus size={14} /> Add Visit
                                                </button>
                                            </div>
                                            <div style={{
                                                display: 'grid',
                                                gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))',
                                                gap: '12px',
                                            }}>
                                                {(timelinePreviews[study._id] || []).map((visit, index) => (
                                                    <div key={index} style={{
                                                        padding: '12px',
                                                        borderRadius: '12px',
                                                        background: '#ffffff',
                                                        border: '1px solid #e2e8f0',
                                                        borderLeft: `4px solid ${visit.color}`,
                                                        boxShadow: '0 2px 4px rgba(0,0,0,0.02)',
                                                        position: 'relative',
                                                        group: 'true'
                                                    }}>
                                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                                                            <input
                                                                value={visit.visitLabel}
                                                                onChange={(e) => handleVisitLabelChange(study._id, index, e.target.value)}
                                                                style={{
                                                                    fontSize: '0.7rem',
                                                                    fontWeight: '700',
                                                                    color: '#64748b',
                                                                    textTransform: 'uppercase',
                                                                    letterSpacing: '0.05em',
                                                                    border: 'none',
                                                                    background: 'transparent',
                                                                    width: '100px',
                                                                    outline: 'none',
                                                                    textOverflow: 'ellipsis'
                                                                }}
                                                            />
                                                            <button
                                                                type="button"
                                                                onClick={() => handleDeleteVisit(study._id, index)}
                                                                style={{
                                                                    border: 'none',
                                                                    background: 'transparent',
                                                                    color: '#ef4444',
                                                                    cursor: 'pointer',
                                                                    padding: '0',
                                                                    opacity: 0.6,
                                                                    transition: 'opacity 0.2s'
                                                                }}
                                                                onMouseEnter={e => e.target.style.opacity = '1'}
                                                                onMouseLeave={e => e.target.style.opacity = '0.6'}
                                                            >
                                                                <Trash2 size={12} />
                                                            </button>
                                                        </div>
                                                        <input
                                                            type="date"
                                                            value={visit.plannedDate ? new Date(visit.plannedDate).toISOString().split('T')[0] : ''}
                                                            onChange={(e) => handleVisitDateChange(study._id, index, e.target.value)}
                                                            style={{
                                                                background: 'transparent',
                                                                border: 'none',
                                                                color: '#334155',
                                                                fontSize: '0.9rem',
                                                                width: '100%',
                                                                fontFamily: 'monospace',
                                                                cursor: 'pointer',
                                                                outline: 'none'
                                                            }}
                                                        />
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* DRT & Washout Config */}
                        <div style={{ ...cardStyle, border: 'none', background: 'transparent', boxShadow: 'none', padding: '0', marginBottom: '16px' }}>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
                                <div>
                                    <label style={sectionLabelStyle}>DRT (Optional)</label>
                                    <div style={{ position: 'relative' }}>
                                        <CalendarIcon size={18} style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: '#ef4444', zIndex: 1 }} />
                                        <input
                                            type="date"
                                            name="drtWashoutDate"
                                            value={formData.drtWashoutDate}
                                            onChange={handleChange}
                                            style={{ ...inputStyle, paddingLeft: '46px' }}
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label style={sectionLabelStyle}>Washout Period (Days)</label>
                                    <div style={{ position: 'relative' }}>
                                        <Clock size={18} style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: '#6366f1', zIndex: 1 }} />
                                        <input
                                            type="number"
                                            name="washoutPeriod"
                                            placeholder="e.g. 90"
                                            value={formData.washoutPeriod}
                                            onChange={handleChange}
                                            min="0"
                                            style={{ ...inputStyle, paddingLeft: '46px' }}
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div style={{ ...cardStyle, border: 'none', background: 'transparent', boxShadow: 'none', padding: '0', marginBottom: '8px' }}>
                            <label style={sectionLabelStyle}>Remarks / Notes</label>
                            <textarea
                                name="remarks"
                                value={formData.remarks}
                                onChange={handleChange}
                                placeholder="Add any specific notes or instructions for this study instance..."
                                rows="3"
                                style={{
                                    ...inputStyle,
                                    resize: 'vertical',
                                    minHeight: '80px',
                                    lineHeight: '1.5'
                                }}
                                onFocus={(e) => { e.target.style.borderColor = '#6366f1'; e.target.style.background = '#ffffff'; e.target.style.boxShadow = '0 0 0 4px rgba(99,102,241,0.1)'; }}
                                onBlur={(e) => { e.target.style.borderColor = '#e2e8f0'; e.target.style.background = '#f8fafc'; e.target.style.boxShadow = 'none'; }}
                            />
                        </div>

                        {error && (
                            <div style={{
                                padding: '12px',
                                background: '#fef2f2',
                                border: '1px solid #fee2e2',
                                borderRadius: '12px',
                                color: '#ef4444',
                                fontSize: '0.9rem',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                justifyContent: 'center'
                            }}>
                                <AlertCircle size={16} />
                                {error}
                            </div>
                        )}

                    </form>
                </div>

                {/* Footer */}
                <div style={{
                    padding: '24px 32px',
                    borderTop: '1px solid #e2e8f0',
                    background: '#ffffff',
                    display: 'flex',
                    justifyContent: 'flex-end',
                    gap: '16px'
                }}>
                    <button
                        type="button"
                        onClick={onClose}
                        style={{
                            padding: '12px 24px',
                            borderRadius: '16px',
                            background: '#ffffff',
                            color: '#64748b',
                            border: '1px solid #cbd5e1',
                            cursor: 'pointer',
                            fontSize: '0.95rem',
                            fontWeight: '600',
                            transition: 'all 0.2s'
                        }}
                        onMouseEnter={(e) => { e.target.style.background = '#f8fafc'; e.target.style.color = '#334155'; }}
                        onMouseLeave={(e) => { e.target.style.background = '#ffffff'; e.target.style.color = '#64748b'; }}
                    >
                        Cancel
                    </button>
                    <button
                        type="button"
                        onClick={handleSubmit}
                        disabled={loading}
                        style={{
                            padding: '12px 32px',
                            borderRadius: '16px',
                            background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
                            color: 'white',
                            border: 'none',
                            cursor: loading ? 'not-allowed' : 'pointer',
                            fontSize: '0.95rem',
                            fontWeight: '700',
                            boxShadow: '0 4px 12px rgba(99, 102, 241, 0.3)',
                            transition: 'transform 0.2s',
                            opacity: loading ? 0.7 : 1
                        }}
                        onMouseEnter={(e) => !loading && (e.target.style.transform = 'translateY(-2px)')}
                        onMouseLeave={(e) => !loading && (e.target.style.transform = 'translateY(0)')}
                    >
                        {loading ? 'Saving...' : (isEdit ? 'Update Study' : 'Confirm Schedule')}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default CreateStudyModal;
