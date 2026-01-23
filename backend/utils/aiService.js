// backend/utils/aiService.js - Optimized for Phi 2.7b
const fetch = require('node-fetch');

class AIService {
  constructor() {
    this.ollamaUrl = process.env.OLLAMA_URL || 'http://localhost:11434';
    this.model = process.env.OLLAMA_MODEL || 'phi:2.7b';
    this.maxTextLength = 2000; // Phi works best with shorter text
  }

  /**
   * Main method to generate quiz questions using Phi 2.7b
   */
  async generateQuizFromText(text, numQuestions = 10) {
    console.log(`🤖 Using Phi 2.7b (FREE) to generate ${numQuestions} questions...`);
    
    try {
      // Clean and prepare text for Phi
      const preparedText = this.prepareTextForPhi(text);
      
      // Generate with Phi
      const questions = await this.generateWithPhi(preparedText, numQuestions);
      
      if (questions && questions.length > 0) {
        console.log(`✅ Phi generated ${questions.length} questions`);
        return questions;
      }
      
      // Fallback if Phi returns empty
      return this.generateBasicQuestions(preparedText, numQuestions);
      
    } catch (error) {
      console.error('Phi generation failed:', error.message);
      return this.generateBasicQuestions(text, numQuestions);
    }
  }

  /**
   * Generate questions using Phi 2.7b (optimized for small model)
   */
  async generateWithPhi(text, numQuestions) {
    const prompt = this.createPhiPrompt(text, numQuestions);
    
    console.log(`📤 Sending request to Phi...`);
    
    const response = await fetch(`${this.ollamaUrl}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: this.model,
        prompt: prompt,
        stream: false,
        options: {
          temperature: 0.8, // Slightly higher for creativity
          num_predict: 1500, // Limit tokens for faster response
          top_k: 40,
          top_p: 0.9,
          repeat_penalty: 1.1
        }
      }),
      timeout: 30000 // 30 second timeout
    });

    if (!response.ok) {
      throw new Error(`Phi API error: ${response.status} - ${response.statusText}`);
    }

    const data = await response.json();
    console.log(`📥 Phi response received (${data.response?.length || 0} chars)`);
    
    return this.parsePhiResponse(data.response || '', numQuestions);
  }

  /**
   * Create optimized prompt for Phi 2.7b
   */
  createPhiPrompt(text, numQuestions) {
    return `You are a quiz question generator. Create exactly ${numQuestions} multiple-choice questions based on the text below.

TEXT:
${text}

INSTRUCTIONS:
1. Create ${numQuestions} questions
2. Each question must have 4 options labeled A, B, C, D
3. Only one correct answer per question
4. Make questions directly related to the text
5. Format output as JSON

REQUIRED JSON FORMAT:
[
  {
    "question": "Question text?",
    "options": ["A) Option 1", "B) Option 2", "C) Option 3", "D) Option 4"],
    "correct": "A"
  }
]

Generate ${numQuestions} questions now. Return ONLY the JSON array:`;
  }

  /**
   * Parse Phi's response (Phi sometimes needs simpler parsing)
   */
  parsePhiResponse(response, numQuestions) {
    try {
      // Try to find JSON array
      const jsonMatch = response.match(/\[\s*{[\s\S]*?}\s*\]/);
      
      if (!jsonMatch) {
        console.log('No JSON found, extracting questions from text');
        return this.extractQuestionsFromPhiText(response, numQuestions);
      }
      
      let questions;
      try {
        questions = JSON.parse(jsonMatch[0]);
      } catch (e) {
        // Try to fix common JSON issues
        const fixedJson = jsonMatch[0]
          .replace(/'/g, '"')
          .replace(/(\w+):/g, '"$1":')
          .replace(/,\s*}/g, '}');
        
        questions = JSON.parse(fixedJson);
      }
      
      // Convert to our format
      return questions.map((q, index) => {
        let correctIndex = 0;
        
        // Parse correct answer (could be "A", "B", etc.)
        if (q.correct) {
          const letter = q.correct.trim().toUpperCase().charAt(0);
          correctIndex = 'ABCD'.indexOf(letter);
          if (correctIndex === -1) correctIndex = 0;
        }
        
        // Ensure 4 options
        let options = q.options || [];
        while (options.length < 4) {
          options.push(`Option ${options.length + 1}`);
        }
        if (options.length > 4) options = options.slice(0, 4);
        
        // Remove option labels (A), B), etc.
        options = options.map(opt => {
          return opt.replace(/^[A-D]\)\s*/, '').replace(/^[A-D]\.\s*/, '');
        });
        
        return {
          question: q.question || `Question ${index + 1}?`,
          options: options,
          correctAnswer: correctIndex,
          points: 10
        };
      }).slice(0, numQuestions);
      
    } catch (error) {
      console.error('Failed to parse Phi response:', error.message);
      return this.extractQuestionsFromPhiText(response, numQuestions);
    }
  }

  /**
   * Extract questions from Phi's text response
   */
  extractQuestionsFromPhiText(text, numQuestions) {
    const questions = [];
    const lines = text.split('\n');
    
    let currentQuestion = null;
    let optionCount = 0;
    
    for (const line of lines) {
      const trimmedLine = line.trim();
      
      // Look for question pattern (Q1, 1., etc.)
      if (trimmedLine.match(/^(Q\d+|Question\s*\d+|\d+[\.\)])\s+.+\?/i)) {
        if (currentQuestion && currentQuestion.options.length >= 2) {
          questions.push(currentQuestion);
          if (questions.length >= numQuestions) break;
        }
        
        // Extract question text
        const questionText = trimmedLine
          .replace(/^(Q\d+|Question\s*\d+|\d+[\.\)])\s*/i, '')
          .trim();
        
        currentQuestion = {
          question: questionText,
          options: [],
          correctAnswer: 0,
          points: 10
        };
        optionCount = 0;
        
      } else if (currentQuestion && trimmedLine.match(/^[A-D][\.\)]\s+.+/i)) {
        // Found an option
        const optionText = trimmedLine
          .replace(/^[A-D][\.\)]\s*/i, '')
          .trim();
        
        currentQuestion.options.push(optionText);
        optionCount++;
        
        // Mark as correct if indicated
        if (trimmedLine.toLowerCase().includes('correct') || trimmedLine.includes('✓')) {
          currentQuestion.correctAnswer = currentQuestion.options.length - 1;
        }
        
        // If we have 4 options, add the question
        if (optionCount === 4) {
          questions.push(currentQuestion);
          if (questions.length >= numQuestions) break;
          currentQuestion = null;
        }
      }
    }
    
    // Add last question if exists
    if (currentQuestion && currentQuestion.options.length >= 2) {
      // Fill missing options
      while (currentQuestion.options.length < 4) {
        currentQuestion.options.push(`Option ${currentQuestion.options.length + 1}`);
      }
      questions.push(currentQuestion);
    }
    
    return questions.length > 0 ? questions : this.generateBasicQuestions(text, numQuestions);
  }

  /**
   * Prepare text for Phi (Phi works better with concise text)
   */
  prepareTextForPhi(text) {
    // Clean text
    let cleaned = text
      .replace(/\s+/g, ' ')
      .replace(/[^\w\s.,!?;:'"-]/g, '')
      .trim();
    
    // Limit to first few sentences for Phi
    const sentences = cleaned.split(/[.!?]+/);
    const relevantSentences = sentences
      .filter(s => s.trim().length > 10)
      .slice(0, 8)
      .map(s => s.trim() + '.');
    
    return relevantSentences.join(' ');
  }

  /**
   * Basic fallback question generation
   */
  generateBasicQuestions(text, numQuestions) {
    console.log('🔄 Using basic question generation');
    
    const sentences = text.split(/[.!?]+/)
      .filter(s => s.trim().length > 20)
      .map(s => s.trim());
    
    const questions = [];
    
    for (let i = 0; i < Math.min(numQuestions, sentences.length); i++) {
      const sentence = sentences[i];
      const words = sentence.split(' ');
      
      if (words.length > 4) {
        // Create fill-in-the-blank
        const blankIndex = Math.floor(Math.random() * (words.length - 2)) + 1;
        const correctWord = words[blankIndex];
        
        const options = [
          correctWord,
          this.getSimilarWord(correctWord),
          this.getRandomWord(),
          this.getRandomWord()
        ].sort(() => Math.random() - 0.5);
        
        const correctIndex = options.indexOf(correctWord);
        
        words[blankIndex] = '_____';
        const questionText = words.join(' ');
        
        questions.push({
          question: `Complete: "${questionText}"`,
          options: options,
          correctAnswer: correctIndex,
          points: 10
        });
      }
    }
    
    // Add generic questions if needed
    while (questions.length < numQuestions) {
      questions.push({
        question: `Question ${questions.length + 1}: What is the main idea?`,
        options: ['Option A', 'Option B', 'Option C', 'Option D'],
        correctAnswer: Math.floor(Math.random() * 4),
        points: 10
      });
    }
    
    return questions.slice(0, numQuestions);
  }

  /**
   * Helper functions
   */
  getSimilarWord(word) {
    const similar = {
      'the': 'a', 'is': 'was', 'are': 'were', 'have': 'has',
      'not': 'no', 'and': 'or', 'but': 'yet', 'because': 'since',
      'very': 'extremely', 'big': 'large', 'small': 'tiny',
      'good': 'excellent', 'bad': 'poor', 'fast': 'quick'
    };
    return similar[word.toLowerCase()] || this.getRandomWord();
  }

  getRandomWord() {
    const words = ['True', 'False', 'Maybe', 'Sometimes', 'Always', 'Never'];
    return words[Math.floor(Math.random() * words.length)];
  }
}

// Export instance
module.exports = new AIService();