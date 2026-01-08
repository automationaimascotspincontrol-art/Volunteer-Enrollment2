import React from 'react';

export const Card = ({ children, className = '', ...props }) => (
    <div className={`glass-card ${className}`} {...props}>
        {children}
    </div>
);

export default Card;
