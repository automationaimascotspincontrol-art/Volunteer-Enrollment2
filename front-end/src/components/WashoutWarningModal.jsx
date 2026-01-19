import React from 'react';
import { AlertTriangle, X, Calendar, Clock, Check } from 'lucide-react';

const WashoutWarningModal = ({ volunteer, activeStudies, newStudy, onProceed, onCancel }) => {

    const formatDate = (dateStr) => {
        if (!dateStr) return 'Not set';
        try {
            return new Date(dateStr).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric'
            });
        } catch {
            return dateStr;
        }
    };

    const isWashoutOk = (study, newStudyStartDate) => {
        if (!study.washout_complete_date || !newStudyStartDate) return null;

        try {
            const washoutEnd = new Date(study.washout_complete_date);
            const newStart = new Date(newStudyStartDate);
            return newStart >= washoutEnd;
        } catch {
            return null;
        }
    };

    return (
        <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999
        }}>
            <div style={{
                background: 'white',
                borderRadius: '16px',
                maxWidth: '600px',
                width: '90%',
                maxHeight: '80vh',
                overflow: 'auto',
                boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)'
            }}>
                {/* Header */}
                <div style={{
                    padding: '1.5rem',
                    borderBottom: '1px solid #e5e7eb',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <div style={{
                            width: '40px',
                            height: '40px',
                            borderRadius: '50%',
                            background: '#fef3c7',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                        }}>
                            <AlertTriangle size={20} color="#f59e0b" />
                        </div>
                        <div>
                            <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: '700', color: '#111827' }}>
                                Multi-Study Assignment Warning
                            </h3>
                            <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.875rem', color: '#6b7280' }}>
                                This volunteer is already assigned to other studies
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onCancel}
                        style={{
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            padding: '0.5rem',
                            borderRadius: '8px'
                        }}
                    >
                        <X size={20} color="#6b7280" />
                    </button>
                </div>

                {/* Body */}
                <div style={{ padding: '1.5rem' }}>
                    <div style={{
                        background: '#f9fafb',
                        borderRadius: '12px',
                        padding: '1rem',
                        marginBottom: '1.5rem',
                        border: '1px solid #e5e7eb'
                    }}>
                        <p style={{ margin: 0, fontSize: '0.95rem', color: '#374151' }}>
                            <strong>{volunteer.name}</strong> (ID: {volunteer.volunteer_id}) is currently assigned to <strong>{activeStudies.length}</strong> study/studies:
                        </p>
                    </div>

                    {/* Active Studies List */}
                    <div style={{ marginBottom: '1.5rem' }}>
                        <h4 style={{ fontSize: '0.875rem', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase', marginBottom: '0.75rem' }}>
                            Current Assignments
                        </h4>

                        {activeStudies.map((study, idx) => {
                            const isOk = isWashoutOk(study, newStudy?.start_date);

                            return (
                                <div key={idx} style={{
                                    background: 'white',
                                    border: `2px solid ${isOk === false ? '#fca5a5' : isOk === true ? '#86efac' : '#e5e7eb'}`,
                                    borderRadius: '10px',
                                    padding: '1rem',
                                    marginBottom: '0.75rem'
                                }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                                        <div>
                                            <div style={{ fontWeight: '700', fontSize: '1rem', color: '#111827' }}>
                                                {study.study_code}
                                            </div>
                                            <div style={{ fontSize: '0.875rem', color: '#6b7280' }}>
                                                {study.study_name}
                                            </div>
                                        </div>
                                        {isOk !== null && (
                                            <div style={{
                                                background: isOk ? '#dcfce7' : '#fee2e2',
                                                color: isOk ? '#166534' : '#991b1b',
                                                padding: '0.25rem 0.75rem',
                                                borderRadius: '6px',
                                                fontSize: '0.75rem',
                                                fontWeight: '600',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '0.25rem'
                                            }}>
                                                {isOk ? <Check size={14} /> : <AlertTriangle size={14} />}
                                                {isOk ? 'OK' : 'Conflict'}
                                            </div>
                                        )}
                                    </div>

                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', fontSize: '0.875rem' }}>
                                        <div>
                                            <div style={{ color: '#6b7280', fontSize: '0.75rem', marginBottom: '0.25rem' }}>
                                                <Calendar size={12} style={{ display: 'inline', marginRight: '0.25rem' }} />
                                                Expected End
                                            </div>
                                            <div style={{ fontWeight: '600', color: '#374151' }}>
                                                {formatDate(study.expected_end_date)}
                                            </div>
                                        </div>
                                        <div>
                                            <div style={{ color: '#6b7280', fontSize: '0.75rem', marginBottom: '0.25rem' }}>
                                                <Clock size={12} style={{ display: 'inline', marginRight: '0.25rem' }} />
                                                Washout
                                            </div>
                                            <div style={{ fontWeight: '600', color: '#374151' }}>
                                                +{study.washout_days} days
                                            </div>
                                        </div>
                                        <div style={{ gridColumn: '1 / -1' }}>
                                            <div style={{ color: '#6b7280', fontSize: '0.75rem', marginBottom: '0.25rem' }}>
                                                Available After
                                            </div>
                                            <div style={{ fontWeight: '700', color: isOk === false ? '#dc2626' : '#059669', fontSize: '0.95rem' }}>
                                                {formatDate(study.washout_complete_date)}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    {/* New Assignment */}
                    <div style={{
                        background: '#eff6ff',
                        border: '2px dashed #3b82f6',
                        borderRadius: '10px',
                        padding: '1rem'
                    }}>
                        <div style={{ fontSize: '0.75rem', fontWeight: '600', color: '#1e40af', textTransform: 'uppercase', marginBottom: '0.5rem' }}>
                            New Assignment
                        </div>
                        <div style={{ fontWeight: '700', fontSize: '1rem', color: '#111827' }}>
                            {newStudy?.code || newStudy?.study_code}
                        </div>
                        {newStudy?.start_date && (
                            <div style={{ fontSize: '0.875rem', color: '#4b5563', marginTop: '0.25rem' }}>
                                Starts: {formatDate(newStudy.start_date)}
                            </div>
                        )}
                    </div>
                </div>

                {/* Footer */}
                <div style={{
                    padding: '1.5rem',
                    borderTop: '1px solid #e5e7eb',
                    display: 'flex',
                    gap: '0.75rem',
                    justifyContent: 'flex-end'
                }}>
                    <button
                        onClick={onCancel}
                        style={{
                            padding: '0.75rem 1.5rem',
                            borderRadius: '8px',
                            border: '1px solid #e5e7eb',
                            background: 'white',
                            color: '#374151',
                            fontWeight: '600',
                            cursor: 'pointer',
                            fontSize: '0.95rem'
                        }}
                    >
                        Cancel
                    </button>
                    <button
                        onClick={onProceed}
                        style={{
                            padding: '0.75rem 1.5rem',
                            borderRadius: '8px',
                            border: 'none',
                            background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                            color: 'white',
                            fontWeight: '700',
                            cursor: 'pointer',
                            fontSize: '0.95rem',
                            boxShadow: '0 2px 4px rgba(245, 158, 11, 0.2)'
                        }}
                    >
                        Proceed with Assignment
                    </button>
                </div>
            </div>
        </div>
    );
};

export default WashoutWarningModal;
