async function testAI() {
  try {
    const response = await fetch('https://text.pollinations.ai/openai', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages: [
          {
            role: 'user',
            content: 'Responda estritamente no formato JSON: {"columns": [{"title": "A Fazer", "cards": [{"title": "Tarefa 1"}]}]}'
          }
        ]
      })
    });
    const data = await response.json();
    console.log('POLLINATIONS TEST RESULT:', JSON.stringify(data, null, 2));
  } catch (err) {
    console.error('POLLINATIONS TEST ERROR:', err);
  }
}
testAI();
