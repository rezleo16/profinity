const readline = require('readline/promises');
const { stdin: input, stdout: output } = require('process');

const API_BASE_URL = 'http://localhost:3000/api';

async function makeRequest(endpoint, method, bodyData) {
  try {
    const response = await fetch(`${API_BASE_URL}/${endpoint}`, {
      method: method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(bodyData)
    });
    
    const result = await response.json();
    console.log('\n--- API RESPONSE ---');
    console.log(JSON.stringify(result, null, 2));
    console.log('--------------------\n');
  } catch (error) {
    console.error('\n❌ Error connecting to the server:', error.message, '\n');
  }
}

async function startConsole() {
  const rl = readline.createInterface({ input, output });
  
  while (true) {
    console.log('--- Profanity API Tester ---');
    console.log('1. Check a message for profanity');
    console.log('2. Add a new word/phrase');
    console.log('3. Remove a word/phrase');
    console.log('4. Exit');
    
    const choice = await rl.question('Choose an option (1-4): ');
    
    if (choice === '4') {
      console.log('Goodbye!');
      rl.close();
      break;
    }
    
    switch (choice) {
      case '1': {
        const message = await rl.question('Enter the message to check: ');
        await makeRequest('check-message', 'POST', { message });
        break;
      }
      case '2': {
        const phrase = await rl.question('Enter the phrase to ADD: ');
        await makeRequest('add-profanity', 'POST', { phrase });
        break;
      }
      case '3': {
        const phrase = await rl.question('Enter the phrase to REMOVE: ');
        await makeRequest('remove-profanity', 'DELETE', { phrase });
        break;
      }
      default:
        console.log('\n❌ Invalid choice. Please enter a number between 1 and 4.\n');
    }
  }
}

startConsole();