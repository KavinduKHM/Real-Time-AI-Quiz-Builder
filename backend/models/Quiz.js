const mongoose = require('mongoose');

const quizSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true
  },
  description: {
    type: String
  },
  creator: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  fileUrl: {
    type: String,
    required: true
  },
  fileText: {
    type: String,
    required: true
  },
  questions: [{
    question: String,
    options: [String],
    correctAnswer: Number, // Index of correct option
    points: {
      type: Number,
      default: 10
    }
  }],
  isActive: {
    type: Boolean,
    default: true
  },
  roomCode: {
    type: String,
    unique: true,
    required: true
  },
  maxPlayers: {
    type: Number,
    default: 10
  },
  timePerQuestion: {
    type: Number,
    default: 30 // seconds
  },
  players: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    score: {
      type: Number,
      default: 0
    },
    currentQuestion: {
      type: Number,
      default: 0
    },
    answers: [{
      questionIndex: Number,
      selectedOption: Number,
      isCorrect: Boolean,
      timeTaken: Number
    }],
    joinedAt: {
      type: Date,
      default: Date.now
    }
  }],
  leaderboard: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    username: String,
    score: Number,
    avatar: String
  }],
  currentQuestion: {
    type: Number,
    default: 0
  },
  isStarted: {
    type: Boolean,
    default: false
  },
  isFinished: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

// Generate room code before saving
quizSchema.pre('save', function(next) {
  if (!this.roomCode) {
    this.roomCode = Math.random().toString(36).substring(2, 8).toUpperCase();
  }
  next();
});

module.exports = mongoose.model('Quiz', quizSchema);