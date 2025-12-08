import { BrowserRouter as Router, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { LoginPage } from './pages/auth/LoginPage';
import { RegisterPage } from './pages/auth/RegisterPage';
import { Layout } from './components/layout/Layout';
import { DashboardPage } from './pages/dashboard/DashboardPage';
import { ProtectedRoute } from './components/auth/ProtectedRoute';
import { NewComplaintPage } from './pages/complaints/NewComplaintPage';
import { ComplaintListPage } from './pages/complaints/ComplaintListPage';
import { ComplaintDetailPage } from './pages/complaints/ComplaintDetailPage';
import { AdminDashboardPage } from './pages/admin/AdminDashboardPage';
import { AdminComplaintTablePage } from './pages/admin/AdminComplaintTablePage';
import { PublicFeedPage } from './pages/complaints/PublicFeedPage';
import { PublicDashboard } from './pages/public/PublicDashboard';
import { LandingPage } from './pages/public/LandingPage';
import { CommunityVerificationPage } from './pages/public/CommunityVerificationPage';

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
          <Route element={<ProtectedRoute><Layout /></ProtectedRoute>}>
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/feed" element={<PublicFeedPage />} />

            <Route path="/complaints" element={<ComplaintListPage />} />
            <Route path="/complaints/new" element={<NewComplaintPage />} />
            <Route path="/complaints/:id" element={<ComplaintDetailPage />} />
            <Route path="/complaints/:id" element={<ComplaintDetailPage />} />

            {/* Admin Routes */}
            <Route element={<ProtectedRoute allowedRoles={['official', 'superadmin']}><Outlet /></ProtectedRoute>}>
              <Route path="/admin/complaints" element={<AdminComplaintTablePage />} />
              <Route path="/admin/analytics" element={<AdminDashboardPage />} />
            </Route>

            <Route path="/settings" element={<div>Settings (Coming Soon)</div>} />
          </Route>

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </AuthProvider>
    </Router>
  );
}

export default App;
