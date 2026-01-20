import React, { useState, useEffect } from 'react';
import api from '../../api/api';

const AttendanceToggle = ({ volunteerId, volunteerName, assignedStudyId, studyCode, onStatusChange }) => {
    const [isActive, setIsActive] = useState(false);
    const [checkInTime, setCheckInTime] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    // Fetch current status on mount
    useEffect(() => {
        fetchCurrentStatus();
    }, [volunteerId, assignedStudyId]);

    const fetchCurrentStatus = async () => {
        try {
            const response = await api.get(
                `/prm/attendance/${volunteerId}/current`,
                {
                    params: { assigned_study_id: assignedStudyId }
                }
            );

            if (response.data.success && response.data.data) {
                setIsActive(response.data.isActive);
                setCheckInTime(response.data.data.checkInTime);
            }
        } catch (err) {
            console.error('Error fetching attendance status:', err);
        }
    };

    const handleToggle = async () => {
        setLoading(true);
        setError(null);

        try {

            if (!volunteerId || !assignedStudyId) {
                setError('Missing volunteer or study information');
                setLoading(false);
                return;
            }

            const response = await api.post(
                '/prm/attendance/toggle',
                {
                    volunteerId,
                    assignedStudyId
                }
            );

            if (response.data.success) {
                const newStatus = response.data.data.isActive;
                setIsActive(newStatus);
                setCheckInTime(response.data.data.checkInTime);

                // Notify parent component
                if (onStatusChange) {
                    onStatusChange({
                        volunteerId,
                        isActive: newStatus,
                        action: response.data.action
                    });
                }
            }
        } catch (err) {
            console.error('Error toggling attendance:', err);
            setError('Failed to update attendance status');
        } finally {
            setLoading(false);
        }
    };

    const formatTime = (isoString) => {
        if (!isoString) return '--';
        const date = new Date(isoString);
        return date.toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: false
        });
    };

    return (
        <div className="attendance-toggle-container" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            {/* Status Indicator */}
            <div
                className="status-indicator"
                style={{
                    width: '10px',
                    height: '10px',
                    borderRadius: '50%',
                    backgroundColor: isActive ? '#10b981' : '#6b7280',
                    transition: 'background-color 0.3s ease'
                }}
            />

            {/* Toggle Switch */}
            <label
                className="toggle-switch"
                style={{
                    position: 'relative',
                    display: 'inline-block',
                    width: '50px',
                    height: '24px',
                    cursor: loading ? 'not-allowed' : 'pointer',
                    opacity: loading ? 0.6 : 1
                }}
            >
                <input
                    type="checkbox"
                    checked={isActive}
                    onChange={handleToggle}
                    disabled={loading}
                    style={{ opacity: 0, width: 0, height: 0 }}
                />
                <span
                    className="slider"
                    style={{
                        position: 'absolute',
                        cursor: 'pointer',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        backgroundColor: isActive ? '#10b981' : '#d1d5db',
                        transition: 'background-color 0.3s',
                        borderRadius: '24px'
                    }}
                >
                    <span
                        style={{
                            position: 'absolute',
                            height: '18px',
                            width: '18px',
                            left: isActive ? '28px' : '3px',
                            bottom: '3px',
                            backgroundColor: 'white',
                            transition: 'left 0.3s',
                            borderRadius: '50%'
                        }}
                    />
                </span>
            </label>

            {/* Status Text & Time */}
            <div className="status-info" style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                <span style={{
                    fontSize: '13px',
                    fontWeight: '600',
                    color: isActive ? '#10b981' : '#6b7280'
                }}>
                    {isActive ? 'Active' : 'Inactive'}
                </span>
                {isActive && checkInTime && (
                    <span style={{ fontSize: '11px', color: '#9ca3af' }}>
                        Since {formatTime(checkInTime)}
                    </span>
                )}
            </div>

            {/* Error Message */}
            {error && (
                <span style={{ fontSize: '11px', color: '#ef4444' }}>
                    {error}
                </span>
            )}
        </div>
    );
};

export default AttendanceToggle;
