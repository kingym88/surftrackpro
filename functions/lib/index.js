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
const geminiHelper_1 = require("./geminiHelper");
admin.initializeApp();
exports.callGemini = (0, https_1.onCall)(async (request) => {
    if (!request.auth) {
        throw new https_1.HttpsError('unauthenticated', 'Must be signed in.');
    }
    const { prompt, temperature = 0.7, maxOutputTokens = 1024 } = request.data;
    try {
        const text = await (0, geminiHelper_1.callGeminiRaw)(prompt, temperature, maxOutputTokens);
        return { text };
    }
    catch (error) {
        throw new https_1.HttpsError('internal', error.message);
    }
});
exports.dailySwellAlert = (0, scheduler_1.onSchedule)('every day 06:00', async () => {
    const db = admin.firestore();
    const messaging = admin.messaging();
    // 1. Get all users who have a homeSpotId set
    const usersSnap = await db.collection('users').get();
    for (const userDoc of usersSnap.docs) {
        const userData = userDoc.data();
        const uid = userDoc.id;
        const homeSpotId = userData.homeSpotId;
        if (!homeSpotId)
            continue;
        // 2. Get the user's FCM tokens
        const tokensSnap = await db.collection(`users/${uid}/fcmTokens`).get();
        if (tokensSnap.empty)
            continue;
        const tokens = tokensSnap.docs.map(d => d.data().token);
        // 3. Fetch forecast for homeSpot from Firestore (pre-computed forecasts)
        const forecastSnap = await db.collection(`spots/${homeSpotId}/forecasts`).limit(56).get();
        if (forecastSnap.empty)
            continue;
        // the pre-computed forecast collection structure typically stores the snapshot inside .data[]
        // assuming it might be a single config document or individual snapshots
        const forecastsDoc = forecastSnap.docs[0];
        const forecasts = forecastsDoc.data().data || forecastsDoc.data();
        if (!Array.isArray(forecasts))
            continue;
        // 4. Build a compact prompt for Gemini
        const next24hForecasts = forecasts.filter((f) => {
            const fTime = new Date(f.forecastHour).getTime();
            const now = Date.now();
            return fTime >= now && fTime <= now + 24 * 60 * 60 * 1000;
        });
        if (next24hForecasts.length === 0)
            continue;
        // 5. Call Gemini
        const prompt = `You are a surf coach. Based on this 24-hour forecast for a surfer's home break, 
decide if there is a genuinely good surf window today worth alerting them about. 
Only say YES if conditions are clearly above average (good swell, offshore wind, decent period).

FORECAST (next 24h):
${next24hForecasts.map((f) => `${f.forecastHour}: ${f.waveHeight.toFixed(1)}m @ ${f.wavePeriod.toFixed(0)}s, wind ${f.windSpeed.toFixed(0)}km/h from ${f.windDirection}°`).join('\n')}

Respond ONLY with valid JSON:
{
  "shouldAlert": true | false,
  "window": "e.g. 7am–9am",
  "message": "One short sentence (max 15 words) in surfer language describing why it's worth going out."
}`;
        // 6. Call Gemini API (server-side, using the helper)
        const rawText = await (0, geminiHelper_1.callGeminiRaw)(prompt, 0.5, 256);
        let alertData;
        try {
            alertData = JSON.parse(rawText);
        }
        catch (_a) {
            continue;
        }
        if (!alertData.shouldAlert)
            continue;
        // 7. Send FCM push notification to all user tokens
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
});
//# sourceMappingURL=index.js.map