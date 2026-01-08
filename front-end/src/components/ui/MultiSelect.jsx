import React from 'react';

export const MultiSelect = ({ label, options, value = [], onChange, ...props }) => {
    const [isOpen, setIsOpen] = React.useState(false);

    const handleToggle = (optValue) => {
        const newValue = value.includes(optValue)
            ? value.filter(v => v !== optValue)
            : [...value, optValue];
        onChange({ target: { name: props.name, value: newValue } });
    };

    return (
        <div className="input-group" style={{ position: 'relative' }}>
            {label && <label>{label}</label>}
            <div
                className="form-control"
                style={{ minHeight: '45px', height: 'auto', padding: '0.4rem', cursor: 'pointer', position: 'relative' }}
                onClick={() => setIsOpen(!isOpen)}
            >
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', paddingRight: '20px' }}>
                    {options.filter(opt => value.includes(opt.value)).map(opt => (
                        <span key={opt.value} style={{ background: 'var(--primary)', color: 'white', padding: '2px 8px', borderRadius: '6px', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '4px' }}>
                            {opt.label}
                            <span
                                onClick={(e) => { e.stopPropagation(); handleToggle(opt.value); }}
                                style={{ cursor: 'pointer', fontWeight: 'bold', marginLeft: '4px', fontSize: '1rem' }}
                            >
                                ×
                            </span>
                        </span>
                    ))}
                    {value.length === 0 && <span style={{ color: 'var(--text-muted)', fontSize: '0.9rem', paddingLeft: '0.5rem' }}>Select study/studies...</span>}
                </div>
                <span style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', fontSize: '0.7rem' }}>
                    {isOpen ? '▲' : '▼'}
                </span>
            </div>

            {isOpen && (
                <div style={{
                    marginTop: '0.4rem',
                    maxHeight: '200px',
                    overflowY: 'auto',
                    background: 'var(--bg-input)',
                    borderRadius: '12px',
                    padding: '0.4rem',
                    border: '1px solid var(--border-color)',
                    boxShadow: '0 10px 25px rgba(0,0,0,0.5)',
                    position: 'absolute',
                    top: '100%',
                    left: 0,
                    width: '100%',
                    zIndex: 100
                }}>
                    {options.map(opt => {
                        const isSelected = value.includes(opt.value);
                        return (
                            <div
                                key={opt.value}
                                onClick={() => handleToggle(opt.value)}
                                style={{
                                    padding: '0.5rem 0.8rem',
                                    cursor: 'pointer',
                                    borderRadius: '8px',
                                    marginBottom: '2px',
                                    background: isSelected ? 'rgba(99, 102, 241, 0.2)' : 'transparent',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '10px',
                                    fontSize: '0.9rem',
                                    transition: 'background 0.2s'
                                }}
                            >
                                <input
                                    type="checkbox"
                                    checked={isSelected}
                                    readOnly
                                    style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                                />
                                {opt.label}
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

export default MultiSelect;
