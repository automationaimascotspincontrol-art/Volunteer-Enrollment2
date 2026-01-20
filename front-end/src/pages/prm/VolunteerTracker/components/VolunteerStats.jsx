import React from 'react';
import StatCard from './StatCard';
import { Users, CheckCircle, Clock, Activity } from 'lucide-react';

/**
 * VolunteerStats - Grid display of volunteer statistics
 * 
 * @param {Object} stats - Statistics object containing counts
 * @param {number} stats.prescreening - Pre-screening count
 * @param {number} stats.screening - Screening count
 * @param {number} stats.approved - Approved count
 * @param {number} stats.checkedInToday - Checked in today count
 */
const VolunteerStats = ({ stats }) => {
    return (
        <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '1rem',
            marginBottom: '2rem'
        }}>
            <StatCard
                title="Pre-screening"
                value={stats.prescreening || 0}
                subtitle="Initial Enrollment"
                icon={Users}
                colorVar="--chart-blue"
            />
            <StatCard
                title="Screening"
                value={stats.screening || 0}
                subtitle="Medically Fit"
                icon={Clock}
                colorVar="--accent"
            />
            <StatCard
                title="Approved"
                value={stats.approved || 0}
                subtitle="Final Approval"
                icon={CheckCircle}
                colorVar="--chart-purple"
            />
            <StatCard
                title="Checked In"
                value={stats.checkedInToday || 0}
                subtitle="Active Today"
                icon={Activity}
                colorVar="--success"
            />
        </div>
    );
};

export default VolunteerStats;
