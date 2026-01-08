import React from 'react';

/**
 * Badge component for status indicators
 * @param {string} variant - success, error, info, warning
 */
export const Badge = ({ children, variant = 'info', className = '' }) => (
    <span className={`badge badge-${variant} ${className}`}>
        {children}
    </span>
);

export default Badge;
