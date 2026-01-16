import React, { useState } from 'react';
import { FileText, Download, Sparkles, TrendingUp, Users, Calendar, AlertCircle } from 'lucide-react';
import { generateReport, exportReportPDF } from '../services/reportService';

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

    // --- STYLES ---
    const glassPanelStyle = {
        background: 'rgba(255, 255, 255, 0.7)', // White with opacity
        backdropFilter: 'blur(20px)',
        borderRadius: '24px',
        border: '1px solid rgba(255, 255, 255, 0.6)',
        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.02), 0 2px 4px -1px rgba(0, 0, 0, 0.02), 0 0 0 1px rgba(226, 232, 240, 0.3)',
        color: '#1e293b' // Slate 800
    };

    const inputStyle = {
        width: '100%',
        padding: '12px 16px',
        borderRadius: '12px',
        border: '1px solid #e2e8f0', // Slate 200
        background: '#ffffff',
        color: '#0f172a', // Slate 900
        fontSize: '0.95rem',
        outline: 'none',
        transition: 'all 0.2s',
        fontFamily: 'inherit',
        boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)'
    };

    const labelStyle = {
        display: 'block',
        fontSize: '0.75rem',
        fontWeight: '700',
        marginBottom: '8px',
        color: '#64748b', // Slate 500
        textTransform: 'uppercase',
        letterSpacing: '0.05em'
    };

    return (
        <div style={{
            minHeight: '100vh',
            background: '#f8fafc', // Slate 50
            backgroundImage: `
                radial-gradient(at 0% 0%, rgba(99, 102, 241, 0.08) 0px, transparent 50%),
                radial-gradient(at 100% 0%, rgba(236, 72, 153, 0.08) 0px, transparent 50%),
                radial-gradient(at 100% 100%, rgba(14, 165, 233, 0.08) 0px, transparent 50%)
            `,
            padding: '2rem',
            fontFamily: "'Outfit', sans-serif",
            color: '#0f172a'
        }}>
            <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
                {/* Header */}
                <div style={{ marginBottom: '3rem', textAlign: 'center' }}>
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem', padding: '8px 16px', background: 'white', borderRadius: '100px', border: '1px solid #e2e8f0', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
                        <Sparkles size={18} style={{ color: '#6366f1' }} />
                        <span style={{ fontSize: '0.9rem', fontWeight: '600', color: '#6366f1' }}>Powered by Google Gemini AI</span>
                    </div>
                    <h1 style={{
                        fontSize: '3.5rem',
                        fontWeight: '800',
                        color: '#0f172a',
                        margin: '0 0 1rem 0',
                        letterSpacing: '-0.03em',
                        background: 'linear-gradient(135deg, #0f172a 0%, #334155 100%)',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent'
                    }}>
                        Intelligent Reports
                    </h1>
                    <p style={{ color: '#64748b', fontSize: '1.2rem', margin: 0, maxWidth: '600px', marginInline: 'auto', fontWeight: '400' }}>
                        Generate deep insights and actionable analytics from your volunteer and study data in seconds.
                    </p>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'minmax(350px, 1fr) 2fr', gap: '2rem', alignItems: 'start' }}>
                    {/* Left Panel - Controls */}
                    <div style={{ ...glassPanelStyle, padding: '2rem' }}>
                        <h2 style={{ fontSize: '1.25rem', fontWeight: '700', marginBottom: '1.5rem', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <div style={{ width: '4px', height: '20px', background: '#6366f1', borderRadius: '2px' }} />
                            Configuration
                        </h2>

                        {/* Report Type Selection */}
                        <div style={{ marginBottom: '2rem' }}>
                            <label style={labelStyle}>Select Report Type</label>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                {reportTypes.map(type => (
                                    <button
                                        key={type.value}
                                        onClick={() => setReportType(type.value)}
                                        style={{
                                            padding: '1rem',
                                            borderRadius: '16px',
                                            border: `1px solid ${reportType === type.value ? '#6366f1' : 'transparent'}`,
                                            background: reportType === type.value ? 'rgba(99, 102, 241, 0.08)' : 'rgba(255, 255, 255, 0.5)',
                                            cursor: 'pointer',
                                            textAlign: 'left',
                                            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                                            position: 'relative',
                                            overflow: 'hidden'
                                        }}
                                        onMouseEnter={e => {
                                            if (reportType !== type.value) {
                                                e.currentTarget.style.background = 'white';
                                                e.currentTarget.style.transform = 'translateY(-2px)';
                                                e.currentTarget.style.boxShadow = '0 4px 6px -1px rgba(0, 0, 0, 0.05)';
                                            }
                                        }}
                                        onMouseLeave={e => {
                                            if (reportType !== type.value) {
                                                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.5)';
                                                e.currentTarget.style.transform = 'translateY(0)';
                                                e.currentTarget.style.boxShadow = 'none';
                                            }
                                        }}
                                    >
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.25rem' }}>
                                            <div style={{
                                                padding: '8px',
                                                borderRadius: '10px',
                                                background: reportType === type.value ? '#6366f1' : '#f1f5f9',
                                                color: reportType === type.value ? 'white' : '#64748b',
                                                display: 'flex',
                                                transition: 'all 0.2s'
                                            }}>
                                                {type.icon}
                                            </div>
                                            <span style={{ fontWeight: '600', color: reportType === type.value ? '#312e81' : '#334155', fontSize: '1rem' }}>{type.label}</span>
                                        </div>
                                        <p style={{ margin: '0 0 0 44px', fontSize: '0.85rem', color: '#64748b', lineHeight: '1.4' }}>{type.description}</p>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Custom Prompt */}
                        {reportType === 'custom' && (
                            <div style={{ marginBottom: '2rem' }}>
                                <label style={labelStyle}>Your Question</label>
                                <textarea
                                    value={customPrompt}
                                    onChange={(e) => setCustomPrompt(e.target.value)}
                                    placeholder="e.g., Analyzing the gender ratio of volunteers in the last 6 months..."
                                    rows={4}
                                    maxLength={500}
                                    style={{
                                        ...inputStyle,
                                        resize: 'vertical',
                                        lineHeight: '1.6'
                                    }}
                                    onFocus={e => { e.target.style.borderColor = '#6366f1'; e.target.style.boxShadow = '0 0 0 3px rgba(99, 102, 241, 0.1)'; }}
                                    onBlur={e => { e.target.style.borderColor = '#e2e8f0'; e.target.style.boxShadow = '0 1px 2px 0 rgba(0, 0, 0, 0.05)'; }}
                                />
                                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '4px' }}>
                                    <span style={{ fontSize: '0.75rem', color: '#64748b' }}>{customPrompt.length}/500</span>
                                </div>
                            </div>
                        )}

                        {/* Date Range */}
                        <div style={{ marginBottom: '2rem' }}>
                            <label style={labelStyle}>Date Range Filter (Optional)</label>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                <div>
                                    <input
                                        type="date"
                                        value={dateRange.start}
                                        onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
                                        style={inputStyle}
                                    />
                                </div>
                                <div>
                                    <input
                                        type="date"
                                        value={dateRange.end}
                                        onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
                                        style={inputStyle}
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
                                padding: '16px',
                                borderRadius: '16px',
                                border: 'none',
                                background: loading ? '#cbd5e1' : 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)', // Indigo to Violet
                                color: 'white',
                                fontWeight: '700',
                                fontSize: '1.1rem',
                                cursor: loading ? 'not-allowed' : 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '10px',
                                boxShadow: loading ? 'none' : '0 10px 20px -5px rgba(79, 70, 229, 0.4)',
                                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                                letterSpacing: '0.02em',
                                opacity: loading || (reportType === 'custom' && !customPrompt.trim()) ? 0.7 : 1
                            }}
                            onMouseEnter={e => !loading && (e.target.style.transform = 'translateY(-2px)')}
                            onMouseLeave={e => !loading && (e.target.style.transform = 'translateY(0)')}
                        >
                            {loading ? (
                                <>
                                    <div style={{
                                        width: '24px',
                                        height: '24px',
                                        border: '3px solid rgba(255,255,255,0.3)',
                                        borderTop: '3px solid white',
                                        borderRadius: '50%',
                                        animation: 'spin 1s linear infinite'
                                    }} />
                                    <span>Processing...</span>
                                </>
                            ) : (
                                <>
                                    <Sparkles size={22} fill="white" />
                                    <span>Generate Insights</span>
                                </>
                            )}
                        </button>
                    </div>

                    {/* Right Panel - Display */}
                    <div style={{ ...glassPanelStyle, padding: '3rem', minHeight: '650px', display: 'flex', flexDirection: 'column' }}>
                        {error && (
                            <div style={{
                                padding: '16px',
                                background: '#fef2f2',
                                border: '1px solid #fee2e2',
                                borderRadius: '12px',
                                marginBottom: '2rem',
                                display: 'flex',
                                alignItems: 'start',
                                gap: '12px',
                                animation: 'slideDown 0.3s ease-out'
                            }}>
                                <AlertCircle size={24} style={{ color: '#ef4444', flexShrink: 0 }} />
                                <div>
                                    <p style={{ margin: 0, fontWeight: '700', color: '#991b1b' }}>Generation Failed</p>
                                    <p style={{ margin: '4px 0 0 0', fontSize: '0.95rem', color: '#b91c1c' }}>{error}</p>
                                </div>
                            </div>
                        )}

                        {!reportData && !loading && (
                            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', color: '#64748b' }}>
                                <div style={{
                                    width: '120px',
                                    height: '120px',
                                    borderRadius: '50%',
                                    background: 'linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    marginBottom: '2rem',
                                    boxShadow: '0 20px 40px -10px rgba(14, 165, 233, 0.1)',
                                    border: '1px solid #e0f2fe'
                                }}>
                                    <Sparkles size={48} style={{ color: '#0ea5e9' }} />
                                </div>
                                <h3 style={{ fontSize: '1.5rem', fontWeight: '800', color: '#0f172a', marginBottom: '0.75rem' }}>Ready to Analyze</h3>
                                <p style={{ fontSize: '1.1rem', maxWidth: '400px', lineHeight: '1.6', color: '#64748b' }}>Select a report type on the left and tap 'Generate Insights' to start the AI analysis engine.</p>
                            </div>
                        )}

                        {reportData && (
                            <div style={{ animation: 'fadeIn 0.5s ease-out' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2rem', paddingBottom: '2rem', borderBottom: '1px solid #e2e8f0' }}>
                                    <div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                                            <span style={{ fontSize: '0.75rem', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.1em' }}>REPORT RESULT</span>
                                            <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#10b981' }} />
                                        </div>
                                        <h2 style={{ fontSize: '2.5rem', fontWeight: '800', margin: 0, lineHeight: '1.1', color: '#0f172a' }}>
                                            {selectedReportInfo?.label}
                                        </h2>
                                        <p style={{ margin: '8px 0 0 0', fontSize: '1rem', color: '#64748b' }}>
                                            Generated on {new Date(reportData.generated_at).toLocaleString()}
                                        </p>
                                    </div>
                                    <button
                                        onClick={handleExport}
                                        style={{
                                            padding: '12px 24px',
                                            borderRadius: '12px',
                                            border: '1px solid #e2e8f0',
                                            background: 'white',
                                            color: '#6366f1',
                                            fontWeight: '600',
                                            cursor: 'pointer',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '8px',
                                            transition: 'all 0.2s',
                                            boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)'
                                        }}
                                        onMouseEnter={(e) => {
                                            e.currentTarget.style.background = '#f8fafc';
                                            e.currentTarget.style.transform = 'translateY(-2px)';
                                            e.currentTarget.style.boxShadow = '0 4px 6px -1px rgba(0, 0, 0, 0.05)';
                                        }}
                                        onMouseLeave={(e) => {
                                            e.currentTarget.style.background = 'white';
                                            e.currentTarget.style.transform = 'translateY(0)';
                                            e.currentTarget.style.boxShadow = '0 1px 2px 0 rgba(0, 0, 0, 0.05)';
                                        }}
                                    >
                                        <Download size={20} />
                                        Export PDF
                                    </button>
                                </div>

                                <div style={{
                                    background: '#f8fafc',
                                    borderRadius: '20px',
                                    padding: '2.5rem',
                                    border: '1px solid #e2e8f0',
                                    marginBottom: '2rem'
                                }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '1.5rem' }}>
                                        <Sparkles size={24} style={{ color: '#6366f1' }} />
                                        <h3 style={{ fontSize: '1.25rem', fontWeight: '700', color: '#0f172a', margin: 0 }}>Executive Summary</h3>
                                    </div>

                                    <div style={{
                                        color: '#334155',
                                        lineHeight: '1.8',
                                        fontSize: '1.1rem',
                                        whiteSpace: 'pre-wrap',
                                        fontFamily: "'Outfit', sans-serif"
                                    }}>
                                        {reportData.summary}
                                    </div>
                                </div>

                                {/* Raw Data Section */}
                                <details style={{ marginTop: '2rem' }}>
                                    <summary style={{
                                        cursor: 'pointer',
                                        fontWeight: '600',
                                        padding: '12px 16px',
                                        background: 'white',
                                        borderRadius: '12px',
                                        marginBottom: '1rem',
                                        color: '#64748b',
                                        listStyle: 'none',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '8px',
                                        border: '1px solid #e2e8f0'
                                    }}>
                                        <div style={{ padding: '4px', background: '#f1f5f9', borderRadius: '4px' }}>
                                            <FileText size={14} />
                                        </div>
                                        View Raw JSON Data
                                    </summary>
                                    <pre style={{
                                        background: '#0f172a',
                                        color: '#cbd5e1',
                                        padding: '20px',
                                        borderRadius: '16px',
                                        fontSize: '0.85rem',
                                        overflow: 'auto',
                                        maxHeight: '400px',
                                        fontFamily: "'JetBrains Mono', monospace"
                                    }}>
                                        {JSON.stringify(reportData.raw_data, null, 2)}
                                    </pre>
                                </details>
                            </div>
                        )}
                    </div>
                </div>
            </div>
            <style>{`
                @keyframes spin {
                    0% { transform: rotate(0deg); }
                    100% { transform: rotate(360deg); }
                }
                @keyframes slideDown {
                    from { opacity: 0; transform: translateY(-10px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                @keyframes fadeIn {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }
                ::-webkit-scrollbar {
                    width: 8px;
                }
                ::-webkit-scrollbar-track {
                    background: transparent;
                }
                ::-webkit-scrollbar-thumb {
                    background: #cbd5e1; /* Slate 300 */
                    border-radius: 4px;
                }
                ::-webkit-scrollbar-thumb:hover {
                    background: #94a3b8; /* Slate 400 */
                }
            `}</style>
        </div>
    );
};

export default Reports;
