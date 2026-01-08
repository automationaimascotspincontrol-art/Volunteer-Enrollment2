import React, { useState, useEffect } from 'react';
import api from '../../api/api';
import { Input, Select, Button } from '../../components/ui';
import { Users, UserPlus, Trash2, Shield, User as UserIcon } from 'lucide-react';

const UserManagement = () => {
    const [users, setUsers] = useState([]);
    const [formData, setFormData] = useState({
        username: '',
        full_name: '',
        role: 'field',
        password: ''
    });
    const [loading, setLoading] = useState(false);
    const [fetching, setFetching] = useState(true);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    const fetchUsers = async () => {
        try {
            const response = await api.get('/users/');
            setUsers(response.data);
        } catch (err) {
            console.error('Failed to fetch users', err);
            setError(`Failed to load users: ${err.response?.status === 404 ? 'Backend Restart Required (New Route Not Loaded)' : err.message}`);
        } finally {
            setFetching(false);
        }
    };

    useEffect(() => {
        fetchUsers();
    }, []);

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        setSuccess('');
        try {
            await api.post('/users/register', formData);
            setSuccess(`User ${formData.username} created!`);
            setFormData({ username: '', full_name: '', role: 'field', password: '' });
            fetchUsers();
        } catch (err) {
            setError(err.response?.data?.detail || 'Failed to create user');
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (username) => {
        if (!window.confirm(`Are you sure you want to delete ${username}?`)) return;
        try {
            await api.delete(`/users/${username}`);
            fetchUsers();
        } catch (err) {
            setError('Failed to delete user');
        }
    };

    return (
        <div className="container animate-fade-in" style={{ paddingBottom: '5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
                <div>
                    <h1 style={{ fontSize: 'clamp(1.5rem, 5vw, 2.3rem)', fontWeight: '800', marginBottom: '0.2rem', background: 'linear-gradient(90deg, #fff, var(--text-muted))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                        User Control Center
                    </h1>
                    <p style={{ color: 'var(--text-muted)' }}>Manage system access and roles</p>
                </div>
                <div className="glass-card" style={{ padding: '0.6rem 1.2rem', display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0 }}>
                    <Shield size={18} color="var(--accent)" />
                    <span style={{ fontSize: '0.9rem', fontWeight: '600' }}>Administrator Tool</span>
                </div>
            </div>



            {
                error && (
                    <div style={{
                        padding: '1rem',
                        background: 'rgba(244, 63, 94, 0.1)',
                        border: '1px solid var(--error)',
                        color: 'var(--error)',
                        borderRadius: '12px',
                        marginBottom: '2rem',
                        fontWeight: '600',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem'
                    }}>
                        <Shield size={20} />
                        {error}
                    </div>
                )
            }

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '2rem' }}>

                {/* Form Side */}
                <div className="glass-card">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '2rem' }}>
                        <div style={{ padding: '0.8rem', background: 'var(--primary)', borderRadius: '12px' }}>
                            <UserPlus color="white" size={24} />
                        </div>
                        <div>
                            <h2 style={{ fontSize: '1.5rem', fontWeight: '700' }}>Create User</h2>
                            <p style={{ color: 'var(--text-muted)' }}>Add new system member</p>
                        </div>
                    </div>

                    {error && <div style={{ color: 'var(--error)', marginBottom: '1rem' }}>{error}</div>}
                    {success && <div style={{ color: 'var(--success)', marginBottom: '1rem' }}>{success}</div>}

                    <form onSubmit={handleSubmit}>
                        <Input label="Full Name" name="full_name" value={formData.full_name} onChange={handleChange} required />
                        <Input label="Username" name="username" value={formData.username} onChange={handleChange} required />
                        <Select
                            label="Role"
                            name="role"
                            value={formData.role}
                            onChange={handleChange}
                            options={[
                                { label: 'Field Agent', value: 'field' },
                                { label: 'Recruiter', value: 'recruiter' },
                                { label: 'Management', value: 'management' },
                                { label: 'Game Master', value: 'game_master' }
                            ]}
                            required
                        />
                        <Input label="Password" name="password" type="password" value={formData.password} onChange={handleChange} required />

                        <div style={{ marginTop: '2rem' }}>
                            <Button type="submit" loading={loading} fullWidth icon={UserPlus}>Create Account</Button>
                        </div>
                    </form>
                </div>

                {/* List Side */}
                <div className="glass-card">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '2rem' }}>
                        <div style={{ padding: '0.8rem', background: 'var(--secondary)', borderRadius: '12px' }}>
                            <Users color="white" size={24} />
                        </div>
                        <div>
                            <h2 style={{ fontSize: '1.5rem', fontWeight: '700' }}>System Users</h2>
                            <p style={{ color: 'var(--text-muted)' }}>Total active members: {users.length}</p>
                        </div>
                    </div>

                    <div style={{ marginTop: '1rem' }}>
                        {users.map((u) => (
                            <div key={u.username} style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                padding: '1.2rem 0',
                                borderBottom: '1px solid var(--glass-border)',
                                flexWrap: 'wrap',
                                gap: '1rem'
                            }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flex: '1 1 200px' }}>
                                    <div style={{ width: '44px', height: '44px', background: 'rgba(255,255,255,0.05)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, border: '1px solid var(--glass-border)' }}>
                                        <UserIcon size={20} color="var(--text-muted)" />
                                    </div>
                                    <div style={{ overflow: 'hidden' }}>
                                        <div style={{ fontWeight: '700', fontSize: '1.05rem', color: 'white', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{u.full_name}</div>
                                        <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>@{u.username}</div>
                                    </div>
                                </div>

                                <div style={{ display: 'flex', alignItems: 'center', gap: '1.2rem', justifyContent: 'flex-end', flexWrap: 'nowrap' }}>
                                    <span style={{
                                        fontSize: '0.65rem',
                                        padding: '0.3rem 0.8rem',
                                        borderRadius: '20px',
                                        background: u.role === 'game_master' ? 'rgba(34, 211, 238, 0.1)' : 'rgba(255,255,255,0.05)',
                                        color: u.role === 'game_master' ? 'var(--accent)' : 'var(--text-muted)',
                                        border: '1px solid var(--glass-border)',
                                        fontWeight: '800',
                                        letterSpacing: '1px'
                                    }}>
                                        {u.role?.toUpperCase() || 'N/A'}
                                    </span>

                                    <button
                                        onClick={() => handleDelete(u.username)}
                                        style={{
                                            background: 'rgba(244, 63, 94, 0.1)',
                                            border: '1px solid rgba(244, 63, 94, 0.2)',
                                            color: 'var(--error)',
                                            cursor: 'pointer',
                                            padding: '0.7rem',
                                            borderRadius: '12px',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            transition: 'transform 0.2s, background 0.2s'
                                        }}
                                        onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.1)'}
                                        onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
                                        title="Delete User"
                                    >
                                        <Trash2 size={18} />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

            </div>
        </div >
    );
};

export default UserManagement;
