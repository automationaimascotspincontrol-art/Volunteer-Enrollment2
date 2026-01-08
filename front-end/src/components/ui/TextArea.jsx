import React from 'react';

export const TextArea = ({ label, ...props }) => (
    <div className="input-group">
        {label && <label>{label}</label>}
        <textarea className="form-control" rows="3" {...props}></textarea>
    </div>
);

export default TextArea;
