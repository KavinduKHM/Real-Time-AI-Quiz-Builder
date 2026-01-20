module.exports = (io) => {
  const activeQuizzes = new Map(); // Store active quiz sessions

  io.on('connection', (socket) => {
    console.log('New client connected:', socket.id);

    // Join quiz room
    socket.on('join-quiz', async (data) => {
      const { roomCode, userId, username } = data;
      
      socket.join(roomCode);
      socket.roomCode = roomCode;
      socket.userId = userId;
      socket.username = username;

      // Add to active quizzes tracking
      if (!activeQuizzes.has(roomCode)) {
        activeQuizzes.set(roomCode, new Set());
      }
      activeQuizzes.get(roomCode).add(socket.id);

      // Notify others in room
      socket.to(roomCode).emit('player-joined', {
        userId,
        username,
        socketId: socket.id,
        timestamp: new Date()
      });

      // Send current state to joining player
      const quizState = getQuizState(roomCode);
      if (quizState) {
        socket.emit('quiz-state', quizState);
      }
    });

    // Start quiz
    socket.on('start-quiz', (data) => {
      const { roomCode } = data;
      
      // Initialize quiz timer
      startQuizTimer(io, roomCode);
      
      io.to(roomCode).emit('quiz-started', {
        message: 'Quiz has started!',
        timestamp: new Date()
      });
    });

    // Submit answer
    socket.on('submit-answer', async (data) => {
      const { roomCode, questionIndex, selectedOption, timeTaken } = data;
      
      // Broadcast answer submission
      socket.to(roomCode).emit('answer-submitted', {
        userId: socket.userId,
        username: socket.username,
        questionIndex,
        timestamp: new Date()
      });
    });

    // Next question
    socket.on('next-question', (data) => {
      const { roomCode } = data;
      
      // Broadcast next question
      io.to(roomCode).emit('next-question', {
        questionIndex: getNextQuestionIndex(roomCode),
        timestamp: new Date()
      });
    });

    // Update leaderboard
    socket.on('update-leaderboard', (data) => {
      const { roomCode, leaderboard } = data;
      
      // Broadcast updated leaderboard
      io.to(roomCode).emit('leaderboard-updated', {
        leaderboard,
        timestamp: new Date()
      });
    });

    // Chat message
    socket.on('send-message', (data) => {
      const { roomCode, message } = data;
      
      io.to(roomCode).emit('new-message', {
        userId: socket.userId,
        username: socket.username,
        message,
        timestamp: new Date()
      });
    });

    // Disconnect
    socket.on('disconnect', () => {
      console.log('Client disconnected:', socket.id);
      
      if (socket.roomCode) {
        // Remove from active quizzes
        const roomSockets = activeQuizzes.get(socket.roomCode);
        if (roomSockets) {
          roomSockets.delete(socket.id);
          
          // Notify others
          socket.to(socket.roomCode).emit('player-left', {
            userId: socket.userId,
            username: socket.username,
            timestamp: new Date()
          });
          
          // Clean up if room is empty
          if (roomSockets.size === 0) {
            activeQuizzes.delete(socket.roomCode);
          }
        }
      }
    });
  });

  // Helper functions
  function getQuizState(roomCode) {
    // Get quiz state from database or memory
    return {
      roomCode,
      isStarted: false,
      currentQuestion: 0,
      players: []
    };
  }

  function startQuizTimer(io, roomCode) {
    // Implement quiz timer logic
    let timeLeft = 30; // 30 seconds per question
    
    const timer = setInterval(() => {
      timeLeft--;
      
      io.to(roomCode).emit('timer-update', {
        timeLeft,
        questionIndex: 0
      });
      
      if (timeLeft <= 0) {
        clearInterval(timer);
        // Move to next question or end quiz
      }
    }, 1000);
  }

  function getNextQuestionIndex(roomCode) {
    // Get next question index logic
    return 0;
  }
};