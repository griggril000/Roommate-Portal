// Roommate Portal - Configuration Module
// Handles Firebase configuration and initialization

// Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyAR1Te9hZbEbj0Ln2s1SXAD32y6FPnPs5s",
    authDomain: "roommate-portal.firebaseapp.com",
    projectId: "roommate-portal",
    storageBucket: "roommate-portal.firebasestorage.app",
    messagingSenderId: "496204874017",
    appId: "1:496204874017:web:76e5a43d58ce30d8d87e60"
};

// Initialize Firebase
const firebaseApp = firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
const firebaseAuth = firebase.auth();

// Set Firebase Authentication persistence to local
firebaseAuth.setPersistence(firebase.auth.Auth.Persistence.LOCAL);

// Export for use in other modules
window.RoommatePortal = window.RoommatePortal || {};
window.RoommatePortal.config = {
    app: firebaseApp,
    db,
    auth: firebaseAuth
};
