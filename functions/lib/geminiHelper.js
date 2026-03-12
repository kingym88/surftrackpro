"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.callGeminiRaw = void 0;
const node_fetch_1 = __importDefault(require("node-fetch"));
async function callGeminiRaw(prompt, temperature = 0.7, maxOutputTokens = 1024) {
    var _a, _b, _c, _d, _e, _f;
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey)
        throw new Error('GEMINI_API_KEY not set');
    const response = await (0, node_fetch_1.default)(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { responseMimeType: 'application/json', temperature, maxOutputTokens },
        }),
    });
    if (!response.ok)
        throw new Error(`Gemini error: ${response.status}`);
    const data = await response.json();
    return (_f = (_e = (_d = (_c = (_b = (_a = data === null || data === void 0 ? void 0 : data.candidates) === null || _a === void 0 ? void 0 : _a[0]) === null || _b === void 0 ? void 0 : _b.content) === null || _c === void 0 ? void 0 : _c.parts) === null || _d === void 0 ? void 0 : _d[0]) === null || _e === void 0 ? void 0 : _e.text) !== null && _f !== void 0 ? _f : '{}';
}
exports.callGeminiRaw = callGeminiRaw;
//# sourceMappingURL=geminiHelper.js.map