import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Add token to requests
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

export const authAPI = {
  login: (credentials) => api.post('/auth/login', credentials),
  register: (userData) => api.post('/auth/register', userData),
  getProfile: () => api.get('/auth/profile')
};

export const uploadAPI = {
  uploadFile: (file) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post('/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });
  }
};

export const quizAPI = {
  createQuiz: (data) => api.post('/quiz/create', data),
  joinQuiz: (data) => api.post('/quiz/join', data),
  getQuizDetails: (roomCode) => api.get(`/quiz/${roomCode}`),
  submitAnswer: (quizId, data) => api.post(`/quiz/${quizId}/answer`, data),
  startQuiz: (quizId) => api.post(`/quiz/${quizId}/start`),
  getLeaderboard: (quizId) => api.get(`/quiz/${quizId}/leaderboard`)
};

// Helper function for error handling
export const handleApiError = (error) => {
  if (error.response) {
    return error.response.data.error || 'An error occurred';
  } else if (error.request) {
    return 'No response from server';
  } else {
    return error.message;
  }
};

export default api;