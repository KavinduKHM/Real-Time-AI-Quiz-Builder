// backend/utils/ollamaHealth.js
const fetch = require('node-fetch');

class OllamaHealth {
  constructor() {
    this.ollamaUrl = process.env.OLLAMA_URL || 'http://localhost:11434';
    this.model = process.env.OLLAMA_MODEL || 'phi:2.7b';
  }

  async checkHealth() {
    try {
      // Check if Ollama is running
      const tagsResponse = await fetch(`${this.ollamaUrl}/api/tags`, {
        timeout: 3000
      });

      if (!tagsResponse.ok) {
        return {
          status: 'offline',
          message: `Ollama not running at ${this.ollamaUrl}`,
          fix: 'Run: ollama serve (in terminal)'
        };
      }

      const tagsData = await tagsResponse.json();
      const models = tagsData.models || [];
      
      // Check for Phi model
      const hasPhi = models.some(m => m.name.includes('phi'));
      
      if (!hasPhi) {
        return {
          status: 'no_model',
          message: `Phi model not found. Available: ${models.map(m => m.name).join(', ')}`,
          fix: 'Run: ollama pull phi:2.7b'
        };
      }

      // Test Phi with a simple prompt
      const testResponse = await fetch(`${this.ollamaUrl}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: this.model,
          prompt: 'Say "OK"',
          stream: false,
          options: { num_predict: 5 }
        }),
        timeout: 10000
      });

      if (testResponse.ok) {
        const testData = await testResponse.json();
        return {
          status: 'healthy',
          message: 'Phi 2.7b is working',
          model: this.model,
          responseTime: 'good',
          sampleResponse: testData.response?.substring(0, 50)
        };
      } else {
        return {
          status: 'error',
          message: 'Phi responded with error',
          code: testResponse.status
        };
      }

    } catch (error) {
      return {
        status: 'error',
        message: error.message,
        commonIssues: [
          'Ollama not installed: https://ollama.com',
          'Phi model not downloaded: ollama pull phi:2.7b',
          'Firewall blocking port 11434',
          'Run as administrator (Windows)'
        ]
      };
    }
  }

  async ensureReady() {
    console.log('🔍 Checking Ollama Phi 2.7b...');
    
    const health = await this.checkHealth();
    
    switch (health.status) {
      case 'healthy':
        console.log('✅ Phi 2.7b is ready!');
        break;
        
      case 'offline':
        console.log('❌ Ollama is not running');
        console.log('💡 Run this command in a new terminal:');
        console.log('   ollama serve');
        break;
        
      case 'no_model':
        console.log('❌ Phi model not found');
        console.log('💡 Download it with:');
        console.log('   ollama pull phi:2.7b');
        break;
        
      default:
        console.log('⚠️  Ollama issue:', health.message);
    }
    
    return health;
  }
}

module.exports = new OllamaHealth();