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
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center">
              <h1 className="text-2xl font-bold text-gray-800">AI Quiz Builder</h1>
              <span className="ml-3 px-3 py-1 bg-blue-100 text-blue-800 text-sm rounded-full">
                Beta
              </span>
            </div>
            
            {user && (
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-3">
                  <img
                    src={user.avatar}
                    alt={user.username}
                    className="w-10 h-10 rounded-full border-2 border-blue-200"
                  />
                  <div>
                    <p className="font-medium text-gray-800">{user.username}</p>
                    <p className="text-sm text-gray-600">{user.email}</p>
                  </div>
                </div>
                <button
                  onClick={handleLogout}
                  className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900"
                >
                  Logout
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Hero Section */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Create & Play AI-Powered Quizzes
          </h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Upload any document, generate quizzes instantly, and compete with friends in real-time.
          </p>
        </div>

        {/* Action Cards */}
        <div className="grid md:grid-cols-2 gap-8 mb-12">
          {/* Create Quiz Card */}
          <div className="bg-white rounded-2xl shadow-xl p-8">
            <div className="text-center mb-6">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full mb-4">
                <span className="text-3xl">📄</span>
              </div>
              <h2 className="text-2xl font-bold text-gray-800 mb-2">Create New Quiz</h2>
              <p className="text-gray-600">
                Upload PDF, DOC, or PPT files and let AI generate questions automatically.
              </p>
            </div>
            <Link
              to="/create"
              className="block w-full py-4 px-6 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg text-center transition-colors"
            >
              Create Quiz Now
            </Link>
          </div>

          {/* Join Quiz Card */}
          <div className="bg-white rounded-2xl shadow-xl p-8">
            <div className="text-center mb-6">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-4">
                <span className="text-3xl">🎮</span>
              </div>
              <h2 className="text-2xl font-bold text-gray-800 mb-2">Join Existing Quiz</h2>
              <p className="text-gray-600">
                Enter a room code to join live quiz sessions with friends or colleagues.
              </p>
            </div>
            <form onSubmit={handleJoinQuiz} className="space-y-4">
              <input
                type="text"
                value={roomCode}
                onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                placeholder="Enter Room Code (e.g., ABC123)"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent uppercase"
                maxLength="6"
                pattern="[A-Z0-9]{6}"
              />
              <button
                type="submit"
                className="w-full py-4 px-6 bg-green-600 hover:bg-green-700 text-white font-medium rounded-lg transition-colors"
              >
                Join Quiz
              </button>
            </form>
          </div>
        </div>

        {/* Features Section */}
        <div className="grid md:grid-cols-3 gap-8">
          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="text-blue-600 text-2xl mb-4">⚡</div>
            <h3 className="text-xl font-bold text-gray-800 mb-2">Instant Quiz Generation</h3>
            <p className="text-gray-600">
              AI analyzes your documents and creates quizzes in seconds.
            </p>
          </div>

          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="text-green-600 text-2xl mb-4">👥</div>
            <h3 className="text-xl font-bold text-gray-800 mb-2">Real-time Multiplayer</h3>
            <p className="text-gray-600">
              Compete with friends in live quiz sessions with leaderboards.
            </p>
          </div>

          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="text-purple-600 text-2xl mb-4">📊</div>
            <h3 className="text-xl font-bold text-gray-800 mb-2">Performance Analytics</h3>
            <p className="text-gray-600">
              Track your progress and improve with detailed insights.
            </p>
          </div>
        </div>

        {/* Quick Stats */}
        {user && (
          <div className="mt-12 bg-white rounded-xl shadow-lg p-8">
            <h2 className="text-2xl font-bold text-gray-800 mb-6">Your Stats</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              <div className="text-center">
                <div className="text-3xl font-bold text-blue-600">{user.quizzesCreated?.length || 0}</div>
                <p className="text-gray-600 mt-1">Quizzes Created</p>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-green-600">{user.quizzesJoined?.length || 0}</div>
                <p className="text-gray-600 mt-1">Quizzes Played</p>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-purple-600">{user.totalScore || 0}</div>
                <p className="text-gray-600 mt-1">Total Score</p>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-yellow-600">{user.gamesPlayed || 0}</div>
                <p className="text-gray-600 mt-1">Games Played</p>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default Dashboard;