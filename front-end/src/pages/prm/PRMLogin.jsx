
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import api from '../../api/api';
import { Input, Button } from '../../components/ui';
import { LogIn, User, Lock, Activity } from 'lucide-react';

const PRMLogin = () => {
    const [recruiterId, setRecruiterId] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const { login } = useAuth();
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            const response = await api.post('/auth/login', { username: recruiterId, password });
            const { user, access_token } = response.data;

            // Allow only PRM or Admin
            if (user.role !== 'prm' && user.role !== 'management' && user.role !== 'game_master') {
                setError('Access Restricted: PRM Setup Only');
                setLoading(false);
                return;
            }

            login(user, access_token);
            navigate('/prm/calendar');

        } catch (err) {
            setError(err.response?.data?.detail || 'Login failed');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', padding: '1.5rem', background: '#0a0a0a' }}>

            <div className="animate-fade-in" style={{ marginBottom: '2.5rem', textAlign: 'center' }}>
                <div style={{ width: '64px', height: '64px', background: 'linear-gradient(135deg, #4f46e5, #9333ea)', borderRadius: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem', boxShadow: '0 8px 32px rgba(79, 70, 229, 0.4)' }}>
                    <Activity color="white" size={32} />
                </div>
                <h1 style={{ fontSize: '2.2rem', fontWeight: '800', background: 'linear-gradient(90deg, #818cf8, #c084fc)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', letterSpacing: '1px', margin: 0 }}>
                    PRM SYSTEM
                </h1>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: '0.5rem' }}>Study Planning & Calendar</p>
            </div>

            <div className="glass-card animate-fade-in" style={{ width: '100%', maxWidth: '400px', border: '1px solid rgba(255,255,255,0.1)', backdropFilter: 'blur(20px)' }}>
                <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
                    <h2 style={{ fontSize: '1.5rem', fontWeight: '700', marginBottom: '0.5rem', color: 'white' }}>PRM Access</h2>
                    <p style={{ color: 'var(--text-muted)' }}>Sign in to manage studies</p>
                </div>

                {error && (
                    <div style={{ backgroundColor: 'rgba(244, 63, 94, 0.1)', color: 'var(--error)', padding: '1rem', borderRadius: '12px', marginBottom: '1.5rem', fontSize: '0.9rem', border: '1px solid rgba(244, 63, 94, 0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit}>
                    <div style={{ marginBottom: '1.2rem' }}>
                        <Input
                            label="User ID"
                            placeholder="Enter User ID"
                            icon={User}
                            value={recruiterId}
                            onChange={(e) => setRecruiterId(e.target.value)}
                            required
                        />
                    </div>
                    <div style={{ marginBottom: '1.2rem' }}>
                        <Input
                            label="Password"
                            type="password"
                            placeholder="••••••••"
                            icon={Lock}
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                        />
                    </div>
                    <Button
                        type="submit"
                        loading={loading}
                        icon={LogIn}
                        style={{ width: '100%', marginTop: '1.5rem', height: '50px', fontSize: '1.05rem', background: 'linear-gradient(to right, #4f46e5, #9333ea)' }}
                    >
                        Enter PRM System
                    </Button>
                </form>
            </div>
        </div>
    );
};

export default PRMLogin;
