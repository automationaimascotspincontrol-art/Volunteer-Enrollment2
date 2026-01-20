import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { Users, CheckCircle, Clock, Activity, RefreshCw, XCircle, ScanBarcode, ListCheck, Filter, CheckSquare, Square, Search, Calendar, CalendarClock, FileSpreadsheet } from 'lucide-react';
import { useAuth } from '../../../context/AuthContext';
import * as XLSX from 'xlsx';

// Imported Components
import StatCard from './components/StatCard';
import VolunteerStats from './components/VolunteerStats';
import ScreeningCandidatesTable from './components/ScreeningCandidatesTable';
import BulkActionsBar from './components/BulkActionsBar';


const VolunteerTracker = () => {
    const { token } = useAuth();
    const navigate = useNavigate();

    // Stats & Data
    const [stats, setStats] = useState({
        screening: 0,
        prescreening: 0,
        approved: 0,
        checkedInToday: 0
    });
    const [studyAttendance, setStudyAttendance] = useState([]);
    const [preRegVolunteers, setPreRegVolunteers] = useState([]);
    const [approvedVolunteers, setApprovedVolunteers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [lastUpdated, setLastUpdated] = useState(new Date());

    // New Features State
    const [studies, setStudies] = useState([]);
    const [selectedStudy, setSelectedStudy] = useState(''); // '' means All Approved
    const [rapidEntryId, setRapidEntryId] = useState('');
    const [selectedVolunteers, setSelectedVolunteers] = useState([]); // List of IDs

    // Search states
    const [preRegSearch, setPreRegSearch] = useState('');
    const [approvedSearch, setApprovedSearch] = useState('');
    const [studySearches, setStudySearches] = useState({}); // {studyCode: searchText}
    const [visibleCounts, setVisibleCounts] = useState({}); // {studyCode: count}

    useEffect(() => {
        fetchStudies();
        fetchData();
        fetchStudyAttendance();
        const interval = setInterval(() => {
            fetchData();
            fetchStudyAttendance();
        }, 30000);
        return () => clearInterval(interval);
    }, []);

    // Fetch data whenever study selection changes (to filter at source)
    useEffect(() => {
        fetchData();
    }, [selectedStudy]);

    const fetchStudies = async () => {
        try {
            // Fetch active study instances to populate dropdown
            const res = await axios.get('http://localhost:8000/api/v1/prm/studies/study-instances', {
                headers: { Authorization: `Bearer ${token}` }
            });
            setStudies(res.data);
        } catch (err) {
            console.error("Failed to fetch studies", err);
        }
    }

    const fetchData = async () => {
        try {
            const headers = { Authorization: `Bearer ${token}` };

            // Build Approved URL with optional study param
            let approvedUrl = 'http://localhost:8000/api/v1/volunteers/approved';
            if (selectedStudy) {
                approvedUrl += `?study_id=${selectedStudy}`;
            }

            // Fetch in parallel
            const [statsRes, preRegRes, approvedRes] = await Promise.all([
                axios.get('http://localhost:8000/api/v1/volunteers/stats', { headers }),
                axios.get('http://localhost:8000/api/v1/volunteers/pre-registration', { headers }),
                axios.get(approvedUrl, { headers })
            ]);

            setStats(statsRes.data);
            setPreRegVolunteers(preRegRes.data);
            setApprovedVolunteers(approvedRes.data);
            setLastUpdated(new Date());

            // Clear selection if re-fetching
            // setSelectedVolunteers([]); 
        } catch (err) {
            console.error('Failed to fetch volunteer data', err);
        } finally {
            setLoading(false);
        }
    };

    const fetchStudyAttendance = async () => {
        try {
            const headers = { Authorization: `Bearer ${token}` };
            const response = await axios.get('http://localhost:8000/api/v1/volunteers/study-attendance', { headers });
            setStudyAttendance(response.data.studies || []);
        } catch (err) {
            console.error('Failed to fetch study attendance', err);
            setStudyAttendance([]);
        }
    };

    const toggleAttendance = async (volunteerId, currentStatus, studyCode = null) => {
        try {
            const action = currentStatus === 'IN' ? 'OUT' : 'IN';
            const payload = { volunteer_id: volunteerId, action };
            if (studyCode) {
                payload.study_code = studyCode;
            }

            await axios.post('http://localhost:8000/api/v1/volunteers/attendance/toggle',
                payload,
                { headers: { Authorization: `Bearer ${token}` } }
            );
            // Refresh both approved volunteers and study attendance
            fetchData();
            fetchStudyAttendance();
        } catch (err) {
            console.error('Failed to toggle attendance', err);
            alert('Failed to update attendance');
        }
    };

    // Bulk Toggle
    const handleBulkAttendance = async (action) => {
        if (selectedVolunteers.length === 0) return;

        try {
            await axios.post('http://localhost:8000/api/v1/volunteers/attendance/bulk-toggle',
                { volunteer_ids: selectedVolunteers, action },
                { headers: { Authorization: `Bearer ${token}` } }
            );

            // Refresh and clear selection
            fetchData();
            setSelectedVolunteers([]);
            alert(`Successfully marked ${selectedVolunteers.length} volunteers as ${action}`);
        } catch (err) {
            console.error("Bulk toggle failed", err);
            alert("Failed to update bulk attendance");
        }
    }

    // Rapid Entry
    const handleRapidEntry = async (e) => {
        if (e.key === 'Enter' && rapidEntryId) {
            try {
                // Try to toggle IN for this ID
                const res = await axios.post('http://localhost:8000/api/v1/volunteers/attendance/toggle',
                    { volunteer_id: rapidEntryId, action: 'IN' },
                    { headers: { Authorization: `Bearer ${token}` } }
                );

                // Show success feedback (optional toast) or just clear
                setRapidEntryId('');
                fetchData();

                // Audio feedback could go here
            } catch (err) {
                alert(`Failed to check in ${rapidEntryId}. Check if valid ID.`);
            }
        }
    }

    // Selection Handling
    const handleSelectAll = (e) => {
        if (e.target.checked) {
            const allIds = filteredApproved.map(v => v.volunteer_id);
            setSelectedVolunteers(allIds);
        } else {
            setSelectedVolunteers([]);
        }
    }

    const handleSelectRow = (id) => {
        if (selectedVolunteers.includes(id)) {
            setSelectedVolunteers(selectedVolunteers.filter(v => v !== id));
        } else {
            setSelectedVolunteers([...selectedVolunteers, id]);
        }
    }

    const updateMedicalStatus = async (volunteerId, status) => {
        try {
            await axios.patch(`http://localhost:8000/api/v1/volunteers/${volunteerId}/medical-status`,
                { status },
                { headers: { Authorization: `Bearer ${token}` } }
            );
            fetchData();
        } catch (err) {
            console.error('Failed to update medical status', err);
        }
    };

    const approveVolunteer = async (volunteerId) => {
        try {
            await axios.patch(`http://localhost:8000/api/v1/volunteers/${volunteerId}/approval`,
                { status: 'approved' },
                { headers: { Authorization: `Bearer ${token}` } }
            );
            fetchData();
        } catch (err) {
            console.error('Failed to approve volunteer', err);
        }
    };

    const deleteVolunteer = async (volunteerId, volunteerName) => {
        if (!window.confirm(`Are you sure you want to delete "${volunteerName}"?`)) return;
        try {
            await axios.delete(
                `http://localhost:8000/api/v1/admin/dashboard/volunteers/${volunteerId}`,
                { headers: { Authorization: `Bearer ${token}` } }
            );
            fetchData();
        } catch (err) {
            alert('Failed to delete volunteer');
        }
    };

    // Helper function to filter volunteers in a study by search
    const getFilteredVolunteers = (volunteers, studyCode) => {
        const searchTerm = studySearches[studyCode] || '';
        if (!searchTerm) return volunteers;

        return volunteers.filter(vol =>
            vol.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            vol.volunteer_id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            vol.contact?.includes(searchTerm)
        );
    };

    // Helper to get visible volunteer count for a study
    const getVisibleCount = (studyCode, totalCount) => {
        const defaultShow = 10; // Show 10 volunteers initially
        return visibleCounts[studyCode] || Math.min(defaultShow, totalCount);
    };

    // Filter volunteers based on search
    const filteredPreReg = preRegVolunteers.filter(v =>
        !preRegSearch ||
        v.name?.toLowerCase().includes(preRegSearch.toLowerCase()) ||
        v.contact?.includes(preRegSearch) ||
        v.volunteer_id?.toLowerCase().includes(preRegSearch.toLowerCase())
    );

    const filteredApproved = approvedVolunteers.filter(v =>
        !approvedSearch ||
        v.name?.toLowerCase().includes(approvedSearch.toLowerCase()) ||
        v.contact?.includes(approvedSearch) ||
        v.volunteer_id?.toLowerCase().includes(approvedSearch.toLowerCase())
    );

    // Export approved volunteers to Excel
    const handleExportApprovedVolunteers = () => {
        if (filteredApproved.length === 0) {
            alert("No data to export");
            return;
        }

        const dataToExport = filteredApproved.map(vol => ({
            "Volunteer ID": vol.volunteer_id,
            "Legacy ID": vol.legacy_id || 'N/A',
            "Name": vol.name,
            "Contact": vol.contact,
            "Age": vol.age || 'N/A',
            "Gender": vol.gender || 'N/A',
            "Status": vol.attendance_status || 'OUT',
            "Active Study": vol.attendance_status === 'IN' ? (vol.study_code || 'General') : 'N/A',
            "Scheduled Study": vol.scheduled_study || 'N/A',
            "Scheduled Visit": vol.scheduled_visit || 'N/A',
            "Time In": vol.check_in_time ? new Date(vol.check_in_time).toLocaleString() : '-',
            "Time Out": vol.check_out_time ? new Date(vol.check_out_time).toLocaleString() : '-',
            "Last Approval Date": vol.approval_date ? new Date(vol.approval_date).toLocaleDateString() : '-'
        }));

        const ws = XLSX.utils.json_to_sheet(dataToExport);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Attendance");

        const dateStr = new Date().toISOString().split('T')[0];
        const studyPrefix = selectedStudy ? `${selectedStudy}_` : 'All_Approved_';
        XLSX.writeFile(wb, `PRM_${studyPrefix}Attendance_${dateStr}.xlsx`);
    };

    // Export study-wise attendance to Excel
    const handleExportStudyAttendance = () => {
        if (studyAttendance.length === 0) {
            alert("No study attendance data to export");
            return;
        }

        const wb = XLSX.utils.book_new();

        studyAttendance.forEach(study => {
            if (study.volunteers && study.volunteers.length > 0) {
                const dataToExport = study.volunteers.map(vol => ({
                    "Volunteer ID": vol.volunteer_id,
                    "Name": vol.name,
                    "Study Code": study.studyCode,
                    "Status": "IN",
                    "Time In": vol.check_in_time ? new Date(vol.check_in_time).toLocaleString() : '-',
                    "Time Out": '-'
                }));

                const ws = XLSX.utils.json_to_sheet(dataToExport);
                const sheetName = (study.studyCode || 'Study').substring(0, 31);
                XLSX.utils.book_append_sheet(wb, ws, sheetName);
            }
        });

        if (wb.SheetNames.length === 0) {
            alert("No active volunteers in studies to export");
            return;
        }

        const dateStr = new Date().toISOString().split('T')[0];
        XLSX.writeFile(wb, `PRM_Study_Attendance_${dateStr}.xlsx`);
    };

    if (loading) {
        return (
            <div style={{ padding: '3rem', textAlign: 'center' }}>
                <style>{`
                    @keyframes spin {
                        to { transform: rotate(360deg); }
                    }
                    @keyframes pulse {
                        0%, 100% { opacity: 1; transform: scale(1); }
                        50% { opacity: 0.8; transform: scale(1.05); }
                    }
                `}</style>
                <Activity size={48} style={{ animation: 'spin 1s linear infinite', color: '#10b981' }} />
                <p style={{ marginTop: '1rem', color: 'var(--text-muted)', fontWeight: '600' }}>Loading volunteer data...</p>
            </div>
        );
    }

    const getListTitle = () => {
        if (selectedStudy === 'SCHEDULED_TODAY') return "Today's Schedule";
        if (selectedStudy === 'ACTIVE_STUDIES') return "Active Studies Roster";
        if (selectedStudy) return 'Study Roster';
        return 'Approved Volunteers';
    }

    return (
        <div className="animate-fade-in" style={{ paddingBottom: '5rem' }}>
            {/* CSS Animations */}
            <style>{`
                @keyframes pulse {
                    0%, 100% { opacity: 1; transform: scale(1); }
                    50% { opacity: 0.7; transform: scale(1.05); }
                }
                @keyframes fadeIn {
                    from { opacity: 0; transform: translateY(10px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                @keyframes glow {
                    0%, 100% { box-shadow: 0 0 5px rgba(16, 185, 129, 0.3); }
                    50% { box-shadow: 0 0 20px rgba(16, 185, 129, 0.6); }
                }
                .animate-fade-in {
                    animation: fadeIn 0.4s ease-out;
                }
            `}</style>
            {/* Header & Rapid Entry */}
            <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '2rem',
                flexWrap: 'wrap',
                gap: '1.5rem'
            }}>
                <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '0.5rem' }}>
                        <h1 style={{
                            fontSize: 'clamp(2rem, 6vw, 3.5rem)',
                            fontWeight: '950',
                            margin: 0,
                            background: 'linear-gradient(135deg, #10b981 0%, #14b8a6 100%)',
                            WebkitBackgroundClip: 'text',
                            WebkitTextFillColor: 'transparent',
                            letterSpacing: '-1.5px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.8rem'
                        }}>
                            <Activity size={40} color="#10b981" style={{ animation: 'pulse 2s ease-in-out infinite' }} />
                            Live Tracker
                        </h1>
                        {/* Last Updated Badge */}
                        <div style={{
                            padding: '0.5rem 1rem',
                            borderRadius: '12px',
                            background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.1) 0%, rgba(20, 184, 166, 0.1) 100%)',
                            border: '1px solid rgba(16, 185, 129, 0.3)',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem'
                        }}>
                            <div style={{
                                width: '8px',
                                height: '8px',
                                borderRadius: '50%',
                                background: '#10b981',
                                boxShadow: '0 0 10px rgba(16, 185, 129, 0.5)',
                                animation: 'pulse 2s ease-in-out infinite'
                            }} />
                            <span style={{ fontSize: '0.75rem', color: '#10b981', fontWeight: '700' }}>
                                Updated {Math.floor((new Date() - lastUpdated) / 1000)}s ago
                            </span>
                        </div>
                    </div>
                    <p style={{ color: 'var(--text-muted)', fontSize: '1.05rem', margin: '0 0 1rem 0', fontWeight: '500' }}>Real-time attendance monitoring</p>

                    {/* Study Filter Dropdown - Enhanced */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.7rem' }}>
                        <div style={{
                            padding: '0.6rem',
                            background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.1) 0%, rgba(139, 92, 246, 0.1) 100%)',
                            borderRadius: '10px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                        }}>
                            <Filter size={18} color="#6366f1" />
                        </div>
                        <select
                            value={selectedStudy}
                            onChange={(e) => setSelectedStudy(e.target.value)}
                            style={{
                                padding: '0.7rem 1rem',
                                borderRadius: '12px',
                                border: '2px solid rgba(99, 102, 241, 0.2)',
                                background: 'white',
                                fontSize: '0.95rem',
                                fontWeight: '700',
                                color: 'var(--text-primary)',
                                maxWidth: '350px',
                                cursor: 'pointer',
                                boxShadow: '0 2px 8px rgba(99, 102, 241, 0.1)',
                                transition: 'all 0.2s'
                            }}
                        >
                            <option value="">📋 All Approved Volunteers</option>
                            <option value="SCHEDULED_TODAY">📅 Today's Scheduled Visits</option>
                            <option value="ACTIVE_STUDIES">⚡ All Ongoing/Active Studies</option>
                            <option disabled>──────────</option>
                            {studies.map(s => (
                                <option key={s._id} value={s._id}>
                                    🔬 {s.studyCode} - {s.studyName}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flex: 1, justifyContent: 'flex-end' }}>
                    {/* Rapid Entry Bar */}
                    <div style={{
                        flex: 1,
                        maxWidth: '400px',
                        position: 'relative',
                        display: 'flex',
                        alignItems: 'center'
                    }}>
                        <ScanBarcode size={20} style={{ position: 'absolute', left: '12px', color: '#6366f1' }} />
                        <input
                            type="text"
                            placeholder="Rapid Scan / Enter ID (Press Enter)"
                            value={rapidEntryId}
                            onChange={(e) => setRapidEntryId(e.target.value)}
                            onKeyDown={handleRapidEntry}
                            style={{
                                width: '100%',
                                padding: '0.85rem 1rem 0.85rem 2.8rem',
                                borderRadius: '12px',
                                border: '2px solid #6366f1',
                                background: 'white',
                                fontSize: '1rem',
                                fontWeight: '600',
                                outline: 'none',
                                boxShadow: '0 4px 12px rgba(99, 102, 241, 0.15)'
                            }}
                        />
                    </div>

                    <button
                        onClick={fetchData}
                        style={{
                            padding: '0.75rem',
                            background: 'var(--bg-panel)',
                            color: 'var(--text-muted)',
                            border: '1px solid var(--border-color)',
                            borderRadius: '12px',
                            cursor: 'pointer',
                            transition: 'all 0.2s'
                        }}
                    >
                        <RefreshCw size={20} />
                    </button>
                </div>
            </div>

            {/* Stats Cards Row - Three-Stage Enrollment */}
            <VolunteerStats stats={stats} />

            {/* Pre-Screening & Screening Table */}
            <ScreeningCandidatesTable
                volunteers={filteredPreReg}
                search={preRegSearch}
                onSearchChange={(e) => setPreRegSearch(e.target.value)}
                onToggleAttendance={toggleAttendance}
            />

            {/* Approved Volunteers Table */}
            <div className="glass-card" style={{
                border: selectedVolunteers.length > 0 ? '2px solid #6366f1' : '1px solid var(--border-color)',
                transition: 'all 0.3s'
            }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <h3 style={{ fontSize: '1.3rem', fontWeight: '700', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <ListCheck size={22} color="var(--success)" />
                            {getListTitle()} ({filteredApproved.length})
                        </h3>
                        {selectedVolunteers.length > 0 && (
                            <span style={{
                                background: '#6366f1',
                                color: 'white',
                                padding: '0.2rem 0.6rem',
                                borderRadius: '20px',
                                fontSize: '0.8rem',
                                fontWeight: '700'
                            }}>
                                {selectedVolunteers.length} Selected
                            </span>
                        )}
                    </div>

                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button
                            onClick={handleExportApprovedVolunteers}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.5rem',
                                padding: '0.6rem 1rem',
                                background: '#22c55e',
                                color: 'white',
                                border: 'none',
                                borderRadius: '8px',
                                fontSize: '0.9rem',
                                fontWeight: '600',
                                cursor: 'pointer',
                                boxShadow: '0 2px 4px rgba(34, 197, 94, 0.2)'
                            }}
                        >
                            <FileSpreadsheet size={18} />
                            Export Excel
                        </button>
                        <input
                            type="search"
                            placeholder="Search list..."
                            value={approvedSearch}
                            onChange={(e) => setApprovedSearch(e.target.value)}
                            style={{
                                padding: '0.6rem 1rem',
                                borderRadius: '10px',
                                border: '1px solid var(--border-color)',
                                backgroundColor: 'var(--bg-main)',
                                fontSize: '0.9rem',
                                minWidth: '250px'
                            }}
                        />
                    </div>
                </div>

                <div style={{ maxHeight: '600px', overflowY: 'auto', overflowX: 'auto' }}>
                    <table className="custom-table">
                        <thead>
                            <tr>
                                <th style={{ width: '40px' }}>
                                    <input
                                        type="checkbox"
                                        onChange={handleSelectAll}
                                        checked={filteredApproved.length > 0 && selectedVolunteers.length === filteredApproved.length}
                                        style={{ width: '18px', height: '18px', cursor: 'pointer', accentColor: '#6366f1' }}
                                    />
                                </th>
                                <th>Name</th>
                                <th>Contact</th>
                                <th>Status</th>
                                <th>Time In</th>
                                <th>Time Out</th>
                                <th style={{ textAlign: 'right' }}>Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredApproved.map((vol, idx) => {
                                const isSelected = selectedVolunteers.includes(vol.volunteer_id);
                                return (
                                    <tr
                                        key={vol.volunteer_id}
                                        className="animate-slide-up"
                                        style={{ background: isSelected ? 'rgba(99, 102, 241, 0.05)' : 'transparent' }}
                                    >
                                        <td>
                                            <input
                                                type="checkbox"
                                                checked={isSelected}
                                                onChange={() => handleSelectRow(vol.volunteer_id)}
                                                style={{ width: '18px', height: '18px', cursor: 'pointer', accentColor: '#6366f1' }}
                                            />
                                        </td>
                                        <td style={{ fontWeight: '600' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                {vol.name}
                                                {vol.scheduled_visit && (
                                                    <span style={{
                                                        background: '#e0f2fe',
                                                        color: '#0284c7',
                                                        padding: '0.1rem 0.5rem',
                                                        borderRadius: '12px',
                                                        fontSize: '0.7rem',
                                                        border: '1px solid #bae6fd',
                                                        display: 'flex', alignItems: 'center', gap: '0.3rem'
                                                    }}>
                                                        <CalendarClock size={12} />
                                                        {vol.scheduled_study ? `${vol.scheduled_study}: ` : ''}{vol.scheduled_visit}
                                                    </span>
                                                )}
                                                {selectedStudy === 'ACTIVE_STUDIES' && !vol.scheduled_visit && vol.scheduled_study && (
                                                    <span style={{
                                                        background: '#f0fdf4',
                                                        color: '#15803d',
                                                        padding: '0.1rem 0.5rem',
                                                        borderRadius: '12px',
                                                        fontSize: '0.7rem',
                                                        border: '1px solid #bbf7d0',
                                                        display: 'flex', alignItems: 'center', gap: '0.3rem'
                                                    }}>
                                                        <Activity size={12} />
                                                        {vol.scheduled_study} (Active)
                                                    </span>
                                                )}
                                            </div>
                                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: '400' }}>{vol.volunteer_id}</div>
                                        </td>
                                        <td className="text-muted">{vol.contact}</td>
                                        <td>
                                            {vol.attendance_status === 'IN' ? (
                                                <span style={{ fontSize: '0.75rem', padding: '0.3rem 0.6rem', background: '#10b98120', color: '#10b981', borderRadius: '6px', fontWeight: '700' }}>
                                                    🟢 IN
                                                </span>
                                            ) : (
                                                <span style={{ fontSize: '0.75rem', padding: '0.3rem 0.6rem', background: '#f1f5f9', color: '#64748b', borderRadius: '6px', fontWeight: '600' }}>
                                                    ⚪ OUT
                                                </span>
                                            )}
                                        </td>
                                        <td className="text-muted" style={{ fontSize: '0.85rem' }}>
                                            {vol.check_in_time ? new Date(vol.check_in_time).toLocaleString() : '-'}
                                        </td>
                                        <td className="text-muted" style={{ fontSize: '0.85rem' }}>
                                            {vol.check_out_time ? new Date(vol.check_out_time).toLocaleString() : '-'}
                                        </td>
                                        <td style={{ textAlign: 'right' }}>
                                            <button
                                                onClick={() => {
                                                    // Determine appropriate study code
                                                    let studyCode = null;

                                                    if (vol.attendance_status === 'IN') {
                                                        // CRITICAL: When marking out, use the EXACT code they checked in with.
                                                        studyCode = vol.study_code;
                                                    } else {
                                                        // When marking IN, prioritize selection or schedule
                                                        if (selectedStudy && !['SCHEDULED_TODAY', 'ACTIVE_STUDIES'].includes(selectedStudy)) {
                                                            studyCode = selectedStudy;
                                                        }
                                                        else {
                                                            studyCode = vol.scheduled_study || vol.assigned_study || vol.study_code;
                                                        }
                                                    }

                                                    toggleAttendance(vol.volunteer_id, vol.attendance_status, studyCode);
                                                }}
                                                style={{
                                                    padding: '0.4rem 0.8rem',
                                                    borderRadius: '8px',
                                                    border: 'none',
                                                    background: vol.attendance_status === 'IN' ? '#fef2f2' : '#ecfdf5',
                                                    color: vol.attendance_status === 'IN' ? '#dc2626' : '#059669',
                                                    fontSize: '0.75rem',
                                                    fontWeight: '600',
                                                    cursor: 'pointer',
                                                    transition: 'all 0.2s'
                                                }}
                                            >
                                                {vol.attendance_status === 'IN' ? 'Mark Out' : 'Mark In'}
                                            </button>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Study-Wise Attendance Section */}
            {studyAttendance.length > 0 && (
                <div className="glass-card" style={{ marginTop: '2rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                        <div>
                            <h3 style={{ fontSize: '1.3rem', fontWeight: '700', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <Calendar size={22} color="var(--primary)" />
                                Ongoing Studies - Attendance Tracking ({studyAttendance.length})
                            </h3>
                            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: '0.5rem' }}>
                                Volunteers assigned to active studies
                            </p>
                        </div>
                        <button
                            onClick={handleExportStudyAttendance}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.5rem',
                                padding: '0.6rem 1rem',
                                background: '#22c55e',
                                color: 'white',
                                border: 'none',
                                borderRadius: '8px',
                                fontSize: '0.9rem',
                                fontWeight: '600',
                                cursor: 'pointer',
                                boxShadow: '0 2px 4px rgba(34, 197, 94, 0.2)'
                            }}
                        >
                            <FileSpreadsheet size={18} />
                            Export All Studies
                        </button>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(400px, 1fr))', gap: '1.5rem' }}>
                        {studyAttendance.map((study, idx) => (
                            <div key={idx} style={{
                                padding: '1.5rem',
                                background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.05) 0%, rgba(139, 92, 246, 0.05) 100%)',
                                borderRadius: '16px',
                                border: '1px solid rgba(99, 102, 241, 0.2)',
                                transition: 'all 0.3s'
                            }}>
                                {/* Study Header */}
                                <div style={{ marginBottom: '1rem', paddingBottom: '1rem', borderBottom: '1px solid rgba(99, 102, 241, 0.15)' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                                        <span style={{
                                            padding: '0.3rem 0.7rem',
                                            background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
                                            color: 'white',
                                            borderRadius: '8px',
                                            fontSize: '0.85rem',
                                            fontWeight: '700',
                                            fontFamily: 'monospace'
                                        }}>
                                            {study.study_code}
                                        </span>
                                        <span style={{
                                            padding: '0.2rem 0.6rem',
                                            background: 'rgba(16, 185, 129, 0.1)',
                                            color: '#10b981',
                                            borderRadius: '6px',
                                            fontSize: '0.75rem',
                                            fontWeight: '600'
                                        }}>
                                            {study.study_type}
                                        </span>
                                    </div>
                                    <h4 style={{ fontSize: '1.1rem', fontWeight: '700', margin: 0, color: 'var(--text-primary)' }}>
                                        {study.study_name}
                                    </h4>
                                    <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', margin: '0.3rem 0 0 0' }}>
                                        {study.volunteers.length} volunteer{study.volunteers.length !== 1 ? 's' : ''} assigned
                                    </p>
                                </div>

                                {/* Search Bar for this Study */}
                                {study.volunteers.length > 5 && (
                                    <div style={{ marginBottom: '1rem' }}>
                                        <input
                                            type="search"
                                            placeholder="Search volunteers..."
                                            value={studySearches[study.study_code] || ''}
                                            onChange={(e) => setStudySearches({ ...studySearches, [study.study_code]: e.target.value })}
                                            style={{
                                                width: '100%',
                                                padding: '0.6rem 1rem',
                                                borderRadius: '10px',
                                                border: '1px solid rgba(99, 102, 241, 0.2)',
                                                backgroundColor: 'rgba(255, 255, 255, 0.7)',
                                                fontSize: '0.9rem',
                                                outline: 'none'
                                            }}
                                        />
                                    </div>
                                )}

                                {/* Volunteers List */}
                                {(() => {
                                    const filteredVols = getFilteredVolunteers(study.volunteers, study.study_code);
                                    const visibleCount = getVisibleCount(study.study_code, filteredVols.length);
                                    const visibleVols = filteredVols.slice(0, visibleCount);

                                    return (
                                        <>
                                            <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
                                                {visibleVols.map((vol, vIdx) => (
                                                    <div key={vIdx} style={{
                                                        padding: '0.75rem',
                                                        background: 'rgba(255, 255, 255, 0.5)',
                                                        borderRadius: '10px',
                                                        marginBottom: '0.5rem',
                                                        display: 'flex',
                                                        justifyContent: 'space-between',
                                                        alignItems: 'center',
                                                        border: '1px solid rgba(99, 102, 241, 0.1)'
                                                    }}>
                                                        <div style={{ flex: 1 }}>
                                                            <div style={{ fontWeight: '600', fontSize: '0.95rem', marginBottom: '0.2rem' }}>
                                                                {vol.name}
                                                            </div>
                                                            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontFamily: 'monospace' }}>
                                                                {vol.volunteer_id}
                                                            </div>
                                                            {vol.check_in_time && (
                                                                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                                                                    <Clock size={12} style={{ display: 'inline', marginRight: '0.25rem' }} />
                                                                    {new Date(vol.check_in_time).toLocaleString()}
                                                                </div>
                                                            )}
                                                        </div>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                            {vol.attendance_status === 'present' ? (
                                                                <span style={{
                                                                    fontSize: '0.75rem',
                                                                    padding: '0.3rem 0.6rem',
                                                                    background: '#10b98120',
                                                                    color: '#10b981',
                                                                    borderRadius: '6px',
                                                                    fontWeight: '700'
                                                                }}>
                                                                    🟢 Present
                                                                </span>
                                                            ) : (
                                                                <span style={{
                                                                    fontSize: '0.75rem',
                                                                    padding: '0.3rem 0.6rem',
                                                                    background: '#f1f5f9',
                                                                    color: '#64748b',
                                                                    borderRadius: '6px',
                                                                    fontWeight: '600'
                                                                }}>
                                                                    ⚪ Absent
                                                                </span>
                                                            )}
                                                            <button
                                                                onClick={() => toggleAttendance(vol.volunteer_id, vol.attendance_status === 'present' ? 'IN' : 'OUT', study.study_code)}
                                                                style={{
                                                                    padding: '0.3rem 0.6rem',
                                                                    borderRadius: '6px',
                                                                    border: '1px solid var(--border-color)',
                                                                    fontWeight: '600',
                                                                    fontSize: '0.75rem',
                                                                    cursor: 'pointer',
                                                                    background: 'white',
                                                                    color: vol.attendance_status === 'present' ? '#ef4444' : '#10b981',
                                                                    borderColor: vol.attendance_status === 'present' ? '#ef4444' : '#10b981'
                                                                }}
                                                            >
                                                                {vol.attendance_status === 'present' ? 'Mark Out' : 'Mark In'}
                                                            </button>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>

                                            {/* Show More Button */}
                                            {filteredVols.length > visibleCount && (
                                                <button
                                                    onClick={() => setVisibleCounts({ ...visibleCounts, [study.study_code]: visibleCount + 20 })}
                                                    style={{
                                                        width: '100%',
                                                        padding: '0.6rem',
                                                        marginTop: '0.5rem',
                                                        background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
                                                        color: 'white',
                                                        border: 'none',
                                                        borderRadius: '8px',
                                                        fontWeight: '600',
                                                        cursor: 'pointer',
                                                        fontSize: '0.85rem'
                                                    }}
                                                >
                                                    Show More ({filteredVols.length - visibleCount} remaining)
                                                </button>
                                            )}

                                            {/* Show Less Button */}
                                            {visibleCount > 10 && filteredVols.length > 10 && (
                                                <button
                                                    onClick={() => setVisibleCounts({ ...visibleCounts, [study.study_code]: 10 })}
                                                    style={{
                                                        width: '100%',
                                                        padding: '0.6rem',
                                                        marginTop: '0.5rem',
                                                        background: 'white',
                                                        color: '#6366f1',
                                                        border: '1px solid #6366f1',
                                                        borderRadius: '8px',
                                                        fontWeight: '600',
                                                        cursor: 'pointer',
                                                        fontSize: '0.85rem'
                                                    }}
                                                >
                                                    Show Less
                                                </button>
                                            )}
                                        </>
                                    );
                                })()}
                            </div>
                        ))}
                    </div>
                </div>
            )}


            {/* Bulk Actions Floating Bar */}
            <BulkActionsBar
                selectedCount={selectedVolunteers.length}
                onCheckInAll={() => handleBulkAttendance('IN')}
                onCheckOutAll={() => handleBulkAttendance('OUT')}
                onClear={() => setSelectedVolunteers([])}
            />

            <style>{`
                @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
            `}</style>
        </div>
    );
};

export default VolunteerTracker;
