import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { User, Lock, ArrowRight } from 'lucide-react';
import { Input, Button } from '../../components/ui';
import api from '../../api/api';
import mascotLogo from '../../assets/mascot_logo.png';
import '../../styles/Login.css';

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
        <div className="login-container">
            <div className="login-bg-glow" />

            <div className="login-brand-section">
                <div className="login-logo-wrapper">
                    <img
                        src={mascotLogo}
                        alt="Mascot Spincontrol"
                        className="login-logo-img"
                        style={{
                            filter: 'drop-shadow(0 4px 12px rgba(99, 102, 241, 0.25))',
                            height: '110px'
                        }}
                    />
                </div>
                <h1 style={{
                    fontSize: '2.8rem',
                    fontWeight: '900',
                    margin: '0.5rem 0 0.2rem',
                    background: 'linear-gradient(135deg, #6366f1 0%, #ec4899 100%)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    letterSpacing: '-0.03em',
                    lineHeight: '1.2'
                }}>
                    Mascot Tech
                </h1>
                <p className="brand-subtitle" style={{
                    textTransform: 'uppercase',
                    letterSpacing: '0.2em',
                    fontSize: '0.85rem',
                    fontWeight: '600',
                    color: '#6b7280'
                }}>
                    Secure Access Portal
                </p>
            </div>

            <div className="login-card animate-fade-in">
                <div className="login-header">
                    <h2 className="login-welcome-title">Welcome Back</h2>
                    <p className="login-welcome-subtitle">Please sign in to your account</p>
                </div>

                {error && (
                    <div style={{
                        padding: '0.8rem',
                        background: 'rgba(244, 63, 94, 0.1)',
                        border: '1px solid rgba(244, 63, 94, 0.2)',
                        color: 'var(--error)',
                        borderRadius: '12px',
                        marginBottom: '1.5rem',
                        textAlign: 'center',
                        fontSize: '0.9rem'
                    }}>
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="login-form">
                    <Input
                        label="User ID"
                        name="username"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        icon={User}
                        required
                        placeholder="Enter User ID"
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
                        className="btn-primary login-btn"
                    >
                        Sign In
                    </Button>
                </form>
            </div>

            <div className="login-footer">
                <p>© 2026 Mascot Universal Pvt Ltd</p>
            </div>
        </div>
    );
};

export default Login;
