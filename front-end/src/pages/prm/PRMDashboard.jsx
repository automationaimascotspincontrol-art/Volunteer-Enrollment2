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

// Reusing global .stat-card class
const StatCard = ({ title, value, icon: Icon, colorVar }) => (
    <div className="stat-card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.8rem' }}>
            <div>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '0.3rem' }}>{title}</p>
                <h3 style={{ fontSize: '2rem', fontWeight: '700', color: `var(${colorVar})` }}>{value}</h3>
            </div>
            <div style={{ padding: '0.8rem', background: `rgba(var(${colorVar}-rgb), 0.1)`, borderRadius: '12px' }}>
                <Icon color={`var(${colorVar})`} size={24} />
            </div>
        </div>
    </div>
);

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

    useEffect(() => {
        if (id) {
            fetchStudyParticipation(id);
        } else {
            fetchGlobalStats();
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

    // --- RENDER ---

    // 1. Study Specific View
    if (id) {
        return (
            <div className="s-board animate-fade-in">
                <div className="dashboard-header">
                    <div className="flex items-center gap-4" style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <button onClick={() => navigate('/prm/calendar')} className="btn btn-outline" style={{ padding: '0.5rem' }}>
                            <ArrowLeft />
                        </button>
                        <div>
                            <h1 className="dashboard-title flex items-center gap-2">
                                Study Board <span style={{ fontSize: '1.2rem', fontFamily: 'monospace', background: 'rgba(99, 102, 241, 0.1)', padding: '0.2rem 0.5rem', borderRadius: '4px', color: 'var(--primary)' }}>{id}</span>
                            </h1>
                            <p className="dashboard-subtitle">Detailed enrollment and status analytics</p>
                        </div>
                    </div>
                    <button
                        onClick={downloadReport}
                        className="btn btn-primary"
                    >
                        <FileDown size={18} />
                        Export Report
                    </button>
                </div>

                {/* Study Specific Stats Cards */}
                <div className="stats-grid">
                    <div className="stat-card flex items-center justify-between">
                        <div>
                            <p className="text-muted text-sm mb-1">Total Participants</p>
                            <h3 className="text-2xl font-bold text-white">{studyAnalytics?.total_participants || 0}</h3>
                        </div>
                        <div style={{ padding: '0.8rem', background: 'rgba(59, 130, 246, 0.2)', borderRadius: '12px' }}>
                            <Users className="text-primary" />
                        </div>
                    </div>
                    <div className="stat-card flex items-center justify-between">
                        <div>
                            <p className="text-muted text-sm mb-1">Approved</p>
                            <h3 className="text-2xl font-bold text-white">{studyAnalytics?.approved || 0}</h3>
                        </div>
                        <div style={{ padding: '0.8rem', background: 'rgba(16, 185, 129, 0.2)', borderRadius: '12px' }}>
                            <CheckCircle className="text-success" />
                        </div>
                    </div>
                    <div className="stat-card flex items-center justify-between">
                        <div>
                            <p className="text-muted text-sm mb-1">Rejected</p>
                            <h3 className="text-2xl font-bold text-white">{studyAnalytics?.rejected || 0}</h3>
                        </div>
                        <div style={{ padding: '0.8rem', background: 'rgba(244, 63, 94, 0.2)', borderRadius: '12px' }}>
                            <Activity className="text-error" />
                        </div>
                    </div>
                    <div className="stat-card flex items-center justify-between">
                        <div>
                            <p className="text-muted text-sm mb-1">Pending</p>
                            <h3 className="text-2xl font-bold text-white">{studyAnalytics?.pending || 0}</h3>
                        </div>
                        <div style={{ padding: '0.8rem', background: 'rgba(245, 158, 11, 0.2)', borderRadius: '12px' }}>
                            <Clock className="text-warning" />
                        </div>
                    </div>
                </div>

                {/* Volunteer List */}
                <div className="glass-card">
                    <h3 className="chart-title">
                        <Database size={18} className="text-primary" />
                        Volunteer Enrollments
                    </h3>

                    <div className="table-container">
                        {loading ? <p className="text-center text-muted py-8">Loading study data...</p> : (
                            <table className="custom-table">
                                <thead>
                                    <tr>
                                        <th>Date</th>
                                        <th>Name</th>
                                        <th>Contact</th>
                                        <th>Gender</th>
                                        <th>Age</th>
                                        <th>Status</th>
                                        <th>Rejection Reason</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {studyData.map((row, i) => (
                                        <tr key={i} className="animate-slide-up">
                                            <td>
                                                {row.date ? new Date(row.date).toLocaleDateString() : 'N/A'}
                                            </td>
                                            <td style={{ fontWeight: 500 }}>{row.name}</td>
                                            <td className="text-muted">{row.contact}</td>
                                            <td className="text-muted">{row.sex}</td>
                                            <td className="text-muted">{row.age}</td>
                                            <td>
                                                <span className={`px-2 py-1 rounded-full text-xs font-bold ${row.status === 'approved' ? 'text-success' :
                                                    row.status === 'rejected' ? 'text-error' :
                                                        'text-muted'
                                                    }`}>
                                                    {row.status?.toUpperCase()}
                                                </span>
                                            </td>
                                            <td className="text-muted italic" title={row.reason_of_rejection}>
                                                {row.reason_of_rejection || '-'}
                                            </td>
                                        </tr>
                                    ))}
                                    {studyData.length === 0 && (
                                        <tr><td colSpan="7" className="text-center text-muted py-8">No volunteers recorded for this study.</td></tr>
                                    )}
                                </tbody>
                            </table>
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

            <div className="dashboard-header">
                <div>
                    <h1 className="dashboard-title">
                        PRM Dashboard
                    </h1>
                    <p className="dashboard-subtitle">Clinical Study Overview & Analytics</p>
                </div>
                <div className="sboard-header-controls">
                    <button
                        onClick={() => navigate('/prm/calendar')}
                        className="btn btn-primary"
                    >
                        <Calendar size={18} />
                        <span>Calendar</span>
                    </button>
                    <div className="last-updated">
                        <span className="text-muted">Last updated: </span>
                        <span className="text-accent font-weight-600">{new Date().toLocaleTimeString()}</span>
                    </div>
                </div>
            </div>

            {/* Search Bar */}
            <form onSubmit={handleSearch} className="search-container">
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
            </form>

            {/* Search Results */}
            {searchResults && (
                <div className="glass-card mb-8">
                    <div className="results-header">
                        <h3 className="chart-title">Search Results</h3>
                        <span className="results-count">{searchResults.length} matches found</span>
                    </div>
                    <div className="table-container">
                        <table className="custom-table">
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
            )}

            {/* Statistics Cards - Now Interactive */}
            <div className="stats-grid">
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
                <div className="glass-card animate-fade-in" style={{ marginBottom: '2rem', marginTop: '1rem' }}>
                    <h3 className="chart-title" style={{ marginBottom: '1.5rem' }}>
                        <Database size={18} className="text-primary" />
                        {expandedCategory === 'ONGOING' && '🟢 Ongoing Studies'}
                        {expandedCategory === 'UPCOMING' && '🔵 Upcoming Studies'}
                        {expandedCategory === 'COMPLETED' && '🟠 Completed Studies'}
                        {expandedCategory === 'DRT' && '🔴 DRT Studies'}
                        <span style={{ marginLeft: '0.5rem', fontSize: '0.9rem', color: 'var(--text-muted)' }}>
                            ({categoryStudies.length})
                        </span>
                    </h3>

                    {categoryLoading ? (
                        <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                            Loading studies...
                        </div>
                    ) : categoryStudies.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                            No studies in this category
                        </div>
                    ) : (
                        <div className="table-container">
                            <table className="custom-table">
                                <thead>
                                    <tr>
                                        <th>Study Code</th>
                                        <th>Study Name</th>
                                        <th>Start Date</th>
                                        <th>Volunteers</th>
                                        <th>Status</th>
                                        <th>Action</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {categoryStudies.map((study, idx) => (
                                        <tr key={idx} className="animate-slide-up">
                                            <td style={{ fontFamily: 'monospace', fontWeight: '600', color: 'var(--primary)' }}>
                                                {study.studyCode}
                                            </td>
                                            <td style={{ fontWeight: '500' }}>
                                                {study.studyName}
                                            </td>
                                            <td className="text-muted">
                                                {study.startDate ? new Date(study.startDate).toLocaleDateString() : 'N/A'}
                                            </td>
                                            <td>
                                                <span style={{
                                                    padding: '0.3rem 0.8rem',
                                                    background: study.volunteersAssigned >= study.volunteersPlanned ? '#10b98120' : '#f59e0b20',
                                                    color: study.volunteersAssigned >= study.volunteersPlanned ? '#10b981' : '#f59e0b',
                                                    borderRadius: '8px',
                                                    fontSize: '0.85rem',
                                                    fontWeight: '700'
                                                }}>
                                                    {study.volunteersAssigned}/{study.volunteersPlanned}
                                                </span>
                                            </td>
                                            <td>
                                                <span style={{
                                                    padding: '0.3rem 0.8rem',
                                                    background: expandedCategory === 'ONGOING' ? '#8b5cf620' : expandedCategory === 'UPCOMING' ? '#3b82f620' : '#10b98120',
                                                    color: expandedCategory === 'ONGOING' ? '#8b5cf6' : expandedCategory === 'UPCOMING' ? '#3b82f6' : '#10b981',
                                                    borderRadius: '8px',
                                                    fontSize: '0.75rem',
                                                    fontWeight: '700',
                                                    textTransform: 'uppercase'
                                                }}>
                                                    {study.status}
                                                </span>
                                            </td>
                                            <td>
                                                <button
                                                    onClick={() => navigate(`/prm/dashboard/${study.studyCode}`)}
                                                    className="btn btn-outline"
                                                    style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem' }}
                                                >
                                                    View Details
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            )}

            {/* Charts Grid */}
            <div className="dashboard-grid">
                {/* Study Status Distribution */}
                <div className="chart-card">
                    <h3 className="chart-title">
                        <TrendingUp size={20} className="text-primary" />
                        Study Status Distribution
                    </h3>
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
                            <RechartsTooltip contentStyle={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '12px', color: 'var(--text-primary)' }} />
                            <Legend verticalAlign="bottom" height={36} iconType="circle" />
                        </PieChart>
                    </ResponsiveContainer>
                </div>

                {/* Studies by Type */}
                <div className="chart-card">
                    <h3 className="chart-title">
                        <Database size={20} color="var(--chart-pink)" />
                        Studies by Type (Masters)
                    </h3>
                    <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={studyTypeData}>
                            <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
                            <XAxis dataKey="name" stroke="var(--text-muted)" fontSize={12} />
                            <YAxis stroke="var(--text-muted)" fontSize={12} />
                            <RechartsTooltip cursor={{ fill: 'var(--bg-panel)' }} contentStyle={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '12px', color: 'var(--text-primary)' }} />
                            <Bar dataKey="value" fill="var(--chart-pink)" radius={[4, 4, 0, 0]} name="Studies" />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Monthly Trend (Full Width) */}
            {analyticsData?.studiesByMonth && (
                <div className="chart-card" style={{ marginBottom: '2rem' }}>
                    <div className="chart-title">
                        <TrendingUp size={20} color="var(--accent)" />
                        <h3>Study Initiation Trend</h3>
                    </div>
                    <ResponsiveContainer width="100%" height={300}>
                        <LineChart data={analyticsData.studiesByMonth}>
                            <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
                            <XAxis dataKey="month" stroke="var(--text-muted)" fontSize={12} />
                            <YAxis stroke="var(--text-muted)" fontSize={12} />
                            <RechartsTooltip contentStyle={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '12px', color: 'var(--text-primary)' }} />
                            <Legend verticalAlign="top" height={36} />
                            <Line type="monotone" dataKey="count" stroke="var(--chart-blue)" strokeWidth={3} dot={{ r: 6 }} name="New Studies" />
                            <Line type="monotone" dataKey="volunteers" stroke="var(--chart-green)" strokeWidth={3} dot={{ r: 6 }} name="Planned Volunteers" />
                        </LineChart>
                    </ResponsiveContainer>
                </div>
            )}

        </div>
    );
};


export default SBoard;
