import React from 'react';
import { Link } from 'react-router-dom';
import { UserPlus, Search, Database, Users, ShieldCheck } from 'lucide-react';

const QuickActionTile = ({ to, icon: Icon, label, color, description }) => {
    const colorMap = {
        'var(--primary)': { gradient: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)', shadow: 'rgba(99, 102, 241, 0.4)' },
        'var(--accent)': { gradient: 'linear-gradient(135deg, #f59e0b 0%, #fbbf24 100%)', shadow: 'rgba(245, 158, 11, 0.4)' },
        'var(--secondary)': { gradient: 'linear-gradient(135deg, #ec4899 0%, #f472b6 100%)', shadow: 'rgba(236, 72, 153, 0.4)' },
        '#a78bfa': { gradient: 'linear-gradient(135deg, #8b5cf6 0%, #a78bfa 100%)', shadow: 'rgba(139, 92, 246, 0.4)' }
    };

    const colors = colorMap[color] || { gradient: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)', shadow: 'rgba(99, 102, 241, 0.4)' };

    return (
        <Link
            to={to}
            style={{
                textDecoration: 'none',
                padding: '0',
                display: 'flex',
                flexDirection: 'column',
                borderRadius: '16px',
                background: colors.gradient,
                border: 'none',
                boxShadow: `0 4px 15px ${colors.shadow}`,
                transition: 'all 0.3s ease',
                position: 'relative',
                overflow: 'hidden',
                cursor: 'pointer'
            }}
            onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-6px)';
                e.currentTarget.style.boxShadow = `0 8px 30px ${colors.shadow}`;
            }}
            onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = `0 4px 15px ${colors.shadow}`;
            }}
        >
            {/* Large background icon */}
            <div style={{
                position: 'absolute',
                bottom: '-20px',
                right: '-20px',
                opacity: 0.1,
                transform: 'rotate(-15deg)'
            }}>
                <Icon size={100} color="white" />
            </div>

            {/* Content */}
            <div style={{ padding: '1.8rem 1.5rem', position: 'relative', zIndex: 1 }}>
                {/* Icon container */}
                <div style={{
                    padding: '0.9rem',
                    background: 'rgba(255, 255, 255, 0.2)',
                    borderRadius: '14px',
                    width: 'fit-content',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginBottom: '1rem',
                    backdropFilter: 'blur(10px)'
                }}>
                    <Icon color="white" size={28} />
                </div>

                {/* Text */}
                <div>
                    <h4 style={{
                        color: 'white',
                        fontSize: '1.1rem',
                        fontWeight: '800',
                        marginBottom: '0.5rem',
                        letterSpacing: '-0.3px'
                    }}>
                        {label}
                    </h4>
                    <p style={{
                        color: 'rgba(255,255,255,0.85)',
                        fontSize: '0.85rem',
                        lineHeight: '1.5',
                        fontWeight: '500'
                    }}>
                        {description}
                    </p>
                </div>
            </div>
        </Link>
    );
};

const QuickActions = ({ role }) => {
    const isGM = role === 'game_master';

    return (
        <div style={{ marginBottom: '2.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', marginBottom: '1.5rem' }}>
                <div style={{
                    padding: '0.6rem',
                    background: 'linear-gradient(135deg, #f59e0b 0%, #fbbf24 100%)',
                    borderRadius: '12px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '0 4px 15px rgba(245, 158, 11, 0.3)'
                }}>
                    <ShieldCheck size={20} color="white" />
                </div>
                <h3 style={{
                    fontSize: '1.3rem',
                    fontWeight: '800',
                    letterSpacing: '-0.3px',
                    margin: 0,
                    background: 'linear-gradient(135deg, #6366f1 0%, #ec4899 100%)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent'
                }}>
                    Quick Operations
                </h3>
            </div>

            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
                gap: '1.5rem'
            }}>
                <QuickActionTile
                    to="/"
                    icon={UserPlus}
                    label="New Volunteer"
                    color="var(--primary)"
                    description="Initiate a fresh pre-screening form"
                />
                <QuickActionTile
                    to="/search"
                    icon={Search}
                    label="Search & Enroll"
                    color="var(--accent)"
                    description="Find and complete registrations"
                />
                <QuickActionTile
                    to="/admin/full-search"
                    icon={Database}
                    label="Full Database"
                    color="var(--secondary)"
                    description="Browse all legacy and new records"
                />
                {isGM && (
                    <QuickActionTile
                        to="/admin/users"
                        icon={Users}
                        label="User Management"
                        color="#a78bfa"
                        description="Control access and team permissions"
                    />
                )}
            </div>
        </div>
    );
};

export default QuickActions;
