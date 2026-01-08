import React from 'react';

export const Input = ({ label, icon: Icon, ...props }) => (
    <div className="input-group">
        {label && <label>{label}</label>}
        <div style={{ position: 'relative' }}>
            {Icon && (
                <Icon
                    size={18}
                    style={{
                        position: 'absolute',
                        left: '12px',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        color: 'var(--text-muted)'
                    }}
                />
            )}
            <input
                className="form-control"
                style={{ paddingLeft: Icon ? '40px' : '12px' }}
                {...props}
            />
        </div>
    </div>
);

export default Input;
