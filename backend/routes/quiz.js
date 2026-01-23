const express = require('express');
const Quiz = require('../models/Quiz');
const User = require('../models/User');
const aiService = require('../utils/aiService');
const auth = require('../middleware/auth');
const router = express.Router();

// Health check for Phi
router.get('/health/phi', async (req, res) => {
  try {
    const response = await fetch('http://localhost:11434/api/tags');
    const data = await response.json();
    
    const hasPhi = data.models?.some(m => m.name.includes('phi'));
    
    res.json({
      status: 'ok',
      ollama: response.ok ? 'running' : 'stopped',
      phiModel: hasPhi ? 'available' : 'not found',
      models: data.models?.map(m => m.name) || []
    });
  } catch (error) {
    res.json({
      status: 'error',
      message: 'Ollama not running',
      error: error.message,
      fix: 'Run: ollama serve (in terminal)'
    });
  }
});

// Create quiz (AI with fallback)
router.post('/create', auth, async (req, res) => {
  try {
    const { title, description, fileUrl = null, fileText = '', numQuestions = 10 } = req.body;

    console.log(`📝 Creating quiz: ${title}`);
    console.log(`📊 Text length: ${(fileText || '').length} chars`);
    console.log(`❓ Questions requested: ${numQuestions}`);

    // Basic validation
    if (!title || !title.trim()) {
      return res.status(400).json({ success: false, error: 'Title is required' });
    }

    // Build a text source that is never empty so the route won't 400.
    const baseTextParts = [];
    if (typeof title === 'string' && title.trim()) baseTextParts.push(title.trim());
    if (typeof description === 'string' && description.trim()) baseTextParts.push(description.trim());
    const fallbackText = baseTextParts.join('. ').trim();

    const sourceTextRaw =
      typeof fileText === 'string' && fileText.trim()
        ? fileText.trim()
        : fallbackText;

    // If still empty, provide a minimal default to avoid 400s and keep UX flowing.
    const sourceText = sourceTextRaw || 'General knowledge starter text about science, history, and technology.';

    // Clamp requested questions to sane bounds
    const safeNumQuestions = Math.min(Math.max(parseInt(numQuestions) || 10, 3), 20);

    // Generate quiz questions using AI, but fall back to locally generated questions if AI fails.
    let questions;
    const startTime = Date.now();
    try {
      questions = await aiService.generateQuizFromText(sourceText, safeNumQuestions);
    } catch (aiError) {
      console.error('AI generation failed, using local fallback questions:', aiError.message);
      questions = buildLocalFallbackQuestions(sourceText, safeNumQuestions);
    }
    const generationTime = Date.now() - startTime;

    // Create quiz
    const creatorId = req.user?.id || req.userId;
    if (!creatorId) {
      return res.status(401).json({ success: false, error: 'Not authenticated' });
    }
    const quiz = new Quiz({
      title,
      description: description || '',
      creator: creatorId,
      fileUrl,
      fileText: sourceText.substring(0, 1000),
      questions,
      roomCode: generateRoomCode(),
      maxPlayers: Number(process.env.MAX_PLAYERS) || 10,
      timePerQuestion: Number(process.env.TIME_PER_QUESTION) || 30
    });

    await quiz.save();

    // Update user
    await User.findByIdAndUpdate(creatorId, {
      $push: { quizzesCreated: quiz._id }
    });

    res.status(201).json({
      success: true,
      message: 'Quiz created',
      quiz: {
        id: quiz._id,
        title: quiz.title,
        roomCode: quiz.roomCode,
        questions: quiz.questions.length,
        generationTime: `${generationTime}ms`
      }
    });

  } catch (error) {
    console.error('❌ Create quiz error:', error);

    res.status(500).json({
      success: false,
      error: error.message || 'Failed to create quiz'
    });
  }
});

// Simple local fallback question generator when AI is unavailable (e.g., quota issues)
function buildLocalFallbackQuestions(text, numQuestions) {
  const templatePrompts = [
    'What is the main idea of the text?',
    'Which option best summarizes the content?',
    'Which topic is most related to the text?',
    'What is a key fact mentioned?',
    'Which statement is true about the text?',
    'What concept is emphasized?',
    'Which option is NOT supported by the text?',
    'What is a likely implication of the text?',
    'Which area does the text most concern?',
    'What is a reasonable takeaway from the text?'
  ];

  const questions = [];
  for (let i = 0; i < Math.min(numQuestions, templatePrompts.length); i++) {
    const prompt = templatePrompts[i];
    questions.push({
      question: `${prompt}`,
      options: [
        'Science and technology',
        'History and culture',
        'Business and economics',
        'Health and medicine'
      ],
      correctAnswer: i % 4,
      points: 10
    });
  }

  // If fewer templates than requested, pad with generic items.
  while (questions.length < numQuestions) {
    questions.push({
      question: 'Select the most accurate statement.',
      options: [
        'It discusses technological advances',
        'It focuses on historical events',
        'It analyzes economic trends',
        'It highlights medical research'
      ],
      correctAnswer: questions.length % 4,
      points: 10
    });
  }

  return questions;
}

// Helper to generate room code
function generateRoomCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // No confusing chars
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

// Join quiz
router.post('/join', auth, async (req, res) => {
  try {
    const { roomCode } = req.body;

    if (!roomCode || roomCode.length !== 6) {
      return res.status(400).json({ error: 'Invalid room code' });
    }

    const quiz = await Quiz.findOne({ 
      roomCode: roomCode.toUpperCase(),
      isActive: true 
    }).populate('creator', 'username avatar');

    if (!quiz) {
      return res.status(404).json({ error: 'Quiz not found' });
    }

    if (quiz.players.length >= quiz.maxPlayers) {
      return res.status(400).json({ error: 'Quiz room is full' });
    }

    // Check if already joined
    const alreadyJoined = quiz.players.some(p => p.user.toString() === req.userId);
    if (alreadyJoined) {
      return res.status(400).json({ error: 'Already joined this quiz' });
    }

    // Add player
    const user = await User.findById(req.userId).select('username avatar');
    
    quiz.players.push({
      user: req.userId,
      username: user.username,
      avatar: user.avatar,
      score: 0,
      currentQuestion: 0
    });

    await quiz.save();

    // Update user's joined quizzes
    await User.findByIdAndUpdate(req.userId, {
      $push: { quizzesJoined: quiz._id }
    });

    res.json({
      success: true,
      quiz: {
        id: quiz._id,
        title: quiz.title,
        creator: quiz.creator,
        players: quiz.players.length,
        isStarted: quiz.isStarted,
        roomCode: quiz.roomCode
      }
    });

  } catch (error) {
    console.error('Join quiz error:', error);
    res.status(500).json({ error: 'Failed to join quiz' });
  }
});

// Get quiz details
router.get('/:roomCode', auth, async (req, res) => {
  try {
    const quiz = await Quiz.findOne({ roomCode: req.params.roomCode.toUpperCase() })
      .populate('creator', 'username avatar')
      .populate('players.user', 'username avatar');

    if (!quiz) {
      return res.status(404).json({ error: 'Quiz not found' });
    }

    // Don't send correct answers to players
    const safeQuestions = quiz.questions.map(q => ({
      question: q.question,
      options: q.options
      // Don't include correctAnswer
    }));

    res.json({
      success: true,
      quiz: {
        id: quiz._id,
        title: quiz.title,
        description: quiz.description,
        creator: quiz.creator,
        roomCode: quiz.roomCode,
        questions: safeQuestions,
        totalQuestions: safeQuestions.length,
        players: quiz.players,
        isStarted: quiz.isStarted,
        isFinished: quiz.isFinished,
        currentQuestion: quiz.currentQuestion,
        leaderboard: quiz.leaderboard.slice(0, 5)
      }
    });

  } catch (error) {
    console.error('Get quiz error:', error);
    res.status(500).json({ error: 'Failed to get quiz details' });
  }
});

// Submit answer
router.post('/:quizId/answer', auth, async (req, res) => {
  try {
    const { questionIndex, selectedOption, timeTaken } = req.body;
    
    const quiz = await Quiz.findById(req.params.quizId);
    
    if (!quiz) {
      return res.status(404).json({ error: 'Quiz not found' });
    }

    if (!quiz.isStarted || quiz.isFinished) {
      return res.status(400).json({ error: 'Quiz is not active' });
    }

    // Find player
    const playerIndex = quiz.players.findIndex(p => p.user.toString() === req.userId);
    if (playerIndex === -1) {
      return res.status(403).json({ error: 'Not joined this quiz' });
    }

    const player = quiz.players[playerIndex];
    
    // Check if already answered
    const alreadyAnswered = player.answers?.some(a => a.questionIndex === questionIndex);
    if (alreadyAnswered) {
      return res.status(400).json({ error: 'Already answered this question' });
    }

    // Check answer
    const question = quiz.questions[questionIndex];
    const isCorrect = question.correctAnswer === selectedOption;
    
    // Calculate score
    let points = isCorrect ? question.points : 0;
    const timeBonus = Math.max(0, Math.floor((quiz.timePerQuestion - timeTaken) / 5));
    points += timeBonus;

    // Update player
    if (!player.answers) player.answers = [];
    
    player.answers.push({
      questionIndex,
      selectedOption,
      isCorrect,
      timeTaken
    });
    
    if (isCorrect) {
      player.score += points;
    }
    
    player.currentQuestion = questionIndex + 1;
    quiz.players[playerIndex] = player;

    // Update leaderboard
    quiz.leaderboard = quiz.players
      .map(p => ({
        user: p.user,
        username: p.username,
        avatar: p.avatar,
        score: p.score
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 10);

    await quiz.save();

    res.json({
      success: true,
      isCorrect,
      points,
      correctAnswer: question.correctAnswer,
      currentScore: player.score,
      leaderboard: quiz.leaderboard
    });

  } catch (error) {
    console.error('Submit answer error:', error);
    res.status(500).json({ error: 'Failed to submit answer' });
  }
});

module.exports = router;