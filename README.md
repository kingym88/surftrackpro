# SurfTrack Pro

An AI-powered surf forecasting and session tracking application designed to help surfers of all levels track their progression, discover new spots, and score the best waves with machine learning.

## Features

- **Spot Discovery:** Browse surf spots with live conditions and customized quality ratings.
- **AI Forecasting:** 7-Day detailed conditions forecast powered by Recharts and Open-Meteo.
- **Smart Session Insights:** Automated Gemini AI post-session analysis on your performance and recommended practice routines.
- **Quiver Management:** Track your surfboards with detailed statistics on volume and historical wave performance.
- **Skill Progression Tracking:** Log sessions to track your historical metrics like Top Speed, Avg Wave Time, and Consistency over time.
- **Progressive Web App:** Install SurfTrack Pro on iOS and Android for offline compatibility and native app aesthetics.
- **Dark/Light Mode:** Responsive UI utilizing TailwindCSS and CSS variables.

## Tech Stack

- React 18
- Vite
- TailwindCSS
- Recharts
- Capacitor
- Google Gemini API (for AI Coaching Analysis)
- OpenMeteo & Nominatim (for free Surf Forecasting & Geolocation)
- Firebase (Authentication, Firestore, Hosting)
- Vite PWA Plugin

## Running Locally

1. **Install Dependencies**

```bash
npm install
```

2. **Environment Configuration**
   Create a `.env.local` file with the following variables:

```env
# Required for AI Coaching & Break Analysis
VITE_GEMINI_API_KEY=your_gemini_key

# Required for Authentication & DB
VITE_FIREBASE_API_KEY=your_firebase_key
VITE_FIREBASE_AUTH_DOMAIN=your_domain.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_id
VITE_FIREBASE_STORAGE_BUCKET=your_bucket.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender
VITE_FIREBASE_APP_ID=your_app_id
```

3. **Start the Development Server**

```bash
npm run dev
```

4. **Production Build**

```bash
npm run build
```

## Contributing

Please see standard contributing guidelines when issuing pull requests.

## License

MIT
