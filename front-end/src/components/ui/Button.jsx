import React from 'react';

export const Button = ({ children, variant = 'primary', loading, icon: Icon, className = '', ...props }) => (
    <button
        className={`btn btn-${variant} ${className}`}
        disabled={loading}
        {...props}
    >
        {loading ? 'Processing...' : (
            <>
                {Icon && <Icon size={18} />}
                {children}
            </>
        )}
    </button>
);

export default Button;
