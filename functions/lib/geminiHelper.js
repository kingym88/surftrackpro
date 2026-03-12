"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.callGeminiRaw = void 0;
async function callGeminiRaw(prompt, temperature = 0.7, maxOutputTokens = 1024) {
    var _a, _b, _c, _d;
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey)
        throw new Error('GEMINI_API_KEY not set');
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
    const candidate = (_a = data.candidates) === null || _a === void 0 ? void 0 : _a[0];
    if (!candidate || !candidate.content) {
        throw new Error('No candidates returned from Gemini');
    }
    return (_d = (_c = (_b = candidate.content.parts) === null || _b === void 0 ? void 0 : _b[0]) === null || _c === void 0 ? void 0 : _c.text) !== null && _d !== void 0 ? _d : '';
}
exports.callGeminiRaw = callGeminiRaw;
//# sourceMappingURL=geminiHelper.js.map