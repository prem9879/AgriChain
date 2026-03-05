# AGRI-मित्र

AGRI-मित्र is a farmer decision-support platform with:
- an Expo React Native mobile app (`AgriChain/`)
- a FastAPI + ML backend (`agrichain-backend/`)

## Mobile App (Expo React Native)

### Tech Stack
- Expo SDK 55
- React Native
- React Navigation (bottom tabs + stack)
- React Native Paper
- Axios
- OpenWeatherMap API
- data.gov.in Agmarknet API

### Current Features
- Home dashboard cards: Harvest Advisor, Spoilage Risk, etc.
- Bottom tabs: Home, Market, ARIA, Profile
- Crop input flow:
  - crop, district, soil type, sowing date
  - storage type
  - transit time slider (1-48 hours)
- Recommendation screen:
  - best harvest window
  - best mandi with earnings comparison
  - expandable "Why we recommend this"
  - quick navigation to Spoilage Risk checker
- Spoilage Risk screen:
  - auto-filled inputs when opened from Recommendation
  - crop/storage pickers + days-since-harvest slider + transit slider
  - weather temperature context display
  - animated circular risk meter (Low/Medium/High/Critical)
  - ranked preservation actions by cost
  - explanatory "Why" section
- API fallback behavior:
  - if weather/mandi API fails, app still returns calculated fallback recommendations

### Prerequisites
- Node.js 20.19.4 or newer (24.x recommended)
- npm
- Expo Go app on Android device
- Android Platform Tools (`adb`) for USB debugging workflow

### Install
```bash
npm install
```

### Run (Android)
```bash
npm run android
```

If using a physical Android phone:
1. Enable Developer Options and USB debugging.
2. Connect phone by USB and approve debugging prompt.
3. Verify:
```bash
adb devices
```

### Mobile Environment Variables
Create `.env` in `AgriChain/`:
```env
EXPO_PUBLIC_OPENWEATHER_API_KEY=your_openweather_key
EXPO_PUBLIC_DATA_GOV_API_KEY=your_data_gov_key
```

## Backend (FastAPI + ML Pipeline)

Backend location: `agrichain-backend/`

### Backend Features
- Weather ingestion (`OpenWeatherMap`) with derived weather signals
- Mandi ingestion (`Agmarknet`) with moving averages, momentum, pressure, and spread
- Feature engineering layer combining crop + weather + market features
- ML/decision modules:
  - `price_trend_model.py` (CalibratedClassifierCV + fallback rules)
  - `harvest_window_model.py` (rules + confidence)
  - `spoilage_risk_model.py` (rule-based risk scoring)
  - `decision_engine.py` (final action + preservation ranking)
  - `explainability_engine.py` (3 plain-language reasons + confidence message)
- 6-hour caching for weather/mandi fetches
- graceful fallback behavior if external APIs fail
- CORS enabled for React Native integration

### Backend Setup
```bash
cd ../agrichain-backend
pip install -r requirements.txt
```

Create `.env` in `agrichain-backend/`:
```env
OPENWEATHER_API_KEY=your_openweather_key
DATAGOV_API_KEY=your_data_gov_key
CORS_ORIGINS=*
PORT=8000
```

Run backend:
```bash
uvicorn main:app --reload
```

### Backend Endpoints
- `POST /predict/harvest`
- `POST /predict/mandi`
- `POST /predict/spoilage`
- `POST /explain/recommendation`
- `GET /health`

## Project Structure

```text
AgriChain/
  App.js
  src/
    data/
    screens/
      HomeScreen.js
      CropInputScreen.js
      RecommendationScreen.js
      SpoilageScreen.js
      MarketScreen.js
      AriaScreen.js
      ProfileScreen.js
    services/
      recommendationService.js
    theme/
      colors.js

agrichain-backend/
  main.py
  models/
    price_trend_model.py
    harvest_window_model.py
    spoilage_risk_model.py
  services/
    weather_service.py
    mandi_service.py
    feature_engineering.py
  decision_engine.py
  explainability_engine.py
  requirements.txt
```

## App Scripts
- `npm start` - start Expo dev server
- `npm run android` - run on Android
- `npm run ios` - run on iOS (macOS required)
- `npm run web` - run web preview
