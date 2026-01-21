import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { SocketProvider } from './contexts/SocketContext';

// Components
import FileUpload from './components/FileUpload';
import QuizRoom from './components/QuizRoom';
import Login from './components/Login';
import Register from './components/Register';
import Dashboard from './components/Dashboard';

// Protected Route
const ProtectedRoute = ({ children }) => {
  const token = localStorage.getItem('token');
  return token ? children : <Navigate to="/login" />;
};

function App() {
  const userId = localStorage.getItem('userId');
  const username = localStorage.getItem('username');

  return (
    <SocketProvider userId={userId} username={username}>
      <Router>
        <div className="min-h-screen bg-gray-50">
          <Toaster position="top-right" />
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/create"
              element={
                <ProtectedRoute>
                  <FileUpload />
                </ProtectedRoute>
              }
            />
            <Route
              path="/quiz/:roomCode"
              element={
                <ProtectedRoute>
                  <QuizRoom />
                </ProtectedRoute>
              }
            />
          </Routes>
        </div>
      </Router>
    </SocketProvider>
  );
}

export default App;