import React from 'react';
import { useLocation, Link } from 'react-router-dom';
import { CheckCircle, Search, PlusCircle } from 'lucide-react';

const PreScreeningSuccess = () => {
    const location = useLocation();
    const volunteerId = location.state?.volunteerId || 'N/A';

    return (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '80vh' }}>
            <div className="glass-card animate-fade-in" style={{ textAlign: 'center', maxWidth: '500px' }}>
                <div style={{ display: 'inline-flex', padding: '1.5rem', background: 'rgba(16, 185, 129, 0.1)', borderRadius: '50%', marginBottom: '1.5rem' }}>
                    <CheckCircle color="var(--success)" size={48} />
                </div>
                <h2 style={{ fontSize: '2rem', fontWeight: '700', marginBottom: '1rem' }}>Success!</h2>
                <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
                    Volunteer data has been recorded.
                </p>
                <div style={{ background: 'rgba(0,0,0,0.2)', padding: '1rem', borderRadius: '12px', marginBottom: '2rem' }}>
                    <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: '0.3rem' }}>VOLUNTEER ID</p>
                    <h3 style={{ fontSize: '1.5rem', fontWeight: '700', color: 'var(--accent)' }}>{volunteerId}</h3>
                </div>

                <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
                    <Link to={`/registration/${volunteerId}`} className="btn btn-primary" style={{ padding: '0.8rem 1.5rem' }}>
                        <CheckCircle size={18} /> Proceed to Medical Registration
                    </Link>
                    <Link to="/search" className="btn" style={{ background: 'transparent', border: '2px solid var(--primary)', color: 'var(--primary)', padding: '0.8rem 1.5rem' }}>
                        <PlusCircle size={18} /> Add Another Visitor
                    </Link>
                </div>
            </div>
        </div>
    );
};

export default PreScreeningSuccess;
