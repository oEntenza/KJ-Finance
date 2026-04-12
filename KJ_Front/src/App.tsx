import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Home } from './pages/Home';
import { Login } from './pages/Login';
import { SignUp } from './pages/SignUp';
import { Dashboard } from './pages/Dashboard';
import { ProtectedRoute } from './components/ProtectedRoute'; 
import { Analytics } from './pages/Analytics';
import { Profile } from './pages/Profile';
import { Preferences } from './pages/Preferences';
import { DialogProvider } from './components/DialogProvider';

export function App() {
  useEffect(() => {
    const theme = localStorage.getItem('@KAO:theme') || 'noir';
    document.documentElement.dataset.theme = theme;
  }, []);

  return (
    <DialogProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<SignUp />} />             
          <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
          <Route path="/analytics" element={<Analytics />} />
          <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
          <Route path="/preferences" element={<ProtectedRoute><Preferences /></ProtectedRoute>} />
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </BrowserRouter>
    </DialogProvider>
  );
}
