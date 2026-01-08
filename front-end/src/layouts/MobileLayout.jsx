import React from 'react';
import { Outlet } from 'react-router-dom';
import { LogOut } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import mascotLogo from '../assets/mascot_logo.png';

const MobileLayout = () => {
    const { user, logout } = useAuth();

    return (
        <div style={{ minHeight: '100vh', background: 'var(--bg-main)' }}>
            <div style={{
                padding: '0.75rem 1rem',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                background: 'var(--bg-card)',
                backdropFilter: 'blur(20px)',
                borderBottom: '1px solid var(--border-color)',
                position: 'sticky',
                top: 0,
                zIndex: 50,
                boxShadow: '0 4px 12px rgba(0,0,0,0.05)'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <img
                        src={mascotLogo}
                        alt="Mascot Logo"
                        style={{
                            width: '48px',
                            height: '48px',
                            objectFit: 'contain',
                            filter: 'drop-shadow(0 2px 6px rgba(99, 102, 241, 0.2))'
                        }}
                    />
                    <h1 style={{
                        fontSize: '1.4rem',
                        fontWeight: '900',
                        margin: 0,
                        background: 'linear-gradient(135deg, #6366f1 0%, #ec4899 100%)',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent'
                    }}>
                        Mascot Tech
                    </h1>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                        <span style={{ fontSize: '0.7rem', fontWeight: '700', color: 'var(--text-primary)' }}>{user?.full_name || user?.name}</span>
                        <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>Field Agent • {user?.username}</span>
                    </div>

                    <button
                        onClick={logout}
                        className="btn btn-ghost"
                        style={{
                            color: 'var(--error)',
                            padding: '0.5rem',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.4rem',
                            fontSize: '0.85rem',
                            fontWeight: '700',
                            borderRadius: '10px',
                            background: 'rgba(244, 63, 94, 0.05)'
                        }}
                    >
                        <LogOut size={18} />
                        <span>Logout</span>
                    </button>
                </div>
            </div>

            <main style={{ padding: '1rem' }}>
                <Outlet />
            </main>
        </div>
    );
};

export default MobileLayout;
