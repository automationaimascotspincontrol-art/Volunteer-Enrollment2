import React from 'react';

/**
 * StatCard - Enhanced stat display card with VBoard-style premium design
 * 
 * @param {string} title - Card title (e.g., "Pre-screening")
 * @param {number} value - Numeric value to display
 * @param {string} subtitle - Subtitle text below the value
 * @param {React.Component} icon - Lucide icon component
 * @param {string} colorVar - Color variable key for styling (--chart-blue, --accent, --chart-purple, --success)
 * @param {function} onClick - Optional click handler
 */
const StatCard = ({ title, value, subtitle, icon: Icon, colorVar, onClick }) => {
    const colorMap = {
        '--chart-blue': { gradient: 'linear-gradient(135deg, #3b82f6 0%, #60a5fa 100%)', shadow: 'rgba(59, 130, 246, 0.3)', iconBg: 'rgba(59, 130, 246, 0.15)' },
        '--accent': { gradient: 'linear-gradient(135deg, #f59e0b 0%, #fbbf24 100%)', shadow: 'rgba(245, 158, 11, 0.3)', iconBg: 'rgba(245, 158, 11, 0.15)' },
        '--chart-purple': { gradient: 'linear-gradient(135deg, #8b5cf6 0%, #a78bfa 100%)', shadow: 'rgba(139, 92, 246, 0.3)', iconBg: 'rgba(139, 92, 246, 0.15)' },
        '--success': { gradient: 'linear-gradient(135deg, #10b981 0%, #14b8a6 100%)', shadow: 'rgba(16, 185, 129, 0.3)', iconBg: 'rgba(16, 185, 129, 0.15)' }
    };
    const colors = colorMap[colorVar] || colorMap['--success'];

    return (
        <div
            onClick={onClick}
            style={{
                padding: '0',
                background: colors.gradient,
                border: 'none',
                borderRadius: '20px',
                boxShadow: `0 4px 15px ${colors.shadow}`,
                cursor: onClick ? 'pointer' : 'default',
                transition: 'all 0.3s ease',
                position: 'relative',
                overflow: 'hidden'
            }}
            onMouseEnter={(e) => {
                e.currentTarget.style.transform = onClick ? 'translateY(-4px)' : 'scale(1.02)';
                e.currentTarget.style.boxShadow = `0 8px 25px ${colors.shadow}`;
            }}
            onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0) scale(1)';
                e.currentTarget.style.boxShadow = `0 4px 15px ${colors.shadow}`;
            }}
        >
            {/* Background Icon */}
            <div style={{ position: 'absolute', top: '-30px', right: '-30px', opacity: 0.1 }}>
                <Icon size={120} color="white" />
            </div>

            {/* Content */}
            <div style={{ padding: '1.8rem 1.5rem', position: 'relative', zIndex: 1 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                    <div style={{ flex: 1 }}>
                        <p style={{ color: 'rgba(255,255,255,0.85)', fontSize: '0.85rem', fontWeight: '600', marginBottom: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.5px', margin: 0 }}>{title}</p>
                        <h3 style={{ fontSize: '2.5rem', fontWeight: '900', color: 'white', margin: '0.5rem 0', lineHeight: 1 }}>{value?.toLocaleString() || 0}</h3>
                        {subtitle && <p style={{ margin: '0.5rem 0 0 0', fontSize: '0.8rem', color: 'rgba(255,255,255,0.75)' }}>{subtitle}</p>}
                    </div>
                    <div style={{
                        padding: '0.9rem',
                        background: 'rgba(255, 255, 255, 0.2)',
                        borderRadius: '14px',
                        backdropFilter: 'blur(10px)',
                        flexShrink: 0
                    }}>
                        <Icon color="white" size={28} />
                    </div>
                </div>
            </div>
        </div>
    );
};

export default StatCard;
