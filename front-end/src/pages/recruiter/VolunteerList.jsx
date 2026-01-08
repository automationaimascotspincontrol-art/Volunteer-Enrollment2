import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../api/api';
import { Search, ChevronLeft, ChevronRight, Eye, Filter, Users, Activity } from 'lucide-react';
import { Select, Input } from '../../components/ui';
import '../../styles/VolunteerList.css';

const VolunteerList = () => {
    const [volunteers, setVolunteers] = useState([]);
    const [total, setTotal] = useState(0);
    const [loading, setLoading] = useState(true);
    const [filters, setFilters] = useState({ stage: '', status: '', gender: '' });
    const [search, setSearch] = useState('');
    const [page, setPage] = useState(0);
    const limit = 20;

    const fetchVolunteers = async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams({
                skip: page * limit,
                limit: limit,
                ...(filters.stage && { stage: filters.stage }),
                ...(filters.status && { status: filters.status }),
                ...(filters.gender && { gender: filters.gender }),
                ...(search && { search: search })
            });
            const response = await api.get(`/dashboard/volunteers?${params}`);
            setVolunteers(response.data.volunteers);
            setTotal(response.data.total);
        } catch (err) {
            console.error('Failed to fetch volunteers', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        const delayDebounceFn = setTimeout(() => {
            fetchVolunteers();
        }, 500);

        return () => clearTimeout(delayDebounceFn);
    }, [page, filters, search]);

    return (
        <div className="volunteer-list-container animate-fade-in">
            <div className="list-header">
                <div>
                    <h1 className="dashboard-title">
                        All Volunteers
                    </h1>
                    <p style={{ color: 'var(--text-muted)' }}>{total} total records</p>
                </div>
                <Link to="/admin/dashboard" className="btn" style={{ background: 'var(--glass)', border: '1px solid var(--glass-border)' }}>← Back to Dashboard</Link>
            </div>

            <div className="filter-card animate-fade-in-up" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                {/* Search - Full Width */}
                <div className="filter-group" style={{ width: '100%' }}>
                    <label className="filter-label" style={{ fontSize: '0.9rem' }}><Search size={16} /> Search Volunteers</label>
                    <div style={{ position: 'relative' }}>
                        <Input
                            placeholder="Search by ID, Name, or Subject Code..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="w-full"
                            style={{
                                padding: '0.8rem 1rem',
                                paddingLeft: '2.5rem',
                                fontSize: '1rem',
                                borderRadius: '12px',
                                border: '1px solid var(--glass-border)',
                                boxShadow: '0 2px 10px rgba(0,0,0,0.03)'
                            }}
                        />
                        <Search
                            size={18}
                            style={{
                                position: 'absolute',
                                left: '1rem',
                                top: '50%',
                                transform: 'translateY(-50%)',
                                color: 'var(--text-muted)'
                            }}
                        />
                    </div>
                </div>

                {/* Filters - Grid */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.25rem', width: '100%' }}>
                    <div className="filter-group">
                        <label className="filter-label"><Activity size={14} /> Stage</label>
                        <Select
                            value={filters.stage}
                            onChange={(e) => setFilters({ ...filters, stage: e.target.value })}
                            options={[
                                { label: 'All Stages', value: '' },
                                { label: 'Pre-Screening', value: 'pre_screening' },
                                { label: 'Registered', value: 'registered' }
                            ]}
                        />
                    </div>

                    <div className="filter-group">
                        <label className="filter-label"><Filter size={14} /> Status</label>
                        <Select
                            value={filters.status}
                            onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                            options={[
                                { label: 'All Statuses', value: '' },
                                { label: 'Submitted', value: 'submitted' },
                                { label: 'Approved', value: 'approved' },
                                { label: 'Rejected', value: 'rejected' }
                            ]}
                        />
                    </div>

                    <div className="filter-group">
                        <label className="filter-label"><Users size={14} /> Gender</label>
                        <Select
                            value={filters.gender}
                            onChange={(e) => setFilters({ ...filters, gender: e.target.value })}
                            options={[
                                { label: 'All Genders', value: '' },
                                { label: 'Male', value: 'male' },
                                { label: 'Female', value: 'female' },
                                { label: 'Minor', value: 'minor' }
                            ]}
                        />
                    </div>
                </div>
            </div>

            {loading ? (
                <div className="glass-card" style={{ textAlign: 'center', padding: '3rem' }}>Loading...</div>
            ) : (
                <>
                    <div className="table-container">
                        <table className="custom-table">
                            <thead>
                                <tr>
                                    <th>Subject Code / ID</th>
                                    <th>Name</th>
                                    <th>Contact</th>
                                    <th>Gender</th>
                                    <th>Stage</th>
                                    <th>Status</th>
                                    <th>Date</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {volunteers.map((vol, idx) => (
                                    <tr key={idx}>
                                        <td>
                                            <div style={{ fontFamily: 'monospace', fontSize: '0.95rem', fontWeight: '700', color: 'var(--primary)' }}>{vol.subject_code || '-'}</div>
                                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{vol.volunteer_id}</div>
                                            {vol.legacy_id && <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Legacy: {vol.legacy_id}</div>}
                                        </td>
                                        <td style={{ fontWeight: '600', color: '#1e293b' }}>{vol.pre_screening.name}</td>
                                        <td style={{ color: 'var(--text-muted)' }}>{vol.pre_screening.contact || 'N/A'}</td>
                                        <td style={{ textTransform: 'capitalize' }}>
                                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}>
                                                {vol.pre_screening.gender === 'male' ? '👨' : vol.pre_screening.gender === 'female' ? '👩' : '👤'}
                                                {vol.pre_screening.gender}
                                            </span>
                                        </td>
                                        <td>
                                            <span className={`badge ${vol.stage === 'registered' ? 'badge-success' : 'badge-primary'}`}>
                                                {vol.stage === 'pre_screening' ? 'PRE-SCREEN' : 'REGISTERED'}
                                            </span>
                                        </td>
                                        <td>
                                            <span className={`badge ${vol.status === 'approved' ? 'badge-success' :
                                                vol.status === 'rejected' ? 'badge-error' : 'badge-neutral'
                                                }`}>
                                                {vol.status}
                                            </span>
                                        </td>
                                        <td style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                                            {vol.created_at ? new Date(vol.created_at).toLocaleDateString() : 'N/A'}
                                        </td>
                                        <td>
                                            <Link to={`/registration/${vol.volunteer_id}`} state={{ volunteer: vol }} className="action-btn">
                                                <Eye size={16} /> View
                                            </Link>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    <div className="pagination-controls">
                        <button
                            className="btn"
                            style={{ background: 'var(--glass)' }}
                            disabled={page === 0}
                            onClick={() => setPage(page - 1)}
                        >
                            <ChevronLeft size={18} /> Previous
                        </button>
                        <span className="page-info">
                            Page {page + 1} of {Math.ceil(total / limit) || 1}
                        </span>
                        <button
                            className="btn"
                            style={{ background: 'var(--glass)' }}
                            disabled={(page + 1) * limit >= total}
                            onClick={() => setPage(page + 1)}
                        >
                            Next <ChevronRight size={18} />
                        </button>
                    </div>
                </>
            )}
        </div>
    );
};

export default VolunteerList;
