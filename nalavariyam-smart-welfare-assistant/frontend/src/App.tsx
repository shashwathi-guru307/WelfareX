import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from './hooks/useTheme';
import { AuthProvider, useAuth } from './hooks/useAuth';
import Layout from './components/layout/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Workers from './pages/Workers';
import WorkerDetail from './pages/WorkerDetail';
import EditWorker from './pages/EditWorker';
import Schemes from './pages/Schemes';
import Eligibility from './pages/Eligibility';
import RenewalAlerts from './pages/RenewalAlerts';
import Reminders from './pages/Reminders';
import Notifications from './pages/Notifications';
import Reports from './pages/Reports';
import Settings from './pages/Settings';
import CaseManagement from './pages/CaseManagement';
import CaseDetail from './pages/CaseDetail';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, loading } = useAuth();
  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-slate-900">
      <div className="text-center">
        <svg className="animate-spin h-8 w-8 text-accent mx-auto mb-3" viewBox="0 0 24 24" fill="none">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
        <p className="text-sm text-gray-500 dark:text-gray-400">Loading...</p>
      </div>
    </div>
  );
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function AppRoutes() {
  const { isAuthenticated } = useAuth();
  return (
    <Routes>
      <Route path="/login" element={isAuthenticated ? <Navigate to="/" replace /> : <Login />} />
      <Route path="/signup" element={<Navigate to="/login" replace />} />
      <Route path="/register" element={<Navigate to="/login" replace />} />
      <Route path="/*" element={
        <ProtectedRoute>
          <Layout>
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/applicants" element={<Workers />} />
              <Route path="/workers" element={<Workers />} />
              <Route path="/workers/new" element={<EditWorker />} />
              <Route path="/workers/:id" element={<WorkerDetail />} />
              <Route path="/workers/:id/edit" element={<EditWorker />} />
              <Route path="/schemes" element={<Schemes />} />
              <Route path="/eligibility" element={<Eligibility />} />
              <Route path="/renewals" element={<RenewalAlerts />} />
              <Route path="/reminders" element={<Reminders />} />
              <Route path="/notifications" element={<Notifications />} />
              <Route path="/cases" element={<CaseManagement />} />
              <Route path="/cases/:id" element={<CaseDetail />} />
              <Route path="/reports" element={<Reports />} />
              <Route path="/settings" element={<Settings />} />
            </Routes>
          </Layout>
        </ProtectedRoute>
      } />
    </Routes>
  );
}

export default function App() {
  return (
    <ThemeProvider>
    <AuthProvider>
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
    </AuthProvider>
    </ThemeProvider>
  );
}
