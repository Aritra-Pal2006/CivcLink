import { BrowserRouter as Router, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { LoginPage } from './pages/auth/LoginPage';
import { RegisterPage } from './pages/auth/RegisterPage';
import { Layout } from './components/layout/Layout';
import { ProtectedRoute } from './components/ProtectedRoute';
import { NewComplaintPage } from './pages/complaints/NewComplaintPage';
import { ComplaintListPage } from './pages/complaints/ComplaintListPage';
import { ComplaintDetailPage } from './pages/complaints/ComplaintDetailPage';
import { AdminDashboardPage } from './pages/admin/AdminDashboardPage';
import { AdminComplaintTablePage } from './pages/admin/AdminComplaintTablePage';
import { ManageOfficialsPage } from './pages/admin/ManageOfficialsPage';
import { CitizenDashboard } from './pages/dashboard/CitizenDashboard';
import { WardAdminDashboard } from './pages/dashboard/WardAdminDashboard';
import { DeptAdminDashboard } from './pages/dashboard/DeptAdminDashboard';
import { CityAdminDashboard } from './pages/dashboard/CityAdminDashboard';
import { SuperAdminDashboard } from './pages/dashboard/SuperAdminDashboard';
import { PublicFeedPage } from './pages/complaints/PublicFeedPage';
import { PublicDashboard } from './pages/public/PublicDashboard';
import { LandingPage } from './pages/public/LandingPage';
import { CommunityVerificationPage } from './pages/public/CommunityVerificationPage';
import { CityEscalationsPage } from './pages/dashboard/CityEscalationsPage';

import { DashboardRedirect } from './components/DashboardRedirect';

function App() {
  return (
    <Router>
      <AuthProvider>
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/public" element={<PublicFeedPage />} />
          <Route path="/public-dashboard" element={<PublicDashboard />} />
          <Route path="/community-verification" element={<CommunityVerificationPage />} />

          {/* Protected Routes */}
          {/* Protected Routes */}
          <Route element={<ProtectedRoute><Layout /></ProtectedRoute>}>
            {/* Redirect root dashboard to role-specific dashboard */}
            <Route path="/dashboard" element={<DashboardRedirect />} />

            {/* Universal Authenticated Routes */}
            <Route path="/complaints/:id" element={<ComplaintDetailPage />} />

            {/* Citizen Routes */}
            <Route element={<ProtectedRoute allowedRoles={['citizen']}><Outlet /></ProtectedRoute>}>
              <Route path="/citizen/dashboard" element={<CitizenDashboard />} />
              <Route path="/complaints" element={<ComplaintListPage />} />
              <Route path="/complaints/new" element={<NewComplaintPage />} />
            </Route>

            {/* Ward Admin Routes */}
            <Route element={<ProtectedRoute allowedRoles={['ward_admin']}><Outlet /></ProtectedRoute>}>
              <Route path="/ward/dashboard" element={<WardAdminDashboard />} />
            </Route>

            {/* Dept Admin Routes */}
            <Route element={<ProtectedRoute allowedRoles={['dept_admin']}><Outlet /></ProtectedRoute>}>
              <Route path="/dept/dashboard" element={<DeptAdminDashboard />} />
            </Route>

            {/* City Admin Dashboard */}
            <Route element={<ProtectedRoute allowedRoles={['city_admin']}><Outlet /></ProtectedRoute>}>
              <Route path="/city/dashboard" element={<CityAdminDashboard />} />
              <Route path="/city/complaints" element={<AdminComplaintTablePage />} />
              <Route path="/city/officials" element={<ManageOfficialsPage />} />
              <Route path="/city/analytics" element={<AdminDashboardPage />} />
              <Route path="/city/escalations" element={<CityEscalationsPage />} />
            </Route>

            {/* Super Admin Dashboard */}
            <Route element={<ProtectedRoute allowedRoles={['superadmin']}><Outlet /></ProtectedRoute>}>
              <Route path="/super/dashboard" element={<SuperAdminDashboard />} />
            </Route>

            {/* Shared High-Level Admin Routes (City & Super) */}
            <Route element={<ProtectedRoute allowedRoles={['city_admin', 'superadmin']}><Outlet /></ProtectedRoute>}>
              <Route path="/admin/officials" element={<ManageOfficialsPage />} />
              <Route path="/admin/complaints" element={<AdminComplaintTablePage />} />
              <Route path="/admin/analytics" element={<AdminDashboardPage />} />
            </Route>

            <Route path="/feed" element={<PublicFeedPage />} />
            <Route path="/settings" element={<div>Settings (Coming Soon)</div>} />
          </Route>

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </AuthProvider>
    </Router >
  );
}

export default App;
