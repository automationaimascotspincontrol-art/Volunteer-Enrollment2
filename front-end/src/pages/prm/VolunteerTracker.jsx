import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { Users, CheckCircle, Clock, Activity, RefreshCw, XCircle } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const StatCard = ({ title, value, subtitle, icon: Icon, colorVar, onClick }) => (
    <div
        onClick={onClick}
        style={{
            padding: '1.5rem',
            background: `linear-gradient(135deg, var(${colorVar}) 0%, var(${colorVar}) 100%)`,
            borderRadius: '16px',
            color: 'white',
            boxShadow: `0 4px 15px var(${colorVar})40`,
            cursor: onClick ? 'pointer' : 'default',
            transition: 'all 0.3s',
            position: 'relative',
            overflow: 'hidden'
        }}
        onMouseEnter={(e) => onClick && (e.currentTarget.style.transform = 'translateY(-4px)')}
        onMouseLeave={(e) => onClick && (e.currentTarget.style.transform = 'translateY(0)')}
    >
        <div style={{ position: 'absolute', top: '-20px', right: '-20px', opacity: 0.1 }}>
            <Icon size={100} />
        </div>
        <div style={{ position: 'relative', zIndex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
                <Icon size={24} />
                <p style={{ margin: 0, fontSize: '0.85rem', opacity: 0.9, fontWeight: '600' }}>{title}</p>
            </div>
            <h2 style={{ margin: '0.5rem 0', fontSize: '2.5rem', fontWeight: '900' }}>{value}</h2>
            {subtitle && <p style={{ margin: 0, fontSize: '0.8rem', opacity: 0.8 }}>{subtitle}</p>}
        </div>
    </div>
);

const VolunteerTracker = () => {
    const { token } = useAuth();
    const navigate = useNavigate();

    const [stats, setStats] = useState({
        preRegistration: 0,
        medicalFit: 0,
        medicalUnfit: 0,
        approved: 0,
        checkedInToday: 0
    });

    const [preRegVolunteers, setPreRegVolunteers] = useState([]);
    const [approvedVolunteers, setApprovedVolunteers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [lastUpdated, setLastUpdated] = useState(new Date());

    useEffect(() => {
        fetchData();
        const interval = setInterval(fetchData, 30000);
        return () => clearInterval(interval);
    }, []);

    const fetchData = async () => {
        try {
            const headers = { Authorization: `Bearer ${token}` };

            // Fetch all data in parallel
            const [statsRes, preRegRes, approvedRes] = await Promise.all([
                axios.get('http://localhost:8000/api/v1/volunteers/stats', { headers }),
                axios.get('http://localhost:8000/api/v1/volunteers/pre-registration', { headers }),
                axios.get('http://localhost:8000/api/v1/volunteers/approved', { headers })
            ]);

            setStats(statsRes.data);
            setPreRegVolunteers(preRegRes.data);
            setApprovedVolunteers(approvedRes.data);
            setLastUpdated(new Date());
        } catch (err) {
            console.error('Failed to fetch volunteer data', err);
        } finally {
            setLoading(false);
        }
    };

    const toggleAttendance = async (volunteerId, currentStatus) => {
        try {
            const action = currentStatus === 'IN' ? 'OUT' : 'IN';
            await axios.post('http://localhost:8000/api/v1/volunteers/attendance/toggle',
                { volunteer_id: volunteerId, action },
                { headers: { Authorization: `Bearer ${token}` } }
            );
            fetchData(); // Refresh data
        } catch (err) {
            console.error('Failed to toggle attendance', err);
            alert('Failed to update attendance');
        }
    };

    const updateMedicalStatus = async (volunteerId, status) => {
        try {
            await axios.patch(`http://localhost:8000/api/v1/volunteers/${volunteerId}/medical-status`,
                { status },
                { headers: { Authorization: `Bearer ${token}` } }
            );
            fetchData();
        } catch (err) {
            console.error('Failed to update medical status', err);
            alert('Failed to update medical status');
        }
    };

    const approveVolunteer = async (volunteerId) => {
        try {
            await axios.patch(`http://localhost:8000/api/v1/volunteers/${volunteerId}/approval`,
                { status: 'approved' },
                { headers: { Authorization: `Bearer ${token}` } }
            );
            fetchData();
        } catch (err) {
            console.error('Failed to approve volunteer', err);
            alert('Failed to approve volunteer');
        }
    };

    if (loading) {
        return (
            <div style={{ padding: '3rem', textAlign: 'center' }}>
                <Activity size={48} style={{ animation: 'spin 1s linear infinite' }} />
                <p style={{ marginTop: '1rem', color: 'var(--text-muted)' }}>Loading volunteer data...</p>
            </div>
        );
    }

    return (
        <div className="animate-fade-in" style={{ paddingBottom: '3rem' }}>
            {/* Header */}
            <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '2rem',
                flexWrap: 'wrap',
                gap: '1rem'
            }}>
                <div>
                    <h1 style={{
                        fontSize: 'clamp(1.8rem, 5vw, 2.5rem)',
                        fontWeight: '900',
                        marginBottom: '0.3rem',
                        background: 'linear-gradient(135deg, #10b981 0%, #14b8a6 100%)',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent'
                    }}>
                        Live Volunteer Tracker
                    </h1>
                    <p style={{ color: 'var(--text-muted)', margin: 0 }}>
                        Real-time volunteer status & attendance management
                    </p>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <div style={{
                        padding: '0.75rem 1.25rem',
                        background: 'var(--bg-panel)',
                        borderRadius: '12px',
                        border: '1px solid var(--border-color)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem'
                    }}>
                        <Clock size={16} color="var(--text-muted)" />
                        <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                            Updated: {lastUpdated.toLocaleTimeString()}
                        </span>
                    </div>

                    <button
                        onClick={fetchData}
                        style={{
                            padding: '0.75rem 1.25rem',
                            background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
                            color: 'white',
                            border: 'none',
                            borderRadius: '12px',
                            fontWeight: '600',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem',
                            boxShadow: '0 4px 12px rgba(99, 102, 241, 0.3)',
                            transition: 'all 0.2s'
                        }}
                    >
                        <RefreshCw size={16} />
                        Refresh
                    </button>
                </div>
            </div>

            {/* Stats Cards */}
            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                gap: '1.25rem',
                marginBottom: '2.5rem'
            }}>
                <StatCard title="Pre-Registration" value={stats.preRegistration} subtitle="In process" icon={Users} colorVar="--chart-blue" />
                <StatCard title="Medical Fit" value={stats.medicalFit} subtitle="Ready for approval" icon={CheckCircle} colorVar="--success" />
                <StatCard title="Medical Unfit" value={stats.medicalUnfit} subtitle="Review required" icon={Activity} colorVar="--error" />
                <StatCard title="Approved" value={stats.approved} subtitle="Ready volunteers" icon={CheckCircle} colorVar="--chart-purple" />
                <StatCard title="Checked In Today" value={stats.checkedInToday} subtitle="Currently active" icon={Activity} colorVar="--accent" />
            </div>

            {/* Pre-Registration Table */}
            <div className="glass-card" style={{ marginBottom: '2rem' }}>
                <h3 style={{ fontSize: '1.3rem', fontWeight: '700', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Users size={20} color="var(--chart-blue)" />
                    Pre-Registration & Medical Review ({preRegVolunteers.length})
                </h3>
                <div style={{ overflowX: 'auto' }}>
                    <table className="custom-table">
                        <thead>
                            <tr>
                                <th>Name</th>
                                <th>Contact</th>
                                <th>Age</th>
                                <th>Gender</th>
                                <th>Medical Status</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {preRegVolunteers.map((vol, idx) => (
                                <tr key={idx} className="animate-slide-up">
                                    <td style={{ fontWeight: '600' }}>{vol.name}</td>
                                    <td className="text-muted">{vol.contact}</td>
                                    <td>{vol.age}</td>
                                    <td>{vol.gender}</td>
                                    <td>
                                        <span style={{
                                            padding: '0.4rem 0.8rem',
                                            borderRadius: '8px',
                                            fontSize: '0.75rem',
                                            fontWeight: '700',
                                            textTransform: 'uppercase',
                                            background: vol.medical_status === 'fit' ? '#10b98120' : vol.medical_status === 'unfit' ? '#ef444420' : '#fbbf2420',
                                            color: vol.medical_status === 'fit' ? '#10b981' : vol.medical_status === 'unfit' ? '#ef4444' : '#fbbf24'
                                        }}>
                                            {vol.medical_status}
                                        </span>
                                    </td>
                                    <td>
                                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                                            {vol.medical_status === 'pending' && (
                                                <>
                                                    <button onClick={() => updateMedicalStatus(vol.volunteer_id, 'fit')} className="btn btn-sm" style={{ background: '#10b981', color: 'white' }}>
                                                        <CheckCircle size={14} /> Fit
                                                    </button>
                                                    <button onClick={() => updateMedicalStatus(vol.volunteer_id, 'unfit')} className="btn btn-sm" style={{ background: '#ef4444', color: 'white' }}>
                                                        <XCircle size={14} /> Unfit
                                                    </button>
                                                </>
                                            )}
                                            {vol.medical_status === 'fit' && (
                                                <button onClick={() => approveVolunteer(vol.volunteer_id)} className="btn btn-primary btn-sm">
                                                    Approve
                                                </button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {preRegVolunteers.length === 0 && (
                                <tr><td colSpan="6" style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>No pre-registration volunteers</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Approved Volunteers Table */}
            <div className="glass-card">
                <h3 style={{ fontSize: '1.3rem', fontWeight: '700', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <CheckCircle size={20} color="var(--success)" />
                    Approved Volunteers ({approvedVolunteers.length})
                </h3>
                <div style={{ overflowX: 'auto' }}>
                    <table className="custom-table">
                        <thead>
                            <tr>
                                <th>Name</th>
                                <th>Contact</th>
                                <th>Age</th>
                                <th>Gender</th>
                                <th>Attendance</th>
                                <th>Time</th>
                            </tr>
                        </thead>
                        <tbody>
                            {approvedVolunteers.map((vol, idx) => (
                                <tr key={idx} className="animate-slide-up">
                                    <td style={{ fontWeight: '600' }}>{vol.name}</td>
                                    <td className="text-muted">{vol.contact}</td>
                                    <td>{vol.age}</td>
                                    <td>{vol.gender}</td>
                                    <td>
                                        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                                            <button
                                                onClick={() => toggleAttendance(vol.volunteer_id, vol.attendance_status)}
                                                style={{
                                                    padding: '0.5rem 1rem',
                                                    borderRadius: '8px',
                                                    border: 'none',
                                                    fontWeight: '700',
                                                    fontSize: '0.85rem',
                                                    cursor: 'pointer',
                                                    background: vol.attendance_status === 'IN' ? 'linear-gradient(135deg, #10b981, #14b8a6)' : 'linear-gradient(135deg, #6b7280, #9ca3af)',
                                                    color: 'white',
                                                    boxShadow: vol.attendance_status === 'IN' ? '0 2px 8px rgba(16, 185, 129, 0.4)' : '0 2px 8px rgba(107, 114, 128, 0.3)',
                                                    transition: 'all 0.2s'
                                                }}
                                            >
                                                {vol.attendance_status === 'IN' ? '✓ IN' : 'OUT'}
                                            </button>
                                            {vol.attendance_status === 'IN' && (
                                                <span style={{ fontSize: '0.7rem', padding: '0.3rem 0.6rem', background: '#10b98120', color: '#10b981', borderRadius: '6px', fontWeight: '600' }}>
                                                    🟢 Active
                                                </span>
                                            )}
                                        </div>
                                    </td>
                                    <td className="text-muted" style={{ fontSize: '0.85rem' }}>
                                        {vol.check_in_time ? new Date(vol.check_in_time).toLocaleTimeString() : '-'}
                                    </td>
                                </tr>
                            ))}
                            {approvedVolunteers.length === 0 && (
                                <tr><td colSpan="6" style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>No approved volunteers</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            <style>{`
                @keyframes spin {
                    0% { transform: rotate(0deg); }
                    100% { transform: rotate(360deg); }
                }
                .btn-sm {
                    padding: 0.4rem 0.8rem;
                    font-size: 0.8rem;
                    border-radius: 6px;
                    border: none;
                    cursor: pointer;
                    font-weight: 600;
                    display: inline-flex;
                    align-items: center;
                    gap: 0.3rem;
                    transition: all 0.2s;
                }
                .btn-sm:hover {
                    transform: translateY(-2px);
                    box-shadow: 0 4px 12px rgba(0,0,0,0.2);
                }
            `}</style>
        </div>
    );
};

export default VolunteerTracker;
