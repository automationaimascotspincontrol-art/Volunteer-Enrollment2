import React from 'react';
import { XCircle } from 'lucide-react';

/**
 * BulkActionsBar - Floating action bar for bulk volunteer operations
 * 
 * @param {number} selectedCount - Number of selected volunteers
 * @param {function} onCheckInAll - Handler for check in all action
 * @param {function} onCheckOutAll - Handler for check out all action
 * @param {function} onClear - Handler for clearing selection
 */
const BulkActionsBar = ({ selectedCount, onCheckInAll, onCheckOutAll, onClear }) => {
    if (selectedCount === 0) return null;

    return (
        <>
            <div style={{
                position: 'fixed',
                bottom: '2rem',
                left: '50%',
                transform: 'translateX(-50%)',
                background: '#1e293b',
                padding: '1rem 2rem',
                borderRadius: '50px',
                display: 'flex',
                alignItems: 'center',
                gap: '1.5rem',
                boxShadow: '0 10px 25px rgba(0,0,0,0.3)',
                zIndex: 100,
                animation: 'slideUp 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
            }}>
                <span style={{ color: 'white', fontWeight: '600' }}>{selectedCount} Selected</span>
                <div style={{ width: '1px', height: '24px', background: 'rgba(255,255,255,0.2)' }}></div>
                <button
                    onClick={onCheckInAll}
                    style={{ background: '#10b981', color: 'white', border: 'none', padding: '0.6rem 1.2rem', borderRadius: '20px', fontWeight: '700', cursor: 'pointer' }}
                >
                    Check In All
                </button>
                <button
                    onClick={onCheckOutAll}
                    style={{ background: '#ef4444', color: 'white', border: 'none', padding: '0.6rem 1.2rem', borderRadius: '20px', fontWeight: '700', cursor: 'pointer' }}
                >
                    Check Out All
                </button>
                <button
                    onClick={onClear}
                    style={{ background: 'transparent', color: '#94a3b8', border: 'none', cursor: 'pointer', marginLeft: '0.5rem' }}
                >
                    <XCircle size={24} />
                </button>
            </div>

            <style>{`
                @keyframes slideUp { 
                    from { transform: translate(-50%, 100%); opacity: 0; } 
                    to { transform: translate(-50%, 0); opacity: 1; } 
                }
            `}</style>
        </>
    );
};

export default BulkActionsBar;
