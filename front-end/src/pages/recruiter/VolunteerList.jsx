import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../api/api';
import { Search, ChevronLeft, ChevronRight, Filter, Users, Activity, Save, User, Phone, Calendar, MapPin, ChevronDown, ChevronUp } from 'lucide-react';
import { Select, Input } from '../../components/ui';
import '../../styles/VolunteerList.css';

// Expandable Volunteer Details Row
const VolunteerExpandableRow = ({ volunteer, onUpdate, onClose }) => {
    const [editing, setEditing] = useState(false);
    const [formData, setFormData] = useState({
        name: volunteer?.pre_screening?.name || '',
        contact: volunteer?.pre_screening?.contact || '',
        location: volunteer?.pre_screening?.location || '',
        age: volunteer?.pre_screening?.age || '',
        address: volunteer?.pre_screening?.address || ''
    });
    const [saving, setSaving] = useState(false);

    const handleSave = async () => {
        try {
            setSaving(true);
            await api.patch(`/dashboard/volunteers/${volunteer.volunteer_id}`, {
                pre_screening: {
                    ...volunteer.pre_screening,
                    ...formData
                }
            });
            alert('Volunteer details updated successfully!');
            onUpdate();
            setEditing(false);
        } catch (err) {
            console.error('Failed to update volunteer:', err);
            alert('Failed to update volunteer details');
        } finally {
            setSaving(false);
        }
    };

    return (
        <tr style={{ background: '#f9fafb' }}>
            <td colSpan="8" style={{ padding: 0 }}>
                <div style={{
                    padding: '2rem',
                    background: 'linear-gradient(to bottom, #ffffff, #f9fafb)',
                    borderTop: '3px solid #667eea',
                    animation: 'slideDown 0.3s ease-out'
                }}>
                    {/* Header with Status Cards */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                        <h3 style={{ fontSize: '1.25rem', fontWeight: '700', color: '#111827', margin: 0 }}>
                            Volunteer Details - {volunteer.subject_code || volunteer.volunteer_id}
                        </h3>
                        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                            {/* Status Badges */}
                            <div style={{
                                background: volunteer.stage === 'registered' ? '#dcfce7' : '#dbeafe',
                                padding: '0.5rem 1rem',
                                borderRadius: '8px',
                                fontSize: '0.75rem',
                                fontWeight: '700',
                                color: volunteer.stage === 'registered' ? '#166534' : '#1e40af',
                                textTransform: 'uppercase'
                            }}>
                                {volunteer.stage === 'pre_screening' ? 'PRE-SCREEN' : 'REGISTERED'}
                            </div>
                            <div style={{
                                background: volunteer.status === 'approved' ? '#dcfce7' : volunteer.status === 'rejected' ? '#fee2e2' : '#f3f4f6',
                                padding: '0.5rem 1rem',
                                borderRadius: '8px',
                                fontSize: '0.75rem',
                                fontWeight: '700',
                                color: volunteer.status === 'approved' ? '#166534' : volunteer.status === 'rejected' ? '#991b1b' : '#374151',
                                textTransform: 'uppercase'
                            }}>
                                {volunteer.status}
                            </div>
                            <button
                                onClick={onClose}
                                style={{
                                    background: '#f3f4f6',
                                    border: 'none',
                                    borderRadius: '8px',
                                    padding: '0.5rem',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.5rem',
                                    fontSize: '0.85rem',
                                    fontWeight: '600',
                                    color: '#374151'
                                }}
                            >
                                <ChevronUp size={16} /> Close
                            </button>
                        </div>
                    </div>

                    {/* Edit Toggle */}
                    <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '1rem' }}>
                        {!editing ? (
                            <button
                                onClick={() => setEditing(true)}
                                style={{
                                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                                    color: 'white',
                                    border: 'none',
                                    padding: '0.6rem 1.25rem',
                                    borderRadius: '8px',
                                    fontWeight: '700',
                                    cursor: 'pointer',
                                    fontSize: '0.85rem'
                                }}
                            >
                                Edit Details
                            </button>
                        ) : (
                            <div style={{ display: 'flex', gap: '0.75rem' }}>
                                <button
                                    onClick={() => setEditing(false)}
                                    style={{
                                        background: '#f3f4f6',
                                        color: '#374151',
                                        border: 'none',
                                        padding: '0.6rem 1.25rem',
                                        borderRadius: '8px',
                                        fontWeight: '700',
                                        cursor: 'pointer',
                                        fontSize: '0.85rem'
                                    }}
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleSave}
                                    disabled={saving}
                                    style={{
                                        background: saving ? '#9ca3af' : 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                                        color: 'white',
                                        border: 'none',
                                        padding: '0.6rem 1.25rem',
                                        borderRadius: '8px',
                                        fontWeight: '700',
                                        cursor: saving ? 'not-allowed' : 'pointer',
                                        fontSize: '0.85rem',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '0.5rem'
                                    }}
                                >
                                    <Save size={16} />
                                    {saving ? 'Saving...' : 'Save Changes'}
                                </button>
                            </div>
                        )}
                    </div>

                    {/* Details Grid - Horizontal Layout */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1.25rem' }}>
                        {/* Name */}
                        <div>
                            <label style={{ fontSize: '0.75rem', fontWeight: '600', color: '#6b7280', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <User size={14} /> Full Name
                            </label>
                            {editing ? (
                                <input
                                    type="text"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    style={{
                                        width: '100%',
                                        padding: '0.65rem',
                                        borderRadius: '8px',
                                        border: '2px solid #e5e7eb',
                                        fontSize: '0.9rem',
                                        fontWeight: '600'
                                    }}
                                />
                            ) : (
                                <div style={{ padding: '0.65rem', background: 'white', borderRadius: '8px', fontSize: '0.9rem', fontWeight: '600', color: '#111827', border: '1px solid #e5e7eb' }}>
                                    {volunteer.pre_screening.name}
                                </div>
                            )}
                        </div>

                        {/* Contact */}
                        <div>
                            <label style={{ fontSize: '0.75rem', fontWeight: '600', color: '#6b7280', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <Phone size={14} /> Contact Number
                            </label>
                            {editing ? (
                                <input
                                    type="tel"
                                    value={formData.contact}
                                    onChange={(e) => setFormData({ ...formData, contact: e.target.value })}
                                    style={{
                                        width: '100%',
                                        padding: '0.65rem',
                                        borderRadius: '8px',
                                        border: '2px solid #e5e7eb',
                                        fontSize: '0.9rem',
                                        fontWeight: '600'
                                    }}
                                />
                            ) : (
                                <div style={{ padding: '0.65rem', background: 'white', borderRadius: '8px', fontSize: '0.9rem', fontWeight: '600', color: '#111827', border: '1px solid #e5e7eb' }}>
                                    {volunteer.pre_screening.contact || 'N/A'}
                                </div>
                            )}
                        </div>

                        {/* Location */}
                        <div>
                            <label style={{ fontSize: '0.75rem', fontWeight: '600', color: '#6b7280', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <MapPin size={14} /> Location
                            </label>
                            {editing ? (
                                <input
                                    type="text"
                                    value={formData.location}
                                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                                    style={{
                                        width: '100%',
                                        padding: '0.65rem',
                                        borderRadius: '8px',
                                        border: '2px solid #e5e7eb',
                                        fontSize: '0.9rem',
                                        fontWeight: '600'
                                    }}
                                />
                            ) : (
                                <div style={{ padding: '0.65rem', background: 'white', borderRadius: '8px', fontSize: '0.9rem', fontWeight: '600', color: '#111827', border: '1px solid #e5e7eb' }}>
                                    {volunteer.pre_screening.location || 'N/A'}
                                </div>
                            )}
                        </div>

                        {/* Age */}
                        <div>
                            <label style={{ fontSize: '0.75rem', fontWeight: '600', color: '#6b7280', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <Calendar size={14} /> Age
                            </label>
                            {editing ? (
                                <input
                                    type="number"
                                    value={formData.age}
                                    onChange={(e) => setFormData({ ...formData, age: e.target.value })}
                                    style={{
                                        width: '100%',
                                        padding: '0.65rem',
                                        borderRadius: '8px',
                                        border: '2px solid #e5e7eb',
                                        fontSize: '0.9rem',
                                        fontWeight: '600'
                                    }}
                                />
                            ) : (
                                <div style={{ padding: '0.65rem', background: 'white', borderRadius: '8px', fontSize: '0.9rem', fontWeight: '600', color: '#111827', border: '1px solid #e5e7eb' }}>
                                    {volunteer.pre_screening.age || 'N/A'}
                                </div>
                            )}
                        </div>

                        {/* Address - Full Width */}
                        <div style={{ gridColumn: '1 / -1' }}>
                            <label style={{ fontSize: '0.75rem', fontWeight: '600', color: '#6b7280', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <MapPin size={14} /> Address
                            </label>
                            {editing ? (
                                <textarea
                                    value={formData.address}
                                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                                    rows={2}
                                    style={{
                                        width: '100%',
                                        padding: '0.65rem',
                                        borderRadius: '8px',
                                        border: '2px solid #e5e7eb',
                                        fontSize: '0.9rem',
                                        fontWeight: '600',
                                        fontFamily: 'inherit',
                                        resize: 'vertical'
                                    }}
                                />
                            ) : (
                                <div style={{ padding: '0.65rem', background: 'white', borderRadius: '8px', fontSize: '0.9rem', fontWeight: '600', color: '#111827', border: '1px solid #e5e7eb' }}>
                                    {volunteer.pre_screening.address || 'N/A'}
                                </div>
                            )}
                        </div>

                        {/* IDs */}
                        <div>
                            <label style={{ fontSize: '0.75rem', fontWeight: '600', color: '#6b7280', marginBottom: '0.5rem', display: 'block' }}>
                                Volunteer ID
                            </label>
                            <div style={{ padding: '0.65rem', background: 'white', borderRadius: '8px', fontSize: '0.85rem', fontWeight: '600', color: '#667eea', fontFamily: 'monospace', border: '1px solid #e5e7eb' }}>
                                {volunteer.volunteer_id}
                            </div>
                        </div>
                        <div>
                            <label style={{ fontSize: '0.75rem', fontWeight: '600', color: '#6b7280', marginBottom: '0.5rem', display: 'block' }}>
                                Created Date
                            </label>
                            <div style={{ padding: '0.65rem', background: 'white', borderRadius: '8px', fontSize: '0.85rem', fontWeight: '600', color: '#111827', border: '1px solid #e5e7eb' }}>
                                {volunteer.created_at ? new Date(volunteer.created_at).toLocaleDateString() : 'N/A'}
                            </div>
                        </div>
                    </div>
                </div>

                <style>{`
                    @keyframes slideDown {
                        from {
                            opacity: 0;
                            max-height: 0;
                        }
                        to {
                            opacity: 1;
                            max-height: 1000px;
                        }
                    }
                `}</style>
            </td>
        </tr>
    );
};

const VolunteerList = () => {
    const [volunteers, setVolunteers] = useState([]);
    const [total, setTotal] = useState(0);
    const [loading, setLoading] = useState(true);
    const [filters, setFilters] = useState({ stage: '', status: '', gender: '' });
    const [search, setSearch] = useState('');
    const [page, setPage] = useState(0);
    const [expandedVolunteerId, setExpandedVolunteerId] = useState(null);
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

    const toggleExpand = (volunteerId) => {
        setExpandedVolunteerId(expandedVolunteerId === volunteerId ? null : volunteerId);
    };

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
                                    <React.Fragment key={idx}>
                                        <tr style={{
                                            background: expandedVolunteerId === vol.volunteer_id ? '#f0f4ff' : 'white',
                                            borderLeft: expandedVolunteerId === vol.volunteer_id ? '3px solid #667eea' : 'none'
                                        }}>
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
                                                <button
                                                    onClick={() => toggleExpand(vol.volunteer_id)}
                                                    className="action-btn"
                                                    style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}
                                                >
                                                    {expandedVolunteerId === vol.volunteer_id ? (
                                                        <><ChevronUp size={16} /> Close</>
                                                    ) : (
                                                        <><ChevronDown size={16} /> View</>
                                                    )}
                                                </button>
                                            </td>
                                        </tr>
                                        {expandedVolunteerId === vol.volunteer_id && (
                                            <VolunteerExpandableRow
                                                volunteer={vol}
                                                onUpdate={() => {
                                                    fetchVolunteers();
                                                    setExpandedVolunteerId(null);
                                                }}
                                                onClose={() => setExpandedVolunteerId(null)}
                                            />
                                        )}
                                    </React.Fragment>
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