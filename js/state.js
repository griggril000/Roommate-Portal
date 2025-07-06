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
let announcements = JSON.parse(localStorage.getItem('roommatePortal_announcements')) || [];
let rewards = [];
let rewardTransactions = [];

// Firestore listeners (to manage cleanup)
let choresListener = null;
let messagesListener = null;
let announcementsListener = null;
let rewardsListener = null;
let rewardTransactionsListener = null;

// DOM elements - Core
const choreInput = document.getElementById('choreInput');
const choreAssignee = document.getElementById('choreAssignee');
const chorePoints = document.getElementById('chorePoints');
const addChoreForm = document.getElementById('addChoreForm');
const addChoreBtn = document.getElementById('addChoreBtn');
const choreList = document.getElementById('choreList');
const rewardsOptInBtn = document.getElementById('rewardsOptInBtn');
const authorInput = document.getElementById('authorInput');
const messageInput = document.getElementById('messageInput');
const postMessageForm = document.getElementById('postMessageForm');
const messageList = document.getElementById('messageList');
const announcementTitleInput = document.getElementById('announcementTitleInput');
const announcementBodyInput = document.getElementById('announcementBodyInput');
const announcementExpirationInput = document.getElementById('announcementExpirationInput');
const postAnnouncementForm = document.getElementById('postAnnouncementForm');
const announcementList = document.getElementById('announcementList');

// Statistics elements
const activeChoresCount = document.getElementById('activeChoresCount');
const completedTodayCount = document.getElementById('completedTodayCount');
const newMessagesCount = document.getElementById('newMessagesCount');
const activeAnnouncementsCount = document.getElementById('activeAnnouncementsCount');

// Authentication buttons
const signInButton = document.getElementById('signInButton');
const signOutButton = document.getElementById('signOutButton');
const householdManagementBtn = document.getElementById('householdManagementBtn');

// Notification buttons
const notificationToggleBtn = document.getElementById('notificationToggleBtn');
const notificationToggleText = document.getElementById('notificationToggleText');

// Mobile buttons
const signInButtonMobile = document.getElementById('signInButtonMobile');
const signOutButtonMobile = document.getElementById('signOutButtonMobile');
const householdManagementBtnMobile = document.getElementById('householdManagementBtnMobile');
const notificationToggleBtnMobile = document.getElementById('notificationToggleBtnMobile');
const notificationToggleTextMobile = document.getElementById('notificationToggleTextMobile');
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

    getAnnouncements: () => announcements,
    setAnnouncements: (announcementList) => { announcements = announcementList; },

    getRewards: () => rewards,
    setRewards: (rewardsList) => { rewards = rewardsList; },

    getRewardTransactions: () => rewardTransactions,
    setRewardTransactions: (transactionsList) => { rewardTransactions = transactionsList; },

    // Listeners
    getChoresListener: () => choresListener,
    setChoresListener: (listener) => { choresListener = listener; },

    getMessagesListener: () => messagesListener,
    setMessagesListener: (listener) => { messagesListener = listener; },

    getAnnouncementsListener: () => announcementsListener,
    setAnnouncementsListener: (listener) => { announcementsListener = listener; },

    getRewardsListener: () => rewardsListener,
    setRewardsListener: (listener) => { rewardsListener = listener; },

    getRewardTransactionsListener: () => rewardTransactionsListener,
    setRewardTransactionsListener: (listener) => { rewardTransactionsListener = listener; },

    // DOM elements
    elements: {
        choreInput,
        choreAssignee,
        chorePoints,
        addChoreForm,
        addChoreBtn,
        choreList,
        rewardsOptInBtn,
        authorInput,
        messageInput,
        postMessageForm,
        messageList,
        announcementTitleInput,
        announcementBodyInput,
        announcementExpirationInput,
        postAnnouncementForm,
        announcementList,
        activeChoresCount,
        completedTodayCount,
        newMessagesCount,
        activeAnnouncementsCount,
        signInButton,
        signOutButton,
        householdManagementBtn,
        notificationToggleBtn,
        notificationToggleText,
        signInButtonMobile,
        signOutButtonMobile,
        householdManagementBtnMobile,
        notificationToggleBtnMobile,
        notificationToggleTextMobile,
        mobileMenuBtn,
        mobileMenu,
        getGoogleSignInButton: () => googleSignInButton,
        setGoogleSignInButton: (button) => { googleSignInButton = button; },
        getEmailSignInButton: () => emailSignInButton,
        setEmailSignInButton: (button) => { emailSignInButton = button; }
    }
};
