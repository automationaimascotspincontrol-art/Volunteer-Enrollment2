
{/* Recent Field Activity */ }
<Card>
    <h3 style={{ fontSize: '1.2rem', fontWeight: '700', marginBottom: '1.5rem' }}>Field Agent Activity</h3>
    <div style={{ display: 'grid', gap: '0.8rem', maxHeight: '400px', overflowY: 'auto', paddingRight: '0.5rem' }}>
        {stats?.recent_field_visits?.length > 0 ? stats.recent_field_visits.map((visit, idx) => (
            <div key={idx} style={{ padding: '1rem', background: 'var(--bg-panel)', borderRadius: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ flex: 1 }}>
                    <h4 style={{ fontWeight: '600', marginBottom: '0.3rem' }}>{visit.name}</h4>
                    <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{visit.field_area || 'Unknown'}</p>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <div style={{ textAlign: 'right' }}>
                        <p style={{ fontSize: '0.9rem', fontWeight: '600', color: 'var(--accent)' }}>{visit.contact}</p>
                        <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{new Date(visit.created_at).toLocaleDateString()}</p>
                    </div>
                    <Link
                        to={`/search?contact=${visit.contact}`}
                        style={{
                            padding: '0.4rem 0.8rem',
                            background: 'var(--primary)',
                            color: 'white',
                            borderRadius: '6px',
                            fontSize: '0.8rem',
                            textDecoration: 'none',
                            fontWeight: '600',
                            whiteSpace: 'nowrap'
                        }}
                    >
                        View Details
                    </Link>
                </div>
            </div>
        )) : (
            <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '2rem' }}>Waiting for field hunters...</p>
        )}
    </div>
    <Link to="/search" style={{ display: 'block', marginTop: '1.5rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.9rem', textDecoration: 'none' }}>
        Search and Enroll Field Visits →
    </Link>
</Card>
            </div >
        </div >
    );
};

export default VBoard;
