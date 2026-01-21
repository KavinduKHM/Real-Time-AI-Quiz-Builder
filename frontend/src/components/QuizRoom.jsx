import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useSocket } from '../contexts/SocketContext.jsx';
import { getQuizDetails, submitAnswer } from '../services/api';
import { toast } from 'react-hot-toast';

const QuizRoom = () => {
  const { roomCode } = useParams();
  const navigate = useNavigate();
  const { socket, joinQuizRoom, isConnected } = useSocket();
  
  const [quiz, setQuiz] = useState(null);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [selectedOption, setSelectedOption] = useState(null);
  const [timeLeft, setTimeLeft] = useState(30);
  const [score, setScore] = useState(0);
  const [leaderboard, setLeaderboard] = useState([]);
  const [players, setPlayers] = useState([]);
  const [isStarted, setIsStarted] = useState(false);
  const [isFinished, setIsFinished] = useState(false);
  
  const timerRef = useRef(null);
  const startTimeRef = useRef(null);

  useEffect(() => {
    // Fetch quiz details
    const fetchQuiz = async () => {
      try {
        const response = await getQuizDetails(roomCode);
        setQuiz(response.quiz);
        setPlayers(response.quiz.players || []);
        setLeaderboard(response.quiz.leaderboard || []);
        setIsStarted(response.quiz.isStarted);
        setIsFinished(response.quiz.isFinished);
        
        if (response.quiz.isStarted && !response.quiz.isFinished) {
          startQuestionTimer();
        }
      } catch (error) {
        toast.error('Failed to load quiz');
        navigate('/');
      }
    };

    fetchQuiz();
  }, [roomCode, navigate]);

  useEffect(() => {
    // Join socket room
    if (isConnected && socket) {
      joinQuizRoom(roomCode);
      
      // Set up socket listeners
      socket.on('quiz-started', handleQuizStarted);
      socket.on('next-question', handleNextQuestion);
      socket.on('timer-update', handleTimerUpdate);
      socket.on('leaderboard-updated', handleLeaderboardUpdate);
      socket.on('player-joined', handlePlayerJoined);
      socket.on('player-left', handlePlayerLeft);
      socket.on('answer-submitted', handleAnswerSubmitted);
      
      return () => {
        socket.off('quiz-started');
        socket.off('next-question');
        socket.off('timer-update');
        socket.off('leaderboard-updated');
        socket.off('player-joined');
        socket.off('player-left');
        socket.off('answer-submitted');
      };
    }
  }, [socket, isConnected, roomCode]);

  const handleQuizStarted = (data) => {
    setIsStarted(true);
    startQuestionTimer();
    toast.success('Quiz has started!');
  };

  const handleNextQuestion = (data) => {
    if (quiz && currentQuestion < quiz.questions.length - 1) {
      setCurrentQuestion(data.questionIndex);
      setSelectedOption(null);
      setTimeLeft(30);
      startTimeRef.current = Date.now();
    } else {
      endQuiz();
    }
  };

  const handleTimerUpdate = (data) => {
    setTimeLeft(data.timeLeft);
    
    if (data.timeLeft <= 0) {
      // Auto-submit if time runs out
      if (selectedOption !== null) {
        handleSubmitAnswer();
      }
      moveToNextQuestion();
    }
  };

  const handleLeaderboardUpdate = (data) => {
    setLeaderboard(data.leaderboard);
  };

  const handlePlayerJoined = (data) => {
    setPlayers(prev => [...prev, {
      user: { _id: data.userId, username: data.username },
      score: 0
    }]);
    toast.info(`${data.username} joined the quiz`);
  };

  const handlePlayerLeft = (data) => {
    setPlayers(prev => prev.filter(p => p.user._id !== data.userId));
    toast.info(`${data.username} left the quiz`);
  };

  const handleAnswerSubmitted = (data) => {
    // Show that someone submitted an answer
    toast(`${data.username} submitted an answer`, {
      icon: '📝',
      duration: 2000
    });
  };

  const startQuestionTimer = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    
    startTimeRef.current = Date.now();
    setTimeLeft(30);
    
    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timerRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const moveToNextQuestion = () => {
    if (quiz && currentQuestion < quiz.questions.length - 1) {
      setCurrentQuestion(prev => prev + 1);
      setSelectedOption(null);
      setTimeLeft(30);
      startQuestionTimer();
      
      if (socket) {
        socket.emit('next-question', { roomCode });
      }
    } else {
      endQuiz();
    }
  };

  const handleSubmitAnswer = async () => {
    if (selectedOption === null) return;
    
    const timeTaken = Math.floor((Date.now() - startTimeRef.current) / 1000);
    
    try {
      const response = await submitAnswer(quiz._id, {
        questionIndex: currentQuestion,
        selectedOption,
        timeTaken
      });
      
      setScore(response.currentScore);
      
      // Update leaderboard locally
      setLeaderboard(prev => {
        const newLeaderboard = [...prev];
        const userIndex = newLeaderboard.findIndex(u => u.user === quiz.creator._id);
        
        if (userIndex !== -1) {
          newLeaderboard[userIndex].score = response.currentScore;
        } else {
          newLeaderboard.push({
            user: quiz.creator._id,
            username: quiz.creator.username,
            score: response.currentScore,
            avatar: quiz.creator.avatar
          });
        }
        
        return newLeaderboard.sort((a, b) => b.score - a.score);
      });
      
      // Notify others
      if (socket) {
        socket.emit('submit-answer', {
          roomCode,
          questionIndex: currentQuestion,
          selectedOption,
          timeTaken
        });
      }
      
      toast.success(
        response.isCorrect 
          ? `Correct! +${response.points} points`
          : `Incorrect! Correct answer: ${quiz.questions[currentQuestion].options[response.correctAnswer]}`
      );
      
      // Move to next question after delay
      setTimeout(moveToNextQuestion, 2000);
      
    } catch (error) {
      toast.error('Failed to submit answer');
    }
  };

  const endQuiz = () => {
    setIsFinished(true);
    clearInterval(timerRef.current);
    
    toast.success('Quiz completed! Check your final score.');
    
    // Calculate final rankings
    const finalRankings = [...leaderboard].sort((a, b) => b.score - a.score);
    setLeaderboard(finalRankings);
  };

  const startQuiz = () => {
    if (socket) {
      socket.emit('start-quiz', { roomCode });
    }
  };

  if (!quiz) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  const currentQuestionData = quiz.questions[currentQuestion];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 p-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-800">{quiz.title}</h1>
              <p className="text-gray-600 mt-2">{quiz.description}</p>
              <div className="flex items-center mt-4 space-x-4 text-sm">
                <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full">
                  Room: {roomCode}
                </span>
                <span className="bg-green-100 text-green-800 px-3 py-1 rounded-full">
                  Players: {players.length}
                </span>
                <span className="bg-purple-100 text-purple-800 px-3 py-1 rounded-full">
                  Questions: {quiz.questions.length}
                </span>
              </div>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-gray-800">
                Score: <span className="text-blue-600">{score}</span>
              </div>
              {!isStarted && quiz.creator._id === localStorage.getItem('userId') && (
                <button
                  onClick={startQuiz}
                  className="mt-4 bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-lg font-medium"
                >
                  Start Quiz
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Question & Options */}
          <div className="lg:col-span-2 space-y-6">
            {/* Timer */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold text-gray-800">
                  Question {currentQuestion + 1} of {quiz.questions.length}
                </h2>
                <div className={`text-2xl font-bold ${
                  timeLeft > 10 ? 'text-green-600' : 
                  timeLeft > 5 ? 'text-yellow-600' : 'text-red-600'
                }`}>
                  {timeLeft}s
                </div>
              </div>
              
              {/* Question */}
              <div className="mb-8">
                <h3 className="text-lg text-gray-700 mb-4">
                  {currentQuestionData?.question}
                </h3>
                
                {/* Options */}
                <div className="space-y-3">
                  {currentQuestionData?.options.map((option, index) => (
                    <button
                      key={index}
                      onClick={() => setSelectedOption(index)}
                      className={`w-full text-left p-4 rounded-lg border-2 transition-all ${
                        selectedOption === index
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                      disabled={isFinished}
                    >
                      <div className="flex items-center">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center mr-4 ${
                          selectedOption === index
                            ? 'bg-blue-500 text-white'
                            : 'bg-gray-100 text-gray-600'
                        }`}>
                          {String.fromCharCode(65 + index)}
                        </div>
                        <span className="text-gray-700">{option}</span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
              
              {/* Submit Button */}
              {!isFinished && isStarted && (
                <button
                  onClick={handleSubmitAnswer}
                  disabled={selectedOption === null}
                  className={`w-full py-3 rounded-lg font-medium ${
                    selectedOption === null
                      ? 'bg-gray-400 cursor-not-allowed'
                      : 'bg-blue-600 hover:bg-blue-700 text-white'
                  }`}
                >
                  Submit Answer
                </button>
              )}
            </div>

            {/* Players List */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h2 className="text-xl font-bold text-gray-800 mb-4">Players ({players.length})</h2>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                {players.map((player, index) => (
                  <div key={index} className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                    <img
                      src={player.user.avatar}
                      alt={player.user.username}
                      className="w-10 h-10 rounded-full"
                    />
                    <div>
                      <p className="font-medium text-gray-800">{player.user.username}</p>
                      <p className="text-sm text-gray-600">Score: {player.score}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right Column - Leaderboard */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-xl shadow-lg p-6 sticky top-6">
              <h2 className="text-xl font-bold text-gray-800 mb-6">
                🏆 Live Leaderboard
              </h2>
              
              <div className="space-y-4">
                {leaderboard.map((player, index) => (
                  <div
                    key={index}
                    className={`flex items-center justify-between p-4 rounded-lg ${
                      index === 0 ? 'bg-yellow-50 border-2 border-yellow-200' :
                      index === 1 ? 'bg-gray-50 border-2 border-gray-200' :
                      index === 2 ? 'bg-orange-50 border-2 border-orange-200' :
                      'bg-white border border-gray-100'
                    }`}
                  >
                    <div className="flex items-center space-x-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${
                        index === 0 ? 'bg-yellow-500 text-white' :
                        index === 1 ? 'bg-gray-500 text-white' :
                        index === 2 ? 'bg-orange-500 text-white' :
                        'bg-blue-100 text-blue-800'
                      }`}>
                        {index + 1}
                      </div>
                      <img
                        src={player.avatar}
                        alt={player.username}
                        className="w-10 h-10 rounded-full"
                      />
                      <div>
                        <p className="font-medium text-gray-800">{player.username}</p>
                        <p className="text-sm text-gray-600">Score: {player.score}</p>
                      </div>
                    </div>
                    {index < 3 && (
                      <div className="text-2xl">
                        {index === 0 ? '🥇' : index === 1 ? '🥈' : '🥉'}
                      </div>
                    )}
                  </div>
                ))}
                
                {leaderboard.length === 0 && (
                  <p className="text-gray-500 text-center py-4">
                    No scores yet. Be the first!
                  </p>
                )}
              </div>
              
              {/* Final Results */}
              {isFinished && (
                <div className="mt-8 p-4 bg-green-50 rounded-lg border border-green-200">
                  <h3 className="font-bold text-green-800 mb-2">Quiz Completed!</h3>
                  <p className="text-green-700">
                    Your final score: <span className="font-bold">{score}</span>
                  </p>
                  <p className="text-green-700">
                    Rank: <span className="font-bold">
                      #{leaderboard.findIndex(p => p.user === quiz.creator._id) + 1}
                    </span>
                  </p>
                  <button
                    onClick={() => navigate('/')}
                    className="mt-4 w-full bg-green-600 hover:bg-green-700 text-white py-2 rounded-lg"
                  >
                    Create New Quiz
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default QuizRoom;