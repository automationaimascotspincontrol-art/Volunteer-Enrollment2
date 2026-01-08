import React from 'react';
import { useLocation, Link } from 'react-router-dom';
import { ShieldCheck, PlusCircle } from 'lucide-react';

const RegistrationSuccess = () => {
    const location = useLocation();
    const volunteerId = location.state?.volunteerId || 'N/A';
    const status = location.state?.status === 'yes' ? 'Approved' : 'Rejected';

    return (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '80vh' }}>
            <div className="glass-card animate-fade-in" style={{ textAlign: 'center', maxWidth: '500px' }}>
                <div style={{ display: 'inline-flex', padding: '1.5rem', background: location.state?.status === 'yes' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(244, 63, 94, 0.1)', borderRadius: '50%', marginBottom: '1.5rem' }}>
                    <ShieldCheck color={location.state?.status === 'yes' ? 'var(--success)' : 'var(--error)'} size={48} />
                </div>
                <h2 style={{ fontSize: '2rem', fontWeight: '700', marginBottom: '1rem' }}>Registration Complete</h2>
                <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
                    Volunteer status has been finalized.
                </p>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '2rem' }}>
                    <div style={{ background: 'rgba(0,0,0,0.2)', padding: '1rem', borderRadius: '12px' }}>
                        <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>ID</p>
                        <h4 style={{ fontWeight: '600' }}>{volunteerId}</h4>
                    </div>
                    <div style={{ background: 'rgba(0,0,0,0.2)', padding: '1rem', borderRadius: '12px' }}>
                        <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>STATUS</p>
                        <h4 style={{ fontWeight: '600', color: location.state?.status === 'yes' ? 'var(--success)' : 'var(--error)' }}>
                            {status}
                        </h4>
                    </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'center' }}>
                    <Link to="/field-visit" className="btn btn-primary">
                        <PlusCircle size={18} /> Add Another Visitor
                    </Link>
                </div>
            </div>
        </div>
    );
};

export default RegistrationSuccess;
