import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../../api/api';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    AreaChart, Area, Cell, LineChart, Line, Legend
} from 'recharts';
import { Users, CheckCircle, FileText, Clock, Database, FileDown, TrendingUp } from 'lucide-react';
import FieldVisitChart from '../../components/charts/FieldVisitChart';
import EnrollmentChart from '../../components/charts/EnrollmentChart';
import QuickActions from '../../components/QuickActions';
import { Card, Button, Select } from '../../components/ui';

const StatCard = ({ title, value, icon: Icon, colorVar }) => {
    const colorMap = {
        '--primary': { gradient: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)', shadow: 'rgba(99, 102, 241, 0.3)', iconBg: 'rgba(99, 102, 241, 0.15)' },
        '--accent': { gradient: 'linear-gradient(135deg, #f59e0b 0%, #fbbf24 100%)', shadow: 'rgba(245, 158, 11, 0.3)', iconBg: 'rgba(245, 158, 11, 0.15)', },
        '--secondary': { gradient: 'linear-gradient(135deg, #ec4899 0%, #f472b6 100%)', shadow: 'rgba(236, 72, 153, 0.3)', iconBg: 'rgba(236, 72, 153, 0.15)' },
        '--success': { gradient: 'linear-gradient(135deg, #10b981 0%, #14b8a6 100%)', shadow: 'rgba(16, 185, 129, 0.3)', iconBg: 'rgba(16, 185, 129, 0.15)' },
        '--chart-purple': { gradient: 'linear-gradient(135deg, #8b5cf6 0%, #a78bfa 100%)', shadow: 'rgba(139, 92, 246, 0.3)', iconBg: 'rgba(139, 92, 246, 0.15)' }
    };

    const colors = colorMap[colorVar] || colorMap['--primary'];

    return (
        <Card style={{
            padding: '0',
            background: colors.gradient,
            border: 'none',
            boxShadow: `0 4px 15px ${colors.shadow}`,
            transition: 'all 0.3s ease',
            cursor: 'default',
            position: 'relative',
            overflow: 'hidden'
        }}
            onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-4px)';
                e.currentTarget.style.boxShadow = `0  8px 25px ${colors.shadow}`;
            }}
            onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = `0 4px 15px ${colors.shadow}`;
            }}>
            <div style={{ position: 'absolute', top: '-30px', right: '-30px', opacity: 0.1 }}>
                <Icon size={120} color="white" />
            </div>
            <div style={{ padding: '1.8rem 1.5rem', position: 'relative', zIndex: 1 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                    <div style={{ flex: 1 }}>
                        <p style={{ color: 'rgba(255,255,255,0.85)', fontSize: '0.85rem', fontWeight: '600', marginBottom: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{title}</p>
                        <h3 style={{ fontSize: '2.5rem', fontWeight: '900', color: 'white', margin: 0, lineHeight: 1 }}>{value?.toLocaleString() || 0}</h3>
                    </div>
                    <div style={{
                        padding: '0.9rem',
                        background: 'rgba(255, 255, 255, 0.2)',
                        borderRadius: '14px',
                        backdropFilter: 'blur(10px)',
                        flexShrink: 0
                    }}>
                        <Icon color="white" size={28} />
                    </div>
                </div>
            </div>
        </Card>
    );
};


const VBoard = () => {
    const navigate = useNavigate();
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const [selectedStudy, setSelectedStudy] = useState('');
    const [studyData, setStudyData] = useState([]);
    const [studyLoading, setStudyLoading] = useState(false);
    const [clinicalStudies, setClinicalStudies] = useState([]);
    const [studyAnalytics, setStudyAnalytics] = useState(null);
    const [fetchError, setFetchError] = useState(null);

    // Location Analytics State
    const [locations, setLocations] = useState([]);
    const [selectedLocation, setSelectedLocation] = useState('');
    const [locationStats, setLocationStats] = useState(null);

    // Expanded Detail View State
    const [expandedVolunteer, setExpandedVolunteer] = useState(null);
    const [expandedFieldVisit, setExpandedFieldVisit] = useState(null);

    useEffect(() => {
        const fetchStats = async () => {
            try {
                const response = await api.get('/dashboard/stats');
                setStats(response.data);
            } catch (err) {
                console.error('Failed to fetch stats', err);
            } finally {
                setLoading(false);
            }
        };

        const fetchStudies = async () => {
            try {
                const response = await api.get('/clinical/studies');
                setClinicalStudies(response.data);
            } catch (err) {
                console.error('Failed to fetch studies', err);
            }
        };

        fetchStats();
        fetchStudies();

        const fetchLocations = async () => {
            try {
                const response = await api.get('/dashboard/locations');
                setLocations(response.data);
            } catch (err) {
                console.error('Failed to fetch locations', err);
            }
        };
        fetchLocations();

        // Keep data up-to-date
        const interval = setInterval(fetchStats, 60000);
        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        const fetchLocationStats = async () => {
            if (!selectedLocation) {
                setLocationStats(null);
                return;
            }
            try {
                const response = await api.get(`/dashboard/stats/location?location=${encodeURIComponent(selectedLocation)}`);
                setLocationStats(response.data);
            } catch (err) {
                console.error('Failed to fetch location stats', err);
            }
        };
        fetchLocationStats();
    }, [selectedLocation]);

    useEffect(() => {
        if (!selectedStudy) return;
        const interval = setInterval(() => fetchStudyParticipation(selectedStudy), 60000);
        return () => clearInterval(interval);
    }, [selectedStudy]);

    const fetchStudyParticipation = async (studyCode) => {
        if (!studyCode) {
            setStudyData([]);
            setStudyAnalytics(null);
            return;
        }
        setStudyLoading(true);
        setFetchError(null); // Reset error
        try {
            // Add cache busting timestamp
            const timestamp = new Date().getTime();
            const [participationRes, analyticsRes] = await Promise.all([
                api.get(`/dashboard/clinical/participation?study_code=${studyCode}&_t=${timestamp}`),
                api.get(`/dashboard/clinical/analytics?study_code=${studyCode}&_t=${timestamp}`)
            ]);
            setStudyData(participationRes.data);
            setStudyAnalytics(analyticsRes.data);
        } catch (err) {
            console.error('Failed to fetch participation', err);
            setFetchError(err.message || "Failed to load data");
            setStudyData([]); // Ensure empty on error
        } finally {
            setStudyLoading(false);
        }
    };

    const handleStudyChange = (e) => {
        const code = e.target.value;
        setSelectedStudy(code);
        fetchStudyParticipation(code);
    };

    const downloadReport = async () => {
        if (!selectedStudy) return;
        try {

            const response = await api.get(`/dashboard/clinical/export?study_code=${encodeURIComponent(selectedStudy)}`, {
                responseType: 'blob'
            });

            // No need to check response.ok with axios, it throws on error

            const url = window.URL.createObjectURL(new Blob([response.data]));
            const a = document.createElement('a');
            a.href = url;
            a.download = `Study_Report_${selectedStudy}_${new Date().toISOString().split('T')[0]}.xlsx`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
        } catch (err) {
            console.error('Download failed', err);
            alert('Failed to download report. Please try again.');
        }
    };

    if (loading) return <div className="container" style={{ textAlign: 'center' }}>Loading dashboard...</div>;

    return (
        <div className="animate-fade-in" style={{ paddingBottom: '3rem' }}>
            {/* Dashboard Styles */}
            <style>
                {`
                .dashboard-grid {
                    display: grid;
                    grid-template-columns: repeat(2, 1fr);
                    gap: 1.5rem;
                    margin-bottom: 2rem;
                }
                @media (max-width: 1024px) {
                    .dashboard-grid {
                        grid-template-columns: 1fr;
                    }
                }
                .chart-card {
                    min-height: 400px;
                    display: flex;
                    flex-direction: column;
                }
                `}
            </style>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2.5rem', flexWrap: 'wrap', gap: '1rem' }}>
                <div>
                    <h1 style={{
                        fontSize: 'clamp(1.8rem, 6vw, 2.8rem)',
                        fontWeight: '950',
                        marginBottom: '0.2rem',
                        background: 'linear-gradient(135deg, #6366f1 0%, #ec4899 100%)',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                        letterSpacing: '-1.5px'
                    }}>
                        Volunteer Intelligence Board
                    </h1>
                    <p style={{ color: 'var(--text-muted)' }}>Demographics, retention, and participation analytics</p>
                </div>
                <div style={{ padding: '0.8rem 1.2rem', borderRadius: '14px', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-color)', fontSize: '0.85rem' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Last updated: </span>
                    <span style={{ color: 'var(--accent)', fontWeight: '600' }}>{new Date().toLocaleTimeString()}</span>
                </div>
            </div>



            {/* Statistics Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.2rem', marginBottom: '2rem' }}>
                <StatCard title="Total Ecosystem" value={(stats?.total_volunteers || 0) + (stats?.field_visits || 0)} icon={Users} colorVar="--primary" />
                <StatCard title="Field Visits" value={stats?.field_visits || 0} icon={Database} colorVar="--accent" />
                <StatCard title="New Volunteers" value={stats?.pre_screening || 0} icon={Clock} colorVar="--primary" />
                <StatCard title="Registered" value={stats?.registered || 0} icon={FileText} colorVar="--secondary" />
                <StatCard title="Approved" value={stats?.approved || 0} icon={CheckCircle} colorVar="--success" />
                <StatCard title="Legacy Records" value={stats?.legacy_records || 0} icon={Database} colorVar="--chart-purple" />
            </div>

            {/* Quick Actions Grid */}
            <QuickActions role={stats?.user_role || JSON.parse(localStorage.getItem('user'))?.role} />

            {/* Location Analytics - Enhanced */}
            <Card style={{
                marginBottom: '2rem',
                padding: '0',
                overflow: 'hidden',
                background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.05) 0%, rgba(139, 92, 246, 0.05) 100%)',
                border: '1px solid rgba(99, 102, 241, 0.2)'
            }}>
                <div style={{
                    padding: '2rem 2rem 1.5rem',
                    background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.1) 0%, rgba(139, 92, 246, 0.1) 100%)',
                    borderBottom: '1px solid rgba(99, 102, 241, 0.2)'
                }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1.5rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                            <div style={{
                                width: '50px',
                                height: '50px',
                                borderRadius: '14px',
                                background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                boxShadow: '0 4px 15px rgba(99, 102, 241, 0.4)'
                            }}>
                                <TrendingUp size={26} color="white" />
                            </div>
                            <div>
                                <h3 style={{ fontSize: '1.4rem', fontWeight: '800', margin: 0, marginBottom: '0.3rem' }}>Location Analytics</h3>
                                <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', margin: 0 }}>Detailed breakdown by geographic location</p>
                            </div>
                        </div>
                        <select
                            className="form-control"
                            style={{
                                minWidth: '280px',
                                padding: '0.9rem 1.2rem',
                                borderRadius: '12px',
                                border: '2px solid rgba(99, 102, 241, 0.3)',
                                background: 'rgba(255, 255, 255, 0.9)',
                                fontSize: '0.95rem',
                                fontWeight: '500',
                                cursor: 'pointer',
                                transition: 'all 0.2s'
                            }}
                            value={selectedLocation}
                            onChange={(e) => setSelectedLocation(e.target.value)}
                        >
                            <option value="">📍 Select a location...</option>
                            {locations.map((loc, idx) => (
                                <option key={idx} value={loc}>📍 {loc}</option>
                            ))}
                        </select>
                    </div>
                </div>

                <div style={{ padding: '2rem' }}>
                    {selectedLocation && locationStats ? (
                        <div className="animate-fade-in">
                            <div style={{
                                display: 'grid',
                                gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                                gap: '1.2rem',
                                marginBottom: '1.5rem'
                            }}>
                                {/* Total Volunteers Card */}
                                <div style={{
                                    padding: '1.8rem 1.5rem',
                                    background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
                                    borderRadius: '16px',
                                    boxShadow: '0 8px 25px rgba(99, 102, 241, 0.3)',
                                    position: 'relative',
                                    overflow: 'hidden'
                                }}>
                                    <div style={{ position: 'absolute', top: '-20px', right: '-20px', opacity: 0.1 }}>
                                        <Users size={100} color="white" />
                                    </div>
                                    <p style={{ color: 'rgba(255,255,255,0.9)', fontSize: '0.85rem', marginBottom: '0.7rem', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Total Volunteers</p>
                                    <h3 style={{ fontSize: '2.5rem', fontWeight: '900', color: 'white', margin: 0 }}>{locationStats.total}</h3>
                                </div>

                                {/* Gender Breakdown Cards */}
                                {locationStats.gender_breakdown.map((g, i) => {
                                    const colors = {
                                        'Female': { bg: 'linear-gradient(135deg, #ec4899 0%, #f472b6 100%)', shadow: 'rgba(236, 72, 153, 0.3)' },
                                        'Male': { bg: 'linear-gradient(135deg, #3b82f6 0%, #60a5fa 100%)', shadow: 'rgba(59, 130, 246, 0.3)' },
                                        'default': { bg: 'linear-gradient(135deg, #f59e0b 0%, #fbbf24 100%)', shadow: 'rgba(245, 158, 11, 0.3)' }
                                    };
                                    const colorScheme = colors[g.name] || colors['default'];

                                    return (
                                        <div key={i} style={{
                                            padding: '1.8rem 1.5rem',
                                            background: colorScheme.bg,
                                            borderRadius: '16px',
                                            boxShadow: `0 8px 25px ${colorScheme.shadow}`,
                                            transition: 'transform 0.2s',
                                            cursor: 'default'
                                        }}
                                            onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-4px)'}
                                            onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
                                        >
                                            <p style={{ color: 'rgba(255,255,255,0.9)', fontSize: '0.85rem', marginBottom: '0.7rem', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{g.name}</p>
                                            <h3 style={{ fontSize: '2rem', fontWeight: '900', color: 'white', margin: 0 }}>{g.value}</h3>
                                        </div>
                                    );
                                })}
                            </div>
                            <div style={{
                                padding: '1.2rem',
                                background: 'rgba(99, 102, 241, 0.05)',
                                borderRadius: '12px',
                                border: '1px dashed rgba(99, 102, 241, 0.3)',
                                textAlign: 'center'
                            }}>
                                <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', margin: 0 }}>
                                    📊 Showing statistics for <strong style={{ color: 'var(--primary)' }}>{selectedLocation}</strong>
                                </p>
                            </div>
                        </div>
                    ) : (
                        <div style={{
                            textAlign: 'center',
                            padding: '3rem 2rem',
                            background: 'rgba(99, 102, 241, 0.02)',
                            borderRadius: '12px',
                            border: '2px dashed rgba(99, 102, 241, 0.2)'
                        }}>
                            <TrendingUp size={48} color="var(--primary)" style={{ opacity: 0.3, marginBottom: '1rem' }} />
                            <p style={{ color: 'var(--text-muted)', fontSize: '1rem', margin: 0 }}>
                                Select a location above to view detailed volunteer statistics
                            </p>
                        </div>
                    )}
                </div>
            </Card>

            {/* Clinical Study Explorer - Enhanced */}
            <Card style={{
                marginBottom: '2rem',
                padding: '0',
                overflow: 'hidden',
                background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.05) 0%, rgba(20, 184, 166, 0.05) 100%)',
                border: '1px solid rgba(16, 185, 129, 0.2)'
            }}>
                <div style={{
                    padding: '2rem 2rem 1.5rem',
                    background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.1) 0%, rgba(20, 184, 166, 0.1) 100%)',
                    borderBottom: '1px solid rgba(16, 185, 129, 0.2)'
                }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1.5rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                            <div style={{
                                width: '50px',
                                height: '50px',
                                borderRadius: '14px',
                                background: 'linear-gradient(135deg, #10b981, #14b8a6)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                boxShadow: '0 4px 15px rgba(16, 185, 129, 0.4)'
                            }}>
                                <Database size={26} color="white" />
                            </div>
                            <div>
                                <h3 style={{ fontSize: '1.4rem', fontWeight: '800', margin: 0, marginBottom: '0.3rem' }}>Clinical Study Explorer</h3>
                                <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', margin: 0 }}>View participant data and export reports</p>
                            </div>
                        </div>
                        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
                            <select
                                className="form-control"
                                style={{
                                    minWidth: '280px',
                                    padding: '0.9rem 1.2rem',
                                    borderRadius: '12px',
                                    border: '2px solid rgba(16, 185, 129, 0.3)',
                                    background: 'rgba(255, 255, 255, 0.9)',
                                    fontSize: '0.95rem',
                                    fontWeight: '500',
                                    cursor: 'pointer',
                                    transition: 'all 0.2s'
                                }}
                                value={selectedStudy}
                                onChange={handleStudyChange}
                            >
                                <option value="">🔬 Select a study...</option>
                                {clinicalStudies.map(s => (
                                    <option key={s.study_code} value={s.study_code}>🔬 {s.study_name}</option>
                                ))}
                            </select>

                            {selectedStudy && (
                                <button
                                    onClick={downloadReport}
                                    style={{
                                        padding: '0.9rem 1.5rem',
                                        background: 'linear-gradient(to right, #10b981, #14b8a6)',
                                        border: 'none',
                                        borderRadius: '12px',
                                        color: 'white',
                                        fontSize: '0.95rem',
                                        fontWeight: '700',
                                        cursor: 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '0.5rem',
                                        boxShadow: '0 4px 15px rgba(16, 185, 129, 0.3)',
                                        transition: 'all 0.2s'
                                    }}
                                    onMouseEnter={(e) => {
                                        e.currentTarget.style.transform = 'translateY(-2px)';
                                        e.currentTarget.style.boxShadow = '0 6px 20px rgba(16, 185, 129, 0.4)';
                                    }}
                                    onMouseLeave={(e) => {
                                        e.currentTarget.style.transform = 'translateY(0)';
                                        e.currentTarget.style.boxShadow = '0 4px 15px rgba(16, 185, 129, 0.3)';
                                    }}
                                >
                                    <FileDown size={18} />
                                    Download Report
                                </button>
                            )}
                        </div>
                    </div>
                </div>

                <div style={{ padding: '2rem' }}>

                    {selectedStudy ? (
                        <div className="animate-fade-in" style={{
                            background: 'white',
                            borderRadius: '12px',
                            overflow: 'hidden',
                            border: '1px solid rgba(16, 185, 129, 0.1)'
                        }}>
                            {studyLoading ? (
                                <div style={{ padding: '3rem', textAlign: 'center' }}>
                                    <div style={{ width: '40px', height: '40px', border: '4px solid rgba(16, 185, 129, 0.1)', borderTop: '4px solid #10b981', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 1rem' }}></div>
                                    <p style={{ color: 'var(--text-muted)' }}>Loading study data...</p>
                                </div>
                            ) : (
                                <div style={{ maxHeight: '500px', overflow: 'auto' }}>
                                    <table style={{ width: '100%', minWidth: '800px', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
                                        <thead style={{ position: 'sticky', top: 0, background: 'linear-gradient(to right, #10b981, #14b8a6)', zIndex: 1 }}>
                                            <tr style={{ textAlign: 'left', color: 'white' }}>
                                                <th style={{ padding: '1rem', fontWeight: '700' }}>Sr. No</th>

                                                <th style={{ padding: '1rem', fontWeight: '700' }}>Date</th>
                                                <th style={{ padding: '1rem', fontWeight: '700' }}>Name</th>
                                                <th style={{ padding: '1rem', fontWeight: '700' }}>Contact Number</th>
                                                <th style={{ padding: '1rem', fontWeight: '700' }}>Gender</th>
                                                <th style={{ padding: '1rem', fontWeight: '700' }}>Age</th>
                                                <th style={{ padding: '1rem', fontWeight: '700' }}>Status</th>
                                                <th style={{ padding: '1rem', fontWeight: '700' }}>Reason of Rejection</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {studyData.map((row, i) => (
                                                <tr key={i} style={{
                                                    borderBottom: '1px solid rgba(16, 185, 129, 0.1)',
                                                    transition: 'background 0.2s'
                                                }}
                                                    onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(16, 185, 129, 0.05)'}
                                                    onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                                                >
                                                    <td style={{ padding: '1rem', fontWeight: '600', color: '#6b7280' }}>{i + 1}</td>

                                                    <td style={{ padding: '1rem', color: '#374151' }}>
                                                        {row.date && row.date !== 'N/A' && !isNaN(new Date(row.date).getTime())
                                                            ? new Date(row.date).toLocaleDateString()
                                                            : 'N/A'}
                                                    </td>
                                                    <td style={{ padding: '1rem', fontWeight: '600', color: '#111827' }}>{row.name}</td>
                                                    <td style={{ padding: '1rem', color: '#374151', fontFamily: 'monospace' }}>{row.contact}</td>
                                                    <td style={{ padding: '1rem', color: '#374151' }}>{row.gender}</td>
                                                    <td style={{ padding: '1rem', fontWeight: '600', color: '#374151' }}>{row.age}</td>
                                                    <td style={{ padding: '1rem' }}>
                                                        <span style={{
                                                            padding: '0.4rem 0.8rem',
                                                            borderRadius: '8px',
                                                            fontSize: '0.8rem',
                                                            fontWeight: '700',
                                                            textTransform: 'uppercase',
                                                            background: row.status === 'approved' ? 'rgba(34, 197, 94, 0.15)' : row.status === 'rejected' ? 'rgba(239, 68, 68, 0.15)' : 'rgba(251, 191, 36, 0.15)',
                                                            color: row.status === 'approved' ? '#22c55e' : row.status === 'rejected' ? '#ef4444' : '#f59e0b'
                                                        }}>
                                                            {row.status}
                                                        </span>
                                                    </td>
                                                    <td style={{ padding: '1rem', color: '#6b7280', maxWidth: '200px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={row.reason_of_rejection}>
                                                        {row.reason_of_rejection || '-'}
                                                    </td>
                                                </tr>
                                            ))}
                                            {studyData.length === 0 && (
                                                <tr><td colSpan="8" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                                                    <Database size={48} color="var(--text-muted)" style={{ opacity: 0.3, marginBottom: '1rem' }} />
                                                    <p>No registrations found for this study.</p>
                                                </td></tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div style={{
                            textAlign: 'center',
                            padding: '3rem 2rem',
                            background: 'rgba(16, 185, 129, 0.02)',
                            borderRadius: '12px',
                            border: '2px dashed rgba(16, 185, 129, 0.2)'
                        }}>
                            <Database size={48} color="#10b981" style={{ opacity: 0.3, marginBottom: '1rem' }} />
                            <p style={{ color: 'var(--text-muted)', fontSize: '1rem', margin: 0 }}>
                                Select a clinical study above to view participant data and export reports
                            </p>
                        </div>
                    )}
                </div>
            </Card>

            {/* Graphs Grid */}
            <div className="dashboard-grid">

                {/* Ecosystem Activity */}
                <Card className="chart-card" style={{ padding: '0', overflow: 'hidden', border: '1px solid rgba(99, 102, 241, 0.2)' }}>
                    <div style={{ padding: '1.5rem 2rem', background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.1) 0%, rgba(139, 92, 246, 0.1) 100%)', borderBottom: '1px solid rgba(99, 102, 241, 0.2)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
                            <div style={{ padding: '0.7rem', background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', borderRadius: '12px', display: 'flex', boxShadow: '0 4px 15px rgba(99, 102, 241, 0.3)' }}>
                                <TrendingUp size={20} color="white" />
                            </div>
                            <h3 style={{ fontSize: '1.3rem', fontWeight: '800', margin: 0 }}>Ecosystem Activity (14 Days)</h3>
                        </div>
                    </div>
                    <div style={{ padding: '2rem' }}>
                        <ResponsiveContainer width="100%" height={300}>
                            <AreaChart data={stats?.charts?.daily || []}>
                                <defs>
                                    <linearGradient id="colorActivity" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                                        <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(99, 102, 241, 0.1)" />
                                <XAxis dataKey="date" stroke="#6b7280" fontSize={12} />
                                <YAxis stroke="#6b7280" fontSize={12} />
                                <Tooltip contentStyle={{ backgroundColor: 'white', border: '1px solid rgba(99, 102, 241, 0.2)', borderRadius: '12px', boxShadow: '0 4px 15px rgba(0,0,0,0.1)' }} />
                                <Area type="monotone" dataKey="count" stroke="#6366f1" strokeWidth={3} fill="url(#colorActivity)" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </Card>

                {/* Gender Distribution */}
                <Card className="chart-card" style={{ padding: '0', overflow: 'hidden', border: '1px solid rgba(236, 72, 153, 0.2)' }}>
                    <div style={{ padding: '1.5rem 2rem', background: 'linear-gradient(135deg, rgba(236, 72, 153, 0.1) 0%, rgba(244, 114, 182, 0.1) 100%)', borderBottom: '1px solid rgba(236, 72, 153, 0.2)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
                            <div style={{ padding: '0.7rem', background: 'linear-gradient(135deg, #ec4899, #f472b6)', borderRadius: '12px', display: 'flex', boxShadow: '0 4px 15px rgba(236, 72, 153, 0.3)' }}>
                                <Users size={20} color="white" />
                            </div>
                            <h3 style={{ fontSize: '1.3rem', fontWeight: '800', margin: 0 }}>Gender Distribution</h3>
                        </div>
                    </div>
                    <div style={{ padding: '2rem' }}>
                        <ResponsiveContainer width="100%" height={300}>
                            <BarChart
                                data={[
                                    { name: 'Male', value: (stats?.charts?.gender?.find(g => g.name === 'male')?.value || 0), fill: '#3b82f6' },
                                    { name: 'Female', value: (stats?.charts?.gender?.find(g => g.name === 'female')?.value || 0), fill: '#ec4899' },
                                    { name: 'Minor', value: (stats?.charts?.gender?.find(g => g.name === 'minor')?.value || 0), fill: '#f59e0b' }
                                ]}
                                margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                            >
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(236, 72, 153, 0.1)" />
                                <XAxis dataKey="name" stroke="#6b7280" fontSize={12} fontWeight={600} />
                                <YAxis stroke="#6b7280" fontSize={12} />
                                <Tooltip cursor={{ fill: 'rgba(236, 72, 153, 0.05)' }} contentStyle={{ backgroundColor: 'white', border: '1px solid rgba(236, 72, 153, 0.2)', borderRadius: '12px', boxShadow: '0 4px 15px rgba(0,0,0,0.1)' }} />
                                <Bar dataKey="value" name="Volunteers" radius={[8, 8, 0, 0]}>
                                    <Cell key="male" fill="#3b82f6" />
                                    <Cell key="female" fill="#ec4899" />
                                    <Cell key="minor" fill="#f59e0b" />
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </Card>

                {/* Status Overview */}
                <Card className="chart-card" style={{ padding: '0', overflow: 'hidden', border: '1px solid rgba(16, 185, 129, 0.2)' }}>
                    <div style={{ padding: '1.5rem 2rem', background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.1) 0%, rgba(20, 184, 166, 0.1) 100%)', borderBottom: '1px solid rgba(16, 185, 129, 0.2)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
                            <div style={{ padding: '0.7rem', background: 'linear-gradient(135deg, #10b981, #14b8a6)', borderRadius: '12px', display: 'flex', boxShadow: '0 4px 15px rgba(16, 185, 129, 0.3)' }}>
                                <CheckCircle size={20} color="white" />
                            </div>
                            <h3 style={{ fontSize: '1.3rem', fontWeight: '800', margin: 0 }}>Status Overview</h3>
                        </div>
                    </div>
                    <div style={{ padding: '2rem' }}>
                        <ResponsiveContainer width="100%" height={300}>
                            <BarChart data={stats?.charts?.status || []}>
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(16, 185, 129, 0.1)" />
                                <XAxis dataKey="name" stroke="#6b7280" fontSize={11} fontWeight={600} />
                                <YAxis stroke="#6b7280" fontSize={12} />
                                <Tooltip cursor={{ fill: 'rgba(16, 185, 129, 0.05)' }} contentStyle={{ backgroundColor: 'white', border: '1px solid rgba(16, 185, 129, 0.2)', borderRadius: '12px', boxShadow: '0 4px 15px rgba(0,0,0,0.1)' }} />
                                <Bar dataKey="value" radius={[8, 8, 0, 0]}>
                                    {(stats?.charts?.status || []).map((entry, index) => {
                                        const colors = {
                                            'Active New': '#10b981',
                                            'Active Old': '#6366f1',
                                            'Not Active': '#6b7280',
                                            'Approved': '#14b8a6',
                                            'Rejected': '#ef4444'
                                        };
                                        return <Cell key={`cell-${index}`} fill={colors[entry.name] || '#6366f1'} />;
                                    })}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </Card>

                {/* Monthly Growth */}
                <EnrollmentChart title="Personal Enrollment Analysis" />

                {/* Daily Field Activity - Replaced with Interactive Component */}
                <FieldVisitChart
                    title="Daily Field Registration"
                    initialData={stats?.charts?.field_daily}
                />

                {/* Top Volunteer Locations */}
                <Card className="chart-card" style={{ padding: '0', overflow: 'hidden', border: '1px solid rgba(245, 158, 11, 0.2)' }}>
                    <div style={{ padding: '1.5rem 2rem', background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.1) 0%, rgba(251, 191, 36, 0.1) 100%)', borderBottom: '1px solid rgba(245, 158, 11, 0.2)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
                            <div style={{ padding: '0.7rem', background: 'linear-gradient(135deg, #f59e0b, #fbbf24)', borderRadius: '12px', display: 'flex', boxShadow: '0 4px 15px rgba(245, 158, 11, 0.3)' }}>
                                <TrendingUp size={20} color="white" />
                            </div>
                            <h3 style={{ fontSize: '1.3rem', fontWeight: '800', margin: 0 }}>Top Volunteer Locations</h3>
                        </div>
                    </div>
                    <div style={{ padding: '2rem' }}>
                        <ResponsiveContainer width="100%" height={300}>
                            <BarChart data={stats?.charts?.areas || []} layout="vertical">
                                <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="rgba(245, 158, 11, 0.1)" />
                                <XAxis type="number" stroke="#6b7280" fontSize={11} />
                                <YAxis dataKey="name" type="category" stroke="#6b7280" fontSize={10} width={80} fontWeight={600} />
                                <Tooltip contentStyle={{ backgroundColor: 'white', border: '1px solid rgba(245, 158, 11, 0.2)', borderRadius: '12px', boxShadow: '0 4px 15px rgba(0,0,0,0.1)' }} />
                                <Bar dataKey="value" fill="#f59e0b" radius={[0, 8, 8, 0]} barSize={22} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </Card>

            </div>

            {/* Historical Growth - Full Width */}
            <Card style={{ marginBottom: '2rem', padding: '0', overflow: 'hidden', border: '1px solid rgba(139, 92, 246, 0.2)' }}>
                <div style={{ padding: '1.5rem 2rem', background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.1) 0%, rgba(167, 139, 250, 0.1) 100%)', borderBottom: '1px solid rgba(139, 92, 246, 0.2)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
                        <div style={{ padding: '0.7rem', background: 'linear-gradient(135deg, #8b5cf6, #a78bfa)', borderRadius: '12px', display: 'flex', boxShadow: '0 4px 15px rgba(139, 92, 246, 0.3)' }}>
                            <TrendingUp size={20} color="white" />
                        </div>
                        <h3 style={{ fontSize: '1.4rem', fontWeight: '800', margin: 0 }}>Historical Growth (Yearly)</h3>
                    </div>
                </div>
                <div style={{ padding: '2rem' }}>
                    <ResponsiveContainer width="100%" height={320}>
                        <LineChart data={stats?.charts?.yearly_gender || []}>
                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(139, 92, 246, 0.1)" />
                            <XAxis dataKey="year" stroke="#6b7280" fontSize={12} fontWeight={600} />
                            <YAxis stroke="#6b7280" fontSize={12} />
                            <Tooltip contentStyle={{ backgroundColor: 'white', border: '1px solid rgba(139, 92, 246, 0.2)', borderRadius: '12px', boxShadow: '0 4px 15px rgba(0,0,0,0.1)' }} />
                            <Legend verticalAlign="top" height={40} wrapperStyle={{ paddingBottom: '1rem' }} />
                            <Line type="monotone" dataKey="male" stroke="var(--chart-blue)" strokeWidth={3} dot={{ r: 6 }} name="Male" />
                            <Line type="monotone" dataKey="female" stroke="var(--chart-pink)" strokeWidth={3} dot={{ r: 6 }} name="Female" />
                            <Line type="monotone" dataKey="minor" stroke="var(--chart-yellow)" strokeWidth={3} dot={{ r: 6 }} name="Minor" />
                        </LineChart>
                    </ResponsiveContainer>
                </div>
            </Card>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem' }}>
                {/* Recent Enrollments */}
                <div style={{ padding: '0', overflow: 'hidden', border: '1px solid rgba(16, 185, 129, 0.2)', borderRadius: '16px', background: 'white' }}>
                    <div style={{ padding: '1.5rem 2rem', background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.1) 0%, rgba(20, 184, 166, 0.1) 100%)', borderBottom: '1px solid rgba(16, 185, 129, 0.2)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
                            <div style={{ padding: '0.7rem', background: 'linear-gradient(135deg, #10b981, #14b8a6)', borderRadius: '12px', display: 'flex', boxShadow: '0 4px 15px rgba(16, 185, 129, 0.3)' }}>
                                <Users size={20} color="white" />
                            </div>
                            <h3 style={{ fontSize: '1.3rem', fontWeight: '800', margin: 0 }}>Recent Enrollments</h3>
                        </div>
                    </div>
                    <div style={{ padding: '2rem' }}>
                        <div style={{ display: 'grid', gap: '1rem' }}>
                            {stats?.recent_volunteers?.length > 0 ? stats.recent_volunteers.map((vol, idx) => (
                                <div key={idx} style={{
                                    padding: '0',
                                    background: 'white',
                                    borderRadius: '12px',
                                    border: '1px solid rgba(16, 185, 129, 0.2)',
                                    overflow: 'hidden',
                                    transition: 'all 0.2s'
                                }}>
                                    {/* Collapsed View */}
                                    <div style={{
                                        padding: '1.2rem',
                                        background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.03) 0%, rgba(20, 184, 166, 0.05) 100%)',
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'center',
                                        cursor: 'pointer'
                                    }}>
                                        <div>
                                            <h4 style={{ fontWeight: '700', marginBottom: '0.3rem', color: '#111827', fontSize: '1rem' }}>{vol.pre_screening.name}</h4>
                                            <p style={{ fontSize: '0.85rem', color: '#6b7280', fontFamily: 'monospace' }}>{vol.volunteer_id}</p>
                                        </div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                            <span style={{
                                                padding: '0.4rem 1rem',
                                                borderRadius: '20px',
                                                fontSize: '0.75rem',
                                                fontWeight: '700',
                                                textTransform: 'uppercase',
                                                background: vol.stage === 'registered' ? 'linear-gradient(135deg, #10b981, #14b8a6)' : 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                                                color: 'white',
                                                boxShadow: vol.stage === 'registered' ? '0 2px 8px rgba(16, 185, 129, 0.3)' : '0 2px 8px rgba(99, 102, 241, 0.3)'
                                            }}>
                                                {vol.stage.toUpperCase()}
                                            </span>
                                            <button
                                                onClick={() => setExpandedVolunteer(expandedVolunteer === idx ? null : idx)}
                                                style={{
                                                    background: 'linear-gradient(135deg, #10b981, #14b8a6)',
                                                    color: 'white',
                                                    border: 'none',
                                                    padding: '0.5rem 1rem',
                                                    borderRadius: '8px',
                                                    fontSize: '0.85rem',
                                                    fontWeight: '600',
                                                    cursor: 'pointer',
                                                    boxShadow: '0 2px 8px rgba(16, 185, 129, 0.3)',
                                                    transition: 'all 0.2s'
                                                }}
                                                onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.05)'}
                                                onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
                                            >
                                                {expandedVolunteer === idx ? 'Hide' : 'View'}
                                            </button>
                                        </div>
                                    </div>

                                    {/* Expanded Detail View */}
                                    {expandedVolunteer === idx && (
                                        <div className="animate-fade-in" style={{
                                            borderTop: '1px solid rgba(16, 185, 129, 0.2)',
                                            background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.02) 0%, rgba(20, 184, 166, 0.03) 100%)',
                                            padding: '1.5rem'
                                        }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
                                                <h4 style={{ fontSize: '1.1rem', fontWeight: '800', color: '#111827' }}>Volunteer Details</h4>
                                                <button
                                                    onClick={() => setExpandedVolunteer(null)}
                                                    style={{
                                                        background: 'rgba(239, 68, 68, 0.1)',
                                                        border: 'none',
                                                        color: '#ef4444',
                                                        width: '32px',
                                                        height: '32px',
                                                        borderRadius: '50%',
                                                        cursor: 'pointer',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        fontSize: '1.2rem',
                                                        fontWeight: '700',
                                                        transition: 'all 0.2s'
                                                    }}
                                                    onMouseEnter={(e) => {
                                                        e.currentTarget.style.background = '#ef4444';
                                                        e.currentTarget.style.color = 'white';
                                                    }}
                                                    onMouseLeave={(e) => {
                                                        e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)';
                                                        e.currentTarget.style.color = '#ef4444';
                                                    }}
                                                    title="Close"
                                                >
                                                    ×
                                                </button>
                                            </div>

                                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.2rem' }}>
                                                <div style={{ padding: '1rem', background: 'white', borderRadius: '8px', border: '1px solid rgba(16, 185, 129, 0.1)' }}>
                                                    <p style={{ fontSize: '0.75rem', color: '#6b7280', marginBottom: '0.5rem', fontWeight: '600', textTransform: 'uppercase' }}>Volunteer ID</p>
                                                    <p style={{ fontSize: '0.95rem', color: '#111827', fontWeight: '700', fontFamily: 'monospace' }}>{vol.volunteer_id}</p>
                                                </div>
                                                <div style={{ padding: '1rem', background: 'white', borderRadius: '8px', border: '1px solid rgba(16, 185, 129, 0.1)' }}>
                                                    <p style={{ fontSize: '0.75rem', color: '#6b7280', marginBottom: '0.5rem', fontWeight: '600', textTransform: 'uppercase' }}>Full Name</p>
                                                    <p style={{ fontSize: '0.95rem', color: '#111827', fontWeight: '700' }}>{vol.pre_screening.name}</p>
                                                </div>
                                                <div style={{ padding: '1rem', background: 'white', borderRadius: '8px', border: '1px solid rgba(16, 185, 129, 0.1)' }}>
                                                    <p style={{ fontSize: '0.75rem', color: '#6b7280', marginBottom: '0.5rem', fontWeight: '600', textTransform: 'uppercase' }}>Contact</p>
                                                    <p style={{ fontSize: '0.95rem', color: '#111827', fontWeight: '700', fontFamily: 'monospace' }}>{vol.pre_screening.contact || 'N/A'}</p>
                                                </div>
                                                <div style={{ padding: '1rem', background: 'white', borderRadius: '8px', border: '1px solid rgba(16, 185, 129, 0.1)' }}>
                                                    <p style={{ fontSize: '0.75rem', color: '#6b7280', marginBottom: '0.5rem', fontWeight: '600', textTransform: 'uppercase' }}>Age</p>
                                                    <p style={{ fontSize: '0.95rem', color: '#111827', fontWeight: '700' }}>{vol.pre_screening.age || 'N/A'}</p>
                                                </div>
                                                <div style={{ padding: '1rem', background: 'white', borderRadius: '8px', border: '1px solid rgba(16, 185, 129, 0.1)' }}>
                                                    <p style={{ fontSize: '0.75rem', color: '#6b7280', marginBottom: '0.5rem', fontWeight: '600', textTransform: 'uppercase' }}>Gender</p>
                                                    <p style={{ fontSize: '0.95rem', color: '#111827', fontWeight: '700' }}>{vol.pre_screening.gender || 'N/A'}</p>
                                                </div>
                                                <div style={{ padding: '1rem', background: 'white', borderRadius: '8px', border: '1px solid rgba(16, 185, 129, 0.1)' }}>
                                                    <p style={{ fontSize: '0.75rem', color: '#6b7280', marginBottom: '0.5rem', fontWeight: '600', textTransform: 'uppercase' }}>Stage</p>
                                                    <p style={{ fontSize: '0.95rem', color: '#111827', fontWeight: '700', textTransform: 'uppercase' }}>{vol.stage}</p>
                                                </div>
                                            </div>

                                            <Link
                                                to={`/registration/${vol.volunteer_id}`}
                                                style={{
                                                    display: 'block',
                                                    marginTop: '1.5rem',
                                                    padding: '0.8rem',
                                                    background: 'linear-gradient(135deg, #10b981, #14b8a6)',
                                                    color: 'white',
                                                    textAlign: 'center',
                                                    borderRadius: '8px',
                                                    textDecoration: 'none',
                                                    fontWeight: '700',
                                                    fontSize: '0.9rem',
                                                    boxShadow: '0 4px 15px rgba(16, 185, 129, 0.3)'
                                                }}
                                            >
                                                View Full Profile →
                                            </Link>
                                        </div>
                                    )}
                                </div>
                            )) : (
                                <div style={{ textAlign: 'center', padding: '3rem', color: '#6b7280' }}>
                                    <Users size={48} color="#10b981" style={{ opacity: 0.2, marginBottom: '1rem' }} />
                                    <p style={{ fontWeight: '500' }}>No formal enrollments yet.</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Field Agent Activity */}
                <div style={{ padding: '0', overflow: 'hidden', border: '1px solid rgba(245, 158, 11, 0.2)', borderRadius: '16px', background: 'white' }}>
                    <div style={{ padding: '1.5rem 2rem', background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.1) 0%, rgba(251, 191, 36, 0.1) 100%)', borderBottom: '1px solid rgba(245, 158, 11, 0.2)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
                            <div style={{ padding: '0.7rem', background: 'linear-gradient(135deg, #f59e0b, #fbbf24)', borderRadius: '12px', display: 'flex', boxShadow: '0 4px 15px rgba(245, 158, 11, 0.3)' }}>
                                <TrendingUp size={20} color="white" />
                            </div>
                            <h3 style={{ fontSize: '1.3rem', fontWeight: '800', margin: 0 }}>Field Agent Activity</h3>
                        </div>
                    </div>
                    <div style={{ padding: '2rem' }}>
                        <div style={{ display: 'grid', gap: '1rem' }}>
                            {stats?.recent_field_visits?.length > 0 ? stats.recent_field_visits.map((visit, idx) => (
                                <div key={idx} style={{
                                    padding: '0',
                                    background: 'white',
                                    borderRadius: '12px',
                                    border: '1px solid rgba(245, 158, 11, 0.2)',
                                    overflow: 'hidden',
                                    transition: 'all 0.2s'
                                }}>
                                    {/* Collapsed View */}
                                    <div style={{
                                        padding: '1.2rem',
                                        background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.03) 0%, rgba(251, 191, 36, 0.05) 100%)',
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'center'
                                    }}>
                                        <div>
                                            <h4 style={{ fontWeight: '700', marginBottom: '0.3rem', color: '#111827', fontSize: '1rem' }}>{visit.name}</h4>
                                            <p style={{ fontSize: '0.85rem', color: '#6b7280' }}>{visit.field_area || 'Field Visit'}</p>
                                        </div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                            <div style={{ textAlign: 'right' }}>
                                                <p style={{ fontSize: '0.95rem', fontWeight: '700', color: '#f59e0b', fontFamily: 'monospace' }}>{visit.contact}</p>
                                                <p style={{ fontSize: '0.75rem', color: '#6b7280' }}>{new Date(visit.created_at).toLocaleDateString()}</p>
                                            </div>
                                            <button
                                                onClick={() => setExpandedFieldVisit(expandedFieldVisit === idx ? null : idx)}
                                                style={{
                                                    background: 'linear-gradient(135deg, #f59e0b, #fbbf24)',
                                                    color: 'white',
                                                    border: 'none',
                                                    padding: '0.5rem 1rem',
                                                    borderRadius: '8px',
                                                    fontSize: '0.85rem',
                                                    fontWeight: '600',
                                                    cursor: 'pointer',
                                                    boxShadow: '0 2px 8px rgba(245, 158, 11, 0.3)',
                                                    transition: 'all 0.2s'
                                                }}
                                                onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.05)'}
                                                onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
                                            >
                                                {expandedFieldVisit === idx ? 'Hide' : 'View'}
                                            </button>
                                        </div>
                                    </div>

                                    {/* Expanded Detail View */}
                                    {expandedFieldVisit === idx && (
                                        <div className="animate-fade-in" style={{
                                            borderTop: '1px solid rgba(245, 158, 11, 0.2)',
                                            background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.02) 0%, rgba(251, 191, 36, 0.03) 100%)',
                                            padding: '1.5rem'
                                        }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
                                                <h4 style={{ fontSize: '1.1rem', fontWeight: '800', color: '#111827' }}>Field Visit Details</h4>
                                                <button
                                                    onClick={() => setExpandedFieldVisit(null)}
                                                    style={{
                                                        background: 'rgba(239, 68, 68, 0.1)',
                                                        border: 'none',
                                                        color: '#ef4444',
                                                        width: '32px',
                                                        height: '32px',
                                                        borderRadius: '50%',
                                                        cursor: 'pointer',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        fontSize: '1.2rem',
                                                        fontWeight: '700',
                                                        transition: 'all 0.2s'
                                                    }}
                                                    onMouseEnter={(e) => {
                                                        e.currentTarget.style.background = '#ef4444';
                                                        e.currentTarget.style.color = 'white';
                                                    }}
                                                    onMouseLeave={(e) => {
                                                        e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)';
                                                        e.currentTarget.style.color = '#ef4444';
                                                    }}
                                                    title="Close"
                                                >
                                                    ×
                                                </button>
                                            </div>

                                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.2rem' }}>
                                                <div style={{ padding: '1rem', background: 'white', borderRadius: '8px', border: '1px solid rgba(245, 158, 11, 0.1)' }}>
                                                    <p style={{ fontSize: '0.75rem', color: '#6b7280', marginBottom: '0.5rem', fontWeight: '600', textTransform: 'uppercase' }}>Full Name</p>
                                                    <p style={{ fontSize: '0.95rem', color: '#111827', fontWeight: '700' }}>{visit.name}</p>
                                                </div>
                                                <div style={{ padding: '1rem', background: 'white', borderRadius: '8px', border: '1px solid rgba(245, 158, 11, 0.1)' }}>
                                                    <p style={{ fontSize: '0.75rem', color: '#6b7280', marginBottom: '0.5rem', fontWeight: '600', textTransform: 'uppercase' }}>Contact Number</p>
                                                    <p style={{ fontSize: '0.95rem', color: '#111827', fontWeight: '700', fontFamily: 'monospace' }}>{visit.contact}</p>
                                                </div>
                                                <div style={{ padding: '1rem', background: 'white', borderRadius: '8px', border: '1px solid rgba(245, 158, 11, 0.1)' }}>
                                                    <p style={{ fontSize: '0.75rem', color: '#6b7280', marginBottom: '0.5rem', fontWeight: '600', textTransform: 'uppercase' }}>Field Area</p>
                                                    <p style={{ fontSize: '0.95rem', color: '#111827', fontWeight: '700' }}>{visit.field_area || 'Not specified'}</p>
                                                </div>
                                                <div style={{ padding: '1rem', background: 'white', borderRadius: '8px', border: '1px solid rgba(245, 158, 11, 0.1)' }}>
                                                    <p style={{ fontSize: '0.75rem', color: '#6b7280', marginBottom: '0.5rem', fontWeight: '600', textTransform: 'uppercase' }}>Registration Date</p>
                                                    <p style={{ fontSize: '0.95rem', color: '#111827', fontWeight: '700' }}>{new Date(visit.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
                                                </div>
                                                {visit.age && (
                                                    <div style={{ padding: '1rem', background: 'white', borderRadius: '8px', border: '1px solid rgba(245, 158, 11, 0.1)' }}>
                                                        <p style={{ fontSize: '0.75rem', color: '#6b7280', marginBottom: '0.5rem', fontWeight: '600', textTransform: 'uppercase' }}>Age</p>
                                                        <p style={{ fontSize: '0.95rem', color: '#111827', fontWeight: '700' }}>{visit.age}</p>
                                                    </div>
                                                )}
                                                {visit.gender && (
                                                    <div style={{ padding: '1rem', background: 'white', borderRadius: '8px', border: '1px solid rgba(245, 158, 11, 0.1)' }}>
                                                        <p style={{ fontSize: '0.75rem', color: '#6b7280', marginBottom: '0.5rem', fontWeight: '600', textTransform: 'uppercase' }}>Gender</p>
                                                        <p style={{ fontSize: '0.95rem', color: '#111827', fontWeight: '700' }}>{visit.gender}</p>
                                                    </div>
                                                )}
                                            </div>

                                            {visit.notes && (
                                                <div style={{ marginTop: '1.5rem', padding: '1rem', background: 'white', borderRadius: '8px', border: '1px solid rgba(245, 158, 11, 0.1)' }}>
                                                    <p style={{ fontSize: '0.75rem', color: '#6b7280', marginBottom: '0.5rem', fontWeight: '600', textTransform: 'uppercase' }}>Notes</p>
                                                    <p style={{ fontSize: '0.9rem', color: '#374151', lineHeight: '1.6' }}>{visit.notes}</p>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            )) : (
                                <div style={{ textAlign: 'center', padding: '3rem', color: '#6b7280' }}>
                                    <TrendingUp size={48} color="#f59e0b" style={{ opacity: 0.2, marginBottom: '1rem' }} />
                                    <p style={{ fontWeight: '500' }}>Waiting for field hunters...</p>
                                </div>
                            )}
                        </div>
                        <Link to="/search" style={{
                            display: 'block',
                            marginTop: '1.5rem',
                            textAlign: 'center',
                            color: '#f59e0b',
                            fontSize: '0.9rem',
                            textDecoration: 'none',
                            fontWeight: '600',
                            padding: '0.8rem',
                            background: 'rgba(245, 158, 11, 0.05)',
                            borderRadius: '8px',
                            border: '1px dashed rgba(245, 158, 11, 0.3)'
                        }}>
                            Search and Enroll Field Visits →
                        </Link>
                    </div>
                </div>
            </div>
        </div >
    );
};

export default VBoard;
