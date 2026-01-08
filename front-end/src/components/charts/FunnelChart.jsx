import React from 'react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Cell, LabelList } from 'recharts';
import { Card } from '../ui';

const FunnelChart = ({ data }) => {
    if (!data || data.length === 0) return null;

    return (
        <Card style={{ padding: '1.5rem', height: '100%', minHeight: '400px', display: 'flex', flexDirection: 'column' }}>
            <h3 style={{ fontSize: '1.3rem', fontWeight: '700', marginBottom: '0.5rem', color: 'var(--text-primary)' }}>
                Lead Conversion Funnel
            </h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
                Conversion journey from initial field visit to study enrollment.
            </p>

            <div style={{ flex: 1, width: '100%', minHeight: '300px' }}>
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                        data={data}
                        layout="vertical"
                        margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                        barSize={40}
                    >
                        <XAxis type="number" hide />
                        <YAxis
                            dataKey="name"
                            type="category"
                            width={100}
                            tick={{ fill: 'var(--text-muted)', fontSize: 12, fontWeight: 600 }}
                            axisLine={false}
                            tickLine={false}
                        />
                        <Tooltip
                            cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                            contentStyle={{
                                backgroundColor: 'var(--bg-card)',
                                border: '1px solid var(--border-color)',
                                borderRadius: '12px',
                                color: 'var(--text-primary)'
                            }}
                        />
                        <Bar dataKey="value" radius={[0, 6, 6, 0]}>
                            {data.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.fill} />
                            ))}
                            <LabelList dataKey="value" position="right" fill="var(--text-primary)" fontWeight={700} />
                        </Bar>
                    </BarChart>
                </ResponsiveContainer>
            </div>

            {/* Conversion Rate Highlight */}
            <div style={{ marginTop: '1rem', padding: '1rem', background: 'rgba(16, 185, 129, 0.1)', borderRadius: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>Overall Conversion</span>
                <span style={{ fontSize: '1.1rem', fontWeight: '800', color: 'var(--success)' }}>
                    {data[0]?.value > 0 ? ((data[data.length - 1]?.value / data[0]?.value) * 100).toFixed(1) : 0}%
                </span>
            </div>
        </Card>
    );
};

export default FunnelChart;
