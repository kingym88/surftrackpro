"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.dailySwellAlert = exports.callGemini = void 0;
const admin = __importStar(require("firebase-admin"));
const scheduler_1 = require("firebase-functions/v2/scheduler");
const https_1 = require("firebase-functions/v2/https");
const params_1 = require("firebase-functions/params");
const geminiHelper_1 = require("./geminiHelper");
const geminiApiKey = (0, params_1.defineSecret)('GEMINI_API_KEY');
admin.initializeApp();
async function requireAuth(req, res, next) {
    var _a;
    const authHeader = (_a = req.headers.authorization) !== null && _a !== void 0 ? _a : '';
    const idToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
    if (!idToken) {
        res.status(401).json({ error: 'Unauthenticated' });
        return;
    }
    try {
        await admin.auth().verifyIdToken(idToken);
    }
    catch (_b) {
        res.status(401).json({ error: 'Invalid or expired token' });
        return;
    }
    await next();
}
exports.callGemini = (0, https_1.onRequest)({
    cors: ['https://surftrack-pro.web.app', 'http://localhost:5173'],
    secrets: [geminiApiKey],
    region: 'us-central1',
}, (req, res) => requireAuth(req, res, async () => {
    const { data } = req.body;
    const { type, payload } = data !== null && data !== void 0 ? data : {};
    if (!type || !payload) {
        res.status(400).json({ error: 'Missing type or payload' });
        return;
    }
    let prompt;
    let temperature = 0.7;
    let maxOutputTokens = 1024;
    switch (type) {
        case 'SPOT_ANALYSIS':
            prompt = buildSpotAnalysisPrompt(payload);
            break;
        case 'SURF_MATCH':
            prompt = buildSurfMatchPrompt(payload);
            temperature = 0.6;
            break;
        case 'SESSION_NOTE':
            prompt = buildSessionNotePrompt(payload);
            temperature = 0.8;
            maxOutputTokens = 256;
            break;
        case 'SKILL_COACH':
            prompt = buildSkillCoachPrompt(payload);
            maxOutputTokens = 512;
            break;
        case 'SWELL_ALERT':
            prompt = buildSwellAlertPrompt(payload);
            temperature = 0.5;
            maxOutputTokens = 256;
            break;
        default:
            res.status(400).json({ error: `Unknown type: ${type}` });
            return;
    }
    if (prompt.length > 12000) {
        res.status(400).json({ error: 'Payload too large.' });
        return;
    }
    try {
        const text = await (0, geminiHelper_1.callGeminiRaw)(prompt, temperature, maxOutputTokens);
        res.json({ result: { text } });
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
}));
// ─── Prompt builders ──────────────────────────────────────────────────────────
function buildSpotAnalysisPrompt(p) {
    var _a, _b, _c, _d;
    return `You are an expert surf coach and meteorologist analysing surf forecasts.

SPOT PROFILE:
- Break type: ${p.breakType}
- Facing direction: ${p.facingDirection}
- Optimal swell direction: ${p.optimalSwellDirection}
- Optimal tide phase: ${p.optimalTidePhase}
- Best wind direction (offshore): ${p.optimalWindDirection}

SURFER PREFERENCE:
${(_a = p.wavePreference) !== null && _a !== void 0 ? _a : 'No specific wave height preference set.'}

7-DAY FORECAST DATA (daylight hours only):
${p.forecastSummary}

RECENT SESSION HISTORY:
${(_b = p.historyText) !== null && _b !== void 0 ? _b : 'No previous sessions logged.'}
${(_c = p.boardsUsedText) !== null && _c !== void 0 ? _c : ''}${(_d = p.detectedPatternsText) !== null && _d !== void 0 ? _d : ''}

TASK: Analyse the forecast data and identify the best 1–3 session windows in the next 7 days. Consider wave height and period quality, wind direction (offshore is best), swell direction alignment, tide phase match, surfer's preferred wave height range, and pattern comparison with past sessions. Only recommend daylight hours. Factor in energy levels and crowd data from past sessions. Consider board choices.

Respond ONLY with valid JSON in this exact format (no markdown, no extra text):
{
  "bestWindows": [
    {"startTime": "ISO8601_datetime", "endTime": "ISO8601_datetime", "reason": "2-3 sentence explanation in plain surfer language"},
    ...
  ],
  "summary": "2-3 sentence overall forecast summary for this spot this week, in plain surfer language"
}`;
}
function buildSurfMatchPrompt(p) {
    var _a;
    return `You are an elite virtual surf coach analysing a spot's 7-day forecast.
  
SPOT PROFILE:
- Optimal Swell: ${p.optimalSwellDirection}
- Optimal Wind: ${p.optimalWindDirection}
- Pre-filtered Best Windows (one per day):
${p.daySummaries}

USER PREF: ${(_a = p.userPrefs) !== null && _a !== void 0 ? _a : 'No preference set.'}

TASK:
Provide exactly one short, punchy sentence (max 15 words) per day giving a qualitative coaching opinion on that day's specific condition.
Speak naturally like a surfer. Do not include the date or introductory phrases.

Respond ONLY with a valid JSON Record<string, string> where the key is the YYYY-MM-DD date and the value is the sentence.
Example format:
{
  "2026-03-01": "Punchy and offshore all morning, grab the shorty.",
  "2026-03-02": "Blowing heavy onshore, might be blown out."
}`;
}
function buildSessionNotePrompt(p) {
    return `You are helping a surfer write a quick session diary note.

SESSION FACTS:
- Spot: ${p.spotName}
- Rating: ${p.rating}/5
- Duration: ${p.durationHours} hours
- Wave count: ${p.waveCount}
- Conditions: ${p.waveHeight}m waves @ ${p.wavePeriod}s, wind ${p.windSpeed}km/h, tide ${p.tideType} (${p.tide}m)
${p.board ? `- Board: ${p.board}` : ''}

Write a 2–3 sentence personal surf diary note in first person. 
Sound like a real surfer — casual, honest, descriptive. 
Reference the conditions and session stats. Do not start with "I had".
Do not add quotes around the note.

Respond ONLY with valid JSON: { "note": "your draft note here" }`;
}
function buildSkillCoachPrompt(p) {
    return `You are an expert surf coach reviewing a surfer's progression log.

HOME BREAK: ${p.homeSpotName}
TIMEFRAME: Last ${p.timeframe === 'ALL' ? 'all time' : p.timeframe + ' days'}
RECENT SESSIONS (most recent first):
${p.sessionSummary}

COMPUTED TREND: ${p.trend}

Give a 3–4 sentence coaching analysis. Be specific — reference actual session data (dates, wave heights, boards used). 
Identify one clear strength and one actionable area to improve. End with a motivating but realistic next goal.
Use plain surfer language — honest, direct, not patronising.

Respond ONLY with valid JSON: { "analysis": "your coaching analysis here" }`;
}
function buildSwellAlertPrompt(p) {
    return `You are a surf coach. Based on this 24-hour forecast for a surfer's home break, 
decide if there is a genuinely good surf window today worth alerting them about. 
Only say YES if conditions are clearly above average (good swell, offshore wind, decent period).

FORECAST (next 24h):
${p.forecastSummary}

Respond ONLY with valid JSON:
{
  "shouldAlert": true | false,
  "window": "e.g. 7am–9am",
  "message": "One short sentence (max 15 words) in surfer language describing why it's worth going out."
}`;
}
exports.dailySwellAlert = (0, scheduler_1.onSchedule)('every day 06:00', async () => {
    const db = admin.firestore();
    const messaging = admin.messaging();
    const usersSnap = await db.collection('users').get();
    for (const userDoc of usersSnap.docs) {
        const userData = userDoc.data();
        const uid = userDoc.id;
        const homeSpotId = userData.homeSpotId;
        if (!homeSpotId)
            continue;
        const tokensSnap = await db.collection(`users/${uid}/fcmTokens`).get();
        if (tokensSnap.empty)
            continue;
        const tokens = tokensSnap.docs.map(d => d.data().token);
        const forecastSnap = await db.collection(`spots/${homeSpotId}/forecasts`).limit(56).get();
        if (forecastSnap.empty)
            continue;
        const forecastsDoc = forecastSnap.docs[0];
        const forecasts = forecastsDoc.data().data || forecastsDoc.data();
        if (!Array.isArray(forecasts))
            continue;
        const next24hForecasts = forecasts.filter((f) => {
            const fTime = new Date(f.forecastHour).getTime();
            const now = Date.now();
            return fTime >= now && fTime <= now + 24 * 60 * 60 * 1000;
        });
        if (next24hForecasts.length === 0)
            continue;
        const forecastSummaryStr = next24hForecasts.map((f) => `${f.forecastHour}: ${f.waveHeight.toFixed(1)}m @ ${f.wavePeriod.toFixed(0)}s, wind ${f.windSpeed.toFixed(0)}km/h from ${f.windDirection}°`).join('\n');
        try {
            const rawText = await (0, geminiHelper_1.callGeminiRaw)(buildSwellAlertPrompt({ forecastSummary: forecastSummaryStr }), 0.5, 256);
            let alertData;
            try {
                alertData = JSON.parse(rawText);
            }
            catch (_a) {
                continue;
            }
            if (!alertData.shouldAlert)
                continue;
            const notification = {
                title: `🌊 Surf Alert — ${alertData.window}`,
                body: alertData.message,
            };
            await messaging.sendEachForMulticast({
                tokens,
                notification,
                data: { spotId: homeSpotId, screen: 'SPOT_DETAIL' },
            });
        }
        catch (e) {
            console.error('Swell alert Gemini call failed', e);
            continue;
        }
    }
});
//# sourceMappingURL=index.js.map