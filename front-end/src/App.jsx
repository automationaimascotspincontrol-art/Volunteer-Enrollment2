import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import ProtectedRoute from './routes/ProtectedRoute';

// Layouts
import DesktopLayout from './layouts/DesktopLayout';
import MobileLayout from './layouts/MobileLayout';

// Pages
import Login from './pages/auth/Login';
import PreScreeningForm from './pages/recruiter/PreScreeningForm';
import PreScreeningSuccess from './pages/recruiter/PreScreeningSuccess';
import VolunteerSearch from './pages/recruiter/VolunteerSearch';
import RegistrationForm from './pages/recruiter/RegistrationForm';
import RegistrationSuccess from './pages/recruiter/RegistrationSuccess';
import VBoard from './pages/recruiter/VBoard';
import ManagementDashboard from './pages/recruiter/ManagementDashboard';
import VolunteerList from './pages/recruiter/VolunteerList';
import FieldForm from './pages/field/FieldForm';
import UserManagement from './pages/admin/UserManagement';
import FullVolunteerSearch from './pages/admin/FullVolunteerSearch';
import PRMDashboard from './pages/prm/PRMDashboard';
import PRMCalendar from './pages/prm/PRMCalendar';
import VolunteerTracker from './pages/prm/VolunteerTracker/index';
import RecruiterStudyView from './pages/recruiter/RecruiterStudyView';
import PRMLogin from './pages/prm/PRMLogin'; // Import PRM Login
import RecentEnrollment from './pages/recruiter/RecentEnrollment';
import AssignedStudies from './pages/prm/AssignedStudies';
import Reports from './pages/Reports'; // AI-Powered Reports

// Home Logic
const HomeDispatcher = () => {
  const { user } = useAuth();
  if (user?.role === 'field') return <Navigate to="/field-visit" replace />;
  if (user?.role === 'management' || user?.role === 'game_master') return <Navigate to="/admin/dashboard" replace />;
  if (user?.role === 'prm') return <Navigate to="/prm/calendar" replace />; // Updated to Calendar
  return <PreScreeningForm />;
};

const AppRoutes = () => {
  const { user } = useAuth();

  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/prm/login" element={<PRMLogin />} /> {/* PRM Entry Point */}

      {/* Protected Routes */}
      <Route element={<ProtectedRoute />}>

        {/* Field Layout for Field Users */}
        {(user?.role === 'field') ? (
          <Route element={<MobileLayout />}>
            <Route path="/field-visit" element={<FieldForm />} />
            <Route path="/register" element={<RegistrationForm />} />
            <Route path="*" element={<Navigate to="/field-visit" replace />} />
          </Route>
        ) : (
          /* Desktop Layout for Office Users */
          <Route element={<DesktopLayout />}>
            <Route path="/" element={<HomeDispatcher />} />
            <Route path="/prescreening-success" element={<PreScreeningSuccess />} />
            <Route path="/search" element={<VolunteerSearch />} />
            <Route path="/register" element={<PreScreeningForm />} />
            <Route path="/recent-enrollment" element={<RecentEnrollment />} />
            <Route path="/registration/:id" element={<RegistrationForm />} />
            <Route path="/registration-success" element={<RegistrationSuccess />} />

            <Route path="/admin/dashboard" element={
              (user?.role === 'management' || user?.role === 'game_master')
                ? (
                  <div>
                    <h2 className="text-xl font-bold mb-4">VBoard</h2>
                    <VBoard />
                    <hr className="my-8" />
                    <h2 className="text-xl font-bold mb-4">PRM Dashboard</h2>
                    <PRMDashboard />
                  </div>
                )
                : <VBoard />
            } />

            {/* PRM Routes */}
            {(user?.role === 'prm' || user?.role === 'recruiter' || user?.role === 'management' || user?.role === 'game_master') && (
              <>
                <Route path="/prm/dashboard" element={<PRMDashboard />} />
                <Route path="/prm/dashboard/:id" element={<PRMDashboard />} />
                <Route path="/prm/calendar" element={<PRMCalendar />} />
                <Route path="/prm/assigned-studies" element={<AssignedStudies />} />
              </>
            )}

            {/* Volunteer Tracker - Available to all authenticated users for now */}
            <Route path="/prm/volunteers" element={<VolunteerTracker />} />

            {/* Recruiter Study View */}
            {(user?.role === 'recruiter' || user?.role === 'management' || user?.role === 'game_master') && (
              <Route path="/recruiter/studies" element={<RecruiterStudyView />} />
            )}

            <Route path="/volunteer-list" element={<VolunteerList />} />
            <Route path="/admin/volunteers" element={<VolunteerList />} />

            {/* New Full Database Search */}
            <Route path="/admin/full-search" element={<FullVolunteerSearch />} />

            <Route path="/admin/users" element={<UserManagement />} />

            {/* AI Reports - Available to management, game_master, and prm */}
            {(user?.role === 'management' || user?.role === 'game_master' || user?.role === 'prm') && (
              <Route path="/reports" element={<Reports />} />
            )}

            {/* Fallback */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        )}

      </Route>
    </Routes >
  );
};

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
