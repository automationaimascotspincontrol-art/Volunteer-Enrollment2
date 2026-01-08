import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../api/api';
import { Input, Button } from '../../components/ui';
import { FileText, ArrowRight } from 'lucide-react';
import '../../styles/VolunteerSearch.css';

const VolunteerSearch = () => {
    // State for Master/Legacy Search
    const [legacyId, setLegacyId] = useState('');
    const [legacyLoading, setLegacyLoading] = useState(false);
    const [legacyError, setLegacyError] = useState('');
    const [legacyResult, setLegacyResult] = useState(null);

    // State for Field Visit Search
    const [fieldContact, setFieldContact] = useState('');
    const [fieldLoading, setFieldLoading] = useState(false);
    const [fieldError, setFieldError] = useState('');
    const [fieldResult, setFieldResult] = useState(null);

    const navigate = useNavigate();

    // Handler for Master Search
    const handleLegacySearch = async (e) => {
        e.preventDefault();
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

    // Handler for Field Visit Search
    const handleFieldSearch = async (e) => {
        e.preventDefault();
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

        return (
            <div className="result-card animate-fade-in">
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '1.5rem', borderBottom: '1px solid var(--glass-border)', paddingBottom: '1rem' }}>

                    <div className="result-header">
                        <div className={`result-icon-box ${result.source === 'field_visit' ? 'field' : 'master'}`}>
                            <FileText color="white" size={28} />
                        </div>
                        <div style={{ flex: 1 }}>
                            <h3 className="result-title">
                                {name}
                            </h3>

                            <div className="result-ids">
                                {result.source !== 'field_visit' && (
                                    <>
                                        {result.subject_code && (
                                            <span className="subject-code">
                                                {result.subject_code}
                                            </span>
                                        )}
                                        <span style={{ color: 'var(--text-muted)', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                            ID: <span style={{ color: 'var(--text-main)', fontFamily: 'monospace' }}>{result.volunteer_id}</span>
                                        </span>
                                    </>
                                )}
                                {result.source === 'field_visit' && (
                                    <span style={{ color: 'var(--secondary)', fontWeight: '600', fontSize: '0.9rem' }}>
                                        Field Visit Record
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                <div className="result-details-grid">
                    <div>
                        <p className="detail-label">Contact Number</p>
                        <p className="detail-value">{contact}</p>
                    </div>
                    <div>
                        <p className="detail-label">Gender</p>
                        <p className="detail-value" style={{ textTransform: 'capitalize' }}>
                            {gender.replace(/_/g, ' ')}
                        </p>
                    </div>
                    {result.pre_screening?.address && (
                        <div style={{ gridColumn: '1 / -1' }}>
                            <p className="detail-label">Address</p>
                            <p className="detail-value" style={{ fontSize: '1rem', fontWeight: '500' }}>
                                {result.pre_screening.address}
                            </p>
                        </div>
                    )}
                </div>

                <div style={{ display: 'flex', gap: '1rem' }}>
                    <Button
                        onClick={() => {
                            if (result.source === 'field_visit') {
                                navigate(`/register`, { state: { prefill: result.pre_screening } });
                            } else {
                                navigate(`/registration/${result.volunteer_id}`, { state: { volunteer: result } });
                            }
                        }}
                        style={{ flex: 1, padding: '1rem' }}
                        icon={ArrowRight}
                        variant={result.source === 'field_visit' ? 'primary' : 'default'}
                    >
                        {result.source === 'field_visit' ? 'Proceed to Enrollment' : 'Proceed to Register'}
                    </Button>
                </div>
            </div>
        );
    };

    return (
        <div className="search-page-container animate-fade-in">
            <div className="search-header">
                <div>
                    <h1 className="dashboard-title">
                        Search & Register
                    </h1>
                    <p style={{ color: 'var(--text-muted)' }}>Find volunteers from Legacy records or Field visits</p>
                </div>
                <div className="system-badge">
                    <span style={{ color: 'var(--text-muted)' }}>System: </span>
                    <span style={{ color: 'var(--primary)', fontWeight: '600' }}>Active Search</span>
                </div>
            </div>

            {/* Section 1: Master Database Search */}
            <div className="glass-card search-section-master">
                <h2 style={{ fontSize: '1.4rem', marginBottom: '0.5rem', color: 'var(--primary)', fontWeight: '700' }}>
                    Search by Subject Code / Name / ID
                </h2>
                <h3 style={{ fontSize: '1rem', color: 'var(--text-muted)', fontWeight: '500', marginBottom: '1.5rem', marginTop: 0 }}>
                    Also supports searching by <span style={{ color: 'var(--secondary)' }}>Contact Number</span>
                </h3>

                <div className="search-input-group">
                    <div className="search-input-wrapper">
                        <Input
                            placeholder="e.g. GUPSA, GUP10, Name, Contact..."
                            value={legacyId}
                            onChange={(e) => setLegacyId(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleLegacySearch()}
                        />
                    </div>
                    <div className="search-btn-wrapper">
                        <Button
                            variant="primary"
                            onClick={handleLegacySearch}
                            loading={legacyLoading}
                            style={{ width: '100%' }}
                        >
                            Search Database
                        </Button>
                    </div>
                </div>
                {legacyError && (
                    <div className="error-message animate-shake">
                        {legacyError}
                    </div>
                )}
                {legacyResult && Array.isArray(legacyResult) && legacyResult.map((res, idx) => (
                    <ResultCard key={idx} result={res} isField={false} />
                ))}
                {legacyResult && !Array.isArray(legacyResult) && <ResultCard result={legacyResult} isField={false} />}
                {legacyResult && Array.isArray(legacyResult) && legacyResult.length === 0 && (
                    <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>No results found via list search.</div>
                )}
            </div>

            {/* Section 2: Field Visit Search */}
            <div className="glass-card search-section-field">
                <h3 style={{ fontSize: '1.2rem', fontWeight: '600', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <FileText size={20} color="var(--secondary)" /> Search Current Data (Field Visits)
                </h3>
                <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
                    Find active field visits or search by contact number.
                </p>
                <form onSubmit={handleFieldSearch} className="search-input-group">
                    <div className="search-input-wrapper">
                        <Input
                            placeholder="Enter Contact Number or Participant Name"
                            value={fieldContact}
                            onChange={(e) => setFieldContact(e.target.value)}
                            required
                        />
                    </div>
                    <div className="search-btn-wrapper">
                        <Button type="submit" loading={fieldLoading} variant="primary" style={{ width: '100%' }}>Search Current Data</Button>
                    </div>
                </form>
                {fieldError && (
                    <div className="error-message">
                        {fieldError}
                    </div>
                )}
                {fieldResult && <ResultCard result={fieldResult} isField={true} />}
            </div>
        </div>
    );
};

export default VolunteerSearch;
