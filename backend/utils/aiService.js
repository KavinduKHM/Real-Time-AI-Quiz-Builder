const { OpenAI } = require('openai');

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

class AIService {
  async generateQuizFromText(text, numQuestions = 10) {
    try {
      const prompt = `
      Based on the following text, generate ${numQuestions} multiple-choice quiz questions.
      Each question should have 4 options (a, b, c, d) with exactly one correct answer.
      Format your response as a valid JSON array.

      Text:
      ${text.substring(0, 4000)} // Limit text length

      Response format:
      [
        {
          "question": "Question text here?",
          "options": ["Option A", "Option B", "Option C", "Option D"],
          "correctAnswer": 0 // Index of correct option (0-3)
        }
      ]
      `;

      const response = await openai.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: [
          {
            role: "system",
            content: "You are a quiz generator. Generate educational quiz questions from given text. Always respond with valid JSON."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        temperature: 0.7,
        max_tokens: 2000
      });

      const content = response.choices[0].message.content;
      
      // Extract JSON from response
      const jsonMatch = content.match(/\[[\s\S]*\]/);
      if (!jsonMatch) {
        throw new Error('Invalid response format from AI');
      }

      const questions = JSON.parse(jsonMatch[0]);

      // Validate questions
      return questions.map((q, index) => ({
        question: q.question,
        options: q.options,
        correctAnswer: q.correctAnswer,
        points: 10
      }));

    } catch (error) {
      console.error('AI Generation Error:', error);

      // Surface quota/plan issues with a clearer message
      if (error?.code === 'insufficient_quota' || error?.status === 429) {
        throw new Error(
          'AI quota exceeded. Please check your OpenAI plan and billing settings.'
        );
      }

      throw new Error('Failed to generate quiz questions');
    }
  }

  parseAIResponse(response) {
    // Parse the text response into structured questions
    const questions = [];
    const lines = response.split('\n').filter(line => line.trim());
    
    lines.forEach(line => {
      if (line.includes('?')) {
        questions.push({
          question: line.trim(),
          options: ['True', 'False', 'Maybe', 'Not sure'],
          correctAnswer: 0,
          points: 10
        });
      }
    });
    
    return questions.slice(0, 10);
  }
}

module.exports = new AIService();