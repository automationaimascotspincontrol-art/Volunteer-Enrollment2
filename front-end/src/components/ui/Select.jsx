import React from 'react';

export const Select = ({ label, options, ...props }) => (
    <div className="input-group">
        {label && <label>{label}</label>}
        <select className="form-control" {...props}>
            <option value="" disabled>Select option</option>
            {options.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
        </select>
    </div>
);

export default Select;
