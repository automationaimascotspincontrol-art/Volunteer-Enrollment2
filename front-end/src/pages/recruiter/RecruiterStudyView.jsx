import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import { Search } from 'lucide-react';

const RecruiterStudyView = () => {
    const [studies, setStudies] = useState([]);
    const [filter, setFilter] = useState('all'); // all, ongoing, upcoming
    const { token } = useAuth();

    useEffect(() => {
        const fetchStudies = async () => {
            try {
                const res = await axios.get('http://localhost:8000/api/v1/studies/history', {
                    headers: { Authorization: `Bearer ${token}` }
                });
                setStudies(res.data);
            } catch (err) {
                console.error(err);
            }
        };
        if (token) fetchStudies();
    }, [token]);

    const filteredStudies = studies.filter(s => {
        if (filter === 'all') return true;
        return s.status === filter;
    });

    return (
        <div className="p-6 bg-gray-50 min-h-screen">
            <div className="mb-6">
                <h1 className="text-2xl font-bold text-gray-800">Assigned Studies</h1>
                <p className="text-gray-500">Overview of ongoing and upcoming clinical studies.</p>
            </div>

            {/* Filters */}
            <div className="flex mb-6 space-x-4">
                <button
                    onClick={() => setFilter('all')}
                    className={`px-4 py-2 rounded-lg text-sm font-medium ${filter === 'all' ? 'bg-blue-600 text-white' : 'bg-white text-gray-700 border'}`}
                >
                    All Studies
                </button>
                <button
                    onClick={() => setFilter('ongoing')}
                    className={`px-4 py-2 rounded-lg text-sm font-medium ${filter === 'ongoing' ? 'bg-blue-600 text-white' : 'bg-white text-gray-700 border'}`}
                >
                    Ongoing
                </button>
                <button
                    onClick={() => setFilter('upcoming')}
                    className={`px-4 py-2 rounded-lg text-sm font-medium ${filter === 'upcoming' ? 'bg-blue-600 text-white' : 'bg-white text-gray-700 border'}`}
                >
                    Upcoming
                </button>
            </div>

            {/* List */}
            <div className="grid gap-4">
                {filteredStudies.map(study => (
                    <div key={study._id} className="bg-white p-5 rounded-lg shadow-sm border border-gray-100 flex justify-between items-center transition hover:shadow-md">
                        <div>
                            <div className="flex items-center space-x-3 mb-1">
                                <h3 className="font-bold text-gray-900">{study.study_name}</h3>
                                <span className={`text-xs px-2 py-0.5 rounded-full uppercase tracking-wide font-semibold
                                    ${study.status === 'ongoing' ? 'bg-green-100 text-green-700' :
                                        study.status === 'upcoming' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'}`}>
                                    {study.status}
                                </span>
                            </div>
                            <p className="text-sm text-gray-500">
                                Start Date: <span className="font-medium text-gray-700">{study.start_date}</span>
                                <span className="mx-2">•</span>
                                Target: <span className="font-medium text-gray-700">{study.target_volunteers} Volunteers</span>
                            </p>
                        </div>
                        <div className="text-right">
                            {/* Action buttons if Recruiters need to do something? Probably just view for now */}
                            <button className="text-blue-600 hover:text-blue-700 text-sm font-medium">
                                View Details
                            </button>
                        </div>
                    </div>
                ))}

                {filteredStudies.length === 0 && (
                    <div className="text-center py-12 bg-white rounded-lg border border-dashed">
                        <p className="text-gray-400">No studies found matching this filter.</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default RecruiterStudyView;
