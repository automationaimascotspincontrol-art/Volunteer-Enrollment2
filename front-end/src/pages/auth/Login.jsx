import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { User, Lock, ArrowRight, Sparkles } from 'lucide-react';
import { Input, Button } from '../../components/ui';
import api from '../../api/api';
import mascotLogo from '../../assets/mascot_logo.png';

const Login = () => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();
    const { login } = useAuth();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        try {
            const response = await api.post('/auth/login', { username, password });
            const { user, access_token } = response.data;

            login(user, access_token);

            // Strict Role-Based Routing
            if (user.role === 'field') {
                navigate('/field-visit');
            } else if (user.role === 'recruiter') {
                navigate('/register');
            } else if (user.role === 'management' || user.role === 'game_master') {
                navigate('/admin/dashboard');
            } else if (user.role === 'prm') {
                navigate('/prm/calendar');
            } else {
                navigate('/');
            }
        } catch (err) {
            if (err.response) {
                if (err.response.status === 401) {
                    setError('Invalid credentials. Please check User ID and Password.');
                } else if (err.response.status === 429) {
                    setError('Too many attempts. Please wait a moment.');
                } else {
                    setError(err.response.data?.detail || 'Login failed. Please try again.');
                }
            } else {
                setError('Network error. Is the server running?');
            }
            console.error("Login error:", err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{
            minHeight: '100vh',
            display: 'flex',
            fontFamily: "'Outfit', sans-serif",
            position: 'relative',
            overflow: 'hidden'
        }}>
            {/* CSS Animations */}
            <style>{`
                @keyframes float {
                    0%, 100% { transform: translateY(0px); }
                    50% { transform: translateY(-20px); }
                }
                @keyframes fadeIn {
                    from { opacity: 0; transform: translateY(20px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                @keyframes slideInLeft {
                    from { opacity: 0; transform: translateX(-50px); }
                    to { opacity: 1; transform: translateX(0); }
                }
                @keyframes slideInRight {
                    from { opacity: 0; transform: translateX(50px); }
                    to { opacity: 1; transform: translateX(0); }
                }
                @keyframes pulse {
                    0%, 100% { opacity: 0.6; }
                    50% { opacity: 1; }
                }
            `}</style>

            {/* Left Side - Branding */}
            <div style={{
                flex: '1',
                background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 50%, #ec4899 100%)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '3rem',
                position: 'relative',
                animation: 'slideInLeft 0.8s ease-out'
            }}>
                {/* Animated Background Elements */}
                <div style={{
                    position: 'absolute',
                    top: '10%',
                    left: '10%',
                    width: '300px',
                    height: '300px',
                    background: 'radial-gradient(circle, rgba(255,255,255,0.1) 0%, transparent 70%)',
                    borderRadius: '50%',
                    animation: 'pulse 4s ease-in-out infinite'
                }} />
                <div style={{
                    position: 'absolute',
                    bottom: '15%',
                    right: '15%',
                    width: '200px',
                    height: '200px',
                    background: 'radial-gradient(circle, rgba(255,255,255,0.1) 0%, transparent 70%)',
                    borderRadius: '50%',
                    animation: 'pulse 3s ease-in-out infinite 1s'
                }} />

                {/* Logo & Branding */}
                <div style={{
                    textAlign: 'center',
                    position: 'relative',
                    zIndex: 1
                }}>
                    <div style={{
                        animation: 'float 3s ease-in-out infinite'
                    }}>
                        <img
                            src={mascotLogo}
                            alt="Mascot Tech"
                            style={{
                                height: '140px',
                                filter: 'drop-shadow(0 8px 32px rgba(0, 0, 0, 0.2))',
                                marginBottom: '2rem'
                            }}
                        />
                    </div>

                    <h1 style={{
                        fontSize: 'clamp(3rem, 8vw, 4.5rem)',
                        fontWeight: '950',
                        color: 'white',
                        margin: '0 0 1rem 0',
                        letterSpacing: '-0.05em',
                        textShadow: '0 4px 20px rgba(0, 0, 0, 0.3)',
                        lineHeight: '1.1'
                    }}>
                        Mascot Tech
                    </h1>

                    <p style={{
                        fontSize: '1.1rem',
                        color: 'rgba(255, 255, 255, 0.9)',
                        margin: '0 0 3rem 0',
                        textTransform: 'uppercase',
                        letterSpacing: '0.3em',
                        fontWeight: '600'
                    }}>
                        Volunteer Recruitment
                    </p>

                    {/* Feature Pills */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', alignItems: 'center' }}>
                        {['🔒 Secure Access', '⚡ Real-time Tracking', '📊 Smart Analytics'].map((feature, i) => (
                            <div key={i} style={{
                                padding: '0.75rem 1.5rem',
                                background: 'rgba(255, 255, 255, 0.15)',
                                backdropFilter: 'blur(10px)',
                                borderRadius: '50px',
                                border: '1px solid rgba(255, 255, 255, 0.2)',
                                color: 'white',
                                fontSize: '0.95rem',
                                fontWeight: '600',
                                animation: `fadeIn 0.8s ease-out ${i * 0.2}s both`
                            }}>
                                {feature}
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Right Side - Sign In Form */}
            <div style={{
                flex: '1',
                background: '#f8fafc',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '3rem',
                animation: 'slideInRight 0.8s ease-out'
            }}>
                <div style={{
                    width: '100%',
                    maxWidth: '480px',
                    animation: 'fadeIn 1s ease-out 0.3s both'
                }}>
                    {/* Header */}
                    <div style={{ marginBottom: '3rem', textAlign: 'center' }}>
                        <div style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.5rem',
                            padding: '0.5rem 1rem',
                            background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.1), rgba(139, 92, 246, 0.1))',
                            borderRadius: '50px',
                            marginBottom: '1.5rem',
                            border: '1px solid rgba(99, 102, 241, 0.2)'
                        }}>
                            <Sparkles size={16} color="#6366f1" />
                            <span style={{ fontSize: '0.85rem', color: '#6366f1', fontWeight: '700' }}>
                                Secure Portal
                            </span>
                        </div>

                        <h2 style={{
                            fontSize: '2.5rem',
                            fontWeight: '900',
                            color: '#0f172a',
                            margin: '0 0 0.5rem 0',
                            letterSpacing: '-0.03em'
                        }}>
                            Welcome Back
                        </h2>
                        <p style={{
                            color: '#64748b',
                            fontSize: '1.05rem',
                            margin: 0
                        }}>
                            Sign in to access your dashboard
                        </p>
                    </div>

                    {/* Error Message */}
                    {error && (
                        <div style={{
                            padding: '1rem 1.25rem',
                            background: 'rgba(244, 63, 94, 0.08)',
                            border: '1px solid rgba(244, 63, 94, 0.2)',
                            borderRadius: '16px',
                            marginBottom: '2rem',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.75rem',
                            animation: 'fadeIn 0.3s ease-out'
                        }}>
                            <div style={{
                                width: '6px',
                                height: '6px',
                                borderRadius: '50%',
                                background: '#f43f5e',
                                flexShrink: 0
                            }} />
                            <span style={{
                                color: '#dc2626',
                                fontSize: '0.95rem',
                                fontWeight: '600'
                            }}>
                                {error}
                            </span>
                        </div>
                    )}

                    {/* Form */}
                    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                        <Input
                            label="User ID"
                            name="username"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            icon={User}
                            required
                            placeholder="Enter your user ID"
                            autoFocus
                        />

                        <Input
                            label="Password"
                            name="password"
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            icon={Lock}
                            required
                            placeholder="••••••••"
                        />

                        <Button
                            type="submit"
                            loading={loading}
                            icon={ArrowRight}
                            style={{
                                width: '100%',
                                padding: '1rem',
                                background: loading ? '#cbd5e1' : 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
                                border: 'none',
                                borderRadius: '16px',
                                color: 'white',
                                fontSize: '1.1rem',
                                fontWeight: '700',
                                cursor: loading ? 'not-allowed' : 'pointer',
                                boxShadow: loading ? 'none' : '0 8px 24px rgba(99, 102, 241, 0.3)',
                                transition: 'all 0.3s ease',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '0.5rem',
                                marginTop: '0.5rem'
                            }}
                            onMouseEnter={(e) => !loading && (e.currentTarget.style.transform = 'translateY(-2px)')}
                            onMouseLeave={(e) => !loading && (e.currentTarget.style.transform = 'translateY(0)')}
                        >
                            {loading ? 'Signing In...' : 'Sign In'}
                        </Button>
                    </form>

                    {/* Footer */}
                    <div style={{
                        marginTop: '3rem',
                        textAlign: 'center',
                        color: '#94a3b8',
                        fontSize: '0.85rem'
                    }}>
                        <p style={{ margin: 0 }}>© 2026 Mascot Universal Pvt Ltd</p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Login;
