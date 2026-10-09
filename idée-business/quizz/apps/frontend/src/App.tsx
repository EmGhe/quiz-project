import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import LoginPage from '@/pages/LoginPage';
import RegisterPage from '@/pages/RegisterPage';

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
          element={user ? <div>Daily Page (TODO)</div> : <Navigate to="/login" />}
        />
        <Route path="/" element={<Navigate to="/daily" />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
