import React from 'react';
import { Users } from 'lucide-react';

/**
 * ScreeningCandidatesTable - Table displaying pre-screening and screening volunteers
 * 
 * @param {Array} volunteers - List of candidate volunteers
 * @param {string} search - Search query string
 * @param {function} onSearchChange - Search input change handler
 * @param {function} onToggleAttendance - Attendance toggle handler
 */
const ScreeningCandidatesTable = ({ volunteers, search, onSearchChange, onToggleAttendance }) => {
    return (
        <div className="glass-card" style={{ marginBottom: '2rem', border: '1px solid var(--border-color)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <h3 style={{ fontSize: '1.3rem', fontWeight: '700', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <Users size={22} color="#f59e0b" />
                        Screening Candidates ({volunteers.length})
                    </h3>
                </div>
                <input
                    type="search"
                    placeholder="Search candidates..."
                    value={search}
                    onChange={onSearchChange}
                    style={{
                        padding: '0.6rem 1rem',
                        borderRadius: '10px',
                        border: '1px solid var(--border-color)',
                        backgroundColor: 'var(--bg-main)',
                        fontSize: '0.9rem',
                        minWidth: '250px'
                    }}
                />
            </div>

            <div style={{ maxHeight: '400px', overflowY: 'auto', overflowX: 'auto' }}>
                <table className="custom-table">
                    <thead>
                        <tr>
                            <th>Name</th>
                            <th>Status</th>
                            <th>Contact</th>
                            <th>Attendance</th>
                            <th style={{ textAlign: 'right' }}>Action</th>
                        </tr>
                    </thead>
                    <tbody>
                        {volunteers.length === 0 ? (
                            <tr>
                                <td colSpan="5" style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                                    No candidates in prescreening/screening
                                </td>
                            </tr>
                        ) : (
                            volunteers.map((vol) => (
                                <tr key={vol.volunteer_id} className="animate-slide-up">
                                    <td style={{ fontWeight: '600' }}>
                                        <div style={{ color: 'var(--text-primary)' }}>{vol.name || vol.basic_info?.name}</div>
                                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{vol.volunteer_id}</div>
                                    </td>
                                    <td>
                                        <span style={{
                                            padding: '0.2rem 0.6rem',
                                            borderRadius: '12px',
                                            fontSize: '0.75rem',
                                            fontWeight: '600',
                                            background: vol.current_status === 'screening' || vol.current_stage === 'pending'
                                                ? 'rgba(245, 158, 11, 0.1)'
                                                : 'rgba(99, 102, 241, 0.1)',
                                            color: vol.current_status === 'screening' || vol.current_stage === 'pending'
                                                ? '#f59e0b'
                                                : '#6366f1'
                                        }}>
                                            {vol.current_status === 'screening' ? 'Screening' : 'Pre-Screening'}
                                        </span>
                                    </td>
                                    <td className="text-muted">{vol.contact || vol.basic_info?.phone || vol.basic_info?.mobile}</td>
                                    <td>
                                        {vol.attendance_status === 'IN' ? (
                                            <span style={{ fontSize: '0.75rem', padding: '0.3rem 0.6rem', background: '#10b98120', color: '#10b981', borderRadius: '6px', fontWeight: '700' }}>
                                                🟢 IN
                                            </span>
                                        ) : (
                                            <span style={{ fontSize: '0.75rem', padding: '0.3rem 0.6rem', background: '#f1f5f9', color: '#64748b', borderRadius: '6px', fontWeight: '600' }}>
                                                ⚪ OUT
                                            </span>
                                        )}
                                    </td>
                                    <td style={{ textAlign: 'right' }}>
                                        <button
                                            onClick={() => onToggleAttendance(vol.volunteer_id, vol.attendance_status)}
                                            style={{
                                                padding: '0.4rem 0.8rem',
                                                borderRadius: '8px',
                                                border: 'none',
                                                background: vol.attendance_status === 'IN' ? '#fef2f2' : '#ecfdf5',
                                                color: vol.attendance_status === 'IN' ? '#dc2626' : '#059669',
                                                fontSize: '0.75rem',
                                                fontWeight: '600',
                                                cursor: 'pointer',
                                                transition: 'all 0.2s'
                                            }}
                                        >
                                            {vol.attendance_status === 'IN' ? 'Mark Out' : 'Mark In'}
                                        </button>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default ScreeningCandidatesTable;
