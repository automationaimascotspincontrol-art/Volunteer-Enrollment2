import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
    LayoutDashboard,
    Users,
    ClipboardList,
    LogOut,
    Menu,
    X,
    Shield
} from 'lucide-react';
import mascotLogo from '../../assets/mascot_logo.png';

const Sidebar = ({ isOpen, toggle, role }) => {
    const { logout } = useAuth();
    const navigate = useNavigate();

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    return (
        <>
            {/* Mobile Overlay */}
            {isOpen && (
                <div
                    style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 40 }}
                    onClick={toggle}
                />
            )}

            <aside style={{
                width: '280px',
                position: 'fixed',
                left: 0,
                top: 0,
                bottom: 0,
                background: 'var(--bg-card)',
                borderRight: '1px solid var(--border-color)',
                zIndex: 50,
                transform: isOpen ? 'translateX(0)' : 'translateX(-100%)',
                transition: 'transform 0.3s ease',
                display: 'flex',
                flexDirection: 'column',
                padding: '1.5rem',
                // Desktop override
                '@media (min-width: 1024px)': {
                    transform: 'translateX(0)'
                }
            }} className="sidebar">

                {/* Brand */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '3rem', paddingLeft: '0.5rem' }}>
                    <img
                        src={mascotLogo}
                        alt="Mascot Logo"
                        style={{
                            width: '52px',
                            height: '52px',
                            objectFit: 'contain',
                            filter: 'drop-shadow(0 4px 8px rgba(99, 102, 241, 0.2))'
                        }}
                    />
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <h1 style={{
                            fontSize: '1.4rem',
                            fontWeight: '900',
                            margin: 0,
                            background: 'linear-gradient(135deg, #6366f1 0%, #ec4899 100%)',
                            WebkitBackgroundClip: 'text',
                            WebkitTextFillColor: 'transparent',
                            filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.05))'
                        }}>
                            Mascot Tech
                        </h1>
                        <span style={{ fontSize: '0.65rem', color: '#6b7280', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.03em' }}>
                            Patient Recruitment
                        </span>
                    </div>
                </div>

                {/* Nav Items */}
                <nav style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {role !== 'field' && (
                        <NavLink
                            to="/admin/dashboard"
                            className={({ isActive }) => `btn btn-ghost ${isActive ? 'active' : ''}`}
                            style={{ justifyContent: 'flex-start', background: 'transparent' }} // reset
                        // Custom active styling is handled via specific class or manual logic in style prop if needed. 
                        // Using simple inline for now for "active" simulation
                        >
                            {({ isActive }) => (
                                <div style={{
                                    display: 'flex', alignItems: 'center', gap: '0.8rem', width: '100%',
                                    color: isActive ? 'var(--accent)' : 'var(--text-muted)',
                                    fontWeight: isActive ? 700 : 500
                                }}>
                                    <LayoutDashboard size={20} />
                                    Dashboard
                                </div>
                            )}
                        </NavLink>
                    )}

                    {role === 'recruiter' && (
                        <NavLink to="/volunteer-list" className="btn btn-ghost" style={{ justifyContent: 'flex-start' }}>
                            {({ isActive }) => (
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', color: isActive ? 'var(--accent)' : 'var(--text-muted)' }}>
                                    <Users size={20} />
                                    Volunteers
                                </div>
                            )}
                        </NavLink>
                    )}

                    {(role === 'management' || role === 'game_master') && (
                        <NavLink to="/admin/users" className="btn btn-ghost" style={{ justifyContent: 'flex-start' }}>
                            {({ isActive }) => (
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', color: isActive ? 'var(--accent)' : 'var(--text-muted)' }}>
                                    <Users size={20} />
                                    Manage Users
                                </div>
                            )}
                        </NavLink>
                    )}

                    <NavLink to="/register" className="btn btn-ghost" style={{ justifyContent: 'flex-start' }}>
                        {({ isActive }) => (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', color: isActive ? 'var(--accent)' : 'var(--text-muted)' }}>
                                <ClipboardList size={20} />
                                New Registration
                            </div>
                        )}
                    </NavLink>
                </nav>

                {/* Footer Actions */}
                <div style={{ paddingTop: '1rem', borderTop: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <button onClick={handleLogout} className="btn btn-ghost" style={{ color: 'var(--danger)' }}>
                        <LogOut size={20} />
                        Logout
                    </button>
                </div>

            </aside>
        </>
    );
};

export default Sidebar;
