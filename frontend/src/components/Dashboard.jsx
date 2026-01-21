import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { quizAPI, authAPI } from '../services/api';
import { toast } from 'react-hot-toast';

const Dashboard = () => {
  const [quizzes, setQuizzes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [roomCode, setRoomCode] = useState('');
  const [user, setUser] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    fetchUserProfile();
    fetchQuizzes();
  }, []);

  const fetchUserProfile = async () => {
    try {
      const response = await authAPI.getProfile();
      setUser(response.data.user);
    } catch (error) {
      console.error('Failed to fetch profile:', error);
    }
  };

  const fetchQuizzes = async () => {
    try {
      // In a real app, you'd fetch user's quizzes
      // For now, show recent quizzes
      setLoading(false);
    } catch (error) {
      console.error('Failed to fetch quizzes:', error);
      setLoading(false);
    }
  };

  const handleJoinQuiz = async (e) => {
    e.preventDefault();
    
    if (!roomCode.trim()) {
      toast.error('Please enter a room code');
      return;
    }

    try {
      const response = await quizAPI.joinQuiz({ roomCode: roomCode.toUpperCase() });
      
      if (response.data.success) {
        toast.success('Joined quiz successfully!');
        navigate(`/quiz/${roomCode.toUpperCase()}`);
      }
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to join quiz');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('userId');
    localStorage.removeItem('username');
    toast.success('Logged out successfully');
    navigate('/login');
  };

  if (loading) {
    return (
      <div className="d-flex align-items-center justify-content-center min-vh-100">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-vh-100 bg-light">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="container py-3 d-flex justify-content-between align-items-center">
          <div className="d-flex align-items-center">
            <h1 className="h4 mb-0 fw-bold text-dark">AI Quiz Builder</h1>
            <span className="badge bg-primary-subtle text-primary-emphasis ms-3">Beta</span>
          </div>

          {user && (
            <div className="d-flex align-items-center gap-3">
              <div className="d-flex align-items-center gap-2">
                <img
                  src={user.avatar}
                  alt={user.username}
                  className="rounded-circle border border-primary-subtle"
                  style={{ width: '40px', height: '40px', objectFit: 'cover' }}
                />
                <div className="small">
                  <div className="fw-semibold text-dark">{user.username}</div>
                  <div className="text-muted">{user.email}</div>
                </div>
              </div>
              <button
                onClick={handleLogout}
                className="btn btn-outline-secondary btn-sm"
              >
                Logout
              </button>
            </div>
          )}
        </div>
      </header>

      <main className="container py-5">
        {/* Hero Section */}
        <div className="text-center mb-5">
          <h1 className="display-6 fw-bold text-dark mb-3">
            Create &amp; Play AI-Powered Quizzes
          </h1>
          <p className="lead text-muted mx-auto" style={{ maxWidth: '720px' }}>
            Upload any document, generate quizzes instantly, and compete with friends in real-time.
          </p>
        </div>

        {/* Action Cards */}
        <div className="row g-4 mb-5">
          {/* Create Quiz Card */}
          <div className="col-md-6">
            <div className="card h-100 shadow-sm">
              <div className="card-body text-center">
                <div className="d-inline-flex align-items-center justify-content-center rounded-circle bg-primary-subtle text-primary fs-3 mb-3" style={{ width: '64px', height: '64px' }}>
                  <span>📄</span>
                </div>
                <h2 className="h5 fw-bold mb-2">Create New Quiz</h2>
                <p className="text-muted mb-4">
                  Upload PDF, DOC, or PPT files and let AI generate questions automatically.
                </p>
                <Link
                  to="/create"
                  className="btn btn-primary w-100"
                >
                  Create Quiz Now
                </Link>
              </div>
            </div>
          </div>

          {/* Join Quiz Card */}
          <div className="col-md-6">
            <div className="card h-100 shadow-sm">
              <div className="card-body">
                <div className="text-center mb-3">
                  <div className="d-inline-flex align-items-center justify-content-center rounded-circle bg-success-subtle text-success fs-3 mb-3" style={{ width: '64px', height: '64px' }}>
                    <span>🎮</span>
                  </div>
                  <h2 className="h5 fw-bold mb-2">Join Existing Quiz</h2>
                  <p className="text-muted mb-0">
                    Enter a room code to join live quiz sessions with friends or colleagues.
                  </p>
                </div>
                <form onSubmit={handleJoinQuiz}>
                  <div className="mb-3">
                    <input
                      type="text"
                      value={roomCode}
                      onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                      placeholder="Enter Room Code (e.g., ABC123)"
                      className="form-control text-uppercase"
                      maxLength="6"
                      pattern="[A-Z0-9]{6}"
                    />
                  </div>
                  <button
                    type="submit"
                    className="btn btn-success w-100"
                  >
                    Join Quiz
                  </button>
                </form>
              </div>
            </div>
          </div>
        </div>

        {/* Features Section */}
        <div className="row g-4 mb-4">
          <div className="col-md-4">
            <div className="card h-100 shadow-sm">
              <div className="card-body">
                <div className="fs-3 mb-2 text-primary">⚡</div>
                <h3 className="h6 fw-bold mb-2">Instant Quiz Generation</h3>
                <p className="text-muted mb-0">
                  AI analyzes your documents and creates quizzes in seconds.
                </p>
              </div>
            </div>
          </div>

          <div className="col-md-4">
            <div className="card h-100 shadow-sm">
              <div className="card-body">
                <div className="fs-3 mb-2 text-success">👥</div>
                <h3 className="h6 fw-bold mb-2">Real-time Multiplayer</h3>
                <p className="text-muted mb-0">
                  Compete with friends in live quiz sessions with leaderboards.
                </p>
              </div>
            </div>
          </div>

          <div className="col-md-4">
            <div className="card h-100 shadow-sm">
              <div className="card-body">
                <div className="fs-3 mb-2 text-primary">📊</div>
                <h3 className="h6 fw-bold mb-2">Performance Analytics</h3>
                <p className="text-muted mb-0">
                  Track your progress and improve with detailed insights.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Stats */}
        {user && (
          <div className="card shadow-sm mt-4">
            <div className="card-body">
              <h2 className="h5 fw-bold mb-4">Your Stats</h2>
              <div className="row text-center g-3">
                <div className="col-6 col-md-3">
                  <div className="h4 mb-1 text-primary">{user.quizzesCreated?.length || 0}</div>
                  <div className="text-muted small">Quizzes Created</div>
                </div>
                <div className="col-6 col-md-3">
                  <div className="h4 mb-1 text-success">{user.quizzesJoined?.length || 0}</div>
                  <div className="text-muted small">Quizzes Played</div>
                </div>
                <div className="col-6 col-md-3">
                  <div className="h4 mb-1 text-primary">{user.totalScore || 0}</div>
                  <div className="text-muted small">Total Score</div>
                </div>
                <div className="col-6 col-md-3">
                  <div className="h4 mb-1 text-warning">{user.gamesPlayed || 0}</div>
                  <div className="text-muted small">Games Played</div>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default Dashboard;