import React, { useState, useEffect } from 'react';
import api from '../../api/api';
import { Input, Select, Button } from '../../components/ui';
import { Users, UserPlus, Trash2, Shield, User as UserIcon, Activity, Award, Crown } from 'lucide-react';
import ThemeToggle from '../../theme/ThemeToggle';

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
            setSuccess(`User ${formData.username} created successfully!`);
            setFormData({ username: '', full_name: '', role: 'field', password: '' });
            fetchUsers();
            setTimeout(() => setSuccess(''), 4000);
        } catch (err) {
            setError(err.response?.data?.detail || 'Failed to create user');
            setTimeout(() => setError(''), 4000);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (username) => {
        if (!window.confirm(`Are you sure you want to delete ${username}?`)) return;
        try {
            await api.delete(`/users/${username}`);
            setSuccess(`User ${username} deleted successfully`);
            fetchUsers();
            setTimeout(() => setSuccess(''), 3000);
        } catch (err) {
            setError('Failed to delete user');
            setTimeout(() => setError(''), 3000);
        }
    };

    const getRoleBadge = (role) => {
        const roleConfig = {
            'game_master': {
                bg: 'linear-gradient(135deg, #22d3ee 0%, #06b6d4 100%)',
                shadow: 'rgba(34, 211, 238, 0.4)',
                icon: Crown
            },
            'management': {
                bg: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
                shadow: 'rgba(99, 102, 241, 0.4)',
                icon: Shield
            },
            'prm': {
                bg: 'linear-gradient(135deg, #10b981 0%, #14b8a6 100%)',
                shadow: 'rgba(16, 185, 129, 0.4)',
                icon: Activity
            },
            'recruiter': {
                bg: 'linear-gradient(135deg, #ec4899 0%, #f472b6 100%)',
                shadow: 'rgba(236, 72, 153, 0.4)',
                icon: Award
            },
            'field': {
                bg: 'linear-gradient(135deg, #f59e0b 0%, #fbbf24 100%)',
                shadow: 'rgba(245, 158, 11, 0.4)',
                icon: UserIcon
            }
        };

        const config = roleConfig[role] || roleConfig['field'];
        const Icon = config.icon;

        return (
            <div style={{
                background: config.bg,
                padding: '0.5rem 1rem',
                borderRadius: '20px',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.5rem',
                boxShadow: `0 4px 15px ${config.shadow}`,
                transition: 'all 0.2s'
            }}>
                <Icon size={14} color="white" />
                <span style={{
                    fontSize: '0.75rem',
                    fontWeight: '800',
                    color: 'white',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px'
                }}>
                    {role.replace('_', ' ')}
                </span>
            </div>
        );
    };

    return (
        <div className="animate-fade-in" style={{ paddingBottom: '5rem' }}>
            {/* Header Section */}
            <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '3rem',
                flexWrap: 'wrap',
                gap: '1.5rem'
            }}>
                <div>
                    <h1 style={{
                        fontSize: 'clamp(1.8rem, 6vw, 2.8rem)',
                        fontWeight: '950',
                        marginBottom: '0.3rem',
                        background: 'linear-gradient(135deg, #6366f1 0%, #ec4899 100%)',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                        letterSpacing: '-1.5px'
                    }}>
                        User Control Center
                    </h1>
                    <p style={{ color: 'var(--text-muted)', fontSize: '1rem' }}>Manage system access and user roles</p>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <div style={{
                        padding: '0.8rem 1.2rem',
                        borderRadius: '14px',
                        background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.1) 0%, rgba(236, 72, 153, 0.1) 100%)',
                        border: '1px solid rgba(99, 102, 241, 0.2)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.6rem'
                    }}>
                        <Shield size={18} color="var(--primary)" />
                        <span style={{ fontSize: '0.9rem', fontWeight: '600' }}>Admin Tools</span>
                    </div>
                    <ThemeToggle />
                </div>
            </div>

            {/* Alerts */}
            {error && (
                <div className="animate-fade-in" style={{
                    padding: '1.2rem 1.5rem',
                    background: 'rgba(244, 63, 94, 0.1)',
                    border: '1px solid rgba(244, 63, 94, 0.3)',
                    borderRadius: '16px',
                    marginBottom: '2rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.8rem',
                    boxShadow: '0 4px 15px rgba(244, 63, 94, 0.2)'
                }}>
                    <Shield size={20} color="var(--error)" />
                    <span style={{ color: 'var(--error)', fontWeight: '600' }}>{error}</span>
                </div>
            )}

            {success && (
                <div className="animate-fade-in" style={{
                    padding: '1.2rem 1.5rem',
                    background: 'rgba(16, 185, 129, 0.1)',
                    border: '1px solid rgba(16, 185, 129, 0.3)',
                    borderRadius: '16px',
                    marginBottom: '2rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.8rem',
                    boxShadow: '0 4px 15px rgba(16, 185, 129, 0.2)'
                }}>
                    <Activity size={20} color="var(--success)" />
                    <span style={{ color: 'var(--success)', fontWeight: '600' }}>{success}</span>
                </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(380px, 1fr))', gap: '2rem' }}>

                {/* Create User Card */}
                <div style={{
                    padding: '0',
                    background: 'white',
                    borderRadius: '20px',
                    overflow: 'hidden',
                    border: '1px solid rgba(99, 102, 241, 0.2)',
                    boxShadow: '0 8px 30px rgba(99, 102, 241, 0.15)',
                    transition: 'transform 0.3s, box-shadow 0.3s'
                }}
                    onMouseEnter={(e) => {
                        e.currentTarget.style.transform = 'translateY(-4px)';
                        e.currentTarget.style.boxShadow = '0 12px 40px rgba(99, 102, 241, 0.25)';
                    }}
                    onMouseLeave={(e) => {
                        e.currentTarget.style.transform = 'translateY(0)';
                        e.currentTarget.style.boxShadow = '0 8px 30px rgba(99, 102, 241, 0.15)';
                    }}>
                    {/* Header */}
                    <div style={{
                        padding: '2rem 2rem 1.5rem',
                        background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.1) 0%, rgba(139, 92, 246, 0.1) 100%)',
                        borderBottom: '1px solid rgba(99, 102, 241, 0.2)'
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                            <div style={{
                                width: '56px',
                                height: '56px',
                                borderRadius: '16px',
                                background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                boxShadow: '0 4px 15px rgba(99, 102, 241, 0.4)'
                            }}>
                                <UserPlus size={28} color="white" />
                            </div>
                            <div>
                                <h2 style={{ fontSize: '1.6rem', fontWeight: '800', margin: 0, marginBottom: '0.2rem' }}>Create User</h2>
                                <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', margin: 0 }}>Add new system member</p>
                            </div>
                        </div>
                    </div>

                    {/* Form */}
                    <form onSubmit={handleSubmit} style={{ padding: '2rem' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
                            <Input
                                label="Full Name"
                                name="full_name"
                                value={formData.full_name}
                                onChange={handleChange}
                                required
                                placeholder="Enter full name"
                            />
                            <Input
                                label="Username"
                                name="username"
                                value={formData.username}
                                onChange={handleChange}
                                required
                                placeholder="Enter username"
                            />
                            <Select
                                label="Role"
                                name="role"
                                value={formData.role}
                                onChange={handleChange}
                                options={[
                                    { label: '🚗 Field Agent', value: 'field' },
                                    { label: '📋 Recruiter', value: 'recruiter' },
                                    { label: '👔 Management', value: 'management' },
                                    { label: '📊 PRM', value: 'prm' },
                                    { label: '👑 Game Master', value: 'game_master' }
                                ]}
                                required
                            />
                            <Input
                                label="Password"
                                name="password"
                                type="password"
                                value={formData.password}
                                onChange={handleChange}
                                required
                                placeholder="Enter password"
                            />

                            <Button
                                type="submit"
                                loading={loading}
                                fullWidth
                                icon={UserPlus}
                                style={{
                                    marginTop: '1rem',
                                    background: 'linear-gradient(to right, #6366f1, #8b5cf6)',
                                    border: 'none',
                                    padding: '1rem',
                                    fontSize: '1rem',
                                    fontWeight: '700',
                                    boxShadow: '0 4px 15px rgba(99, 102, 241, 0.3)',
                                    transition: 'all 0.2s'
                                }}
                            >
                                Create Account
                            </Button>
                        </div>
                    </form>
                </div>

                {/* Users List Card */}
                <div style={{
                    padding: '0',
                    background: 'white',
                    borderRadius: '20px',
                    overflow: 'hidden',
                    border: '1px solid rgba(236, 72, 153, 0.2)',
                    boxShadow: '0 8px 30px rgba(236, 72, 153, 0.15)',
                    transition: 'transform 0.3s, box-shadow 0.3s'
                }}
                    onMouseEnter={(e) => {
                        e.currentTarget.style.transform = 'translateY(-4px)';
                        e.currentTarget.style.boxShadow = '0 12px 40px rgba(236, 72, 153, 0.25)';
                    }}
                    onMouseLeave={(e) => {
                        e.currentTarget.style.transform = 'translateY(0)';
                        e.currentTarget.style.boxShadow = '0 8px 30px rgba(236, 72, 153, 0.15)';
                    }}>
                    {/* Header */}
                    <div style={{
                        padding: '2rem 2rem 1.5rem',
                        background: 'linear-gradient(135deg, rgba(236, 72, 153, 0.1) 0%, rgba(244, 114, 182, 0.1) 100%)',
                        borderBottom: '1px solid rgba(236, 72, 153, 0.2)'
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                            <div style={{
                                width: '56px',
                                height: '56px',
                                borderRadius: '16px',
                                background: 'linear-gradient(135deg, #ec4899, #f472b6)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                boxShadow: '0 4px 15px rgba(236, 72, 153, 0.4)'
                            }}>
                                <Users size={28} color="white" />
                            </div>
                            <div>
                                <h2 style={{ fontSize: '1.6rem', fontWeight: '800', margin: 0, marginBottom: '0.2rem' }}>System Users</h2>
                                <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', margin: 0 }}>
                                    {users.length} active {users.length === 1 ? 'member' : 'members'}
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Users List */}
                    <div style={{
                        padding: '1.5rem',
                        maxHeight: '600px',
                        overflowY: 'auto',
                        overflowX: 'hidden'
                    }}>
                        {fetching ? (
                            <div style={{ textAlign: 'center', padding: '3rem' }}>
                                <div style={{
                                    width: '40px',
                                    height: '40px',
                                    border: '4px solid rgba(236, 72, 153, 0.1)',
                                    borderTop: '4px solid #ec4899',
                                    borderRadius: '50%',
                                    animation: 'spin 1s linear infinite',
                                    margin: '0 auto 1rem'
                                }}></div>
                                <p style={{ color: 'var(--text-muted)' }}>Loading users...</p>
                            </div>
                        ) : users.length === 0 ? (
                            <div style={{ textAlign: 'center', padding: '3rem' }}>
                                <Users size={48} color="var(--text-muted)" style={{ opacity: 0.3, marginBottom: '1rem' }} />
                                <p style={{ color: 'var(--text-muted)' }}>No users found</p>
                            </div>
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                {users.map((u) => (
                                    <div key={u.username} style={{
                                        padding: '1.5rem',
                                        background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.9) 0%, rgba(250, 250, 250, 0.9) 100%)',
                                        borderRadius: '16px',
                                        border: '1px solid rgba(0, 0, 0, 0.06)',
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'center',
                                        gap: '1rem',
                                        transition: 'all 0.2s',
                                        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)'
                                    }}
                                        onMouseEnter={(e) => {
                                            e.currentTarget.style.transform = 'translateX(4px)';
                                            e.currentTarget.style.boxShadow = '0 4px 15px rgba(0, 0, 0, 0.08)';
                                            e.currentTarget.style.borderColor = 'rgba(236, 72, 153, 0.3)';
                                        }}
                                        onMouseLeave={(e) => {
                                            e.currentTarget.style.transform = 'translateX(0)';
                                            e.currentTarget.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.04)';
                                            e.currentTarget.style.borderColor = 'rgba(0, 0, 0, 0.06)';
                                        }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flex: 1, minWidth: 0 }}>
                                            <div style={{
                                                width: '52px',
                                                height: '52px',
                                                borderRadius: '14px',
                                                background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.1) 0%, rgba(236, 72, 153, 0.1) 100%)',
                                                border: '2px solid rgba(0, 0, 0, 0.05)',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                flexShrink: 0
                                            }}>
                                                <span style={{
                                                    fontSize: '1.3rem',
                                                    fontWeight: '800',
                                                    background: 'linear-gradient(135deg, #6366f1 0%, #ec4899 100%)',
                                                    WebkitBackgroundClip: 'text',
                                                    WebkitTextFillColor: 'transparent'
                                                }}>
                                                    {u.full_name.charAt(0).toUpperCase()}
                                                </span>
                                            </div>
                                            <div style={{ flex: 1, minWidth: 0 }}>
                                                <div style={{
                                                    fontWeight: '800',
                                                    fontSize: '1.1rem',
                                                    color: '#111827',
                                                    marginBottom: '0.3rem',
                                                    overflow: 'hidden',
                                                    textOverflow: 'ellipsis',
                                                    whiteSpace: 'nowrap'
                                                }}>
                                                    {u.full_name}
                                                </div>
                                                <div style={{
                                                    fontSize: '0.85rem',
                                                    color: '#6b7280',
                                                    fontFamily: 'monospace',
                                                    fontWeight: '600'
                                                }}>
                                                    @{u.username}
                                                </div>
                                            </div>
                                        </div>

                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', flexShrink: 0 }}>
                                            {getRoleBadge(u.role)}
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
                                                    transition: 'all 0.2s',
                                                    boxShadow: '0 2px 8px rgba(244, 63, 94, 0.15)'
                                                }}
                                                onMouseEnter={(e) => {
                                                    e.currentTarget.style.background = 'rgba(244, 63, 94, 0.15)';
                                                    e.currentTarget.style.transform = 'scale(1.1)';
                                                    e.currentTarget.style.boxShadow = '0 4px 12px rgba(244, 63, 94, 0.25)';
                                                }}
                                                onMouseLeave={(e) => {
                                                    e.currentTarget.style.background = 'rgba(244, 63, 94, 0.1)';
                                                    e.currentTarget.style.transform = 'scale(1)';
                                                    e.currentTarget.style.boxShadow = '0 2px 8px rgba(244, 63, 94, 0.15)';
                                                }}
                                                title="Delete User"
                                            >
                                                <Trash2 size={18} />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default UserManagement;
