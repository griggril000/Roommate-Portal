// Roommate Portal - State Management Module
// Handles global state variables and DOM element references

// Initialize RoommatePortal namespace
window.RoommatePortal = window.RoommatePortal || {};

// Global state variables
let currentUser = null;
let currentHousehold = null;
let userHouseholds = [];
let chores = JSON.parse(localStorage.getItem('roommatePortal_chores')) || [];
let messages = JSON.parse(localStorage.getItem('roommatePortal_messages')) || [];

// Firestore listeners (to manage cleanup)
let choresListener = null;
let messagesListener = null;

// DOM elements - Core
const choreInput = document.getElementById('choreInput');
const choreAssignee = document.getElementById('choreAssignee');
const addChoreForm = document.getElementById('addChoreForm');
const choreList = document.getElementById('choreList');
const authorInput = document.getElementById('authorInput');
const messageInput = document.getElementById('messageInput');
const postMessageForm = document.getElementById('postMessageForm');
const messageList = document.getElementById('messageList');

// Statistics elements
const activeChoresCount = document.getElementById('activeChoresCount');
const completedTodayCount = document.getElementById('completedTodayCount');
const newMessagesCount = document.getElementById('newMessagesCount');

// Authentication buttons
const signInButton = document.getElementById('signInButton');
const signOutButton = document.getElementById('signOutButton');
const householdManagementBtn = document.getElementById('householdManagementBtn');

// Mobile buttons
const signInButtonMobile = document.getElementById('signInButtonMobile');
const signOutButtonMobile = document.getElementById('signOutButtonMobile');
const householdManagementBtnMobile = document.getElementById('householdManagementBtnMobile');
const mobileMenuBtn = document.getElementById('mobileMenuBtn');
const mobileMenu = document.getElementById('mobileMenu');

// Sign-in modal buttons (initialized later)
let googleSignInButton = null;
let emailSignInButton = null;

// Export state to global namespace
window.RoommatePortal.state = {
    // User state
    getCurrentUser: () => currentUser,
    setCurrentUser: (user) => { currentUser = user; },

    // Household state
    getCurrentHousehold: () => currentHousehold,
    setCurrentHousehold: (household) => { currentHousehold = household; },

    getUserHouseholds: () => userHouseholds,
    setUserHouseholds: (households) => { userHouseholds = households; },

    // Data state
    getChores: () => chores,
    setChores: (choreList) => { chores = choreList; },

    getMessages: () => messages,
    setMessages: (messageList) => { messages = messageList; },

    // Listeners
    getChoresListener: () => choresListener,
    setChoresListener: (listener) => { choresListener = listener; },

    getMessagesListener: () => messagesListener,
    setMessagesListener: (listener) => { messagesListener = listener; },

    // DOM elements
    elements: {
        choreInput,
        choreAssignee,
        addChoreForm,
        choreList,
        authorInput,
        messageInput,
        postMessageForm,
        messageList,
        activeChoresCount,
        completedTodayCount,
        newMessagesCount,
        signInButton,
        signOutButton,
        householdManagementBtn,
        signInButtonMobile,
        signOutButtonMobile,
        householdManagementBtnMobile,
        mobileMenuBtn,
        mobileMenu,
        getGoogleSignInButton: () => googleSignInButton,
        setGoogleSignInButton: (button) => { googleSignInButton = button; },
        getEmailSignInButton: () => emailSignInButton,
        setEmailSignInButton: (button) => { emailSignInButton = button; }
    }
};
