import React, { useEffect, useState } from 'react';
import api from '../../api/api';
import { Search, Filter, ChevronDown, ChevronUp, Save, X, Phone, MapPin, Calendar, BadgeInfo, CreditCard, User, Edit2, AlertCircle } from 'lucide-react';
import '../../styles/VolunteerList.css'; // Reusing existing styles for consistency

const FullVolunteerSearch = () => {
    const [volunteers, setVolunteers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [total, setTotal] = useState(0);

    // Search & Filter State
    const [search, setSearch] = useState('');
    const [filters, setFilters] = useState({ stage: '', status: '', gender: '' });
    const [page, setPage] = useState(0);
    const limit = 20;

    // Editing State
    const [expandedIds, setExpandedIds] = useState([]);
    const [editingId, setEditingId] = useState(null);
    const [formData, setFormData] = useState({});
    const [saving, setSaving] = useState(false);

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
            // Using the correct Admin endpoint
            const response = await api.get(`/admin/dashboard/volunteers?${params}`);
            setVolunteers(response.data.volunteers);
            setTotal(response.data.total);
        } catch (err) {
            console.error('Failed to fetch volunteers', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        const timeout = setTimeout(fetchVolunteers, 500); // Debounce search
        return () => clearTimeout(timeout);
    }, [search, filters, page]);

    const toggleExpand = (id) => {
        setExpandedIds(prev =>
            prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
        );
    };

    const startEditing = (vol) => {
        setEditingId(vol.volunteer_id);
        setFormData({
            name: vol.basic_info?.name || vol.pre_screening?.name || vol.name || '',
            contact: vol.basic_info?.contact || vol.pre_screening?.contact || vol.phone || vol.mobile || '',
            location: vol.basic_info?.location || vol.pre_screening?.location || vol.city || '',
            age: vol.basic_info?.age || vol.pre_screening?.age || vol.age || '',
            address: vol.basic_info?.address || vol.pre_screening?.address || vol.address || '',
            gender: vol.basic_info?.gender || vol.pre_screening?.gender || vol.gender || '',
            id_proof_type: vol.id_proof_type || '',
            id_proof_number: vol.id_proof_number || ''
        });
    };

    const handleSave = async (volunteerId) => {
        setSaving(true);
        try {
            await api.patch(`/admin/dashboard/volunteers/${volunteerId}`, {
                // We send data to both structures to ensure backward compatibility and updates
                pre_screening: {
                    name: formData.name,
                    contact: formData.contact,
                    location: formData.location,
                    age: formData.age,
                    address: formData.address,
                    gender: formData.gender
                },
                // ID Proofs are stored at root or basic_info depending on backend logic, 
                // but our API expects them in a specific 'id_proof' object for processing
                id_proof: {
                    type: formData.id_proof_type,
                    number: formData.id_proof_number
                }
            });

            alert('Volunteer updated successfully!');
            setEditingId(null);
            fetchVolunteers(); // Refresh data
        } catch (err) {
            console.error(err);
            alert(err.response?.data?.detail || 'Failed to update volunteer');
        } finally {
            setSaving(false);
        }
    };

    // Helper to get field value with fallbacks
    const getField = (vol, field) => {
        if (field === 'location') {
            return vol.basic_info?.location || vol.pre_screening?.location || vol.location || vol.city;
        }
        if (field === 'contact') {
            return vol.basic_info?.contact || vol.pre_screening?.contact || vol.contact || vol.phone || vol.mobile;
        }
        if (field === 'age') {
            return vol.basic_info?.age || vol.pre_screening?.age || vol.age;
        }
        if (field === 'address') {
            return vol.basic_info?.address || vol.pre_screening?.address || vol.address;
        }
        // distinct name check
        if (field === 'name') {
            return vol.basic_info?.name || vol.pre_screening?.name || vol.name;
        }
        // generic fallback
        return vol.basic_info?.[field] || vol.pre_screening?.[field] || vol[field];
    };

    const renderCell = (vol, field) => {
        const val = getField(vol, field);
        return val || <span style={{ color: '#9ca3af', fontStyle: 'italic' }}>N/A</span>;
    };

    return (
        <div className="animate-fade-in" style={{ padding: '2rem', maxWidth: '1600px', margin: '0 auto', paddingBottom: '3rem' }}>
            <style>
                {`
                .glass-card {
                    background: rgba(255, 255, 255, 0.95);
                    backdrop-filter: blur(10px);
                    border: 1px solid rgba(255, 255, 255, 0.2);
                    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03);
                }
                .search-input:focus {
                    box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.2);
                    border-color: #6366f1;
                }
                .hover-row:hover {
                    background-color: rgba(99, 102, 241, 0.03) !important;
                }
                .btn-primary {
                    background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
                    color: white;
                    border: none;
                    box-shadow: 0 4px 10px rgba(99, 102, 241, 0.3);
                    transition: all 0.2s;
                }
                .btn-primary:hover {
                    transform: translateY(-2px);
                    box-shadow: 0 6px 15px rgba(99, 102, 241, 0.4);
                }
                `}
            </style>

            {/* Header */}
            <div style={{ marginBottom: '2.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'end', flexWrap: 'wrap', gap: '1rem' }}>
                <div>
                    <h1 style={{
                        fontSize: '2.5rem',
                        fontWeight: '900',
                        marginBottom: '0.5rem',
                        background: 'linear-gradient(135deg, #111827 0%, #4b5563 100%)',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                        letterSpacing: '-1px'
                    }}>
                        Reference Database
                    </h1>
                    <p style={{ color: '#6b7280', fontSize: '1.1rem' }}>
                        Manage complete volunteer records with precision.
                    </p>
                </div>
                <div style={{ padding: '0.8rem 1.5rem', background: '#e0e7ff', color: '#4338ca', borderRadius: '12px', fontWeight: '700', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#4338ca' }}></div>
                    {total} Records Found
                </div>
            </div>

            {/* Controls */}
            <div className="glass-card" style={{ padding: '1.5rem', borderRadius: '16px', marginBottom: '2rem', display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center', border: '1px solid rgba(229, 231, 235, 0.5)' }}>
                <div style={{ flex: 1, minWidth: '350px', position: 'relative' }}>
                    <Search size={22} style={{ position: 'absolute', left: '1.2rem', top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }} />
                    <input
                        type="text"
                        className="search-input"
                        placeholder="Search by Name, ID, Phone, or Aadhaar..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        style={{
                            width: '100%',
                            padding: '1rem 1rem 1rem 3.5rem',
                            borderRadius: '12px',
                            border: '1px solid #e5e7eb',
                            fontSize: '1rem',
                            outline: 'none',
                            transition: 'all 0.2s',
                            background: '#f9fafb'
                        }}
                    />
                </div>

                <select
                    value={filters.gender}
                    onChange={(e) => setFilters({ ...filters, gender: e.target.value })}
                    style={{
                        padding: '1rem 2rem 1rem 1rem',
                        borderRadius: '12px',
                        border: '1px solid #e5e7eb',
                        minWidth: '180px',
                        background: '#f9fafb',
                        fontSize: '0.95rem',
                        fontWeight: '500',
                        cursor: 'pointer',
                        outline: 'none'
                    }}
                >
                    <option value="">All Genders</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                </select>
            </div>

            {/* Table */}
            <div className="glass-card" style={{ borderRadius: '16px', overflow: 'hidden', border: '1px solid rgba(229, 231, 235, 0.5)' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                        <tr>
                            <th style={{ padding: '1.2rem 1.5rem', textAlign: 'left', fontSize: '0.8rem', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Identity</th>
                            <th style={{ padding: '1.2rem 1.5rem', textAlign: 'left', fontSize: '0.8rem', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Contact Info</th>
                            <th style={{ padding: '1.2rem 1.5rem', textAlign: 'left', fontSize: '0.8rem', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Location</th>
                            <th style={{ padding: '1.2rem 1.5rem', textAlign: 'left', fontSize: '0.8rem', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Full Address</th>
                            <th style={{ padding: '1.2rem 1.5rem', textAlign: 'left', fontSize: '0.8rem', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Demographics</th>
                            <th style={{ padding: '1.2rem 1.5rem', textAlign: 'right', fontSize: '0.8rem', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr><td colSpan="6" style={{ padding: '4rem', textAlign: 'center' }}>
                                <div style={{ width: '40px', height: '40px', border: '3px solid #e5e7eb', borderTop: '3px solid #6366f1', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 1rem' }}></div>
                                <div style={{ color: '#6b7280', fontWeight: '500' }}>Loading database records...</div>
                            </td></tr>
                        ) : volunteers.length === 0 ? (
                            <tr><td colSpan="6" style={{ padding: '4rem', textAlign: 'center', color: '#6b7280' }}>
                                <div style={{ background: '#f3f4f6', width: '80px', height: '80px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem' }}>
                                    <Search size={32} color="#9ca3af" />
                                </div>
                                <h3 style={{ fontSize: '1.1rem', fontWeight: '600', color: '#374151', marginBottom: '0.5rem' }}>No volunteers found</h3>
                                <p>Try adjusting your search terms or filters</p>
                            </td></tr>
                        ) : volunteers.map((vol) => (
                            <React.Fragment key={vol.volunteer_id}>
                                <tr className="hover-row" style={{ borderBottom: '1px solid #f1f5f9', transition: 'background-color 0.2s' }}>
                                    <td style={{ padding: '1.2rem 1.5rem' }}>
                                        <div style={{ fontWeight: '700', color: '#111827', fontSize: '1rem', marginBottom: '0.3rem' }}>
                                            {renderCell(vol, 'name')}
                                        </div>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                                            {vol.subject_code && (
                                                <div style={{ fontSize: '0.8rem', color: '#059669', background: 'rgba(5, 150, 105, 0.1)', padding: '0.2rem 0.5rem', borderRadius: '6px', width: 'fit-content', fontFamily: 'monospace', fontWeight: '700' }}>
                                                    📋 {vol.subject_code}
                                                </div>
                                            )}
                                            {vol.legacy_id && (
                                                <div style={{ fontSize: '0.75rem', color: '#d97706', background: 'rgba(217, 119, 6, 0.1)', padding: '0.2rem 0.5rem', borderRadius: '6px', width: 'fit-content', fontFamily: 'monospace', fontWeight: '600' }}>
                                                    🏷️ Legacy: {vol.legacy_id}
                                                </div>
                                            )}
                                            <div style={{ fontSize: '0.7rem', color: '#6366f1', background: 'rgba(99, 102, 241, 0.1)', padding: '0.2rem 0.5rem', borderRadius: '6px', width: 'fit-content', fontFamily: 'monospace', fontWeight: '600' }}>
                                                🆔 {vol.volunteer_id}
                                            </div>
                                        </div>
                                    </td>
                                    <td style={{ padding: '1.2rem 1.5rem' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#374151', fontWeight: '500' }}>
                                            <Phone size={14} color="#9ca3af" />
                                            {renderCell(vol, 'contact')}
                                        </div>
                                    </td>
                                    <td style={{ padding: '1.2rem 1.5rem' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#374151' }}>
                                            <MapPin size={14} color="#9ca3af" />
                                            {renderCell(vol, 'location')}
                                        </div>
                                    </td>
                                    <td style={{ padding: '1.2rem 1.5rem', maxWidth: '250px' }}>
                                        <div style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', color: '#4b5563', fontSize: '0.9rem' }} title={getField(vol, 'address') || ''}>
                                            {renderCell(vol, 'address')}
                                        </div>
                                    </td>
                                    <td style={{ padding: '1.2rem 1.5rem' }}>
                                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                                            <span style={{ background: '#f3f4f6', padding: '0.3rem 0.6rem', borderRadius: '6px', fontSize: '0.85rem', fontWeight: '600', color: '#4b5563' }}>
                                                {renderCell(vol, 'age')} Yrs
                                            </span>
                                            <span style={{ background: getField(vol, 'gender') === 'Female' ? '#fce7f3' : '#e0f2fe', color: getField(vol, 'gender') === 'Female' ? '#db2777' : '#0284c7', padding: '0.3rem 0.6rem', borderRadius: '6px', fontSize: '0.85rem', fontWeight: '600', textTransform: 'capitalize' }}>
                                                {renderCell(vol, 'gender')}
                                            </span>
                                        </div>
                                    </td>
                                    <td style={{ padding: '1.2rem 1.5rem', textAlign: 'right' }}>
                                        <button
                                            onClick={() => toggleExpand(vol.volunteer_id)}
                                            style={{
                                                padding: '0.6rem',
                                                borderRadius: '50%',
                                                border: '1px solid #e5e7eb',
                                                background: expandedIds.includes(vol.volunteer_id) ? '#f3f4f6' : 'white',
                                                cursor: 'pointer',
                                                color: '#4b5563',
                                                transition: 'all 0.2s'
                                            }}
                                        >
                                            {expandedIds.includes(vol.volunteer_id) ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                                        </button>
                                    </td>
                                </tr>

                                {expandedIds.includes(vol.volunteer_id) && (
                                    <tr style={{ background: '#f8fafc' }}>
                                        <td colSpan="6" style={{ padding: '0 1.5rem 1.5rem 1.5rem' }}>
                                            <div style={{
                                                background: 'white',
                                                borderRadius: '0 0 16px 16px',
                                                padding: '2rem',
                                                border: '1px solid #e2e8f0',
                                                borderTop: 'none',
                                                boxShadow: 'inset 0 4px 6px -4px rgba(0,0,0,0.05)'
                                            }}>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2rem', alignItems: 'center' }}>
                                                    <div>
                                                        <h3 style={{ fontSize: '1.3rem', fontWeight: '800', color: '#1e293b', marginBottom: '0.2rem' }}>Detailed Profile</h3>
                                                        <p style={{ color: '#64748b', fontSize: '0.9rem' }}>View and manage sensitive volunteer information.</p>
                                                    </div>
                                                    {!editingId && (
                                                        <button
                                                            onClick={() => startEditing(vol)}
                                                            className="btn-primary"
                                                            style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', padding: '0.8rem 1.5rem', borderRadius: '10px', fontWeight: '600', cursor: 'pointer', fontSize: '0.95rem' }}
                                                        >
                                                            <Edit2 size={16} /> Edit Profile
                                                        </button>
                                                    )}
                                                </div>

                                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '2rem' }}>
                                                    {/* Name */}
                                                    <div>
                                                        <label style={{ fontSize: '0.75rem', fontWeight: '700', color: '#64748b', marginBottom: '0.6rem', display: 'block', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Full Name</label>
                                                        {editingId === vol.volunteer_id ? (
                                                            <input
                                                                value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })}
                                                                className="search-input"
                                                                style={{ width: '100%', padding: '0.8rem', borderRadius: '8px', border: '1px solid #cbd5e1' }}
                                                            />
                                                        ) : (
                                                            <div style={{ fontWeight: '600', fontSize: '1.1rem', color: '#0f172a' }}>{renderCell(vol, 'name')}</div>
                                                        )}
                                                    </div>

                                                    {/* Contact */}
                                                    <div>
                                                        <label style={{ fontSize: '0.75rem', fontWeight: '700', color: '#64748b', marginBottom: '0.6rem', display: 'block', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Contact Number</label>
                                                        {editingId === vol.volunteer_id ? (
                                                            <input
                                                                value={formData.contact} onChange={e => setFormData({ ...formData, contact: e.target.value })}
                                                                className="search-input"
                                                                style={{ width: '100%', padding: '0.8rem', borderRadius: '8px', border: '1px solid #cbd5e1' }}
                                                            />
                                                        ) : (
                                                            <div style={{ fontWeight: '600', fontSize: '1.1rem', color: '#0f172a' }}>{renderCell(vol, 'contact')}</div>
                                                        )}
                                                    </div>

                                                    {/* Age */}
                                                    <div>
                                                        <label style={{ fontSize: '0.75rem', fontWeight: '700', color: '#64748b', marginBottom: '0.6rem', display: 'block', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Age</label>
                                                        {editingId === vol.volunteer_id ? (
                                                            <input
                                                                value={formData.age} onChange={e => setFormData({ ...formData, age: e.target.value })}
                                                                className="search-input"
                                                                style={{ width: '100%', padding: '0.8rem', borderRadius: '8px', border: '1px solid #cbd5e1' }}
                                                            />
                                                        ) : (
                                                            <div style={{ fontWeight: '600', fontSize: '1.1rem', color: '#0f172a' }}>{renderCell(vol, 'age')} Years</div>
                                                        )}
                                                    </div>

                                                    {/* Location */}
                                                    <div>
                                                        <label style={{ fontSize: '0.75rem', fontWeight: '700', color: '#64748b', marginBottom: '0.6rem', display: 'block', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Location</label>
                                                        {editingId === vol.volunteer_id ? (
                                                            <div style={{ position: 'relative' }}>
                                                                <MapPin size={16} style={{ position: 'absolute', left: '10px', top: '12px', color: '#64748b' }} />
                                                                <input
                                                                    value={formData.location}
                                                                    onChange={e => setFormData({ ...formData, location: e.target.value })}
                                                                    className="search-input"
                                                                    style={{ width: '100%', padding: '0.8rem 0.8rem 0.8rem 2.5rem', borderRadius: '8px', border: '1px solid #cbd5e1' }}
                                                                />
                                                            </div>
                                                        ) : (
                                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: '600', fontSize: '1.1rem', color: '#0f172a' }}>
                                                                <MapPin size={18} color="#6366f1" />
                                                                {renderCell(vol, 'location')}
                                                            </div>
                                                        )}
                                                    </div>

                                                    {/* Gender */}
                                                    <div>
                                                        <label style={{ fontSize: '0.75rem', fontWeight: '700', color: '#64748b', marginBottom: '0.6rem', display: 'block', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Gender</label>
                                                        {editingId === vol.volunteer_id ? (
                                                            <select
                                                                value={formData.gender} onChange={e => setFormData({ ...formData, gender: e.target.value })}
                                                                className="search-input"
                                                                style={{ width: '100%', padding: '0.8rem', borderRadius: '8px', border: '1px solid #cbd5e1' }}
                                                            >
                                                                <option value="">Select</option>
                                                                <option value="Male">Male</option>
                                                                <option value="Female">Female</option>
                                                            </select>
                                                        ) : (
                                                            <div style={{ fontWeight: '600', fontSize: '1.1rem', color: '#0f172a', textTransform: 'capitalize' }}>{renderCell(vol, 'gender')}</div>
                                                        )}
                                                    </div>

                                                    {/* ID Proof Type */}
                                                    <div>
                                                        <label style={{ fontSize: '0.75rem', fontWeight: '700', color: '#64748b', marginBottom: '0.6rem', display: 'block', textTransform: 'uppercase', letterSpacing: '0.5px' }}>ID Proof Type</label>
                                                        {editingId === vol.volunteer_id ? (
                                                            <div style={{ position: 'relative' }}>
                                                                <BadgeInfo size={16} style={{ position: 'absolute', left: '10px', top: '12px', color: '#64748b' }} />
                                                                <select
                                                                    value={formData.id_proof_type}
                                                                    onChange={e => setFormData({ ...formData, id_proof_type: e.target.value })}
                                                                    className="search-input"
                                                                    style={{ width: '100%', padding: '0.8rem 0.8rem 0.8rem 2.5rem', borderRadius: '8px', border: '1px solid #cbd5e1' }}
                                                                >
                                                                    <option value="">Select Type</option>
                                                                    <option value="Aadhaar Card">Aadhaar Card</option>
                                                                    <option value="PAN Card">PAN Card</option>
                                                                    <option value="Voter ID">Voter ID</option>
                                                                    <option value="Driving License">Driving License</option>
                                                                </select>
                                                            </div>
                                                        ) : (
                                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: '600', fontSize: '1rem', color: '#0f172a' }}>
                                                                <BadgeInfo size={18} color="#6366f1" />
                                                                {vol.id_proof_type || 'N/A'}
                                                            </div>
                                                        )}
                                                    </div>

                                                    {/* ID Proof Number */}
                                                    <div>
                                                        <label style={{ fontSize: '0.75rem', fontWeight: '700', color: '#64748b', marginBottom: '0.6rem', display: 'block', textTransform: 'uppercase', letterSpacing: '0.5px' }}>ID Number</label>
                                                        {editingId === vol.volunteer_id ? (
                                                            <div style={{ position: 'relative' }}>
                                                                <CreditCard size={16} style={{ position: 'absolute', left: '10px', top: '12px', color: '#64748b' }} />
                                                                <input
                                                                    value={formData.id_proof_number}
                                                                    onChange={e => setFormData({ ...formData, id_proof_number: e.target.value.toUpperCase() })}
                                                                    placeholder="XXXX-XXXX-XXXX"
                                                                    className="search-input"
                                                                    style={{ width: '100%', padding: '0.8rem 0.8rem 0.8rem 2.5rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontFamily: 'monospace', fontWeight: '600' }}
                                                                />
                                                            </div>
                                                        ) : (
                                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: '600', fontSize: '1rem', color: '#0f172a', fontFamily: 'monospace' }}>
                                                                <CreditCard size={18} color="#6366f1" />
                                                                {vol.id_proof_number || 'N/A'}
                                                            </div>
                                                        )}
                                                    </div>

                                                    {/* Address */}
                                                    <div style={{ gridColumn: '1 / -1' }}>
                                                        <label style={{ fontSize: '0.75rem', fontWeight: '700', color: '#64748b', marginBottom: '0.6rem', display: 'block', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Full Residential Address</label>
                                                        {editingId === vol.volunteer_id ? (
                                                            <textarea
                                                                value={formData.address} onChange={e => setFormData({ ...formData, address: e.target.value })}
                                                                rows={3}
                                                                className="search-input"
                                                                style={{ width: '100%', padding: '0.8rem', borderRadius: '8px', border: '1px solid #cbd5e1', resize: 'none' }}
                                                            />
                                                        ) : (
                                                            <div style={{ fontWeight: '500', color: '#334155', lineHeight: '1.6', background: '#f8fafc', padding: '1rem', borderRadius: '8px', border: '1px dashed #cbd5e1' }}>
                                                                {renderCell(vol, 'address')}
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>

                                                {editingId === vol.volunteer_id && (
                                                    <div style={{ marginTop: '2rem', paddingTop: '1.5rem', borderTop: '1px solid #e2e8f0', display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
                                                        <button
                                                            onClick={() => setEditingId(null)}
                                                            style={{ padding: '0.8rem 1.5rem', background: 'white', border: '1px solid #d1d5db', borderRadius: '10px', cursor: 'pointer', fontWeight: '600', color: '#4b5563' }}
                                                        >
                                                            Cancel
                                                        </button>
                                                        <button
                                                            onClick={() => handleSave(vol.volunteer_id)}
                                                            disabled={saving}
                                                            className="btn-primary"
                                                            style={{ padding: '0.8rem 2rem', borderRadius: '10px', fontWeight: '600', cursor: 'pointer' }}
                                                        >
                                                            {saving ? 'Saving Changes...' : 'Save Updates'}
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                )}
                            </React.Fragment>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default FullVolunteerSearch;
