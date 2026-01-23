// backend/test-phi.js
require('dotenv').config();
const aiService = require('./utils/aiService');

async function testPhi() {
  console.log('🧪 Testing Phi 2.7b AI Integration\n');
  
  const testText = `
    Photosynthesis is the process by which plants convert sunlight into energy.
    They use chlorophyll to capture light energy.
    The process produces oxygen as a byproduct.
    Plants need water and carbon dioxide for photosynthesis.
    This process is essential for life on Earth.
  `;
  
  console.log('📝 Test Text:');
  console.log(testText);
  console.log('\n🤖 Generating quiz questions with Phi 2.7b...\n');
  
  try {
    const startTime = Date.now();
    const questions = await aiService.generateQuizFromText(testText, 3);
    const timeTaken = Date.now() - startTime;
    
    console.log(`✅ Success! Generated ${questions.length} questions in ${timeTaken}ms\n`);
    
    questions.forEach((q, i) => {
      console.log(`${i + 1}. ${q.question}`);
      q.options.forEach((opt, j) => {
        const marker = j === q.correctAnswer ? '✓' : ' ';
        console.log(`   ${marker} ${String.fromCharCode(65 + j)}. ${opt}`);
      });
      console.log('');
    });
    
    // Test Phi connection
    console.log('🔍 Testing Ollama connection...');
    const response = await fetch('http://localhost:11434/api/tags');
    if (response.ok) {
      const data = await response.json();
      console.log('✅ Ollama running. Models:', data.models.map(m => m.name).join(', '));
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.log('\n🔧 TROUBLESHOOTING:');
    console.log('1. Is Ollama installed? (ollama.com)');
    console.log('2. Run: ollama serve (in terminal)');
    console.log('3. Download Phi: ollama pull phi:2.7b');
    console.log('4. Test: curl http://localhost:11434/api/tags');
    console.log('5. Check firewall/antivirus settings');
  }
}

testPhi();