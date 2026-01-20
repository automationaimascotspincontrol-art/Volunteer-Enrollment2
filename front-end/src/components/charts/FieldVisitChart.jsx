import React, { useState, useEffect } from 'react';
import api from '../../api/api';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell
} from 'recharts';
import { Calendar, RefreshCw, TrendingUp } from 'lucide-react';

const FieldVisitChart = ({ title = "Field Visit Activity", initialData = null, initialPeriod = 'day' }) => {
    const [period, setPeriod] = useState(initialPeriod);
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(!initialData);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (initialData && period === 'day') {
            processChartData(initialData);
        }
    }, [initialData, period]);

    const processChartData = (rawItems) => {
        if (!rawItems || !Array.isArray(rawItems)) {
            console.warn('FieldVisitChart received non-array data:', rawItems);
            return;
        }

        let chartData = rawItems.map(item => {
            let displayLabel = 'N/A';
            try {
                const labelStr = item.label || item.date;
                if (!labelStr) return { ...item, displayLabel: 'Missing', count: item.count || 0 };

                if (period === 'day') {
                    const now = new Date();
                    const today = now.toISOString().split('T')[0];
                    const yesterday = new Date(now.getTime() - 86400000).toISOString().split('T')[0];

                    displayLabel = labelStr === today ? 'Today' :
                        labelStr === yesterday ? 'Yesterday' :
                            new Date(labelStr).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
                } else if (period === 'week') {
                    displayLabel = `Week ${labelStr.split('-')[1] || '?'}`;
                } else {
                    const parts = labelStr.split('-');
                    const d = new Date(parts[0], (parts[1] || 1) - 1);
                    displayLabel = d.toLocaleString('default', { month: 'short', year: '2-digit' });
                }
            } catch (e) {
                console.error('Error parsing chart item:', item, e);
                displayLabel = item.label || item.date || 'Unknown';
            }
            return { ...item, displayLabel, count: parseFloat(item.count) || 0 };
        });

        if (period === 'day' && chartData.length > 14) {
            chartData = chartData.slice(-14);
        }

        // Data processed successfully
        setData(chartData);
    };

    const fetchData = async () => {
        if (!initialData) setLoading(true);

        try {
            // Fetching field stats
            const response = await api.get(`/dashboard/field-stats?period=${period}`);
            // API response received

            if (Array.isArray(response.data) && (response.data.length > 0 || data.length === 0)) {
                processChartData(response.data);
            }
            setError(null);
        } catch (err) {
            console.error('Failed to fetch field stats', err);
            if (data.length === 0) setError('Failed to load chart data');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
        const interval = setInterval(fetchData, 30000);
        return () => clearInterval(interval);
    }, [period]);

    return (
        <div style={{
            padding: '0',
            overflow: 'hidden',
            border: '1px solid rgba(6, 182, 212, 0.2)',
            borderRadius: '16px',
            minHeight: '400px',
            display: 'flex',
            flexDirection: 'column',
            background: 'white'
        }}>
            {/* Gradient Header */}
            <div style={{ padding: '1.5rem 2rem', background: 'linear-gradient(135deg, rgba(6, 182, 212, 0.1) 0%, rgba(34, 211, 238, 0.1) 100%)', borderBottom: '1px solid rgba(6, 182, 212, 0.2)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
                        <div style={{ padding: '0.7rem', background: 'linear-gradient(135deg, #06b6d4, #22d3ee)', borderRadius: '12px', display: 'flex', boxShadow: '0 4px 15px rgba(6, 182, 212, 0.3)' }}>
                            <Calendar size={20} color="white" />
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
                                border: '2px solid rgba(6, 182, 212, 0.3)',
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
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(6, 182, 212, 0.1)" vertical={false} />
                                <XAxis dataKey="displayLabel" stroke="#6b7280" fontSize={11} tickLine={false} axisLine={false} tickMargin={12} fontWeight={600} />
                                <YAxis stroke="#6b7280" fontSize={11} tickLine={false} axisLine={false} allowDecimals={false} width={40} />
                                <Tooltip
                                    cursor={{ fill: 'rgba(6, 182, 212, 0.05)' }}
                                    contentStyle={{ backgroundColor: 'white', border: '1px solid rgba(6, 182, 212, 0.2)', borderRadius: '12px', boxShadow: '0 4px 15px rgba(0,0,0,0.1)' }}
                                />
                                <Bar dataKey="count" radius={[8, 8, 0, 0]} barSize={period === 'day' ? 30 : 20} minPointSize={8}>
                                    {data.map((entry, index) => {
                                        const isHighlight = entry.displayLabel === 'Today' || entry.displayLabel === 'Yesterday';
                                        return <Cell key={`cell-${index}`} fill={isHighlight ? '#22d3ee' : '#06b6d4'} fillOpacity={isHighlight ? 1 : 0.7} />;
                                    })}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                ) : (
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#6b7280', gap: '1rem', minHeight: '300px' }}>
                        <TrendingUp size={48} opacity={0.2} color="#06b6d4" />
                        <p style={{ fontSize: '0.95rem', fontWeight: '500' }}>
                            {loading ? 'Fetching analytical data...' : 'No activity recorded for this period.'}
                        </p>
                        {!loading && <button
                            onClick={fetchData}
                            style={{ background: 'linear-gradient(135deg, #06b6d4, #22d3ee)', border: 'none', color: 'white', padding: '0.6rem 1.2rem', borderRadius: '8px', cursor: 'pointer', fontSize: '0.85rem', fontWeight: '600', boxShadow: '0 4px 15px rgba(6, 182, 212, 0.3)' }}
                        >
                            Refresh Data
                        </button>}
                    </div>
                )}

                <div style={{ marginTop: '2rem', paddingTop: '1rem', borderTop: '1px solid rgba(6, 182, 212, 0.1)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.75rem', color: '#6b7280' }}>
                        * Real-time field entry tracking active
                    </span>
                    <span style={{ fontSize: '0.75rem', fontWeight: '700', color: '#06b6d4' }}>
                        {period === 'day' ? 'Yesterday & Today Perspective' : `${period.charAt(0).toUpperCase() + period.slice(1)} Analytics`}
                    </span>
                </div>
            </div>
        </div>
    );
};

export default FieldVisitChart;
