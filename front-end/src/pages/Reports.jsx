import React, { useState } from 'react';
import { FileText, Download, Sparkles, TrendingUp, Users, Calendar, AlertCircle } from 'lucide-react';
import { generateReport, exportReportPDF, getReportMetrics } from '../services/reportService';

const Reports = () => {
    const [reportType, setReportType] = useState('overall_summary');
    const [loading, setLoading] = useState(false);
    const [reportData, setReportData] = useState(null);
    const [error, setError] = useState(null);
    const [customPrompt, setCustomPrompt] = useState('');
    const [dateRange, setDateRange] = useState({ start: '', end: '' });

    const reportTypes = [
        { value: 'overall_summary', label: 'Overall Summary', icon: <TrendingUp size={18} />, description: 'Complete system overview with key metrics and trends' },
        { value: 'volunteer_insights', label: 'Volunteer Insights', icon: <Users size={18} />, description: 'Deep dive into volunteer data and patterns' },
        { value: 'study_performance', label: 'Study Performance', icon: <Calendar size={18} />, description: 'Analysis of study completion and scheduling' },
        { value: 'custom', label: 'Custom Query', icon: <Sparkles size={18} />, description: 'Ask AI a custom question about your data' },
    ];

    const handleGenerateReport = async () => {
        setLoading(true);
        setError(null);

        try {
            const request = {
                report_type: reportType,
                date_range: dateRange.start && dateRange.end ? {
                    start: new Date(dateRange.start).toISOString(),
                    end: new Date(dateRange.end).toISOString()
                } : null,
                custom_prompt: reportType === 'custom' ? customPrompt : null
            };

            const result = await generateReport(request);
            setReportData(result);
        } catch (err) {
            console.error('Report generation error:', err);
            setError(err.response?.data?.detail || 'Failed to generate report. Please check your API key configuration.');
        } finally {
            setLoading(false);
        }
    };

    const handleExport = () => {
        if (!reportData) return;
        try {
            exportReportPDF(reportData, reportType);
        } catch (err) {
            setError('Failed to export report');
        }
    };

    const selectedReportInfo = reportTypes.find(r => r.value === reportType);

    return (
        <div style={{
            minHeight: '100vh',
            background: 'linear-gradient(to bottom, #fafbfc 0%, #ffffff 100%)',
            padding: '2rem'
        }}>
            <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
                {/* Header */}
                <div style={{ marginBottom: '2rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
                        <Sparkles size={32} style={{ color: '#6366f1' }} />
                        <h1 style={{
                            fontSize: '2rem',
                            fontWeight: '800',
                            background: 'linear-gradient(135deg, #6366f1 0%, #ec4899 100%)',
                            WebkitBackgroundClip: 'text',
                            WebkitTextFillColor: 'transparent',
                            margin: 0
                        }}>
                            AI-Powered Reports
                        </h1>
                    </div>
                    <p style={{ color: '#6b7280', fontSize: '1rem', margin: 0 }}>
                        Generate intelligent insights powered by Google Gemini AI
                    </p>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '2rem' }}>
                    {/* Left Panel - Controls */}
                    <div style={{
                        background: 'white',
                        borderRadius: '16px',
                        padding: '2rem',
                        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.05)',
                        border: '1px solid rgba(0, 0, 0, 0.08)',
                        height: 'fit-content'
                    }}>
                        <h2 style={{ fontSize: '1.25rem', fontWeight: '700', marginBottom: '1.5rem', color: '#1f2937' }}>
                            Report Configuration
                        </h2>

                        {/* Report Type Selection */}
                        <div style={{ marginBottom: '1.5rem' }}>
                            <label style={{ display: 'block', fontWeight: '600', marginBottom: '0.75rem', color: '#374151' }}>
                                Report Type
                            </label>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                {reportTypes.map(type => (
                                    <button
                                        key={type.value}
                                        onClick={() => setReportType(type.value)}
                                        style={{
                                            padding: '1rem',
                                            borderRadius: '12px',
                                            border: `2px solid ${reportType === type.value ? '#6366f1' : '#e5e7eb'}`,
                                            background: reportType === type.value ? 'rgba(99, 102, 241, 0.05)' : 'white',
                                            cursor: 'pointer',
                                            textAlign: 'left',
                                            transition: 'all 0.2s'
                                        }}
                                    >
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                                            {type.icon}
                                            <span style={{ fontWeight: '600', color: '#1f2937' }}>{type.label}</span>
                                        </div>
                                        <p style={{ margin: 0, fontSize: '0.85rem', color: '#6b7280' }}>{type.description}</p>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Custom Prompt (for custom reports) */}
                        {reportType === 'custom' && (
                            <div style={{ marginBottom: '1.5rem' }}>
                                <label style={{ display: 'block', fontWeight: '600', marginBottom: '0.5rem', color: '#374151' }}>
                                    Your Question
                                </label>
                                <textarea
                                    value={customPrompt}
                                    onChange={(e) => setCustomPrompt(e.target.value)}
                                    placeholder="E.g., What's our volunteer retention trend over the last 3 months?"
                                    rows={4}
                                    maxLength={500}
                                    style={{
                                        width: '100%',
                                        padding: '0.75rem',
                                        borderRadius: '8px',
                                        border: '1px solid #e5e7eb',
                                        fontSize: '0.95rem',
                                        fontFamily: 'inherit',
                                        resize: 'vertical'
                                    }}
                                />
                                <p style={{ fontSize: '0.75rem', color: '#9ca3af', margin: '0.25rem 0 0 0' }}>
                                    {customPrompt.length}/500 characters
                                </p>
                            </div>
                        )}

                        {/* Date Range (optional) */}
                        <div style={{ marginBottom: '1.5rem' }}>
                            <label style={{ display: 'block', fontWeight: '600', marginBottom: '0.5rem', color: '#374151' }}>
                                Date Range (Optional)
                            </label>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                                <div>
                                    <label style={{ fontSize: '0.75rem', color: '#6b7280', display: 'block', marginBottom: '0.25rem' }}>Start</label>
                                    <input
                                        type="date"
                                        value={dateRange.start}
                                        onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
                                        style={{
                                            width: '100%',
                                            padding: '0.5rem',
                                            borderRadius: '8px',
                                            border: '1px solid #e5e7eb',
                                            fontSize: '0.9rem'
                                        }}
                                    />
                                </div>
                                <div>
                                    <label style={{ fontSize: '0.75rem', color: '#6b7280', display: 'block', marginBottom: '0.25rem' }}>End</label>
                                    <input
                                        type="date"
                                        value={dateRange.end}
                                        onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
                                        style={{
                                            width: '100%',
                                            padding: '0.5rem',
                                            borderRadius: '8px',
                                            border: '1px solid #e5e7eb',
                                            fontSize: '0.9rem'
                                        }}
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Generate Button */}
                        <button
                            onClick={handleGenerateReport}
                            disabled={loading || (reportType === 'custom' && !customPrompt.trim())}
                            style={{
                                width: '100%',
                                padding: '1rem',
                                borderRadius: '12px',
                                border: 'none',
                                background: loading ? '#9ca3af' : 'linear-gradient(90deg, #6366f1, #8b5cf6)',
                                color: 'white',
                                fontWeight: '700',
                                fontSize: '1rem',
                                cursor: loading ? 'not-allowed' : 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '0.5rem',
                                transition: 'all 0.2s'
                            }}
                        >
                            {loading ? (
                                <>
                                    <div style={{
                                        width: '20px',
                                        height: '20px',
                                        border: '3px solid rgba(255,255,255,0.3)',
                                        borderTop: '3px solid white',
                                        borderRadius: '50%',
                                        animation: 'spin 1s linear infinite'
                                    }} />
                                    Generating...
                                </>
                            ) : (
                                <>
                                    <Sparkles size={20} />
                                    Generate Report
                                </>
                            )}
                        </button>

                        <style>{`
                            @keyframes spin {
                                0% { transform: rotate(0deg); }
                                100% { transform: rotate(360deg); }
                            }
                        `}</style>
                    </div>

                    {/* Right Panel - Report Display */}
                    <div style={{
                        background: 'white',
                        borderRadius: '16px',
                        padding: '2rem',
                        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.05)',
                        border: '1px solid rgba(0, 0, 0, 0.08)',
                        minHeight: '600px'
                    }}>
                        {error && (
                            <div style={{
                                padding: '1rem',
                                background: 'rgba(239, 68, 68, 0.1)',
                                border: '1px solid rgba(239, 68, 68, 0.3)',
                                borderRadius: '12px',
                                marginBottom: '1rem',
                                display: 'flex',
                                alignItems: 'start',
                                gap: '0.75rem'
                            }}>
                                <AlertCircle size={20} style={{ color: '#ef4444', flexShrink: 0, marginTop: '2px' }} />
                                <div>
                                    <p style={{ margin: 0, fontWeight: '600', color: '#b91c1c' }}>Error</p>
                                    <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.9rem', color: '#dc2626' }}>{error}</p>
                                </div>
                            </div>
                        )}

                        {!reportData && !loading && (
                            <div style={{ textAlign: 'center', padding: '4rem 2rem', color: '#9ca3af' }}>
                                <FileText size={64} style={{ margin: '0 auto 1rem', opacity: 0.5 }} />
                                <p style={{ fontSize: '1.1rem', fontWeight: '600', marginBottom: '0.5rem' }}>No report generated yet</p>
                                <p style={{ fontSize: '0.95rem' }}>Select a report type and click "Generate Report" to get started</p>
                            </div>
                        )}

                        {reportData && (
                            <>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '1.5rem', paddingBottom: '1rem', borderBottom: '2px solid #f3f4f6' }}>
                                    <div>
                                        <h2 style={{ fontSize: '1.5rem', fontWeight: '700', margin: '0 0 0.5rem 0', color: '#1f2937' }}>
                                            {selectedReportInfo?.label}
                                        </h2>
                                        <p style={{ margin: 0, fontSize: '0.9rem', color: '#6b7280' }}>
                                            Generated on {new Date(reportData.generated_at).toLocaleString()}
                                        </p>
                                    </div>
                                    <button
                                        onClick={handleExport}
                                        style={{
                                            padding: '0.75rem 1.25rem',
                                            borderRadius: '10px',
                                            border: '1px solid #6366f1',
                                            background: 'white',
                                            color: '#6366f1',
                                            fontWeight: '600',
                                            cursor: 'pointer',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '0.5rem',
                                            transition: 'all 0.2s'
                                        }}
                                        onMouseEnter={(e) => {
                                            e.currentTarget.style.background = '#6366f1';
                                            e.currentTarget.style.color = 'white';
                                        }}
                                        onMouseLeave={(e) => {
                                            e.currentTarget.style.background = 'white';
                                            e.currentTarget.style.color = '#6366f1';
                                        }}
                                    >
                                        <Download size={18} />
                                        Export PDF
                                    </button>
                                </div>

                                <div style={{
                                    background: 'linear-gradient(to bottom right, rgba(99, 102, 241, 0.05), rgba(139, 92, 246, 0.05))',
                                    padding: '1.5rem',
                                    borderRadius: '12px',
                                    border: '1px solid rgba(99, 102, 241, 0.1)',
                                    marginBottom: '1.5rem'
                                }}>
                                    <h3 style={{ fontSize: '1.1rem', fontWeight: '700', marginBottom: '1rem', color: '#4f46e5', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                        <Sparkles size={20} />
                                        AI-Generated Insights
                                    </h3>
                                    <div style={{
                                        color: '#374151',
                                        lineHeight: '1.7',
                                        fontSize: '0.95rem',
                                        whiteSpace: 'pre-wrap'
                                    }}>
                                        {reportData.summary}
                                    </div>
                                </div>

                                {/* Raw Data Section (Collapsible) */}
                                <details style={{ marginTop: '1.5rem' }}>
                                    <summary style={{
                                        cursor: 'pointer',
                                        fontWeight: '600',
                                        padding: '0.75rem',
                                        background: '#f9fafb',
                                        borderRadius: '8px',
                                        marginBottom: '0.5rem'
                                    }}>
                                        View Raw Data
                                    </summary>
                                    <pre style={{
                                        background: '#1f2937',
                                        color: '#e5e7eb',
                                        padding: '1rem',
                                        borderRadius: '8px',
                                        fontSize: '0.85rem',
                                        overflow: 'auto',
                                        maxHeight: '400px'
                                    }}>
                                        {JSON.stringify(reportData.raw_data, null, 2)}
                                    </pre>
                                </details>
                            </>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Reports;
