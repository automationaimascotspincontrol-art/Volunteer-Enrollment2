import React, { useState, useEffect } from 'react';
import api from '../../api/api';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell
} from 'recharts';
import { Calendar, RefreshCw, TrendingUp } from 'lucide-react';

const EnrollmentChart = ({ title = "New Enrollment Analytics", initialData = null }) => {
    const [period, setPeriod] = useState('month');
    const [year, setYear] = useState(new Date().getFullYear());
    const [data, setData] = useState([]);
    const [years, setYears] = useState([new Date().getFullYear()]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const processChartData = (rawItems) => {
        if (!rawItems || !Array.isArray(rawItems)) return;

        let chartData = rawItems.map(item => {
            let displayLabel = 'N/A';
            try {
                const labelStr = item.label;
                if (!labelStr) return { ...item, displayLabel: 'Missing', count: item.count || 0 };

                if (period === 'day') {
                    const now = new Date();
                    const today = now.toISOString().split('T')[0];
                    const yesterday = new Date(now.getTime() - 86400000).toISOString().split('T')[0];

                    displayLabel = labelStr === today ? 'Today' :
                        labelStr === yesterday ? 'Yesterday' :
                            new Date(labelStr).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
                } else if (period === 'week') {
                    displayLabel = `Wk ${labelStr.split('-')[1] || '?'}`;
                } else {
                    const parts = labelStr.split('-');
                    const d = new Date(parts[0], (parts[1] || 1) - 1);
                    displayLabel = d.toLocaleString('default', { month: 'short' });
                }
            } catch (e) {
                displayLabel = item.label || 'Unknown';
            }
            return { ...item, displayLabel, count: parseFloat(item.count) || 0 };
        });

        setData(chartData);
    };

    const fetchData = async () => {
        setLoading(true);
        try {
            console.log(`Fetching /dashboard/enrollment-stats?period=${period}&year=${year}`);
            const response = await api.get(`/dashboard/enrollment-stats?period=${period}&year=${year}`);
            if (response.data && response.data.stats) {
                processChartData(response.data.stats);
                if (response.data.available_years) setYears(response.data.available_years);
            }
            setError(null);
        } catch (err) {
            console.error('Failed to fetch enrollment stats', err);
            setError('Failed to load chart data');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
        const interval = setInterval(fetchData, 60000); // 1 minute live update
        return () => clearInterval(interval);
    }, [period, year]);

    return (
        <div style={{
            padding: '0',
            overflow: 'hidden',
            border: '1px solid rgba(139, 92, 246, 0.2)',
            borderRadius: '16px',
            minHeight: '400px',
            display: 'flex',
            flexDirection: 'column',
            background: 'white'
        }}>
            {/* Gradient Header */}
            <div style={{ padding: '1.5rem 2rem', background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.1) 0%, rgba(167, 139, 250, 0.1) 100%)', borderBottom: '1px solid rgba(139, 92, 246, 0.2)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
                        <div style={{ padding: '0.7rem', background: 'linear-gradient(135deg, #8b5cf6, #a78bfa)', borderRadius: '12px', display: 'flex', boxShadow: '0 4px 15px rgba(139, 92, 246, 0.3)' }}>
                            <TrendingUp size={20} color="white" />
                        </div>
                        <h3 style={{ fontSize: '1.3rem', fontWeight: '800', margin: 0 }}>{title}</h3>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
                        {loading && <RefreshCw size={14} className="animate-spin" style={{ color: '#6b7280' }} />}

                        <select
                            value={period}
                            onChange={(e) => setPeriod(e.target.value)}
                            style={{
                                background: 'white',
                                border: '2px solid rgba(139, 92, 246, 0.3)',
                                color: '#374151',
                                padding: '0.5rem 0.8rem',
                                borderRadius: '8px',
                                fontSize: '0.85rem',
                                fontWeight: '600',
                                outline: 'none',
                                cursor: 'pointer'
                            }}
                        >
                            <option value="day">Daily</option>
                            <option value="week">Weekly</option>
                            <option value="month">Monthly</option>
                        </select>

                        <select
                            value={year}
                            onChange={(e) => setYear(e.target.value)}
                            style={{
                                background: 'white',
                                border: '2px solid rgba(139, 92, 246, 0.3)',
                                color: '#374151',
                                padding: '0.5rem 0.8rem',
                                borderRadius: '8px',
                                fontSize: '0.85rem',
                                fontWeight: '600',
                                outline: 'none',
                                cursor: 'pointer'
                            }}
                        >
                            {years.map(y => (
                                <option key={y} value={y}>{y}</option>
                            ))}
                        </select>
                    </div>
                </div>
            </div>

            {/* Chart Content */}
            <div style={{ padding: '2rem' }}>
                {error ? (
                    <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ef4444', fontSize: '0.9rem', minHeight: '300px' }}>
                        {error}
                    </div>
                ) : data.length > 0 ? (
                    <div style={{ position: 'relative', height: '300px', width: '100%' }}>
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={data} margin={{ top: 10, right: 10, left: 10, bottom: 20 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(139, 92, 246, 0.1)" vertical={false} />
                                <XAxis dataKey="displayLabel" stroke="#6b7280" fontSize={11} tickLine={false} axisLine={false} tickMargin={12} fontWeight={600} />
                                <YAxis stroke="#6b7280" fontSize={11} tickLine={false} axisLine={false} allowDecimals={false} width={45} />
                                <Tooltip
                                    cursor={{ fill: 'rgba(139, 92, 246, 0.05)' }}
                                    contentStyle={{ backgroundColor: 'white', border: '1px solid rgba(139, 92, 246, 0.2)', borderRadius: '12px', boxShadow: '0 4px 15px rgba(0,0,0,0.1)' }}
                                />
                                <Bar dataKey="count" radius={[8, 8, 0, 0]} barSize={period === 'day' ? 25 : 35} minPointSize={8}>
                                    {data.map((entry, index) => {
                                        const isHighlight = entry.displayLabel === 'Today' || entry.displayLabel === 'Yesterday';
                                        return <Cell key={`cell-${index}`} fill={isHighlight ? '#fbbf24' : '#a78bfa'} fillOpacity={isHighlight ? 1 : 0.8} />;
                                    })}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                ) : (
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#6b7280', gap: '1rem', minHeight: '300px' }}>
                        <TrendingUp size={48} opacity={0.2} color="#8b5cf6" />
                        <p style={{ fontSize: '0.95rem', fontWeight: '500' }}>
                            {loading ? 'Fetching analytical data...' : 'Zero registrations in this period.'}
                        </p>
                    </div>
                )}

                <div style={{ marginTop: '2rem', paddingTop: '1rem', borderTop: '1px solid rgba(139, 92, 246, 0.1)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.75rem', color: '#6b7280' }}>
                        * Real-time enrollment tracking active
                    </span>
                    <span style={{ fontSize: '0.75rem', fontWeight: '700', color: '#8b5cf6' }}>
                        {year} {period.charAt(0).toUpperCase() + period.slice(1)} View
                    </span>
                </div>
            </div>
        </div>
    );
};

export default EnrollmentChart;
