/**
 * MultiSelect Component
 * Multi-select dropdown for study type selection with search
 */

import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, X, Search } from 'lucide-react';
import './MultiSelect.css';

export const MultiSelect = ({
    label,
    options,
    value = [],
    onChange,
    placeholder = 'Select options...',
    error,
    required = false,
    disabled = false
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const dropdownRef = useRef(null);
    const searchInputRef = useRef(null);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsOpen(false);
                setSearchTerm(''); // Clear search when closing
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleToggle = (option) => {
        const isSelected = value.some(v => v._id === option._id);

        if (isSelected) {
            onChange(value.filter(v => v._id !== option._id));
        } else {
            onChange([...value, option]);
        }
    };

    const handleRemove = (option, e) => {
        e.stopPropagation();
        onChange(value.filter(v => v._id !== option._id));
    };

    const handleDropdownToggle = () => {
        const newState = !isOpen;
        setIsOpen(newState);
        if (newState) {
            // Focus search input when opening
            setTimeout(() => searchInputRef.current?.focus(), 100);
        } else {
            // Clear search when closing
            setSearchTerm('');
        }
    };

    // Filter options based on search term
    const filteredOptions = options.filter(option => {
        if (!searchTerm) return true;
        const search = searchTerm.toLowerCase();
        return (
            option.studyName?.toLowerCase().includes(search) ||
            option.studyCode?.toLowerCase().includes(search) ||
            option.studyType?.toLowerCase().includes(search)
        );
    });

    return (
        <div className="multiselect-group" ref={dropdownRef}>
            {label && (
                <label className="multiselect-label">
                    {label}
                    {required && <span className="input-required">*</span>}
                </label>
            )}

            <div
                className={`multiselect-trigger ${error ? 'multiselect-trigger--error' : ''} ${disabled ? 'multiselect-trigger--disabled' : ''}`}
                onClick={() => !disabled && handleDropdownToggle()}
            >
                <div className="multiselect-values">
                    {value.length === 0 ? (
                        <span className="multiselect-placeholder">{placeholder}</span>
                    ) : (
                        value.map(item => (
                            <span key={item._id} className="multiselect-tag">
                                {item.studyName}
                                <button
                                    className="multiselect-tag-remove"
                                    onClick={(e) => handleRemove(item, e)}
                                    disabled={disabled}
                                >
                                    <X size={14} />
                                </button>
                            </span>
                        ))
                    )}
                </div>
                <ChevronDown
                    size={20}
                    className={`multiselect-icon ${isOpen ? 'multiselect-icon--open' : ''}`}
                />
            </div>

            {isOpen && (
                <div className="multiselect-dropdown">
                    <div className="multiselect-search">
                        <Search size={16} className="multiselect-search-icon" />
                        <input
                            ref={searchInputRef}
                            type="text"
                            className="multiselect-search-input"
                            placeholder="Search by study name, code, or type..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            onClick={(e) => e.stopPropagation()}
                        />
                    </div>
                    <div className="multiselect-options-container">
                        {filteredOptions.length === 0 ? (
                            <div className="multiselect-empty">
                                {searchTerm ? `No studies found for "${searchTerm}"` : 'No options available'}
                            </div>
                        ) : (
                            filteredOptions.map(option => {
                                const isSelected = value.some(v => v._id === option._id);
                                return (
                                    <div
                                        key={option._id}
                                        className={`multiselect-option ${isSelected ? 'multiselect-option--selected' : ''}`}
                                        onClick={() => handleToggle(option)}
                                    >
                                        <input
                                            type="checkbox"
                                            checked={isSelected}
                                            onChange={() => { }}
                                            className="multiselect-checkbox"
                                        />
                                        <div className="multiselect-option-content">
                                            <div className="multiselect-option-name">
                                                {option.studyName}{option.studyCode ? ` (${option.studyCode})` : ''}
                                            </div>
                                            <div className="multiselect-option-meta">{option.studyType}</div>
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>
            )}

            {error && <span className="input-error-message">{error}</span>}
        </div>
    );
};

export default MultiSelect;
