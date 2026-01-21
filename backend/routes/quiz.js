const express = require('express');
const router = express.Router();
const Quiz = require('../models/Quiz');
const User = require('../models/User');
const aiService = require('../utils/aiService');
const auth = require('../middleware/auth');

// Create new quiz
router.post('/create', auth, async (req, res) => {
  try {
    const { title, description, fileUrl, fileText, numQuestions = 10 } = req.body;
    // Fallback: if no text was extracted from the file (e.g. PDF parsing disabled),
    // use title + description as the source text so quiz generation can still proceed.
    const baseTextParts = [];
    if (typeof title === 'string') baseTextParts.push(title);
    if (typeof description === 'string') baseTextParts.push(description);
    const fallbackText = baseTextParts.join('. ').trim();

    const sourceText =
      typeof fileText === 'string' && fileText.trim()
        ? fileText
        : fallbackText;

    if (!sourceText) {
      return res.status(400).json({
        error:
          'No usable text was provided to generate quiz questions. Please add a title/description or try a different document.'
      });
    }

    // Generate quiz questions using AI
    const questions = await aiService.generateQuizFromText(sourceText, numQuestions);

    // Create quiz
    const quiz = new Quiz({
      title,
      description,
      creator: req.user.id,
      fileUrl,
      fileText: sourceText.substring(0, 1000), // Store first 1000 chars
      questions,
      maxPlayers: 10,
      timePerQuestion: 30
    });

    await quiz.save();

    // Add to user's created quizzes
    await User.findByIdAndUpdate(req.user.id, {
      $push: { quizzesCreated: quiz._id }
    });

    res.json({
      success: true,
      quiz: {
        id: quiz._id,
        title: quiz.title,
        roomCode: quiz.roomCode,
        questions: quiz.questions.length
      }
    });

  } catch (error) {
    console.error('Create quiz error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Join quiz
router.post('/join', auth, async (req, res) => {
  try {
    const { roomCode } = req.body;

    const quiz = await Quiz.findOne({ roomCode, isActive: true });
    
    if (!quiz) {
      return res.status(404).json({ error: 'Quiz not found or inactive' });
    }

    if (quiz.players.length >= quiz.maxPlayers) {
      return res.status(400).json({ error: 'Quiz room is full' });
    }

    // Check if already joined
    const alreadyJoined = quiz.players.find(p => p.user.toString() === req.user.id);
    if (alreadyJoined) {
      return res.status(400).json({ error: 'Already joined this quiz' });
    }

    // Add player to quiz
    quiz.players.push({
      user: req.user.id,
      score: 0,
      currentQuestion: 0,
      answers: []
    });

    await quiz.save();

    // Add to user's joined quizzes
    await User.findByIdAndUpdate(req.user.id, {
      $push: { quizzesJoined: quiz._id }
    });

    res.json({
      success: true,
      quiz: {
        id: quiz._id,
        title: quiz.title,
        players: quiz.players.length,
        isStarted: quiz.isStarted
      }
    });

  } catch (error) {
    console.error('Join quiz error:', error);
    res.status(500).json({ error: error.message });
  }
});


// Get quiz details
router.get('/:roomCode', auth, async (req, res) => {
  try {
    const quiz = await Quiz.findOne({ roomCode: req.params.roomCode })
      .populate('creator', 'username avatar')
      .populate('players.user', 'username avatar');

    if (!quiz) {
      return res.status(404).json({ error: 'Quiz not found' });
    }

    res.json({
      success: true,
      quiz: {
        id: quiz._id,
        title: quiz.title,
        description: quiz.description,
        creator: quiz.creator,
        roomCode: quiz.roomCode,
        players: quiz.players,
        questions: quiz.questions.length,
        isStarted: quiz.isStarted,
        isFinished: quiz.isFinished,
        currentQuestion: quiz.currentQuestion,
        leaderboard: quiz.leaderboard
      }
    });

  } catch (error) {
    console.error('Get quiz error:', error);
    res.status(500).json({ error: error.message });
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
    const playerIndex = quiz.players.findIndex(p => p.user.toString() === req.user.id);
    if (playerIndex === -1) {
      return res.status(403).json({ error: 'Not joined this quiz' });
    }

    const player = quiz.players[playerIndex];
    
    // Check if already answered this question
    const alreadyAnswered = player.answers.find(a => a.questionIndex === questionIndex);
    if (alreadyAnswered) {
      return res.status(400).json({ error: 'Already answered this question' });
    }

    // Check if correct
    const question = quiz.questions[questionIndex];
    const isCorrect = question.correctAnswer === selectedOption;
    
    // Calculate score with time bonus
    let points = isCorrect ? question.points : 0;
    const timeBonus = Math.max(0, Math.floor((quiz.timePerQuestion - timeTaken) / 5));
    points += timeBonus;

    // Update player
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
    await quiz.save();

    // Update leaderboard
    await updateLeaderboard(quiz);

    res.json({
      success: true,
      isCorrect,
      points,
      correctAnswer: question.correctAnswer,
      currentScore: player.score
    });

  } catch (error) {
    console.error('Submit answer error:', error);
    res.status(500).json({ error: error.message });
  }
});


// Function to update leaderboard
async function updateLeaderboard(quiz) {
  // Sort players by score
  quiz.leaderboard = quiz.players
    .map(player => ({
      user: player.user,
      username: player.user.username,
      score: player.score,
      avatar: player.user.avatar
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 10); // Top 10

  await quiz.save();
}

module.exports = router;

