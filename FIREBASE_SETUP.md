# Firebase Setup Guide for RoomieHub

## Prerequisites
1. A Google account
2. Basic understanding of Firebase console

## Step 1: Create Firebase Project
1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click "Create a project"
3. Enter project name: "roomie-hub" (or your preferred name)
4. Enable Google Analytics (optional)
5. Click "Create project"

## Step 2: Add Web App to Project
1. In your Firebase project dashboard, click the "Web" icon (</>) 
2. Register app with nickname: "RoomieHub Web App"
3. Enable "Firebase Hosting" (optional)
4. Click "Register app"
5. Copy the Firebase configuration object

## Step 3: Enable Authentication
1. In Firebase console, go to "Authentication" > "Get started"
2. Go to "Sign-in method" tab
3. Enable "Google" provider
4. Add your domain to authorized domains (for production)

## Step 4: Set up Firestore Database
1. In Firebase console, go to "Firestore Database" > "Create database"
2. Choose "Start in test mode" (for development)
3. Select a location (choose closest to your users)

## Step 5: Configure Firestore Security Rules
Replace the default rules with:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Users can read/write their own user document
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    
    // Household members can read/write household data
    match /households/{householdId} {
      allow read, write: if request.auth != null && 
        request.auth.uid in resource.data.members;
      
      // Chores and messages within households
      match /{collection}/{document} {
        allow read, write: if request.auth != null && 
          request.auth.uid in get(/databases/$(database)/documents/households/$(householdId)).data.members;
      }
    }
  }
}
```

## Step 6: Update Configuration in Code
1. Copy your Firebase configuration from Step 2
2. Replace the demo configuration in `script.js`:

```javascript
const firebaseConfig = {
    apiKey: "your-api-key",
    authDomain: "your-project.firebaseapp.com",
    projectId: "your-project-id",
    storageBucket: "your-project.appspot.com",
    messagingSenderId: "your-sender-id",
    appId: "your-app-id"
};
```

## Step 7: Deploy (Optional)
1. Install Firebase CLI: `npm install -g firebase-tools`
2. Login: `firebase login`
3. Initialize hosting: `firebase init hosting`
4. Deploy: `firebase deploy`

## Testing
1. Open your app in a web browser
2. Sign in with Google
3. Create a household or join using a code
4. Test chore management and messaging features

## Production Considerations
1. Update Firestore security rules for production
2. Set up proper authentication domains
3. Consider Firebase App Check for additional security
4. Monitor usage and set up billing alerts
5. Set up proper error logging and monitoring

## Troubleshooting
- Check browser console for errors
- Verify Firebase configuration
- Ensure Firestore rules allow your operations
- Check that authentication is properly configured
