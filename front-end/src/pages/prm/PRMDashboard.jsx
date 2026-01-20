import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useParams, useNavigate } from 'react-router-dom';
import { Clock, Calendar, Users, Activity, CheckCircle, Database, FileDown, ArrowLeft, TrendingUp } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import {
    PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip, Legend,
    BarChart, Bar, XAxis, YAxis, CartesianGrid, LineChart, Line
} from 'recharts';
import { Card, Button } from '../../components/ui';
import '../../styles/SBoard.css';

// Premium StatCard matching VBoard aesthetic
const StatCard = ({ title, value, icon: Icon, colorVar }) => {
    const colorMap = {
        '--primary': { gradient: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)', shadow: 'rgba(99, 102, 241, 0.3)', iconBg: 'rgba(99, 102, 241, 0.15)' },
        '--accent': { gradient: 'linear-gradient(135deg, #f59e0b 0%, #fbbf24 100%)', shadow: 'rgba(245, 158, 11, 0.3)', iconBg: 'rgba(245, 158, 11, 0.15)' },
        '--secondary': { gradient: 'linear-gradient(135deg, #ec4899 0%, #f472b6 100%)', shadow: 'rgba(236, 72, 153, 0.3)', iconBg: 'rgba(236, 72, 153, 0.15)' },
        '--success': { gradient: 'linear-gradient(135deg, #10b981 0%, #14b8a6 100%)', shadow: 'rgba(16, 185, 129, 0.3)', iconBg: 'rgba(16, 185, 129, 0.15)' },
        '--chart-purple': { gradient: 'linear-gradient(135deg, #8b5cf6 0%, #a78bfa 100%)', shadow: 'rgba(139, 92, 246, 0.3)', iconBg: 'rgba(139, 92, 246, 0.15)' },
        '--chart-blue': { gradient: 'linear-gradient(135deg, #3b82f6 0%, #60a5fa 100%)', shadow: 'rgba(59, 130, 246, 0.3)', iconBg: 'rgba(59, 130, 246, 0.15)' }
    };

    const colors = colorMap[colorVar] || colorMap['--primary'];

    return (
        <div style={{
            padding: '0',
            background: colors.gradient,
            border: 'none',
            borderRadius: '16px',
            boxShadow: `0 4px 15px ${colors.shadow}`,
            transition: 'all 0.3s ease',
            cursor: 'default',
            position: 'relative',
            overflow: 'hidden'
        }}
            onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-4px)';
                e.currentTarget.style.boxShadow = `0 8px 25px ${colors.shadow}`;
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
        </div>
    );
};

const SBoard = () => {
    const { id } = useParams(); // Start with Study ID if provided
    const navigate = useNavigate();
    const { token } = useAuth();

    // Global Stats
    const [dashboardData, setDashboardData] = useState(null);
    const [analyticsData, setAnalyticsData] = useState(null);

    // Study Specific Stats
    const [studyData, setStudyData] = useState([]);
    const [studyAnalytics, setStudyAnalytics] = useState(null);
    const [loading, setLoading] = useState(false);

    // Search State
    const [searchQuery, setSearchQuery] = useState('');
    const [searchType, setSearchType] = useState('study'); // 'study' or 'volunteer'
    const [searchResults, setSearchResults] = useState(null);

    // Expanded Category State
    const [expandedCategory, setExpandedCategory] = useState(null);
    const [categoryStudies, setCategoryStudies] = useState([]);
    const [categoryLoading, setCategoryLoading] = useState(false);
    const [searching, setSearching] = useState(false);

    // Volunteer Lists State
    const [preScreeningVolunteers, setPreScreeningVolunteers] = useState([]);
    const [approvedVolunteers, setApprovedVolunteers] = useState([]);
    const [volunteerSearchPre, setVolunteerSearchPre] = useState('');
    const [volunteerSearchApproved, setVolunteerSearchApproved] = useState('');
    const [volunteersLoading, setVolunteersLoading] = useState(false);

    useEffect(() => {
        if (id) {
            fetchStudyParticipation(id);
        } else {
            fetchGlobalStats();
            fetchVolunteers(); // Fetch volunteers for dashboard view
        }
    }, [id, token]);

    const fetchGlobalStats = async () => {
        try {
            const [metricsRes, analyticsRes] = await Promise.all([
                axios.get('http://localhost:8000/api/v1/prm-dashboard', { headers: { Authorization: `Bearer ${token}` } }),
                axios.get('http://localhost:8000/api/v1/prm-dashboard/analytics', { headers: { Authorization: `Bearer ${token}` } })
            ]);

            if (metricsRes.data.success) {
                setDashboardData(metricsRes.data.data);
            } else {
                setDashboardData(metricsRes.data);
            }

            if (analyticsRes.data.success) {
                setAnalyticsData(analyticsRes.data.data);
            }
        } catch (error) {
            console.error("Error fetching global stats", error);
        }
    };

    const fetchStudyParticipation = async (studyCode) => {
        setLoading(true);
        try {
            const [participationRes, analyticsRes] = await Promise.all([
                axios.get(`http://localhost:8000/api/v1/dashboard/clinical/participation?study_code=${studyCode}`, { headers: { Authorization: `Bearer ${token}` } }),
                axios.get(`http://localhost:8000/api/v1/dashboard/clinical/analytics?study_code=${studyCode}`, { headers: { Authorization: `Bearer ${token}` } })
            ]);
            console.log('📊 Analytics Response:', analyticsRes.data);
            console.log('📋 Participation Response:', participationRes.data);
            setStudyData(participationRes.data);
            setStudyAnalytics(analyticsRes.data);
        } catch (err) {
            console.error('Failed to fetch participation', err);
        } finally {
            setLoading(false);
        }
    };

    const downloadReport = async () => {
        if (!id) return;
        try {
            const response = await axios.get(`http://localhost:8000/api/v1/dashboard/clinical/export?study_code=${encodeURIComponent(id)}`, {
                headers: { Authorization: `Bearer ${token}` },
                responseType: 'blob'
            });
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const a = document.createElement('a');
            a.href = url;
            a.download = `Study_Report_${id}_${new Date().toISOString().split('T')[0]}.xlsx`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
        } catch (err) {
            alert('Failed to download report.');
        }
    };

    const downloadAttendance = async (studyCode) => {
        if (!studyCode) {
            alert('Please enter a study code to download attendance.');
            return;
        }
        try {
            const response = await axios.get(`http://localhost:8000/api/v1/prm/attendance/export/${encodeURIComponent(studyCode)}`, {
                headers: { Authorization: `Bearer ${token}` },
                responseType: 'blob'
            });
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const a = document.createElement('a');
            a.href = url;
            a.download = `Attendance_${studyCode}_${new Date().toISOString().split('T')[0]}.xlsx`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
        } catch (err) {
            if (err.response?.status === 404) {
                alert('No attendance records found for this study.');
            } else {
                alert('Failed to download attendance report.');
            }
            console.error('Attendance download error:', err);
        }
    };

    const downloadWashoutVolunteers = async () => {
        try {
            const response = await axios.get('http://localhost:8000/api/v1/prm/assignments/volunteers/in-washout', {
                headers: { Authorization: `Bearer ${token}` }
            });

            if (!response.data.volunteers || response.data.volunteers.length === 0) {
                alert('No volunteers currently in washout period');
                return;
            }

            // Create Excel file
            const XLSX = await import('xlsx');
            const ws_data = [
                ['Subject Code', 'Legacy ID', 'Volunteer ID', 'Name', 'Contact', 'Age', 'Gender',
                    'Completed Study', 'Study Code', 'Study End Date', 'Washout Days', 'Available From', 'Days Remaining']
            ];

            response.data.volunteers.forEach(v => {
                ws_data.push([
                    v.subject_code || '-',
                    v.legacy_id || '-',
                    v.volunteer_id,
                    v.volunteer_name,
                    v.contact || '-',
                    v.age || '-',
                    v.gender || '-',
                    v.completed_study_name,
                    v.completed_study_code,
                    v.study_end_date ? new Date(v.study_end_date).toLocaleDateString() : '-',
                    v.washout_days,
                    v.washout_complete_date ? new Date(v.washout_complete_date).toLocaleDateString() : '-',
                    v.days_remaining
                ]);
            });

            const ws = XLSX.utils.aoa_to_sheet(ws_data);
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, 'Washout Volunteers');
            XLSX.writeFile(wb, `Washout_Volunteers_${new Date().toISOString().split('T')[0]}.xlsx`);
        } catch (err) {
            console.error(err);
            alert('Failed to download washout volunteers report.');
        }
    };

    const handleSearch = async (e) => {
        e.preventDefault();
        if (!searchQuery.trim()) return;
        setSearching(true);
        try {
            const res = await axios.get(`http://localhost:8000/api/v1/prm-dashboard/search?q=${searchQuery}&type=${searchType}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setSearchResults(res.data.data);
        } catch (err) {
            console.error("Search failed", err);
        } finally {
            setSearching(false);
        }
    };

    const fetchCategoryStudies = async (category) => {
        if (expandedCategory === category) {
            setExpandedCategory(null);
            return;
        }

        setExpandedCategory(category);
        setCategoryLoading(true);
        try {
            const res = await axios.get(`http://localhost:8000/api/v1/studies-by-status?status=${category}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setCategoryStudies(res.data);
        } catch (err) {
            console.error("Failed to fetch category studies", err);
            setCategoryStudies([]);
        } finally {
            setCategoryLoading(false);
        }
    };

    const clearSearch = () => {
        setSearchQuery('');
        setSearchResults(null);
    };

    // Volunteer Management Functions
    const fetchVolunteers = async () => {
        setVolunteersLoading(true);
        try {
            const [preScreeningRes, approvedRes] = await Promise.all([
                axios.get('http://localhost:8000/api/v1/admin/dashboard/volunteers?stage=pre-screening&limit=1000', {
                    headers: { Authorization: `Bearer ${token}` }
                }),
                axios.get('http://localhost:8000/api/v1/admin/dashboard/volunteers?status=approved&limit=1000', {
                    headers: { Authorization: `Bearer ${token}` }
                })
            ]);

            if (preScreeningRes.data.success) {
                setPreScreeningVolunteers(preScreeningRes.data.volunteers || []);
            }
            if (approvedRes.data.success) {
                setApprovedVolunteers(approvedRes.data.volunteers || []);
            }
        } catch (err) {
            console.error('Failed to fetch volunteers', err);
        } finally {
            setVolunteersLoading(false);
        }
    };

    const handleDeleteVolunteer = async (volunteerId, volunteerName) => {
        if (!window.confirm(`Are you sure you want to delete volunteer "${volunteerName}"? This action cannot be undone.`)) {
            return;
        }

        try {
            const response = await axios.delete(
                `http://localhost:8000/api/v1/admin/dashboard/volunteers/${volunteerId}`,
                { headers: { Authorization: `Bearer ${token}` } }
            );

            if (response.data.success) {
                // Remove from local state
                setPreScreeningVolunteers(prev => prev.filter(v => v.volunteer_id !== volunteerId));
                alert('Volunteer deleted successfully');
            }
        } catch (err) {
            console.error('Failed to delete volunteer', err);
            alert(err.response?.data?.detail || 'Failed to delete volunteer');
        }
    };

    // --- RENDER ---

    // 1. Study Specific View
    if (id) {
        return (
            <div className="s-board animate-fade-in">
                {/* Premium Header */}
                <div style={{
                    marginBottom: '2.5rem',
                    padding: '2rem',
                    background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.08) 0%, rgba(139, 92, 246, 0.08) 100%)',
                    borderRadius: '20px',
                    border: '1px solid rgba(99, 102, 241, 0.15)'
                }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1.5rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                            <button
                                onClick={() => navigate('/prm/calendar')}
                                style={{
                                    padding: '0.75rem',
                                    background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
                                    border: 'none',
                                    borderRadius: '14px',
                                    color: 'white',
                                    cursor: 'pointer',
                                    boxShadow: '0 4px 12px rgba(99, 102, 241, 0.35)',
                                    transition: 'all 0.3s'
                                }}
                                onMouseEnter={(e) => {
                                    e.target.style.transform = 'translateY(-2px)';
                                    e.target.style.boxShadow = '0 6px 16px rgba(99, 102, 241, 0.45)';
                                }}
                                onMouseLeave={(e) => {
                                    e.target.style.transform = 'translateY(0)';
                                    e.target.style.boxShadow = '0 4px 12px rgba(99, 102, 241, 0.35)';
                                }}
                            >
                                <ArrowLeft size={20} />
                            </button>
                            <div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.4rem' }}>
                                    <h1 style={{
                                        fontSize: 'clamp(1.6rem, 5vw, 2.2rem)',
                                        fontWeight: '900',
                                        margin: 0,
                                        background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
                                        WebkitBackgroundClip: 'text',
                                        WebkitTextFillColor: 'transparent',
                                        letterSpacing: '-0.5px'
                                    }}>
                                        Study Board
                                    </h1>
                                    <span style={{
                                        fontSize: '1rem',
                                        fontFamily: 'monospace',
                                        fontWeight: '700',
                                        background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
                                        padding: '0.4rem 0.9rem',
                                        borderRadius: '10px',
                                        color: 'white',
                                        boxShadow: '0 2px 8px rgba(99, 102, 241, 0.3)'
                                    }}>
                                        {id}
                                    </span>
                                </div>
                                <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', margin: 0 }}>
                                    Detailed enrollment and status analytics
                                </p>
                            </div>
                        </div>
                        <button
                            onClick={downloadReport}
                            style={{
                                padding: '0.875rem 1.75rem',
                                background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
                                border: 'none',
                                borderRadius: '14px',
                                color: 'white',
                                fontSize: '0.95rem',
                                fontWeight: '700',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.5rem',
                                boxShadow: '0 4px 15px rgba(99, 102, 241, 0.35)',
                                transition: 'all 0.3s'
                            }}
                            onMouseEnter={(e) => {
                                e.target.style.transform = 'translateY(-2px)';
                                e.target.style.boxShadow = '0 6px 20px rgba(99, 102, 241, 0.45)';
                            }}
                            onMouseLeave={(e) => {
                                e.target.style.transform = 'translateY(0)';
                                e.target.style.boxShadow = '0 4px 15px rgba(99, 102, 241, 0.35)';
                            }}
                        >
                            <FileDown size={18} />
                            Export Report
                        </button>
                    </div>
                </div>

                {/* Premium Stats Cards */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.2rem', marginBottom: '2.5rem' }}>
                    <StatCard
                        title="Total Participants"
                        value={studyAnalytics?.total_participants || 0}
                        icon={Users}
                        colorVar="--chart-blue"
                    />
                    <StatCard
                        title="Approved"
                        value={studyAnalytics?.charts?.status?.find(s => s.name === 'approved')?.value || 0}
                        icon={CheckCircle}
                        colorVar="--success"
                    />
                    <StatCard
                        title="Rejected"
                        value={studyAnalytics?.charts?.status?.find(s => s.name === 'rejected')?.value || 0}
                        icon={Activity}
                        colorVar="--secondary"
                    />
                    <StatCard
                        title="Pending"
                        value={studyAnalytics?.charts?.status?.find(s => s.name === 'pending')?.value || 0}
                        icon={Clock}
                        colorVar="--accent"
                    />
                </div>

                {/* Volunteer List - Enhanced */}
                <div style={{
                    background: 'rgba(255, 255, 255, 0.02)',
                    backdropFilter: 'blur(20px)',
                    borderRadius: '20px',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    overflow: 'hidden',
                    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)'
                }}>
                    {/* Card Header */}
                    <div style={{
                        padding: '2rem 2rem 1.5rem',
                        background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.1) 0%, rgba(139, 92, 246, 0.1) 100%)',
                        borderBottom: '1px solid rgba(99, 102, 241, 0.15)'
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                            <div style={{
                                padding: '0.9rem',
                                background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
                                borderRadius: '14px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                boxShadow: '0 4px 15px rgba(99, 102, 241, 0.4)'
                            }}>
                                <Database size={24} color="white" />
                            </div>
                            <div>
                                <h3 style={{ fontSize: '1.4rem', fontWeight: '800', margin: 0, marginBottom: '0.25rem' }}>
                                    Volunteer Enrollments
                                </h3>
                                <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', margin: 0 }}>
                                    Complete enrollment records and status tracking
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Table Content */}
                    <div style={{ padding: '2rem' }}>
                        {loading ? (
                            <div style={{
                                textAlign: 'center',
                                padding: '4rem',
                                color: 'var(--text-muted)'
                            }}>
                                <div style={{
                                    width: '50px',
                                    height: '50px',
                                    border: '4px solid rgba(99, 102, 241, 0.2)',
                                    borderTop: '4px solid #6366f1',
                                    borderRadius: '50%',
                                    margin: '0 auto 1rem',
                                    animation: 'spin 1s linear infinite'
                                }}></div>
                                <style>{`
                                    @keyframes spin {
                                        0% { transform: rotate(0deg); }
                                        100% { transform: rotate(360deg); }
                                    }
                                `}</style>
                                <p style={{ fontSize: '1.1rem', fontWeight: '500' }}>Loading study data...</p>
                            </div>
                        ) : (
                            <div style={{ overflowX: 'auto' }}>
                                <table style={{
                                    width: '100%',
                                    minWidth: '800px',
                                    borderCollapse: 'collapse',
                                    fontSize: '0.9rem'
                                }}>
                                    <thead>
                                        <tr style={{
                                            background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.08) 0%, rgba(139, 92, 246, 0.08) 100%)',
                                            borderBottom: '2px solid rgba(99, 102, 241, 0.2)'
                                        }}>
                                            <th style={{ padding: '1.2rem 1rem', textAlign: 'left', fontWeight: '700', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--text-muted)' }}>Date</th>
                                            <th style={{ padding: '1.2rem 1rem', textAlign: 'left', fontWeight: '700', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--text-muted)' }}>Name</th>
                                            <th style={{ padding: '1.2rem 1rem', textAlign: 'left', fontWeight: '700', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--text-muted)' }}>Contact</th>
                                            <th style={{ padding: '1.2rem 1rem', textAlign: 'left', fontWeight: '700', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--text-muted)' }}>Gender</th>
                                            <th style={{ padding: '1.2rem 1rem', textAlign: 'left', fontWeight: '700', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--text-muted)' }}>Age</th>
                                            <th style={{ padding: '1.2rem 1rem', textAlign: 'left', fontWeight: '700', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--text-muted)' }}>Status</th>
                                            <th style={{ padding: '1.2rem 1rem', textAlign: 'left', fontWeight: '700', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--text-muted)' }}>Rejection Reason</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {studyData.map((row, i) => (
                                            <tr
                                                key={i}
                                                style={{
                                                    borderBottom: '1px solid rgba(99, 102, 241, 0.08)',
                                                    transition: 'all 0.2s'
                                                }}
                                                onMouseEnter={(e) => {
                                                    e.currentTarget.style.background = 'rgba(99, 102, 241, 0.05)';
                                                }}
                                                onMouseLeave={(e) => {
                                                    e.currentTarget.style.background = 'transparent';
                                                }}
                                            >
                                                <td style={{ padding: '1.2rem 1rem', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                                                    {row.date ? new Date(row.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'N/A'}
                                                </td>
                                                <td style={{ padding: '1.2rem 1rem', fontWeight: '600', fontSize: '0.95rem' }}>{row.name}</td>
                                                <td style={{ padding: '1.2rem 1rem', color: 'var(--text-muted)', fontFamily: 'monospace', fontSize: '0.85rem' }}>{row.contact}</td>
                                                <td style={{ padding: '1.2rem 1rem' }}>
                                                    <span style={{
                                                        padding: '0.35rem 0.85rem',
                                                        borderRadius: '8px',
                                                        fontSize: '0.8rem',
                                                        fontWeight: '600',
                                                        textTransform: 'capitalize',
                                                        background: row.sex === 'Male' ? 'rgba(59, 130, 246, 0.15)' : row.sex === 'Female' ? 'rgba(236, 72, 153, 0.15)' : 'rgba(139, 92, 246, 0.15)',
                                                        color: row.sex === 'Male' ? '#3b82f6' : row.sex === 'Female' ? '#ec4899' : '#8b5cf6'
                                                    }}>
                                                        {row.sex || 'N/A'}
                                                    </span>
                                                </td>
                                                <td style={{ padding: '1.2rem 1rem', color: 'var(--text-muted)', fontSize: '0.9rem' }}>{row.age || 'N/A'}</td>
                                                <td style={{ padding: '1.2rem 1rem' }}>
                                                    <span style={{
                                                        padding: '0.45rem 1rem',
                                                        borderRadius: '10px',
                                                        fontSize: '0.8rem',
                                                        fontWeight: '700',
                                                        textTransform: 'uppercase',
                                                        letterSpacing: '0.5px',
                                                        background: row.status === 'approved' ? 'rgba(16, 185, 129, 0.15)' :
                                                            row.status === 'rejected' ? 'rgba(244, 63, 94, 0.15)' :
                                                                'rgba(245, 158, 11, 0.15)',
                                                        color: row.status === 'approved' ? '#10b981' :
                                                            row.status === 'rejected' ? '#f43f5e' :
                                                                '#f59e0b'
                                                    }}>
                                                        {row.status || 'pending'}
                                                    </span>
                                                </td>
                                                <td style={{ padding: '1.2rem 1rem', color: 'var(--text-muted)', fontStyle: 'italic', fontSize: '0.85rem', maxWidth: '250px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={row.reason_of_rejection}>
                                                    {row.reason_of_rejection || '-'}
                                                </td>
                                            </tr>
                                        ))}
                                        {studyData.length === 0 && (
                                            <tr>
                                                <td colSpan="7" style={{ padding: '4rem', textAlign: 'center' }}>
                                                    <div style={{
                                                        display: 'flex',
                                                        flexDirection: 'column',
                                                        alignItems: 'center',
                                                        gap: '1rem'
                                                    }}>
                                                        <div style={{
                                                            width: '80px',
                                                            height: '80px',
                                                            background: 'rgba(99, 102, 241, 0.1)',
                                                            borderRadius: '50%',
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            justifyContent: 'center'
                                                        }}>
                                                            <Users size={40} color="#6366f1" />
                                                        </div>
                                                        <div>
                                                            <p style={{ color: 'var(--text-muted)', fontSize: '1.1rem', fontWeight: '600', marginBottom: '0.25rem' }}>
                                                                No volunteers recorded
                                                            </p>
                                                            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                                                                Volunteer enrollments will appear here once added
                                                            </p>
                                                        </div>
                                                    </div>
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        );
    }

    // 2. VBoard Dashboard View (General PRM)
    // Prepare Data
    const studyStatusData = dashboardData?.studies ? [
        { name: 'Active (Cal)', value: dashboardData.studies.ongoing, fill: '#6b7280' },
        { name: 'Upcoming', value: dashboardData.studies.upcoming, fill: '#3b82f6' },
        { name: 'Completed', value: dashboardData.studies.completed, fill: '#fbbf24' }
    ].filter(d => d.value > 0) : [];

    const studyTypeData = analyticsData?.studyTypeDistribution
        ? Object.entries(analyticsData.studyTypeDistribution).map(([name, value]) => ({ name, value }))
        : [];

    return (
        <div className="s-board animate-fade-in">

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
                        PRM Dashboard
                    </h1>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem' }}>Clinical Study Overview & Analytics</p>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
                    <button
                        onClick={() => navigate('/prm/calendar')}
                        style={{
                            padding: '0.9rem 1.5rem',
                            background: 'linear-gradient(to right, #6366f1, #8b5cf6)',
                            border: 'none',
                            borderRadius: '12px',
                            color: 'white',
                            fontSize: '0.95rem',
                            fontWeight: '700',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem',
                            boxShadow: '0 4px 15px rgba(99, 102, 241, 0.3)',
                            transition: 'all 0.2s'
                        }}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.transform = 'translateY(-2px)';
                            e.currentTarget.style.boxShadow = '0 6px 20px rgba(99, 102, 241, 0.4)';
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.transform = 'translateY(0)';
                            e.currentTarget.style.boxShadow = '0 4px 15px rgba(99, 102, 241, 0.3)';
                        }}
                    >
                        <Calendar size={18} />
                        Calendar
                    </button>
                    <button
                        onClick={downloadWashoutVolunteers}
                        style={{
                            padding: '0.9rem 1.5rem',
                            background: 'linear-gradient(to right, #f59e0b, #d97706)',
                            border: 'none',
                            borderRadius: '12px',
                            color: 'white',
                            fontSize: '0.95rem',
                            fontWeight: '700',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem',
                            boxShadow: '0 4px 15px rgba(245, 158, 11, 0.3)',
                            transition: 'all 0.2s'
                        }}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.transform = 'translateY(-2px)';
                            e.currentTarget.style.boxShadow = '0 6px 20px rgba(245, 158, 11, 0.4)';
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.transform = 'translateY(0)';
                            e.currentTarget.style.boxShadow = '0 4px 15px rgba(245, 158, 11, 0.3)';
                        }}
                    >
                        <FileDown size={18} />
                        Washout Volunteers
                    </button>
                    <div style={{ padding: '0.8rem 1.2rem', borderRadius: '14px', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-color)', fontSize: '0.85rem' }}>
                        <span style={{ color: 'var(--text-muted)' }}>Last updated: </span>
                        <span style={{ color: 'var(--accent)', fontWeight: '600' }}>{new Date().toLocaleTimeString()}</span>
                    </div>
                </div>
            </div>

            {/* Search Bar with Attendance Download */}
            <form onSubmit={handleSearch} style={{
                marginBottom: '2rem',
                padding: '1.5rem',
                background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.05) 0%, rgba(139, 92, 246, 0.05) 100%)',
                border: '1px solid rgba(99, 102, 241, 0.2)',
                borderRadius: '16px',
                display: 'flex',
                gap: '1rem',
                alignItems: 'center',
                flexWrap: 'wrap'
            }}>
                <div className="search-type-toggle">
                    <button
                        type="button"
                        onClick={() => setSearchType('study')}
                        className={`search-type-btn ${searchType === 'study' ? 'active' : ''}`}
                    >
                        Study
                    </button>
                    <button
                        type="button"
                        onClick={() => setSearchType('volunteer')}
                        className={`search-type-btn ${searchType === 'volunteer' ? 'active' : ''}`}
                    >
                        Volunteer
                    </button>
                </div>
                <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder={searchType === 'study' ? "Search Study Code or Name..." : "Search Volunteer Name..."}
                    className="search-input"
                />
                {searchResults && (
                    <button type="button" onClick={clearSearch} className="search-clear">X</button>
                )}
                <button type="submit" disabled={searching} className="btn btn-outline" style={{ padding: '0.5rem 1rem' }}>
                    {searching ? '...' : 'Search'}
                </button>
                {searchType === 'study' && (
                    <button
                        type="button"
                        onClick={() => downloadAttendance(searchQuery)}
                        style={{
                            padding: '0.7rem 1.3rem',
                            background: 'linear-gradient(to right, #10b981, #14b8a6)',
                            border: 'none',
                            borderRadius: '12px',
                            color: 'white',
                            fontSize: '0.9rem',
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
                        Download Attendance
                    </button>
                )}
            </form>

            {/* Search Results */}
            {searchResults && (
                <div style={{
                    marginBottom: '2rem',
                    padding: '0',
                    overflow: 'hidden',
                    background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.05) 0%, rgba(20, 184, 166, 0.05) 100%)',
                    border: '1px solid rgba(16, 185, 129, 0.2)',
                    borderRadius: '16px'
                }}>
                    <div style={{
                        padding: '2rem 2rem 1.5rem',
                        background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.1) 0%, rgba(20, 184, 166, 0.1) 100%)',
                        borderBottom: '1px solid rgba(16, 185, 129, 0.2)'
                    }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
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
                                    <h3 style={{ fontSize: '1.4rem', fontWeight: '800', margin: 0, marginBottom: '0.3rem' }}>Search Results</h3>
                                    <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', margin: 0 }}>{searchResults.length} matches found</p>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div style={{ padding: '2rem' }}>
                        <div style={{ maxHeight: '500px', overflow: 'auto' }}>
                            <table style={{ width: '100%', minWidth: '800px', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
                                <thead>
                                    <tr>
                                        {searchType === 'study' ? (
                                            <>
                                                <th>Code</th>
                                                <th>Name</th>
                                                <th>Status</th>
                                                <th>Start Date</th>
                                                <th>Volunteers</th>
                                            </>
                                        ) : (
                                            <>
                                                <th>Name</th>
                                                <th>Email</th>
                                                <th>Phone</th>
                                                <th>History</th>
                                            </>
                                        )}
                                        <th>Action</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {searchResults.map((item, idx) => (
                                        <tr key={idx} className="animate-slide-up">
                                            {searchType === 'study' ? (
                                                <>
                                                    <td className="font-mono text-primary">{item.code}</td>
                                                    <td className="font-medium text-white">{item.name}</td>
                                                    <td>
                                                        <span className={`px-2 py-1 rounded text-xs ${item.status === 'ONGOING' ? 'text-success' : 'text-muted'}`}>
                                                            {item.status}
                                                        </span>
                                                    </td>
                                                    <td>{item.startDate}</td>
                                                    <td>{item.volunteerCount}</td>
                                                </>
                                            ) : (
                                                <>
                                                    <td className="text-white font-medium">{item.name}</td>
                                                    <td>{item.email}</td>
                                                    <td>{item.phone}</td>
                                                    <td>{item.studiesAttended} Studies</td>
                                                </>
                                            )}
                                            <td>
                                                <button onClick={() => {
                                                    if (searchType === 'study') navigate(`/prm/dashboard/${item.code}`);
                                                    else alert('Volunteer details coming soon');
                                                }} className="text-primary hover:underline" style={{ background: 'transparent', border: 'none', cursor: 'pointer' }}>
                                                    View
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {/* Statistics Cards - Now Interactive */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.2rem', marginBottom: '2rem' }}>
                <StatCard title="Total Studies (Lib)" value={dashboardData?.studies?.total || 0} icon={Database} colorVar="--primary" />
                <div onClick={() => fetchCategoryStudies('ONGOING')} style={{ cursor: 'pointer' }}>
                    <StatCard title="Ongoing" value={dashboardData?.studies?.ongoing || 0} icon={Activity} colorVar="--chart-purple" />
                </div>
                <div onClick={() => fetchCategoryStudies('UPCOMING')} style={{ cursor: 'pointer' }}>
                    <StatCard title="Upcoming" value={dashboardData?.studies?.upcoming || 0} icon={Calendar} colorVar="--chart-blue" />
                </div>
                <div onClick={() => fetchCategoryStudies('COMPLETED')} style={{ cursor: 'pointer' }}>
                    <StatCard title="Completed" value={dashboardData?.studies?.completed || 0} icon={CheckCircle} colorVar="--success" />
                </div>
                <StatCard title="Clinic Volunteers" value={dashboardData?.volunteers?.totalInClinic || 0} icon={Users} colorVar="--secondary" />
                <div onClick={() => fetchCategoryStudies('DRT')} style={{ cursor: 'pointer' }}>
                    <StatCard title="DRT Studies" value={dashboardData?.studies?.drt_count || 0} icon={TrendingUp} colorVar="--accent" />
                </div>
            </div>

            {/* Expanded Category Section */}
            {expandedCategory && (
                <div className="animate-fade-in" style={{
                    marginBottom: '2rem',
                    marginTop: '1rem',
                    padding: '0',
                    overflow: 'hidden',
                    background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.05) 0%, rgba(20, 184, 166, 0.05) 100%)',
                    border: '1px solid rgba(16, 185, 129, 0.2)',
                    borderRadius: '16px'
                }}>
                    <div style={{
                        padding: '2rem 2rem 1.5rem',
                        background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.1) 0%, rgba(20, 184, 166, 0.1) 100%)',
                        borderBottom: '1px solid rgba(16, 185, 129, 0.2)'
                    }}>
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
                            <h3 style={{ fontSize: '1.4rem', fontWeight: '800', margin: 0 }}>
                                {expandedCategory === 'ONGOING' && '🟢 Ongoing Studies'}
                                {expandedCategory === 'UPCOMING' && '🔵 Upcoming Studies'}
                                {expandedCategory === 'COMPLETED' && '🟠 Completed Studies'}
                                {expandedCategory === 'DRT' && '🔴 DRT Studies'}
                                <span style={{ marginLeft: '0.5rem', fontSize: '0.9rem', color: 'var(--text-muted)' }}>
                                    ({categoryStudies.length})
                                </span>
                            </h3>
                        </div>
                    </div>

                    {categoryLoading ? (
                        <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                            Loading studies...
                        </div>
                    ) : categoryStudies.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                            No studies in this category
                        </div>
                    ) : (
                        <div style={{ padding: '2rem' }}>
                            <div style={{ maxHeight: '500px', overflow: 'auto' }}>
                                <table style={{ width: '100%', minWidth: '800px', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
                                    <thead style={{ position: 'sticky', top: 0, background: 'linear-gradient(to right, #10b981, #14b8a6)', zIndex: 1 }}>
                                        <tr style={{ textAlign: 'left', color: 'white' }}>
                                            <th style={{ padding: '1rem', fontWeight: '700' }}>Study Code</th>
                                            <th style={{ padding: '1rem', fontWeight: '700' }}>Study Name</th>
                                            <th style={{ padding: '1rem', fontWeight: '700' }}>Start Date</th>
                                            <th style={{ padding: '1rem', fontWeight: '700' }}>Volunteers</th>
                                            <th style={{ padding: '1rem', fontWeight: '700' }}>Status</th>
                                            <th style={{ padding: '1rem', fontWeight: '700' }}>Action</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {categoryStudies.map((study, idx) => (
                                            <tr key={idx} className="animate-slide-up" style={{
                                                borderBottom: '1px solid rgba(16, 185, 129, 0.1)',
                                                transition: 'background 0.2s'
                                            }}
                                                onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(16, 185, 129, 0.05)'}
                                                onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                                            >
                                                <td style={{ padding: '1rem', fontFamily: 'monospace', fontWeight: '600', color: '#6366f1' }}>
                                                    {study.studyCode}
                                                </td>
                                                <td style={{ padding: '1rem', fontWeight: '500', color: '#111827' }}>
                                                    {study.studyName}
                                                </td>
                                                <td style={{ padding: '1rem', color: '#374151' }}>
                                                    {study.startDate ? new Date(study.startDate).toLocaleDateString() : 'N/A'}
                                                </td>
                                                <td style={{ padding: '1rem' }}>
                                                    <span style={{
                                                        padding: '0.4rem 0.8rem',
                                                        borderRadius: '8px',
                                                        fontSize: '0.85rem',
                                                        fontWeight: '700',
                                                        background: study.volunteersAssigned >= study.volunteersPlanned ? 'rgba(34, 197, 94, 0.15)' : 'rgba(245, 158, 11, 0.15)',
                                                        color: study.volunteersAssigned >= study.volunteersPlanned ? '#22c55e' : '#f59e0b'
                                                    }}>
                                                        {study.volunteersAssigned}/{study.volunteersPlanned}
                                                    </span>
                                                </td>
                                                <td style={{ padding: '1rem' }}>
                                                    <span style={{
                                                        padding: '0.4rem 0.8rem',
                                                        borderRadius: '8px',
                                                        fontSize: '0.75rem',
                                                        fontWeight: '700',
                                                        textTransform: 'uppercase',
                                                        background: expandedCategory === 'ONGOING' ? 'rgba(139, 92, 246, 0.15)' : expandedCategory === 'UPCOMING' ? 'rgba(59, 130, 246, 0.15)' : 'rgba(16, 185, 129, 0.15)',
                                                        color: expandedCategory === 'ONGOING' ? '#8b5cf6' : expandedCategory === 'UPCOMING' ? '#3b82f6' : '#10b981'
                                                    }}>
                                                        {study.status}
                                                    </span>
                                                </td>
                                                <td style={{ padding: '1rem' }}>
                                                    <button
                                                        onClick={() => navigate(`/prm/dashboard/${study.studyCode}`)}
                                                        style={{
                                                            padding: '0.5rem 1rem',
                                                            background: 'linear-gradient(to right, #6366f1, #8b5cf6)',
                                                            border: 'none',
                                                            borderRadius: '8px',
                                                            color: 'white',
                                                            fontSize: '0.85rem',
                                                            fontWeight: '600',
                                                            cursor: 'pointer',
                                                            transition: 'all 0.2s',
                                                            boxShadow: '0 2px 8px rgba(99, 102, 241, 0.3)'
                                                        }}
                                                        onMouseEnter={(e) => {
                                                            e.currentTarget.style.transform = 'translateY(-2px)';
                                                            e.currentTarget.style.boxShadow = '0 4px 12px rgba(99, 102, 241, 0.4)';
                                                        }}
                                                        onMouseLeave={(e) => {
                                                            e.currentTarget.style.transform = 'translateY(0)';
                                                            e.currentTarget.style.boxShadow = '0 2px 8px rgba(99, 102, 241, 0.3)';
                                                        }}
                                                    >
                                                        View Details
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Charts Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
                {/* Study Status Distribution */}
                <div style={{ padding: '0', overflow: 'hidden', borderRadius: '16px', background: 'white', border: '1px solid rgba(99, 102, 241, 0.2)' }}>
                    <div style={{ padding: '1.5rem 2rem', background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.1) 0%, rgba(139, 92, 246, 0.1) 100%)', borderBottom: '1px solid rgba(99, 102, 241, 0.2)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
                            <div style={{ padding: '0.7rem', background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', borderRadius: '12px', display: 'flex', boxShadow: '0 4px 15px rgba(99, 102, 241, 0.3)' }}>
                                <TrendingUp size={20} color="white" />
                            </div>
                            <h3 style={{ fontSize: '1.3rem', fontWeight: '800', margin: 0 }}>Study Status Distribution</h3>
                        </div>
                    </div>
                    <div style={{ padding: '2rem' }}>
                        <ResponsiveContainer width="100%" height={300}>
                            <PieChart>
                                <Pie
                                    data={studyStatusData}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={60}
                                    outerRadius={80}
                                    paddingAngle={5}
                                    dataKey="value"
                                >
                                    {studyStatusData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.fill} stroke="rgba(0,0,0,0.5)" />
                                    ))}
                                </Pie>
                                <RechartsTooltip contentStyle={{ backgroundColor: 'white', border: '1px solid rgba(99, 102, 241, 0.2)', borderRadius: '12px', boxShadow: '0 4px 15px rgba(0,0,0,0.1)' }} />
                                <Legend verticalAlign="bottom" height={36} iconType="circle" />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Studies by Type */}
                <div style={{ padding: '0', overflow: 'hidden', borderRadius: '16px', background: 'white', border: '1px solid rgba(236, 72, 153, 0.2)' }}>
                    <div style={{ padding: '1.5rem 2rem', background: 'linear-gradient(135deg, rgba(236, 72, 153, 0.1) 0%, rgba(244, 114, 182, 0.1) 100%)', borderBottom: '1px solid rgba(236, 72, 153, 0.2)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
                            <div style={{ padding: '0.7rem', background: 'linear-gradient(135deg, #ec4899, #f472b6)', borderRadius: '12px', display: 'flex', boxShadow: '0 4px 15px rgba(236, 72, 153, 0.3)' }}>
                                <Database size={20} color="white" />
                            </div>
                            <h3 style={{ fontSize: '1.3rem', fontWeight: '800', margin: 0 }}>Studies by Type (Masters)</h3>
                        </div>
                    </div>
                    <div style={{ padding: '2rem' }}>
                        <ResponsiveContainer width="100%" height={300}>
                            <BarChart data={studyTypeData}>
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(236, 72, 153, 0.1)" />
                                <XAxis dataKey="name" stroke="#6b7280" fontSize={12} fontWeight={600} />
                                <YAxis stroke="#6b7280" fontSize={12} />
                                <RechartsTooltip cursor={{ fill: 'rgba(236, 72, 153, 0.05)' }} contentStyle={{ backgroundColor: 'white', border: '1px solid rgba(236, 72, 153, 0.2)', borderRadius: '12px', boxShadow: '0 4px 15px rgba(0,0,0,0.1)' }} />
                                <Bar dataKey="value" fill="#ec4899" radius={[8, 8, 0, 0]} name="Studies" />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>

            {/* Monthly Trend (Full Width) */}
            {analyticsData?.studiesByMonth && (
                <div style={{ marginBottom: '2rem', padding: '0', overflow: 'hidden', borderRadius: '16px', background: 'white', border: '1px solid rgba(139, 92, 246, 0.2)' }}>
                    <div style={{ padding: '1.5rem 2rem', background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.1) 0%, rgba(167, 139, 250, 0.1) 100%)', borderBottom: '1px solid rgba(139, 92, 246, 0.2)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
                            <div style={{ padding: '0.7rem', background: 'linear-gradient(135deg, #8b5cf6, #a78bfa)', borderRadius: '12px', display: 'flex', boxShadow: '0 4px 15px rgba(139, 92, 246, 0.3)' }}>
                                <TrendingUp size={20} color="white" />
                            </div>
                            <h3 style={{ fontSize: '1.4rem', fontWeight: '800', margin: 0 }}>Study Initiation Trend</h3>
                        </div>
                    </div>
                    <div style={{ padding: '2rem' }}>
                        <ResponsiveContainer width="100%" height={320}>
                            <LineChart data={analyticsData.studiesByMonth}>
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(139, 92, 246, 0.1)" />
                                <XAxis dataKey="month" stroke="#6b7280" fontSize={12} fontWeight={600} />
                                <YAxis stroke="#6b7280" fontSize={12} />
                                <RechartsTooltip contentStyle={{ backgroundColor: 'white', border: '1px solid rgba(139, 92, 246, 0.2)', borderRadius: '12px', boxShadow: '0 4px 15px rgba(0,0,0,0.1)' }} />
                                <Legend verticalAlign="top" height={40} wrapperStyle={{ paddingBottom: '1rem' }} />
                                <Line type="monotone" dataKey="count" stroke="#3b82f6" strokeWidth={3} dot={{ r: 6 }} name="New Studies" />
                                <Line type="monotone" dataKey="volunteers" stroke="#10b981" strokeWidth={3} dot={{ r: 6 }} name="Planned Volunteers" />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            )}

            {/* Pre-Screening Volunteers Section */}
            <div style={{
                marginBottom: '2rem',
                padding: '0',
                overflow: 'hidden',
                background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.05) 0%, rgba(251, 191, 36, 0.05) 100%)',
                border: '1px solid rgba(245, 158, 11, 0.2)',
                borderRadius: '16px'
            }}>
                <div style={{
                    padding: '2rem 2rem 1.5rem',
                    background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.1) 0%, rgba(251, 191, 36, 0.1) 100%)',
                    borderBottom: '1px solid rgba(245, 158, 11, 0.2)'
                }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1.5rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                            <div style={{
                                width: '50px',
                                height: '50px',
                                borderRadius: '14px',
                                background: 'linear-gradient(135deg, #f59e0b, #fbbf24)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                boxShadow: '0 4px 15px rgba(245, 158, 11, 0.4)'
                            }}>
                                <Users size={26} color="white" />
                            </div>
                            <div>
                                <h3 style={{ fontSize: '1.4rem', fontWeight: '800', margin: 0, marginBottom: '0.3rem' }}>
                                    Pre-Screening Volunteers
                                    <span style={{ marginLeft: '0.8rem', fontSize: '0.9rem', color: 'var(--text-muted)' }}>
                                        ({preScreeningVolunteers.filter(v =>
                                            !volunteerSearchPre ||
                                            v.pre_screening?.name?.toLowerCase().includes(volunteerSearchPre.toLowerCase()) ||
                                            v.volunteer_id?.toLowerCase().includes(volunteerSearchPre.toLowerCase()) ||
                                            v.pre_screening?.contact?.includes(volunteerSearchPre)
                                        ).length})
                                    </span>
                                </h3>
                                <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', margin: 0 }}>Manage and delete pre-screening volunteers</p>
                            </div>
                        </div>
                        <input
                            type="search"
                            placeholder="Search by name, ID, or contact..."
                            value={volunteerSearchPre}
                            onChange={(e) => setVolunteerSearchPre(e.target.value)}
                            style={{
                                minWidth: '300px',
                                padding: '0.9rem 1.2rem',
                                borderRadius: '12px',
                                border: '2px solid rgba(245, 158, 11, 0.3)',
                                background: 'rgba(255, 255, 255, 0.9)',
                                fontSize: '0.95rem',
                                fontWeight: '500',
                                transition: 'all 0.2s'
                            }}
                        />
                    </div>
                </div>

                <div style={{ padding: '2rem' }}>
                    {volunteersLoading ? (
                        <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                            Loading volunteers...
                        </div>
                    ) : (
                        <div style={{ maxHeight: '500px', overflow: 'auto' }}>
                            {preScreeningVolunteers
                                .filter(v =>
                                    !volunteerSearchPre ||
                                    v.pre_screening?.name?.toLowerCase().includes(volunteerSearchPre.toLowerCase()) ||
                                    v.volunteer_id?.toLowerCase().includes(volunteerSearchPre.toLowerCase()) ||
                                    v.pre_screening?.contact?.includes(volunteerSearchPre)
                                )
                                .map((volunteer, idx) => (
                                    <div key={volunteer._id || idx} style={{
                                        padding: '1.2rem',
                                        marginBottom: '1rem',
                                        background: 'white',
                                        borderRadius: '12px',
                                        border: '1px solid rgba(245, 158, 11, 0.2)',
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'center',
                                        transition: 'all 0.2s'
                                    }}
                                        onMouseEnter={(e) => {
                                            e.currentTarget.style.boxShadow = '0 4px 12px rgba(245, 158, 11, 0.15)';
                                            e.currentTarget.style.transform = 'translateY(-2px)';
                                        }}
                                        onMouseLeave={(e) => {
                                            e.currentTarget.style.boxShadow = 'none';
                                            e.currentTarget.style.transform = 'translateY(0)';
                                        }}
                                    >
                                        <div style={{ flex: 1 }}>
                                            <div style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap' }}>
                                                <div>
                                                    <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.2rem', textTransform: 'uppercase', fontWeight: '600' }}>Name</p>
                                                    <p style={{ fontWeight: '600', fontSize: '1rem', margin: 0 }}>{volunteer.pre_screening?.name || 'N/A'}</p>
                                                </div>
                                                {volunteer.subject_code && (
                                                    <div>
                                                        <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.2rem', textTransform: 'uppercase', fontWeight: '600' }}>Subject Code</p>
                                                        <p style={{ fontWeight: '700', fontSize: '0.95rem', margin: 0, fontFamily: 'monospace', color: '#ec4899', letterSpacing: '0.5px' }}>{volunteer.subject_code}</p>
                                                    </div>
                                                )}
                                                <div>
                                                    <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.2rem', textTransform: 'uppercase', fontWeight: '600' }}>Volunteer ID</p>
                                                    <p style={{ fontWeight: '500', fontSize: '0.9rem', margin: 0, fontFamily: 'monospace', color: '#6366f1' }}>{volunteer.volunteer_id}</p>
                                                </div>
                                                <div>
                                                    <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.2rem', textTransform: 'uppercase', fontWeight: '600' }}>Contact</p>
                                                    <p style={{ fontWeight: '500', fontSize: '0.9rem', margin: 0 }}>{volunteer.pre_screening?.contact || 'N/A'}</p>
                                                </div>
                                                <div>
                                                    <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.2rem', textTransform: 'uppercase', fontWeight: '600' }}>Age</p>
                                                    <p style={{ fontWeight: '500', fontSize: '0.9rem', margin: 0 }}>{volunteer.pre_screening?.age || 'N/A'}</p>
                                                </div>
                                                <div>
                                                    <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.2rem', textTransform: 'uppercase', fontWeight: '600' }}>Gender</p>
                                                    <p style={{ fontWeight: '500', fontSize: '0.9rem', margin: 0 }}>{volunteer.pre_screening?.gender || 'N/A'}</p>
                                                </div>
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => handleDeleteVolunteer(volunteer.volunteer_id, volunteer.pre_screening?.name)}
                                            style={{
                                                padding: '0.6rem 1.2rem',
                                                background: 'linear-gradient(to right, #ef4444, #dc2626)',
                                                border: 'none',
                                                borderRadius: '8px',
                                                color: 'white',
                                                fontSize: '0.85rem',
                                                fontWeight: '600',
                                                cursor: 'pointer',
                                                transition: 'all 0.2s',
                                                boxShadow: '0 2px 8px rgba(239, 68, 68, 0.3)'
                                            }}
                                            onMouseEnter={(e) => {
                                                e.currentTarget.style.transform = 'translateY(-2px)';
                                                e.currentTarget.style.boxShadow = '0 4px 12px rgba(239, 68, 68, 0.4)';
                                            }}
                                            onMouseLeave={(e) => {
                                                e.currentTarget.style.transform = 'translateY(0)';
                                                e.currentTarget.style.boxShadow = '0 2px 8px rgba(239, 68, 68, 0.3)';
                                            }}
                                        >
                                            Delete
                                        </button>
                                    </div>
                                ))}
                            {preScreeningVolunteers.filter(v =>
                                !volunteerSearchPre ||
                                v.pre_screening?.name?.toLowerCase().includes(volunteerSearchPre.toLowerCase()) ||
                                v.volunteer_id?.toLowerCase().includes(volunteerSearchPre.toLowerCase()) ||
                                v.pre_screening?.contact?.includes(volunteerSearchPre)
                            ).length === 0 && (
                                    <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                                        No volunteers found
                                    </div>
                                )}
                        </div>
                    )}
                </div>
            </div>

            {/* Approved Volunteers Section */}
            <div style={{
                marginBottom: '2rem',
                padding: '0',
                overflow: 'hidden',
                background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.05) 0%, rgba(20, 184, 166, 0.05) 100%)',
                border: '1px solid rgba(16, 185, 129, 0.2)',
                borderRadius: '16px'
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
                                <CheckCircle size={26} color="white" />
                            </div>
                            <div>
                                <h3 style={{ fontSize: '1.4rem', fontWeight: '800', margin: 0, marginBottom: '0.3rem' }}>
                                    Approved Volunteers
                                    <span style={{ marginLeft: '0.8rem', fontSize: '0.9rem', color: 'var(--text-muted)' }}>
                                        ({approvedVolunteers.filter(v =>
                                            !volunteerSearchApproved ||
                                            v.pre_screening?.name?.toLowerCase().includes(volunteerSearchApproved.toLowerCase()) ||
                                            v.volunteer_id?.toLowerCase().includes(volunteerSearchApproved.toLowerCase()) ||
                                            v.pre_screening?.contact?.includes(volunteerSearchApproved)
                                        ).length})
                                    </span>
                                </h3>
                                <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', margin: 0 }}>View approved volunteers</p>
                            </div>
                        </div>
                        <input
                            type="search"
                            placeholder="Search by name, ID, or contact..."
                            value={volunteerSearchApproved}
                            onChange={(e) => setVolunteerSearchApproved(e.target.value)}
                            style={{
                                minWidth: '300px',
                                padding: '0.9rem 1.2rem',
                                borderRadius: '12px',
                                border: '2px solid rgba(16, 185, 129, 0.3)',
                                background: 'rgba(255, 255, 255, 0.9)',
                                fontSize: '0.95rem',
                                fontWeight: '500',
                                transition: 'all 0.2s'
                            }}
                        />
                    </div>
                </div>

                <div style={{ padding: '2rem' }}>
                    {volunteersLoading ? (
                        <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                            Loading volunteers...
                        </div>
                    ) : (
                        <div style={{ maxHeight: '500px', overflow: 'auto' }}>
                            {approvedVolunteers
                                .filter(v =>
                                    !volunteerSearchApproved ||
                                    v.pre_screening?.name?.toLowerCase().includes(volunteerSearchApproved.toLowerCase()) ||
                                    v.volunteer_id?.toLowerCase().includes(volunteerSearchApproved.toLowerCase()) ||
                                    v.pre_screening?.contact?.includes(volunteerSearchApproved)
                                )
                                .map((volunteer, idx) => (
                                    <div key={volunteer._id || idx} style={{
                                        padding: '1.2rem',
                                        marginBottom: '1rem',
                                        background: 'white',
                                        borderRadius: '12px',
                                        border: '1px solid rgba(16, 185, 129, 0.2)',
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'center',
                                        transition: 'all 0.2s'
                                    }}
                                        onMouseEnter={(e) => {
                                            e.currentTarget.style.boxShadow = '0 4px 12px rgba(16, 185, 129, 0.15)';
                                            e.currentTarget.style.transform = 'translateY(-2px)';
                                        }}
                                        onMouseLeave={(e) => {
                                            e.currentTarget.style.boxShadow = 'none';
                                            e.currentTarget.style.transform = 'translateY(0)';
                                        }}
                                    >
                                        <div style={{ flex: 1 }}>
                                            <div style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap' }}>
                                                <div>
                                                    <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.2rem', textTransform: 'uppercase', fontWeight: '600' }}>Name</p>
                                                    <p style={{ fontWeight: '600', fontSize: '1rem', margin: 0 }}>{volunteer.pre_screening?.name || 'N/A'}</p>
                                                </div>
                                                {volunteer.subject_code && (
                                                    <div>
                                                        <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.2rem', textTransform: 'uppercase', fontWeight: '600' }}>Subject Code</p>
                                                        <p style={{ fontWeight: '700', fontSize: '0.95rem', margin: 0, fontFamily: 'monospace', color: '#ec4899', letterSpacing: '0.5px' }}>{volunteer.subject_code}</p>
                                                    </div>
                                                )}
                                                <div>
                                                    <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.2rem', textTransform: 'uppercase', fontWeight: '600' }}>Volunteer ID</p>
                                                    <p style={{ fontWeight: '500', fontSize: '0.9rem', margin: 0, fontFamily: 'monospace', color: '#6366f1' }}>{volunteer.volunteer_id}</p>
                                                </div>
                                                <div>
                                                    <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.2rem', textTransform: 'uppercase', fontWeight: '600' }}>Contact</p>
                                                    <p style={{ fontWeight: '500', fontSize: '0.9rem', margin: 0 }}>{volunteer.pre_screening?.contact || 'N/A'}</p>
                                                </div>
                                                <div>
                                                    <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.2rem', textTransform: 'uppercase', fontWeight: '600' }}>Age</p>
                                                    <p style={{ fontWeight: '500', fontSize: '0.9rem', margin: 0 }}>{volunteer.pre_screening?.age || 'N/A'}</p>
                                                </div>
                                                <div>
                                                    <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.2rem', textTransform: 'uppercase', fontWeight: '600' }}>Gender</p>
                                                    <p style={{ fontWeight: '500', fontSize: '0.9rem', margin: 0 }}>{volunteer.pre_screening?.gender || 'N/A'}</p>
                                                </div>
                                            </div>
                                        </div>
                                        <div style={{
                                            padding: '0.6rem 1.2rem',
                                            background: 'rgba(16, 185, 129, 0.15)',
                                            borderRadius: '8px',
                                            fontSize: '0.85rem',
                                            fontWeight: '700',
                                            color: '#10b981',
                                            textTransform: 'uppercase'
                                        }}>
                                            Approved
                                        </div>
                                    </div>
                                ))}
                            {approvedVolunteers.filter(v =>
                                !volunteerSearchApproved ||
                                v.pre_screening?.name?.toLowerCase().includes(volunteerSearchApproved.toLowerCase()) ||
                                v.volunteer_id?.toLowerCase().includes(volunteerSearchApproved.toLowerCase()) ||
                                v.pre_screening?.contact?.includes(volunteerSearchApproved)
                            ).length === 0 && (
                                    <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                                        No volunteers found
                                    </div>
                                )}
                        </div>
                    )}
                </div>
            </div>

        </div>
    );
};


export default SBoard;
