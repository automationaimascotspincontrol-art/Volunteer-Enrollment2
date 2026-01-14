import React, { useState } from 'react';
import { useNavigate, NavLink } from 'react-router-dom';
import { LayoutDashboard, Search, UserPlus, LogOut, Shield, Menu, X, Calendar, PlusCircle, Users, Settings } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import ThemeToggle from '../../theme/ThemeToggle';
import mascotLogo from '../../assets/mascot_logo.png';

const Topbar = () => {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    return (
        <>
            <header style={{
                height: '75px',
                borderBottom: '1px solid rgba(0, 0, 0, 0.08)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '0 1.5rem',
                background: 'linear-gradient(to bottom, #ffffff 0%, #fafbfc 100%)',
                position: 'sticky',
                top: 0,
                zIndex: 40,
                boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04), 0 4px 12px rgba(0, 0, 0, 0.02)',
                backdropFilter: 'blur(10px)'
            }}>
                {/* Brand */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <div style={{
                        position: 'relative',
                        transition: 'transform 0.3s ease'
                    }}
                        onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.08) rotate(5deg)'}
                        onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1) rotate(0deg)'}
                    >
                        <img
                            src={mascotLogo}
                            alt="Mascot Logo"
                            style={{
                                width: '56px',
                                height: '56px',
                                objectFit: 'contain',
                                flexShrink: 0,
                                filter: 'drop-shadow(0 4px 8px rgba(99, 102, 241, 0.25))'
                            }}
                        />
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.1rem' }}>
                        <span style={{
                            fontWeight: '900',
                            fontSize: 'clamp(1.4rem, 5vw, 1.6rem)',
                            background: 'linear-gradient(135deg, #6366f1 0%, #ec4899 100%)',
                            WebkitBackgroundClip: 'text',
                            WebkitTextFillColor: 'transparent',
                            letterSpacing: '-0.02em',
                            whiteSpace: 'nowrap',
                            filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.05))'
                        }}>
                            Mascot Tech
                        </span>
                        <span style={{
                            fontSize: '0.7rem',
                            color: '#6b7280',
                            fontWeight: '600',
                            letterSpacing: '0.05em',
                            textTransform: 'uppercase'
                        }}>
                            Volunteering Recruitment
                        </span>
                    </div>
                </div>

                {/* Desktop Navigation - Hidden on mobile */}
                <nav style={{
                    display: 'none',
                    alignItems: 'center',
                    gap: '0.5rem',
                }}>
                    <style>{`
                        @media (min-width: 768px) {
                            nav { display: flex !important; }
                        }
                    `}</style>

                    {/* Main Nav (Dashboard, Search) - Hidden for PRM */}
                    {user?.role !== 'prm' && (
                        <>
                            <NavLink
                                to="/admin/dashboard"
                                style={({ isActive }) => ({
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.5rem',
                                    padding: '0.6rem 1rem',
                                    borderRadius: '10px',
                                    textDecoration: 'none',
                                    fontWeight: '600',
                                    fontSize: '0.95rem',
                                    transition: 'all 0.2s',
                                    background: isActive ? 'var(--bg-panel)' : 'transparent',
                                    color: isActive ? 'var(--primary)' : 'var(--text-muted)'
                                })}
                            >
                                <LayoutDashboard size={18} />
                                <span>VBoard</span>
                            </NavLink>

                            <NavLink
                                to="/search"
                                style={({ isActive }) => ({
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.5rem',
                                    padding: '0.6rem 1rem',
                                    borderRadius: '10px',
                                    textDecoration: 'none',
                                    fontWeight: '600',
                                    fontSize: '0.95rem',
                                    transition: 'all 0.2s',
                                    background: isActive ? 'var(--bg-panel)' : 'transparent',
                                    color: isActive ? 'var(--primary)' : 'var(--text-muted)'
                                })}
                            >
                                <Search size={18} />
                                <span>Search</span>
                            </NavLink>

                            <NavLink
                                to="/recent-enrollment"
                                style={({ isActive }) => ({
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.5rem',
                                    padding: '0.6rem 1rem',
                                    borderRadius: '10px',
                                    textDecoration: 'none',
                                    fontWeight: '600',
                                    fontSize: '0.95rem',
                                    transition: 'all 0.2s',
                                    background: isActive ? 'var(--bg-panel)' : 'transparent',
                                    color: isActive ? 'var(--primary)' : 'var(--text-muted)'
                                })}
                            >
                                <Users size={18} />
                                <span>Recent Enrollment</span>
                            </NavLink>

                            <NavLink
                                to="/admin/full-search"
                                style={({ isActive }) => ({
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.5rem',
                                    padding: '0.6rem 1rem',
                                    borderRadius: '10px',
                                    textDecoration: 'none',
                                    fontWeight: '600',
                                    fontSize: '0.95rem',
                                    transition: 'all 0.2s',
                                    background: isActive ? 'var(--bg-panel)' : 'transparent',
                                    color: isActive ? 'var(--primary)' : 'var(--text-muted)'
                                })}
                            >
                                <Search size={18} />
                                <span>Full Database</span>
                            </NavLink>

                            <NavLink
                                to="/prm/assigned-studies"
                                style={({ isActive }) => ({
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.5rem',
                                    padding: '0.6rem 1rem',
                                    borderRadius: '10px',
                                    textDecoration: 'none',
                                    fontWeight: '600',
                                    fontSize: '0.95rem',
                                    transition: 'all 0.2s',
                                    background: isActive ? 'var(--bg-panel)' : 'transparent',
                                    color: isActive ? 'var(--primary)' : 'var(--text-muted)'
                                })}
                            >
                                <LayoutDashboard size={18} />
                                <span>Assigned Studies</span>
                            </NavLink>


                            {/* SBoard for Recruiters */}
                            {user?.role === 'recruiter' && (
                                <NavLink
                                    to="/prm/volunteers"
                                    style={({ isActive }) => ({
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '0.5rem',
                                        padding: '0.6rem 1rem',
                                        borderRadius: '10px',
                                        textDecoration: 'none',
                                        fontWeight: '600',
                                        fontSize: '0.95rem',
                                        transition: 'all 0.2s',
                                        background: isActive ? 'var(--bg-panel)' : 'transparent',
                                        color: isActive ? 'var(--primary)' : 'var(--text-muted)'
                                    })}
                                >
                                    <Users size={18} />
                                    <span>SBoard</span>
                                </NavLink>
                            )}

                            {/* User Management - Game Master Only */}
                            {user?.role === 'game_master' && (
                                <NavLink
                                    to="/admin/users"
                                    style={({ isActive }) => ({
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '0.5rem',
                                        padding: '0.6rem 1rem',
                                        borderRadius: '10px',
                                        textDecoration: 'none',
                                        fontWeight: '600',
                                        fontSize: '0.95rem',
                                        transition: 'all 0.2s',
                                        background: isActive ? 'var(--bg-panel)' : 'transparent',
                                        color: isActive ? 'var(--primary)' : 'var(--text-muted)'
                                    })}
                                >
                                    <Settings size={18} />
                                    <span>User Manager</span>
                                </NavLink>
                            )}
                        </>
                    )}

                    {/* PRM & Management Links */}
                    {(user?.role === 'prm' || user?.role === 'management' || user?.role === 'game_master') && (
                        <>
                            <NavLink
                                to="/prm/dashboard"
                                style={({ isActive }) => ({
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.5rem',
                                    padding: '0.6rem 1rem',
                                    borderRadius: '10px',
                                    textDecoration: 'none',
                                    fontWeight: '600',
                                    fontSize: '0.95rem',
                                    transition: 'all 0.2s',
                                    background: isActive ? 'var(--bg-panel)' : 'transparent',
                                    color: isActive ? 'var(--primary)' : 'var(--text-muted)'
                                })}
                            >
                                <LayoutDashboard size={18} />
                                <span>PRM Dashboard</span>
                            </NavLink>

                            <NavLink
                                to="/prm/calendar"
                                style={({ isActive }) => ({
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.5rem',
                                    padding: '0.6rem 1rem',
                                    borderRadius: '10px',
                                    textDecoration: 'none',
                                    fontWeight: '600',
                                    fontSize: '0.95rem',
                                    transition: 'all 0.2s',
                                    background: isActive ? 'var(--bg-panel)' : 'transparent',
                                    color: isActive ? 'var(--primary)' : 'var(--text-muted)'
                                })}
                            >
                                <Calendar size={18} />
                                <span>Calendar</span>
                            </NavLink>

                            <NavLink
                                to="/prm/volunteers"
                                style={({ isActive }) => ({
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.5rem',
                                    padding: '0.6rem 1rem',
                                    borderRadius: '10px',
                                    textDecoration: 'none',
                                    fontWeight: '600',
                                    fontSize: '0.95rem',
                                    transition: 'all 0.2s',
                                    background: isActive ? 'var(--bg-panel)' : 'transparent',
                                    color: isActive ? 'var(--primary)' : 'var(--text-muted)'
                                })}
                            >
                                <Users size={18} />
                                <span>SBoard</span>
                            </NavLink>
                        </>
                    )}

                    {user?.role !== 'prm' && (
                        <NavLink
                            to="/register"
                            style={({ isActive }) => ({
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.5rem',
                                padding: '0.6rem 1rem',
                                borderRadius: '10px',
                                textDecoration: 'none',
                                fontWeight: '600',
                                fontSize: '0.95rem',
                                transition: 'all 0.2s',
                                background: isActive ? 'var(--bg-panel)' : 'transparent',
                                color: isActive ? 'var(--primary)' : 'var(--text-muted)'
                            })}
                        >
                            <UserPlus size={18} />
                            <span>Register</span>
                        </NavLink>
                    )}
                </nav>

                {/* Right Side - User Info & Mobile Menu Toggle */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    {/* Desktop Information - Visible on medium screens and up */}
                    <div className="desktop-user-info" style={{
                        display: 'none',
                        flexDirection: 'column',
                        alignItems: 'flex-end',
                        marginRight: '0.5rem'
                    }}>
                        <style>{`
                            @media (min-width: 768px) {
                                .desktop-user-info { display: flex !important; }
                            }
                        `}</style>
                        <span style={{ fontSize: '0.9rem', fontWeight: '700', color: 'var(--text-primary)' }}>{user?.full_name || user?.name}</span>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: '500' }}>ID: {user?.username}</span>
                    </div>

                    {/* User Avatar */}
                    <div style={{
                        width: '38px',
                        height: '38px',
                        borderRadius: '12px',
                        background: 'linear-gradient(135deg, var(--primary), var(--secondary))',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '1rem',
                        fontWeight: '800',
                        color: 'white',
                        flexShrink: 0,
                        boxShadow: '0 4px 12px rgba(99, 102, 241, 0.2)'
                    }}>
                        {(user?.full_name || user?.name || 'U').charAt(0).toUpperCase()}
                    </div>

                    {/* Mobile Menu Toggle */}
                    <button
                        onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                        className="btn btn-ghost mobile-menu-btn"
                        style={{
                            padding: '0.5rem',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                        }}
                    >
                        <style>{`
                            @media (min-width: 768px) {
                                .mobile-menu-btn { display: none !important; }
                            }
                        `}</style>
                        {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
                    </button>

                    {/* Desktop Logout */}
                    <button
                        onClick={handleLogout}
                        className="btn btn-ghost desktop-logout"
                        style={{
                            padding: '0.6rem 1rem',
                            display: 'none',
                            alignItems: 'center',
                            gap: '0.5rem',
                            color: 'var(--error)',
                            fontWeight: '600',
                            borderRadius: '12px',
                            transition: 'all 0.2s'
                        }}
                    >
                        <style>{`
                            @media (min-width: 768px) {
                                .desktop-logout { display: flex !important; }
                            }
                        `}</style>
                        <LogOut size={18} />
                        <span>Logout</span>
                    </button>
                </div>
            </header>

            {/* Mobile Dropdown Menu */}
            {mobileMenuOpen && (
                <div className="mobile-dropdown" style={{
                    position: 'fixed',
                    top: '70px',
                    left: 0,
                    right: 0,
                    background: 'var(--bg-main)',
                    borderBottom: '1px solid var(--border-color)',
                    padding: '1rem',
                    zIndex: 39,
                    boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                }}>
                    <style>{`
                        @media (min-width: 768px) {
                            .mobile-dropdown { display: none !important; }
                        }
                    `}</style>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        {/* User Info */}
                        <div style={{
                            padding: '1rem',
                            background: 'var(--bg-panel)',
                            borderRadius: '12px',
                            marginBottom: '0.5rem',
                            border: '1px solid var(--border-color)'
                        }}>
                            <p style={{ margin: 0, fontWeight: '700', fontSize: '1rem', color: 'var(--text-primary)' }}>{user?.full_name || user?.name}</p>
                            <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: '500' }}>
                                ID: {user?.username} • <span style={{ textTransform: 'capitalize' }}>{user?.role}</span>
                            </p>
                        </div>

                        {user?.role !== 'prm' && (
                            <>
                                <NavLink
                                    to="/admin/dashboard"
                                    onClick={() => setMobileMenuOpen(false)}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '0.75rem',
                                        padding: '0.875rem 1rem',
                                        borderRadius: '10px',
                                        textDecoration: 'none',
                                        fontWeight: '600',
                                        fontSize: '0.95rem',
                                        background: 'transparent',
                                        color: 'var(--text-primary)',
                                        border: '1px solid var(--border-color)'
                                    }}
                                >
                                    <LayoutDashboard size={20} />
                                    <span>Dashboard</span>
                                </NavLink>

                                <NavLink
                                    to="/search"
                                    onClick={() => setMobileMenuOpen(false)}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '0.75rem',
                                        padding: '0.875rem 1rem',
                                        borderRadius: '10px',
                                        textDecoration: 'none',
                                        fontWeight: '600',
                                        fontSize: '0.95rem',
                                        background: 'transparent',
                                        color: 'var(--text-primary)',
                                        border: '1px solid var(--border-color)'
                                    }}
                                >
                                    <Search size={20} />
                                    <span>Search</span>
                                </NavLink>

                                <NavLink
                                    to="/register"
                                    onClick={() => setMobileMenuOpen(false)}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '0.75rem',
                                        padding: '0.875rem 1rem',
                                        borderRadius: '10px',
                                        textDecoration: 'none',
                                        fontWeight: '600',
                                        fontSize: '0.95rem',
                                        background: 'transparent',
                                        color: 'var(--text-primary)',
                                        border: '1px solid var(--border-color)'
                                    }}
                                >
                                    <UserPlus size={20} />
                                    <span>Register</span>
                                </NavLink>

                                <NavLink
                                    to="/recent-enrollment"
                                    onClick={() => setMobileMenuOpen(false)}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '0.75rem',
                                        padding: '0.875rem 1rem',
                                        borderRadius: '10px',
                                        textDecoration: 'none',
                                        fontWeight: '600',
                                        fontSize: '0.95rem',
                                        background: 'transparent',
                                        color: 'var(--text-primary)',
                                        border: '1px solid var(--border-color)'
                                    }}
                                >
                                    <Users size={20} />
                                    <span>Recent Enrollment</span>
                                </NavLink>


                                {/* SBoard for Recruiters */}
                                {user?.role === 'recruiter' && (
                                    <NavLink
                                        to="/prm/volunteers"
                                        onClick={() => setMobileMenuOpen(false)}
                                        style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '0.75rem',
                                            padding: '0.875rem 1rem',
                                            borderRadius: '10px',
                                            textDecoration: 'none',
                                            fontWeight: '600',
                                            fontSize: '0.95rem',
                                            background: 'transparent',
                                            color: 'var(--text-primary)',
                                            border: '1px solid var(--border-color)'
                                        }}
                                    >
                                        <Users size={20} />
                                        <span>SBoard</span>
                                    </NavLink>
                                )}

                                {/* User Management - Game Master Only */}
                                {user?.role === 'game_master' && (
                                    <NavLink
                                        to="/admin/users"
                                        onClick={() => setMobileMenuOpen(false)}
                                        style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '0.75rem',
                                            padding: '0.875rem 1rem',
                                            borderRadius: '10px',
                                            textDecoration: 'none',
                                            fontWeight: '600',
                                            fontSize: '0.95rem',
                                            background: 'transparent',
                                            color: 'var(--text-primary)',
                                            border: '1px solid var(--border-color)'
                                        }}
                                    >
                                        <Settings size={20} />
                                        <span>User Manager</span>
                                    </NavLink>
                                )}
                            </>
                        )}

                        {/* PRM Mobile Links */}
                        {(user?.role === 'prm' || user?.role === 'management' || user?.role === 'game_master') && (
                            <>
                                <NavLink
                                    to="/prm/dashboard"
                                    onClick={() => setMobileMenuOpen(false)}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '0.75rem',
                                        padding: '0.875rem 1rem',
                                        borderRadius: '10px',
                                        textDecoration: 'none',
                                        fontWeight: '600',
                                        fontSize: '0.95rem',
                                        background: 'transparent',
                                        color: 'var(--text-primary)',
                                        border: '1px solid var(--border-color)'
                                    }}
                                >
                                    <LayoutDashboard size={20} />
                                    <span>PRM Dashboard</span>
                                </NavLink>

                                <NavLink
                                    to="/prm/calendar"
                                    onClick={() => setMobileMenuOpen(false)}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '0.75rem',
                                        padding: '0.875rem 1rem',
                                        borderRadius: '10px',
                                        textDecoration: 'none',
                                        fontWeight: '600',
                                        fontSize: '0.95rem',
                                        background: 'transparent',
                                        color: 'var(--text-primary)',
                                        border: '1px solid var(--border-color)'
                                    }}
                                >
                                    <Calendar size={20} />
                                    <span>Calendar</span>
                                </NavLink>

                                <NavLink
                                    to="/prm/volunteers"
                                    onClick={() => setMobileMenuOpen(false)}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '0.75rem',
                                        padding: '0.875rem 1rem',
                                        borderRadius: '10px',
                                        textDecoration: 'none',
                                        fontWeight: '600',
                                        fontSize: '0.95rem',
                                        background: 'transparent',
                                        color: 'var(--text-primary)',
                                        border: '1px solid var(--border-color)'
                                    }}
                                >
                                    <Users size={20} />
                                    <span>SBoard</span>
                                </NavLink>

                                <NavLink
                                    to="/prm/calendar"
                                    onClick={() => setMobileMenuOpen(false)}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '0.75rem',
                                        padding: '0.875rem 1rem',
                                        borderRadius: '10px',
                                        textDecoration: 'none',
                                        fontWeight: '600',
                                        fontSize: '0.95rem',
                                        background: 'linear-gradient(90deg, var(--primary), var(--secondary))',
                                        color: 'white',
                                        border: 'none'
                                    }}
                                >
                                    <PlusCircle size={20} />
                                    <span>Create Study</span>
                                </NavLink>
                            </>
                        )}

                        <button
                            onClick={() => {
                                handleLogout();
                                setMobileMenuOpen(false);
                            }}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.75rem',
                                padding: '0.875rem 1rem',
                                borderRadius: '10px',
                                fontWeight: '600',
                                fontSize: '0.95rem',
                                background: 'rgba(244, 63, 94, 0.1)',
                                color: 'var(--error)',
                                border: '1px solid var(--error)',
                                cursor: 'pointer',
                                marginTop: '0.5rem',
                                width: '100%',
                                textAlign: 'left'
                            }}
                        >
                            <LogOut size={20} />
                            <span>Logout</span>
                        </button>
                    </div>
                </div>
            )}
        </>
    );
};

export default Topbar;
