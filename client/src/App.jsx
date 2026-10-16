import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider, useAuth } from './auth';
import Layout from './components/Layout';
import Attendance from './pages/Attendance';
import Dashboard from './pages/Dashboard';
import Exams from './pages/Exams';
import Login from './pages/Login';

function LoadingScreen() {
  return (
    <div className="flex min-h-screen items-center justify-center text-sm text-slate-500">
      Loading ExamQR…
    </div>
  );
}

function LoginGate() {
  const { user, ready } = useAuth();
  if (!ready) return <LoadingScreen />;
  if (user) return <Navigate to="/" replace />;
  return <Login />;
}

function Private({ children }) {
  const { user, ready } = useAuth();
  if (!ready) return <LoadingScreen />;
  if (!user) return <Navigate to="/login" replace />;
  return <Layout>{children}</Layout>;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginGate />} />
          <Route path="/" element={<Private><Dashboard /></Private>} />
          <Route path="/exams" element={<Private><Exams /></Private>} />
          <Route path="/attendance" element={<Private><Attendance /></Private>} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
