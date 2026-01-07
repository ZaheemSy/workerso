# Temporary Screen Setup Guide

## Overview
A "Temporary" button has been added to all dashboard screens (Worker, Admin, Super Admin) that opens a special splash screen with a Lottie animation.

## Features
- **Single Click**: Opens the temporary splash screen
- **Triple Click**: Returns to the home dashboard
- **Off-white Background**: Clean, minimalist design
- **Lottie Animation**: Centered animation displaying Boy_Running.json

## Installation Steps

### Step 1: Install Lottie React Native

```bash
npm install lottie-react-native lottie-ios@3.4.0
```

### Step 2: iOS Setup (if running on iOS)

```bash
cd ios
pod install
cd ..
```

### Step 3: Replace Placeholder Animation

The app currently has a placeholder animation at:
`src/assets/json/Boy_Running.json`

**Replace this file with your actual Boy_Running.json Lottie animation file.**

You can download Lottie animations from:
- [LottieFiles](https://lottiefiles.com/) - Search for "boy running" or similar
- Your own custom Lottie animation

### Step 4: Test the Feature

1. **Start the app:**
   ```bash
   npm run ios
   # or
   npm run android
   ```

2. **Test the temporary button:**
   - Login to any role (Worker, Admin, or Super Admin)
   - You'll see a "Temporary" button at the top of the dashboard
   - Click it to open the temporary splash screen
   - Triple-click anywhere on the screen to go back

## File Locations

### New Files Created:
- `src/screens/TemporarySplashScreen.js` - The temporary splash screen component
- `src/assets/json/Boy_Running.json` - Placeholder Lottie animation (replace with actual)
- `TEMPORARY_SCREEN_SETUP.md` - This setup guide

### Modified Files:
- `src/screens/AdminDashboard.js` - Added "Temporary" button
- `src/screens/SuperAdminDashboard.js` - Added "Temporary" button
- `src/screens/WorkerDashboard.js` - Added "Temporary" button
- `App.jsx` - Added TemporarySplash navigation route

## Customization

### Change Background Color
Edit `src/screens/TemporarySplashScreen.js`:
```javascript
container: {
  flex: 1,
  backgroundColor: '#FAF9F6', // Change this color
  justifyContent: 'center',
  alignItems: 'center',
},
```

### Change Animation Size
Edit the animation style:
```javascript
animation: {
  width: 300,  // Change width
  height: 300, // Change height
},
```

### Change Button Color/Style
Edit the dashboard files (AdminDashboard.js, etc.):
```javascript
temporaryButton: {
  backgroundColor: COLORS.secondary, // Change button color
  borderRadius: 12,
  padding: 16,
  // ... other styles
},
```

## Troubleshooting

### Error: "Unable to resolve module lottie-react-native"
```bash
# Clear cache and reinstall
rm -rf node_modules
npm install
cd ios
pod install
cd ..
```

### Animation Not Showing
1. Verify the Boy_Running.json file exists at `src/assets/json/Boy_Running.json`
2. Ensure it's a valid Lottie JSON file
3. Check the console for any errors

### iOS Build Fails
```bash
cd ios
rm -rf Pods Podfile.lock
pod install
cd ..
```

Then rebuild in Xcode: Product → Clean Build Folder

### Triple Click Not Working
- Make sure you're clicking quickly (within 500ms between clicks)
- Try clicking on different areas of the screen
- Check console for any errors

## How It Works

### Triple Click Detection
The screen uses a click counter with a timeout mechanism:
1. Each click increments the counter
2. If 3 clicks are detected within 500ms, navigate back
3. After 500ms without reaching 3 clicks, counter resets

### Navigation Flow
```
Dashboard → Click "Temporary" → TemporarySplash
TemporarySplash → Triple Click → Dashboard (goBack)
```

## Future Enhancements

Possible improvements:
- Add different animations
- Add sound effects
- Add gesture controls (swipe to dismiss)
- Add animation selection screen
- Save favorite animations

---

Happy coding! 🎨
