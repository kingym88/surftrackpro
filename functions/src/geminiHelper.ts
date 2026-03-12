export async function callGeminiRaw(prompt: string, temperature = 0.7, maxOutputTokens = 1024): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error('GEMINI_API_KEY not set');

  const url = `https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash:generateContent?key=${apiKey}`;

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { 
        temperature, 
        maxOutputTokens,
        // Adding a stop sequence or topP here is often helpful for 2.0 models
      },
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Gemini error: ${response.status} - ${errorBody}`);
  }

  const data = await response.json();
  
  // Extract text safely
  const candidate = data.candidates?.[0];
  if (!candidate || !candidate.content) {
    throw new Error('No candidates returned from Gemini');
  }

  return candidate.content.parts?.[0]?.text ?? '';
}