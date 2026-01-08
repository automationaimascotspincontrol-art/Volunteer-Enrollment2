import React, { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../../api/api';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    Cell, AreaChart, Area, LineChart, Line, Legend
} from 'recharts';
import { Users, CheckCircle, FileText, Database, TrendingUp, Info, FileDown } from 'lucide-react';
import FieldVisitChart from '../../components/charts/FieldVisitChart';
import EnrollmentChart from '../../components/charts/EnrollmentChart';
import FunnelChart from '../../components/charts/FunnelChart';
import { Card, Button, Badge, Select } from '../../components/ui';
import QuickActions from '../../components/QuickActions';
import '../../styles/ManagementDashboard.css';

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

const ManagementDashboard = () => {
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const [selectedStudy, setSelectedStudy] = useState('');
    const [studyData, setStudyData] = useState([]);
    const [studyLoading, setStudyLoading] = useState(false);
    const [clinicalStudies, setClinicalStudies] = useState([]);
    const [locationFilter, setLocationFilter] = useState('');
    const [studyAnalytics, setStudyAnalytics] = useState(null);
    const [funnelData, setFunnelData] = useState([]);

    useEffect(() => {
        const fetchStats = async () => {
            try {
                const [statsRes, funnelRes] = await Promise.all([
                    api.get('/dashboard/stats'),
                    api.get('/dashboard/funnel')
                ]);
                setStats(statsRes.data);
                setFunnelData(funnelRes.data);
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

        // Keep data up-to-date
        const interval = setInterval(fetchStats, 60000);
        return () => clearInterval(interval);
    }, []);

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
        try {
            const [participationRes, analyticsRes] = await Promise.all([
                api.get(`/dashboard/clinical/participation?study_code=${studyCode}`),
                api.get(`/dashboard/clinical/analytics?study_code=${studyCode}`)
            ]);
            setStudyData(participationRes.data);
            setStudyAnalytics(analyticsRes.data);
        } catch (err) {
            console.error('Failed to fetch participation', err);
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
            const token = localStorage.getItem('token');
            const response = await fetch(`http://localhost:8000/api/v1/dashboard/clinical/export?study_code=${selectedStudy}`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!response.ok) throw new Error('Download failed');

            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
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

    if (loading) return <div className="container" style={{ padding: '2rem', textAlign: 'center' }}>Loading Management Insights...</div>;

    const totalEcosystem = (stats?.total_volunteers || 0) + (stats?.field_visits || 0);

    return (
        <div className="management-dashboard animate-fade-in">

            <div className="dashboard-header">
                <div>
                    <h1 className="dashboard-title">
                        Management Insights
                    </h1>
                    <p className="dashboard-subtitle">Strategic overview of organizational reach and performance</p>
                </div>
            </div>

            {/* High Level Statistics */}
            <div className="stats-grid">
                <StatCard title="Total ecosystem" value={totalEcosystem} icon={TrendingUp} colorVar="--info" />
                <StatCard title="Field Visits" value={stats?.field_visits || 0} icon={Database} colorVar="--chart-cyan" />
                <StatCard title="Legacy Data" value={stats?.legacy_records || 0} icon={Database} colorVar="--chart-purple" />
                <StatCard title="Total Approved" value={stats?.approved || 0} icon={CheckCircle} colorVar="--success" />
                <StatCard title="Registered Volunteers" value={stats?.registered || 0} icon={FileText} colorVar="--warning" />
            </div>

            {/* Quick Actions Grid */}
            <div className="quick-actions-section">
                <QuickActions role={JSON.parse(localStorage.getItem('user'))?.role} />
            </div>

            {/* Dashboard Insights Grid */}
            <div className="dashboard-grid">

                {/* Overall Enrollment Intensity */}
                <div className="chart-card">
                    <div className="chart-title">
                        <TrendingUp size={20} color="var(--primary)" />
                        <h3>Enrollment Intensity</h3>
                    </div>
                    <ResponsiveContainer width="100%" height={300}>
                        <AreaChart data={stats?.charts?.daily || []}>
                            <defs>
                                <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.4} />
                                    <stop offset="95%" stopColor="var(--primary)" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" vertical={false} />
                            <XAxis dataKey="date" stroke="var(--text-muted)" fontSize={11} tickMargin={10} />
                            <YAxis stroke="var(--text-muted)" fontSize={11} />
                            <Tooltip contentStyle={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '12px', color: 'var(--text-primary)' }} itemStyle={{ color: 'var(--text-primary)' }} labelStyle={{ color: 'var(--text-muted)' }} />
                            <Area type="monotone" dataKey="count" stroke="var(--primary)" strokeWidth={3} fillOpacity={1} fill="url(#colorCount)" />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>

                {/* Status Overview */}
                <div className="chart-card">
                    <div className="chart-title">
                        <Users size={20} color="var(--secondary)" />
                        <h3>Status Distribution</h3>
                    </div>
                    <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={stats?.charts?.status || []}>
                            <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
                            <XAxis dataKey="name" stroke="var(--text-muted)" fontSize={12} />
                            <YAxis stroke="var(--text-muted)" fontSize={12} />
                            <Tooltip contentStyle={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '12px', color: 'var(--text-primary)' }} itemStyle={{ color: 'var(--text-primary)' }} labelStyle={{ color: 'var(--text-muted)' }} />
                            <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                                {(stats?.charts?.status || []).map((entry, index) => {
                                    const colors = {
                                        'Active New': 'var(--success)',
                                        'Active Old': 'var(--primary)',
                                        'Not Active': 'var(--text-muted)',
                                        'Approved': 'var(--accent)',
                                        'Rejected': 'var(--danger)'
                                    };
                                    return <Cell key={`cell-${index}`} fill={colors[entry.name] || 'var(--primary)'} />;
                                })}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Funnel & Conversion Section */}
            <div style={{ marginBottom: '2rem' }}>
                <FunnelChart data={funnelData} />
            </div>

            {/* Field Operations Section */}
            <div className="glass-card" style={{ marginBottom: '2rem' }}>
                <div className="chart-title">
                    <Users size={24} color="var(--chart-pink)" />
                    <h3>Field Operations Analytics</h3>
                </div>

                <div style={{ marginBottom: '2rem' }}>
                    <FieldVisitChart
                        title="Field Performance Tracker"
                        initialData={stats?.charts?.field_daily}
                    />
                </div>

                {/* Table & Area Chart Grid */}
                <div className="analytics-grid">

                    {/* Top Areas Chart */}
                    <div className="top-areas-chart">
                        <h4 style={{ fontSize: '1.1rem', fontWeight: '600', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <TrendingUp size={18} color="var(--chart-pink)" />
                            Top Field Areas
                        </h4>
                        <ResponsiveContainer width="100%" height={280}>
                            <BarChart
                                data={stats?.charts?.areas || []}
                                layout="vertical"
                                margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                            >
                                <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="var(--border-color)" />
                                <XAxis type="number" stroke="var(--text-muted)" fontSize={10} />
                                <YAxis
                                    dataKey="name"
                                    type="category"
                                    stroke="var(--text-muted)"
                                    fontSize={10}
                                    width={70}
                                    tickMargin={5}
                                />
                                <Tooltip contentStyle={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '12px', color: 'var(--text-primary)' }} itemStyle={{ color: 'var(--text-primary)' }} labelStyle={{ color: 'var(--text-muted)' }} />
                                <Bar dataKey="value" fill="var(--chart-pink)" radius={[0, 4, 4, 0]} barSize={20} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>

                    {/* Recent Field Visits List */}
                    <div>
                        <h4 style={{ fontSize: '1.1rem', fontWeight: '600', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <Users size={18} color="var(--chart-pink)" />
                            Recent Field Registrations
                        </h4>
                        <div className="table-container">
                            <table className="custom-table">
                                <thead>
                                    <tr>
                                        <th>Name/Recruiter</th>
                                        <th>Area</th>
                                        <th>Date</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {stats?.recent_field_visits && stats.recent_field_visits.length > 0 ? stats.recent_field_visits.map((row, i) => (
                                        <tr key={i} className="animate-slide-up">
                                            <td style={{ fontWeight: '600' }}>{row.name}</td>
                                            <td>{row.field_area || 'N/A'}</td>
                                            <td style={{ fontSize: '0.9rem' }}>
                                                {row.created_at && row.created_at !== 'N/A' && !isNaN(new Date(row.created_at).getTime())
                                                    ? new Date(row.created_at).toLocaleDateString()
                                                    : 'N/A'}
                                            </td>
                                        </tr>
                                    )) : (
                                        <tr>
                                            <td colSpan="3" style={{ textAlign: 'center', color: 'var(--text-muted)' }}>No recent field visits.</td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>

            {/* Clinical Study Explorer Section - RESTRUCTURED */}
            <div className="glass-card" style={{ marginBottom: '2rem' }}>
                <div className="study-selector-header">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
                        <Database size={24} color="var(--accent)" />
                        <h3 style={{ fontSize: '1.5rem', fontWeight: '700', margin: 0 }}>Clinical Study Analytics</h3>
                    </div>
                    <div className="study-controls">
                        <select
                            className="form-control study-select"
                            value={selectedStudy}
                            onChange={handleStudyChange}
                        >
                            <option value="">Select Study...</option>
                            {clinicalStudies.map(study => (
                                <option key={study.study_code} value={study.study_code}>
                                    {study.study_name}
                                </option>
                            ))}
                        </select>

                        {selectedStudy && (
                            <Button variant="primary" onClick={downloadReport} style={{ padding: '0.8rem 1.2rem' }}>
                                <FileDown size={16} /> Export Report
                            </Button>
                        )}
                    </div>
                </div>

                {selectedStudy && (
                    <div className="animate-fade-in">
                        {/* GRID LAYOUT: Graph on Left (Large), List on Right (Limited) */}
                        <div className="analytics-grid">

                            {/* NEW GRAPH: Study Specific Growth */}
                            <div className="top-areas-chart">
                                <h4 style={{ fontSize: '1.1rem', fontWeight: '600', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    <TrendingUp size={18} color="var(--success)" />
                                    New User Registrations ({studyAnalytics?.study_name})
                                </h4>
                                {studyAnalytics?.charts?.timeline ? (
                                    <ResponsiveContainer width="100%" height={280}>
                                        <AreaChart data={studyAnalytics.charts.timeline}>
                                            <defs>
                                                <linearGradient id="colorStudy" x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="5%" stopColor="var(--success)" stopOpacity={0.3} />
                                                    <stop offset="95%" stopColor="var(--success)" stopOpacity={0} />
                                                </linearGradient>
                                            </defs>
                                            <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
                                            <XAxis dataKey="date" stroke="var(--text-muted)" fontSize={11} />
                                            <YAxis stroke="var(--text-muted)" fontSize={11} />
                                            <Tooltip contentStyle={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '12px', color: 'var(--text-primary)' }} itemStyle={{ color: 'var(--text-primary)' }} labelStyle={{ color: 'var(--text-muted)' }} />
                                            <Area type="monotone" dataKey="count" stroke="var(--success)" strokeWidth={3} fillOpacity={1} fill="url(#colorStudy)" />
                                        </AreaChart>
                                    </ResponsiveContainer>
                                ) : (
                                    <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>No analytics data available</div>
                                )}
                            </div>

                            {/* LIST: Top 10 Recent */}
                            <div>
                                <h4 style={{ fontSize: '1.1rem', fontWeight: '600', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    <Users size={18} color="var(--chart-purple)" />
                                    All Registrations
                                </h4>
                                <div className="table-container" style={{ maxHeight: '500px', overflowY: 'auto' }}>
                                    <table className="custom-table">
                                        <thead>
                                            <tr>
                                                <th>Name</th>
                                                <th>Date</th>
                                                <th>Status</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {studyData.length > 0 ? studyData.map((row, i) => (
                                                <tr key={i} className="animate-slide-up">
                                                    <td style={{ fontWeight: '600' }}>{row.name}</td>
                                                    <td style={{ fontSize: '0.9rem' }}>
                                                        {row.date && row.date !== 'N/A' && !isNaN(new Date(row.date).getTime())
                                                            ? new Date(row.date).toLocaleDateString()
                                                            : 'N/A'}
                                                    </td>
                                                    <td>
                                                        <Badge variant={row.status === 'approved' ? 'success' : row.status === 'rejected' ? 'error' : 'info'}>
                                                            {row.status}
                                                        </Badge>
                                                    </td>
                                                </tr>
                                            )) : (
                                                <tr>
                                                    <td colSpan="3" style={{ textAlign: 'center', color: 'var(--text-muted)' }}>No recent activity.</td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Other Charts (Lower Priority) */}
            <div className="dashboard-grid">

                {/* Historical Growth - Enlarged */}
                <div className="chart-card">
                    <div className="chart-title">
                        <TrendingUp size={20} color="var(--accent)" />
                        <h3>Historical Growth (Yearly)</h3>
                    </div>
                    <ResponsiveContainer width="100%" height={300}>
                        <LineChart data={stats?.charts?.yearly_gender || []}>
                            <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
                            <XAxis dataKey="year" stroke="var(--text-muted)" fontSize={12} />
                            <YAxis stroke="var(--text-muted)" fontSize={12} />
                            <Tooltip contentStyle={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '12px', color: 'var(--text-primary)' }} itemStyle={{ color: 'var(--text-primary)' }} labelStyle={{ color: 'var(--text-muted)' }} />
                            <Legend verticalAlign="top" height={36} />
                            <Line type="monotone" dataKey="male" stroke="var(--chart-blue)" strokeWidth={3} dot={{ r: 6 }} name="Male" />
                            <Line type="monotone" dataKey="female" stroke="var(--chart-pink)" strokeWidth={3} dot={{ r: 6 }} name="Female" />
                            <Line type="monotone" dataKey="minor" stroke="var(--chart-yellow)" strokeWidth={3} dot={{ r: 6 }} name="Minor" />
                        </LineChart>
                    </ResponsiveContainer>
                </div>

                {/* Monthly Enrollment */}
                <EnrollmentChart title="Volunteer Enrollment Analytics" />

            </div>

            <div className="analytics-grid">
                {/* Recent Volunteers */}
                <div className="glass-card">
                    <h3 style={{ fontSize: '1.2rem', fontWeight: '700', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <FileText size={20} color="var(--primary)" />
                        Recent Enrollments
                    </h3>
                    <div className="recent-activity-list">
                        {stats?.recent_volunteers?.length > 0 ? stats.recent_volunteers.map((vol, idx) => (
                            <div key={idx} className="activity-item">
                                <div className="activity-info">
                                    <h4>{vol.pre_screening.name}</h4>
                                    <p>{vol.volunteer_id}</p>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                    <Badge variant={vol.stage === 'registered' ? 'success' : 'info'}>
                                        {vol.stage.toUpperCase()}
                                    </Badge>
                                    <Link to={`/registration/${vol.volunteer_id}`} style={{ color: 'var(--accent)', fontSize: '0.85rem', textDecoration: 'none' }}>View →</Link>
                                </div>
                            </div>
                        )) : (
                            <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '2rem' }}>No recent enrollments.</p>
                        )}
                    </div>
                </div>

                {/* Recent Field Activity (Agent View) */}
                <div className="glass-card">
                    <h3 style={{ fontSize: '1.2rem', fontWeight: '700', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <Users size={20} color="var(--accent)" />
                        Field Agent Activity
                    </h3>
                    <div className="recent-activity-list">
                        {stats?.recent_field_visits?.length > 0 ? stats.recent_field_visits.map((visit, idx) => (
                            <div key={idx} className="activity-item">
                                <div className="activity-info">
                                    <h4>{visit.name}</h4>
                                    <p>{visit.field_area || 'Field Visit'}</p>
                                </div>
                                <div className="activity-meta">
                                    <p className="activity-contact">{visit.contact}</p>
                                    <p className="activity-date">{new Date(visit.created_at).toLocaleDateString()}</p>
                                </div>
                            </div>
                        )) : (
                            <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '2rem' }}>No recent field activity.</p>
                        )}
                    </div>
                </div>
            </div>

        </div >
    );
};

export default ManagementDashboard;
