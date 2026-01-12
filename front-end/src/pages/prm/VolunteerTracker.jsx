import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { Users, CheckCircle, Clock, Activity, RefreshCw, XCircle, ScanBarcode, ListCheck, Filter, CheckSquare, Square, Search } from 'lucide-react';
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

    // Stats & Data
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

    // New Features State
    const [studies, setStudies] = useState([]);
    const [selectedStudy, setSelectedStudy] = useState(''); // '' means All Approved
    const [rapidEntryId, setRapidEntryId] = useState('');
    const [selectedVolunteers, setSelectedVolunteers] = useState([]); // List of IDs

    // Search states
    const [preRegSearch, setPreRegSearch] = useState('');
    const [approvedSearch, setApprovedSearch] = useState('');

    useEffect(() => {
        fetchStudies();
        fetchData();
        const interval = setInterval(fetchData, 30000);
        return () => clearInterval(interval);
    }, []);

    // Fetch data whenever study selection changes (to filter at source)
    useEffect(() => {
        fetchData();
    }, [selectedStudy]);

    const fetchStudies = async () => {
        try {
            // Fetch active study instances to populate dropdown
            const res = await axios.get('http://localhost:8000/api/v1/prm/studies/study-instances', {
                headers: { Authorization: `Bearer ${token}` }
            });
            setStudies(res.data);
        } catch (err) {
            console.error("Failed to fetch studies", err);
        }
    }

    const fetchData = async () => {
        try {
            const headers = { Authorization: `Bearer ${token}` };

            // Build Approved URL with optional study param
            let approvedUrl = 'http://localhost:8000/api/v1/volunteers/approved';
            if (selectedStudy) {
                approvedUrl += `?study_id=${selectedStudy}`;
            }

            // Fetch in parallel
            const [statsRes, preRegRes, approvedRes] = await Promise.all([
                axios.get('http://localhost:8000/api/v1/volunteers/stats', { headers }),
                axios.get('http://localhost:8000/api/v1/volunteers/pre-registration', { headers }),
                axios.get(approvedUrl, { headers })
            ]);

            setStats(statsRes.data);
            setPreRegVolunteers(preRegRes.data);
            setApprovedVolunteers(approvedRes.data);
            setLastUpdated(new Date());

            // Clear selection if re-fetching
            // setSelectedVolunteers([]); 
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
            fetchData();
        } catch (err) {
            console.error('Failed to toggle attendance', err);
            alert('Failed to update attendance');
        }
    };

    // Bulk Toggle
    const handleBulkAttendance = async (action) => {
        if (selectedVolunteers.length === 0) return;

        try {
            await axios.post('http://localhost:8000/api/v1/volunteers/attendance/bulk-toggle',
                { volunteer_ids: selectedVolunteers, action },
                { headers: { Authorization: `Bearer ${token}` } }
            );

            // Refresh and clear selection
            fetchData();
            setSelectedVolunteers([]);
            alert(`Successfully marked ${selectedVolunteers.length} volunteers as ${action}`);
        } catch (err) {
            console.error("Bulk toggle failed", err);
            alert("Failed to update bulk attendance");
        }
    }

    // Rapid Entry
    const handleRapidEntry = async (e) => {
        if (e.key === 'Enter' && rapidEntryId) {
            try {
                // Try to toggle IN for this ID
                const res = await axios.post('http://localhost:8000/api/v1/volunteers/attendance/toggle',
                    { volunteer_id: rapidEntryId, action: 'IN' },
                    { headers: { Authorization: `Bearer ${token}` } }
                );

                // Show success feedback (optional toast) or just clear
                setRapidEntryId('');
                fetchData();

                // Audio feedback could go here
            } catch (err) {
                alert(`Failed to check in ${rapidEntryId}. Check if valid ID.`);
            }
        }
    }

    // Selection Handling
    const handleSelectAll = (e) => {
        if (e.target.checked) {
            const allIds = filteredApproved.map(v => v.volunteer_id);
            setSelectedVolunteers(allIds);
        } else {
            setSelectedVolunteers([]);
        }
    }

    const handleSelectRow = (id) => {
        if (selectedVolunteers.includes(id)) {
            setSelectedVolunteers(selectedVolunteers.filter(v => v !== id));
        } else {
            setSelectedVolunteers([...selectedVolunteers, id]);
        }
    }

    const updateMedicalStatus = async (volunteerId, status) => {
        try {
            await axios.patch(`http://localhost:8000/api/v1/volunteers/${volunteerId}/medical-status`,
                { status },
                { headers: { Authorization: `Bearer ${token}` } }
            );
            fetchData();
        } catch (err) {
            console.error('Failed to update medical status', err);
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
        }
    };

    const deleteVolunteer = async (volunteerId, volunteerName) => {
        if (!window.confirm(`Are you sure you want to delete "${volunteerName}"?`)) return;
        try {
            await axios.delete(
                `http://localhost:8000/api/v1/admin/dashboard/volunteers/${volunteerId}`,
                { headers: { Authorization: `Bearer ${token}` } }
            );
            fetchData();
        } catch (err) {
            alert('Failed to delete volunteer');
        }
    };

    // Filter volunteers based on search
    const filteredPreReg = preRegVolunteers.filter(v =>
        !preRegSearch ||
        v.name?.toLowerCase().includes(preRegSearch.toLowerCase()) ||
        v.contact?.includes(preRegSearch) ||
        v.volunteer_id?.toLowerCase().includes(preRegSearch.toLowerCase())
    );

    const filteredApproved = approvedVolunteers.filter(v =>
        !approvedSearch ||
        v.name?.toLowerCase().includes(approvedSearch.toLowerCase()) ||
        v.contact?.includes(approvedSearch) ||
        v.volunteer_id?.toLowerCase().includes(approvedSearch.toLowerCase())
    );

    if (loading) {
        return (
            <div style={{ padding: '3rem', textAlign: 'center' }}>
                <Activity size={48} style={{ animation: 'spin 1s linear infinite' }} />
                <p style={{ marginTop: '1rem', color: 'var(--text-muted)' }}>Loading volunteer data...</p>
            </div>
        );
    }

    return (
        <div className="animate-fade-in" style={{ paddingBottom: '5rem' }}>
            {/* Header & Rapid Entry */}
            <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '2rem',
                flexWrap: 'wrap',
                gap: '1.5rem'
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
                        Live Tracker
                    </h1>
                    {/* Study Filter Dropdown */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.5rem' }}>
                        <Filter size={16} color="var(--text-muted)" />
                        <select
                            value={selectedStudy}
                            onChange={(e) => setSelectedStudy(e.target.value)}
                            style={{
                                padding: '0.4rem 0.8rem',
                                borderRadius: '8px',
                                border: '1px solid var(--border-color)',
                                background: 'white',
                                fontSize: '0.9rem',
                                fontWeight: '600',
                                color: 'var(--text-primary)',
                                maxWidth: '300px'
                            }}
                        >
                            <option value="">All Approved Volunteers</option>
                            {studies.map(s => (
                                <option key={s._id} value={s._id}>
                                    {s.studyCode} - {s.studyName}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flex: 1, justifyContent: 'flex-end' }}>
                    {/* Rapid Entry Bar */}
                    <div style={{
                        flex: 1,
                        maxWidth: '400px',
                        position: 'relative',
                        display: 'flex',
                        alignItems: 'center'
                    }}>
                        <ScanBarcode size={20} style={{ position: 'absolute', left: '12px', color: '#6366f1' }} />
                        <input
                            type="text"
                            placeholder="Rapid Scan / Enter ID (Press Enter)"
                            value={rapidEntryId}
                            onChange={(e) => setRapidEntryId(e.target.value)}
                            onKeyDown={handleRapidEntry}
                            style={{
                                width: '100%',
                                padding: '0.85rem 1rem 0.85rem 2.8rem',
                                borderRadius: '12px',
                                border: '2px solid #6366f1',
                                background: 'white',
                                fontSize: '1rem',
                                fontWeight: '600',
                                outline: 'none',
                                boxShadow: '0 4px 12px rgba(99, 102, 241, 0.15)'
                            }}
                        />
                    </div>

                    <button
                        onClick={fetchData}
                        style={{
                            padding: '0.75rem',
                            background: 'var(--bg-panel)',
                            color: 'var(--text-muted)',
                            border: '1px solid var(--border-color)',
                            borderRadius: '12px',
                            cursor: 'pointer',
                            transition: 'all 0.2s'
                        }}
                    >
                        <RefreshCw size={20} />
                    </button>
                </div>
            </div>

            {/* Stats Cards Row */}
            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: '1rem',
                marginBottom: '2rem'
            }}>
                <StatCard title="Checked In" value={stats.checkedInToday} subtitle="Active Today" icon={Activity} colorVar="--accent" />
                <StatCard title="Approved" value={stats.approved} subtitle="Total Pool" icon={CheckCircle} colorVar="--chart-purple" />
                <StatCard title="Pre-Reg" value={stats.preRegistration} subtitle="Processing" icon={Users} colorVar="--chart-blue" />
            </div>

            {/* Approved Volunteers Table */}
            <div className="glass-card" style={{
                border: selectedVolunteers.length > 0 ? '2px solid #6366f1' : '1px solid var(--border-color)',
                transition: 'all 0.3s'
            }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <h3 style={{ fontSize: '1.3rem', fontWeight: '700', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <ListCheck size={22} color="var(--success)" />
                            {selectedStudy ? 'Study Roster' : 'Approved Volunteers'} ({filteredApproved.length})
                        </h3>
                        {selectedVolunteers.length > 0 && (
                            <span style={{
                                background: '#6366f1',
                                color: 'white',
                                padding: '0.2rem 0.6rem',
                                borderRadius: '20px',
                                fontSize: '0.8rem',
                                fontWeight: '700'
                            }}>
                                {selectedVolunteers.length} Selected
                            </span>
                        )}
                    </div>

                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <input
                            type="search"
                            placeholder="Search list..."
                            value={approvedSearch}
                            onChange={(e) => setApprovedSearch(e.target.value)}
                            style={{
                                padding: '0.6rem 1rem',
                                borderRadius: '10px',
                                border: '1px solid var(--border-color)',
                                backgroundColor: 'var(--bg-main)',
                                fontSize: '0.9rem',
                                minWidth: '250px'
                            }}
                        />
                    </div>
                </div>

                <div style={{ maxHeight: '600px', overflowY: 'auto', overflowX: 'auto' }}>
                    <table className="custom-table">
                        <thead>
                            <tr>
                                <th style={{ width: '40px' }}>
                                    <input
                                        type="checkbox"
                                        onChange={handleSelectAll}
                                        checked={filteredApproved.length > 0 && selectedVolunteers.length === filteredApproved.length}
                                        style={{ width: '18px', height: '18px', cursor: 'pointer', accentColor: '#6366f1' }}
                                    />
                                </th>
                                <th>Name</th>
                                <th>Contact</th>
                                <th>Status</th>
                                <th>Time</th>
                                <th style={{ textAlign: 'right' }}>Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredApproved.map((vol, idx) => {
                                const isSelected = selectedVolunteers.includes(vol.volunteer_id);
                                return (
                                    <tr
                                        key={vol.volunteer_id}
                                        className="animate-slide-up"
                                        style={{ background: isSelected ? 'rgba(99, 102, 241, 0.05)' : 'transparent' }}
                                    >
                                        <td>
                                            <input
                                                type="checkbox"
                                                checked={isSelected}
                                                onChange={() => handleSelectRow(vol.volunteer_id)}
                                                style={{ width: '18px', height: '18px', cursor: 'pointer', accentColor: '#6366f1' }}
                                            />
                                        </td>
                                        <td style={{ fontWeight: '600' }}>
                                            {vol.name}
                                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: '400' }}>{vol.volunteer_id}</div>
                                        </td>
                                        <td className="text-muted">{vol.contact}</td>
                                        <td>
                                            {vol.attendance_status === 'IN' ? (
                                                <span style={{ fontSize: '0.75rem', padding: '0.3rem 0.6rem', background: '#10b98120', color: '#10b981', borderRadius: '6px', fontWeight: '700' }}>
                                                    🟢 IN
                                                </span>
                                            ) : (
                                                <span style={{ fontSize: '0.75rem', padding: '0.3rem 0.6rem', background: '#f1f5f9', color: '#64748b', borderRadius: '6px', fontWeight: '600' }}>
                                                    ⚪ OUT
                                                </span>
                                            )}
                                        </td>
                                        <td className="text-muted" style={{ fontSize: '0.85rem' }}>
                                            {vol.check_in_time ? new Date(vol.check_in_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '-'}
                                        </td>
                                        <td style={{ textAlign: 'right' }}>
                                            <button
                                                onClick={() => toggleAttendance(vol.volunteer_id, vol.attendance_status)}
                                                style={{
                                                    padding: '0.4rem 0.8rem',
                                                    borderRadius: '8px',
                                                    border: '1px solid var(--border-color)',
                                                    fontWeight: '600',
                                                    fontSize: '0.8rem',
                                                    cursor: 'pointer',
                                                    background: 'white',
                                                    color: vol.attendance_status === 'IN' ? '#ef4444' : '#10b981',
                                                    borderColor: vol.attendance_status === 'IN' ? '#ef4444' : '#10b981'
                                                }}
                                            >
                                                {vol.attendance_status === 'IN' ? 'Check Out' : 'Check In'}
                                            </button>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Bulk Actions Floating Bar */}
            {selectedVolunteers.length > 0 && (
                <div style={{
                    position: 'fixed',
                    bottom: '2rem',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    background: '#1e293b',
                    padding: '1rem 2rem',
                    borderRadius: '50px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '1.5rem',
                    boxShadow: '0 10px 25px rgba(0,0,0,0.3)',
                    zIndex: 100,
                    animation: 'slideUp 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
                }}>
                    <span style={{ color: 'white', fontWeight: '600' }}>{selectedVolunteers.length} Selected</span>
                    <div style={{ width: '1px', height: '24px', background: 'rgba(255,255,255,0.2)' }}></div>
                    <button
                        onClick={() => handleBulkAttendance('IN')}
                        style={{ background: '#10b981', color: 'white', border: 'none', padding: '0.6rem 1.2rem', borderRadius: '20px', fontWeight: '700', cursor: 'pointer' }}
                    >
                        Check In All
                    </button>
                    <button
                        onClick={() => handleBulkAttendance('OUT')}
                        style={{ background: '#ef4444', color: 'white', border: 'none', padding: '0.6rem 1.2rem', borderRadius: '20px', fontWeight: '700', cursor: 'pointer' }}
                    >
                        Check Out All
                    </button>
                    <button
                        onClick={() => setSelectedVolunteers([])}
                        style={{ background: 'transparent', color: '#94a3b8', border: 'none', cursor: 'pointer', marginLeft: '0.5rem' }}
                    >
                        <XCircle size={24} />
                    </button>
                </div>
            )}

            <style>{`
                @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
                @keyframes slideUp { from { transform: translate(-50%, 100%); opacity: 0; } to { transform: translate(-50%, 0); opacity: 1; } }
            `}</style>
        </div>
    );
};

export default VolunteerTracker;
