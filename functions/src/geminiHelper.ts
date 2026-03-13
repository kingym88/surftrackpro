export async function callGeminiRaw(prompt: string, temperature = 0.7, maxOutputTokens = 2048): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error('GEMINI_API_KEY not set');

  // 1. CHANGED to v1beta to support Gemini 2.5 Flash features
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { 
        temperature, 
        maxOutputTokens,
        // 2. CHANGED to camelCase to prevent the 400 error
        responseMimeType: "application/json",
        // 3. CORRECT nesting and camelCase to disable the reasoning phase
        thinkingConfig: {
          thinkingBudget: 0
        }
      },
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Gemini error: ${response.status} - ${errorBody}`);
  }

  const data = await response.json();
  
  const candidate = data.candidates?.[0];
  if (!candidate || !candidate.content) {
    throw new Error('No candidates returned from Gemini');
  }

  return candidate.content.parts?.[0]?.text ?? '';
}