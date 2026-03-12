import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import fetch from 'node-fetch';

admin.initializeApp();

export const callGemini = functions.https.onCall(async (data, context) => {
  // Auth check — only signed-in users
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Must be signed in.');
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new functions.https.HttpsError('internal', 'Gemini API key not configured.');
  }

  const { prompt, temperature = 0.7, maxOutputTokens = 1024 } = data;

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          responseMimeType: 'application/json',
          temperature,
          maxOutputTokens,
        },
      }),
    }
  );

  if (!response.ok) {
    throw new functions.https.HttpsError('internal', `Gemini error: ${response.status}`);
  }

  const result = await response.json() as any;
  return { text: result?.candidates?.[0]?.content?.parts?.[0]?.text ?? '{}' };
});
