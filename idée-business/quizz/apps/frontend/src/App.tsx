import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import LoginPage from '@/pages/LoginPage';
import RegisterPage from '@/pages/RegisterPage';
import DailyPage from '@/pages/DailyPage';
import AdminDashboard from '@/pages/admin/AdminDashboard';
import AdminQuestions from '@/pages/admin/AdminQuestions';
import AdminQuestionDetail from '@/pages/admin/AdminQuestionDetail';
import AdminReportedQuestions from '@/pages/admin/AdminReportedQuestions';

function App() {
  const { user, loading, checkAuth } = useAuthStore();

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-xl text-gray-600">Loading...</div>
      </div>
    );
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route
          path="/login"
          element={user ? <Navigate to="/daily" /> : <LoginPage />}
        />
        <Route
          path="/register"
          element={user ? <Navigate to="/daily" /> : <RegisterPage />}
        />
        <Route
          path="/daily"
          element={user ? <DailyPage /> : <Navigate to="/login" />}
        />
        <Route
          path="/admin"
          element={user ? <AdminDashboard /> : <Navigate to="/login" />}
        />
        <Route
          path="/admin/questions"
          element={user ? <AdminQuestions /> : <Navigate to="/login" />}
        />
        <Route
          path="/admin/questions/:id"
          element={user ? <AdminQuestionDetail /> : <Navigate to="/login" />}
        />
        <Route
          path="/admin/reported"
          element={user ? <AdminReportedQuestions /> : <Navigate to="/login" />}
        />
        <Route path="/" element={<Navigate to="/daily" />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
