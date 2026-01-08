import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import { ChevronLeft, ChevronRight, Plus, Calendar as CalIcon, X } from 'lucide-react';

const CalendarView = () => {
    const { token } = useAuth();
    const [currentDate, setCurrentDate] = useState(new Date());
    const [visits, setVisits] = useState([]);
    const [studyOptions, setStudyOptions] = useState([]);

    // Modals
    const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);

    // Form Data
    const [selectedDate, setSelectedDate] = useState('');
    const [scheduleForm, setScheduleForm] = useState({
        study_master_id: '',
        start_date: '',
        target_volunteers: 0,
        study_type: ''
    });

    const [selectedVisit, setSelectedVisit] = useState(null);

    // Fetch Data
    useEffect(() => {
        fetchVisits();
        fetchStudyOptions();
    }, [currentDate, token]);

    const fetchVisits = async () => {
        try {
            // Fetch for huge range or just filter in frontend for now to keep it simple
            const res = await axios.get('http://localhost:8000/api/v1/studies/calendar', {
                headers: { Authorization: `Bearer ${token}` }
            });
            setVisits(res.data);
        } catch (err) {
            console.error("Failed to fetch visits", err);
        }
    };

    const fetchStudyOptions = async () => {
        try {
            const res = await axios.get('http://localhost:8000/api/v1/studies/names', {
                headers: { Authorization: `Bearer ${token}` }
            });
            setStudyOptions(res.data);
        } catch (err) {
            console.error("Failed to fetch study options", err);
        }
    };

    // Calendar Logic
    const getDaysInMonth = (year, month) => new Date(year, month + 1, 0).getDate();
    const getFirstDayOfMonth = (year, month) => new Date(year, month, 1).getDay();

    const renderCalendar = () => {
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();
        const daysInMonth = getDaysInMonth(year, month);
        const firstDay = getFirstDayOfMonth(year, month); // 0 = Sun

        const days = [];
        // Empty slots for previous month
        for (let i = 0; i < firstDay; i++) {
            days.push(<div key={`empty-${i}`} className="h-32 bg-black/5 border-r border-b border-white/5"></div>);
        }

        // Days
        for (let d = 1; d <= daysInMonth; d++) {
            const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
            const dayVisits = visits.filter(v => v.planned_date === dateStr);
            console.log("Visit Match", dateStr, dayVisits); // Debug

            days.push(
                <div
                    key={d}
                    className="min-h-32 border-r border-b border-white/10 p-2 cursor-pointer hover:bg-white/5 transition relative group"
                    onClick={() => openScheduleModal(dateStr)}
                >
                    <div className="font-semibold text-gray-400 text-sm mb-1">{d}</div>

                    {/* Visits Stack */}
                    <div className="space-y-1">
                        {dayVisits.map(v => (
                            <div
                                key={v._id}
                                onClick={(e) => { e.stopPropagation(); openEditModal(v); }}
                                className={`text-xs p-1.5 rounded border-l-4 shadow-sm cursor-pointer hover:opacity-80 transition
                                    ${v.status === 'completed' ? 'bg-gray-800 border-l-gray-500 text-gray-400 border border-gray-700' :
                                        'bg-indigo-900/50 border-l-indigo-500 text-indigo-200 border border-indigo-500/30'}`}
                            >
                                <div className="font-bold truncate">{v.study_name}</div>
                                <div className="truncate opacity-75">{v.visit_name}</div>
                            </div>
                        ))}
                    </div>

                    {/* Add Button on Hover */}
                    <button
                        className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 p-1 bg-blue-100 rounded-full text-blue-600"
                        title="Schedule Study"
                    >
                        <Plus size={14} />
                    </button>
                </div>
            );
        }
        return days;
    };

    // Handlers
    const openScheduleModal = (dateStr) => {
        setScheduleForm({
            study_master_id: '',
            start_date: dateStr,
            target_volunteers: 0,
            study_type: ''
        });
        setIsScheduleModalOpen(true);
    };

    const handleStudyChange = (e) => {
        const id = e.target.value;
        const study = studyOptions.find(s => s._id === id);
        if (study) {
            setScheduleForm(prev => ({
                ...prev,
                study_master_id: id,
                study_type: study.study_type,
                target_volunteers: study.default_volunteers
            }));
        } else {
            setScheduleForm(prev => ({ ...prev, study_master_id: id }));
        }
    };

    const handleScheduleSubmit = async (e) => {
        e.preventDefault();
        try {
            await axios.post('http://localhost:8000/api/v1/studies/schedule', scheduleForm, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setIsScheduleModalOpen(false);
            fetchVisits(); // Refresh
        } catch (err) {
            alert("Failed to schedule study");
        }
    };

    const openEditModal = (visit) => {
        setSelectedVisit(visit);
        setIsEditModalOpen(true);
    };

    const handleEditSubmit = async (e) => {
        e.preventDefault();
        try {
            await axios.patch(`http://localhost:8000/api/v1/studies/visits/${selectedVisit._id}`,
                { new_date: selectedVisit.planned_date },
                { headers: { Authorization: `Bearer ${token}` } }
            );
            setIsEditModalOpen(false);
            fetchVisits();
        } catch (err) {
            alert("Failed to update visit");
        }
    };

    // Month Nav
    const nextMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
    const prevMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));

    return (
        <div className="p-6 min-h-screen">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-500 to-pink-500" style={{
                        fontSize: '2rem',
                        background: 'linear-gradient(135deg, var(--primary) 0%, var(--secondary) 100%)',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent'
                    }}>Study Calendar</h1>
                    <p style={{ color: 'var(--text-muted)' }}>Plan and manage study visits.</p>
                </div>
                <div className="flex items-center space-x-4 glass-card p-2 rounded-xl border border-white/10">
                    <button onClick={prevMonth} className="p-2 hover:bg-white/10 rounded-lg text-white"><ChevronLeft /></button>
                    <span className="font-semibold text-lg w-32 text-center text-white">
                        {currentDate.toLocaleString('default', { month: 'long', year: 'numeric' })}
                    </span>
                    <button onClick={nextMonth} className="p-2 hover:bg-white/10 rounded-lg text-white"><ChevronRight /></button>
                </div>
            </div>

            {/* Calendar Grid */}
            <div className="glass-card rounded-xl shadow-sm border border-white/10 overflow-hidden text-white" style={{ padding: 0 }}>
                {/* Headers */}
                <div className="grid grid-cols-7 bg-black/20 border-b border-white/10">
                    {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
                        <div key={d} className="py-3 text-center font-medium text-gray-400 uppercase text-xs tracking-wider">{d}</div>
                    ))}
                </div>
                {/* Body */}
                <div className="grid grid-cols-7 bg-black/10">
                    {renderCalendar()}
                </div>
            </div>

            {/* Schedule Modal */}
            {isScheduleModalOpen && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50">
                    <div className="glass-card w-full max-w-md p-6 shadow-2xl animate-in fade-in zoom-in duration-200 border border-white/10">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-lg font-bold text-white">Schedule New Study</h3>
                            <button onClick={() => setIsScheduleModalOpen(false)}><X className="text-gray-400 hover:text-white" /></button>
                        </div>
                        <form onSubmit={handleScheduleSubmit}>
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-400 mb-1">Start Date</label>
                                    <input
                                        type="date"
                                        required
                                        className="form-control"
                                        value={scheduleForm.start_date}
                                        onChange={e => setScheduleForm({ ...scheduleForm, start_date: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-400 mb-1">Study Name</label>
                                    <select
                                        required
                                        className="form-control"
                                        value={scheduleForm.study_master_id}
                                        onChange={handleStudyChange}
                                    >
                                        <option value="">Select a Study...</option>
                                        {studyOptions.map(s => (
                                            <option key={s._id} value={s._id}>{s.name}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-400 mb-1">Type</label>
                                        <input
                                            readOnly
                                            className="form-control"
                                            style={{ opacity: 0.7, cursor: 'not-allowed' }}
                                            value={scheduleForm.study_type}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-400 mb-1">Volunteers</label>
                                        <input
                                            type="number"
                                            required
                                            className="form-control"
                                            value={scheduleForm.target_volunteers}
                                            onChange={e => setScheduleForm({ ...scheduleForm, target_volunteers: e.target.value })}
                                        />
                                        <p className="text-xs text-gray-500 mt-1">Editable</p>
                                    </div>
                                </div>
                            </div>
                            <div className="mt-6 flex justify-end space-x-3">
                                <button type="button" onClick={() => setIsScheduleModalOpen(false)} className="px-4 py-2 text-gray-400 hover:text-white rounded-lg">Cancel</button>
                                <button type="submit" className="btn btn-primary">Schedule Study</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Edit Visit Modal */}
            {isEditModalOpen && selectedVisit && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50">
                    <div className="glass-card w-full max-w-sm p-6 shadow-2xl border border-white/10">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-lg font-bold text-white">Reschedule Visit</h3>
                            <button onClick={() => setIsEditModalOpen(false)}><X className="text-gray-400 hover:text-white" /></button>
                        </div>
                        <div className="mb-4">
                            <div className="text-sm text-gray-400">Study</div>
                            <div className="font-semibold text-white">{selectedVisit.study_name}</div>
                            <div className="text-sm text-gray-400 mt-2">Visit</div>
                            <div className="font-semibold text-white">{selectedVisit.visit_name}</div>
                        </div>
                        <form onSubmit={handleEditSubmit}>
                            <label className="block text-sm font-medium text-gray-400 mb-1">New Date</label>
                            <input
                                type="date"
                                required
                                className="form-control"
                                value={selectedVisit.planned_date}
                                onChange={e => setSelectedVisit({ ...selectedVisit, planned_date: e.target.value })}
                            />
                            <div className="mt-6 flex justify-end space-x-3">
                                <button type="button" onClick={() => setIsEditModalOpen(false)} className="px-4 py-2 text-gray-400 hover:text-white rounded-lg">Cancel</button>
                                <button type="submit" className="btn btn-primary">Update Date</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

        </div>
    );
};

export default CalendarView;
