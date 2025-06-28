// RoomieHub - Enhanced Roommate Portal with Firebase

// Firebase configuration - REPLACE WITH YOUR ACTUAL CONFIG
const firebaseConfig = {
    // TODO: Add your Firebase config here
    // Get this from Firebase Console > Project Settings > General > Your apps
    apiKey: "demo-key",
    authDomain: "demo-project.firebaseapp.com",
    projectId: "demo-project",
    storageBucket: "demo-project.appspot.com",
    messagingSenderId: "123456789",
    appId: "demo-app-id"
};

// Initialize Firebase
let auth, db;
try {
    firebase.initializeApp(firebaseConfig);
    auth = firebase.auth();
    db = firebase.firestore();
    console.log('Firebase initialized successfully');
} catch (error) {
    console.error('Firebase initialization error:', error);
    // For demo purposes, show a helpful message
    setTimeout(() => {
        const demoMessage = document.createElement('div');
        demoMessage.className = 'fixed top-0 left-0 right-0 bg-yellow-100 border-b border-yellow-400 p-4 text-center z-50';
        demoMessage.innerHTML = `
            <div class="text-yellow-800">
                <strong>⚠️ Demo Mode:</strong> Firebase not configured. Please see FIREBASE_SETUP.md to connect to your Firebase project.
                <br><small>The app will work in demo mode with limited functionality.</small>
                <button onclick="this.parentElement.parentElement.remove()" class="ml-4 text-yellow-600 hover:text-yellow-800">✕</button>
            </div>
        `;
        document.body.appendChild(demoMessage);
    }, 1000);
}

// App state
let currentUser = null;
let currentHousehold = null;
let chores = [];
let messages = [];
let unsubscribeCallbacks = [];

// DOM elements
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

// UI elements
const mainContent = document.getElementById('mainContent');
const authModal = document.getElementById('authModal');
const householdModal = document.getElementById('householdModal');
const userInfo = document.getElementById('userInfo');
const authBtn = document.getElementById('authBtn');
const householdInfo = document.getElementById('householdInfo');

// Initialize the app
document.addEventListener('DOMContentLoaded', function () {
    initializeApp();
});

// Authentication state observer
if (auth) {
    auth.onAuthStateChanged((user) => {
        console.log('Auth state changed:', user ? 'signed in' : 'signed out');
        if (user) {
            currentUser = user;
            updateUI();
            checkUserHousehold();
        } else {
            currentUser = null;
            updateUI();
            showAuthModal();
        }
    });
} else {
    // Demo mode - Firebase not configured
    console.log('Running in demo mode - Firebase not configured');
    setTimeout(() => {
        showDemoMode();
    }, 500);
}

function showDemoMode() {
    // Simulate a demo user and household for demonstration
    currentUser = {
        uid: 'demo-user',
        email: 'demo@example.com',
        displayName: 'Demo User'
    };

    currentHousehold = {
        id: 'demo-household',
        name: 'Demo Apartment',
        code: 'DEMO123',
        members: ['demo-user']
    };

    // Add some demo data
    chores = [
        {
            id: '1',
            text: 'Take out trash and recycling',
            assignee: 'Alex',
            completed: false,
            dateAdded: new Date(),
            priority: 'high',
            createdByName: 'Alex'
        },
        {
            id: '2',
            text: 'Clean kitchen counters',
            assignee: 'Jordan',
            completed: true,
            dateAdded: new Date(Date.now() - 86400000),
            completedDate: new Date(),
            priority: 'medium',
            createdByName: 'Jordan',
            completedByName: 'Jordan'
        }
    ];

    messages = [
        {
            id: '1',
            author: 'Alex',
            text: 'Welcome to RoomieHub! 🎉 This is a demo of our roommate portal. In the real app, this would sync across all devices!',
            timestamp: new Date().toLocaleString(),
            isNew: true
        },
        {
            id: '2',
            author: 'Jordan',
            text: 'Love the new design! Much easier to keep track of everything. Also, who ate my leftover pizza? 🍕😤',
            timestamp: new Date(Date.now() - 3600000).toLocaleString(),
            isNew: true
        }
    ];

    updateUI();
    showMainContent();
    setupFormListeners();
    loadChores();
    loadMessages();
    updateStatistics();
}

function initializeApp() {
    console.log('Initializing RoomieHub...');
    updateUI();
    setupEventListeners();

    // Show loading state
    userInfo.textContent = '🔄 Loading...';

    // Firebase will handle auth state changes automatically
}

function setupEventListeners() {
    // Authentication
    const googleSignInBtn = document.getElementById('googleSignIn');
    if (googleSignInBtn) {
        googleSignInBtn.addEventListener('click', signInWithGoogle);
    }

    const authButton = document.getElementById('authBtn');
    if (authButton) {
        authButton.addEventListener('click', handleAuthButtonClick);
    }

    // Household setup
    const createHouseholdBtn = document.getElementById('createHousehold');
    if (createHouseholdBtn) {
        createHouseholdBtn.addEventListener('click', createHousehold);
    }

    const joinHouseholdBtn = document.getElementById('joinHousehold');
    if (joinHouseholdBtn) {
        joinHouseholdBtn.addEventListener('click', joinHousehold);
    }

    // Existing form listeners will be added after user is authenticated
}

// Authentication Functions
async function signInWithGoogle() {
    try {
        const provider = new firebase.auth.GoogleAuthProvider();
        await auth.signInWithPopup(provider);
        showNotification('✅ Successfully signed in!');
    } catch (error) {
        console.error('Sign in error:', error);
        showNotification('❌ Sign in failed. Please try again.');
    }
}

async function signOut() {
    try {
        // Clean up listeners
        unsubscribeCallbacks.forEach(unsubscribe => unsubscribe());
        unsubscribeCallbacks = [];

        await auth.signOut();
        currentHousehold = null;
        chores = [];
        messages = [];
        showNotification('👋 Successfully signed out!');
    } catch (error) {
        console.error('Sign out error:', error);
        showNotification('❌ Sign out failed.');
    }
}

function handleAuthButtonClick() {
    if (currentUser) {
        signOut();
    } else {
        showAuthModal();
    }
}

// Household Management
async function checkUserHousehold() {
    try {
        const userDoc = await db.collection('users').doc(currentUser.uid).get();

        if (userDoc.exists && userDoc.data().householdId) {
            const householdId = userDoc.data().householdId;
            const householdDoc = await db.collection('households').doc(householdId).get();

            if (householdDoc.exists) {
                currentHousehold = { id: householdId, ...householdDoc.data() };
                hideAuthModal();
                hideHouseholdModal();
                showMainContent();
                setupFirestoreListeners();
                setupFormListeners();
                updateUI();
                return;
            }
        }

        // User needs to create or join a household
        hideAuthModal();
        showHouseholdModal();
    } catch (error) {
        console.error('Error checking household:', error);
        showNotification('❌ Error loading household data.');
    }
}

async function createHousehold() {
    const name = document.getElementById('householdName').value.trim();
    const createBtn = document.getElementById('createHousehold');

    if (!name) {
        showNotification('❌ Please enter a household name.');
        return;
    }

    // Show loading state
    createBtn.textContent = 'Creating...';
    createBtn.disabled = true;

    try {
        // Generate a unique household code
        const code = Math.random().toString(36).substring(2, 8).toUpperCase();

        // Create household document
        const householdRef = await db.collection('households').add({
            name: name,
            code: code,
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            createdBy: currentUser.uid,
            members: [currentUser.uid]
        });

        // Update user document
        await db.collection('users').doc(currentUser.uid).set({
            email: currentUser.email,
            displayName: currentUser.displayName,
            householdId: householdRef.id,
            joinedAt: firebase.firestore.FieldValue.serverTimestamp()
        });

        currentHousehold = {
            id: householdRef.id,
            name: name,
            code: code,
            members: [currentUser.uid]
        };

        hideHouseholdModal();
        showMainContent();
        setupFirestoreListeners();
        setupFormListeners();
        updateUI();
        showNotification(`🏠 Household "${name}" created! Share code: ${code}`);
    } catch (error) {
        console.error('Error creating household:', error);
        showNotification('❌ Error creating household. Please try again.');
    } finally {
        // Reset button state
        createBtn.textContent = 'Create Household';
        createBtn.disabled = false;
    }
}

async function joinHousehold() {
    const code = document.getElementById('householdCode').value.trim().toUpperCase();
    const joinBtn = document.getElementById('joinHousehold');

    if (!code) {
        showNotification('❌ Please enter a household code.');
        return;
    }

    // Show loading state
    joinBtn.textContent = 'Joining...';
    joinBtn.disabled = true;

    try {
        // Find household by code
        const householdQuery = await db.collection('households').where('code', '==', code).get();

        if (householdQuery.empty) {
            showNotification('❌ Household not found. Please check the code.');
            return;
        }

        const householdDoc = householdQuery.docs[0];
        const householdData = householdDoc.data();

        // Check if user is already a member
        if (householdData.members && householdData.members.includes(currentUser.uid)) {
            showNotification('ℹ️ You are already a member of this household.');

            // Still proceed to set up the household
            currentHousehold = {
                id: householdDoc.id,
                ...householdData
            };

            hideHouseholdModal();
            showMainContent();
            setupFirestoreListeners();
            setupFormListeners();
            updateUI();
            return;
        }

        // Add user to household members
        await db.collection('households').doc(householdDoc.id).update({
            members: firebase.firestore.FieldValue.arrayUnion(currentUser.uid)
        });

        // Update user document
        await db.collection('users').doc(currentUser.uid).set({
            email: currentUser.email,
            displayName: currentUser.displayName,
            householdId: householdDoc.id,
            joinedAt: firebase.firestore.FieldValue.serverTimestamp()
        });

        currentHousehold = {
            id: householdDoc.id,
            ...householdData,
            members: [...(householdData.members || []), currentUser.uid]
        };

        hideHouseholdModal();
        showMainContent();
        setupFirestoreListeners();
        setupFormListeners();
        updateUI();
        showNotification(`🏠 Successfully joined "${householdData.name}"!`);
    } catch (error) {
        console.error('Error joining household:', error);
        showNotification('❌ Error joining household. Please try again.');
    } finally {
        // Reset button state
        joinBtn.textContent = 'Join Household';
        joinBtn.disabled = false;
    }
}

// Firestore Listeners
function setupFirestoreListeners() {
    if (!currentHousehold) return;

    // Listen for chores changes
    const choresUnsubscribe = db.collection('households')
        .doc(currentHousehold.id)
        .collection('chores')
        .orderBy('dateAdded', 'desc')
        .onSnapshot((snapshot) => {
            chores = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            loadChores();
            updateStatistics();
        });

    // Listen for messages changes
    const messagesUnsubscribe = db.collection('households')
        .doc(currentHousehold.id)
        .collection('messages')
        .orderBy('timestamp', 'desc')
        .limit(50)
        .onSnapshot((snapshot) => {
            messages = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data(),
                timestamp: doc.data().timestamp?.toDate?.()?.toLocaleString() || doc.data().timestamp
            }));
            loadMessages();
            updateStatistics();
        });

    unsubscribeCallbacks.push(choresUnsubscribe, messagesUnsubscribe);
}

function setupFormListeners() {
    // Chore form
    if (addChoreForm) {
        addChoreForm.addEventListener('submit', async function (e) {
            e.preventDefault();
            const choreText = choreInput.value.trim();
            const assignee = choreAssignee.value;

            if (choreText) {
                if (currentHousehold && db) {
                    // Firebase mode
                    try {
                        await db.collection('households')
                            .doc(currentHousehold.id)
                            .collection('chores')
                            .add({
                                text: choreText,
                                assignee: assignee || 'Unassigned',
                                completed: false,
                                dateAdded: firebase.firestore.FieldValue.serverTimestamp(),
                                priority: 'medium',
                                createdBy: currentUser.uid,
                                createdByName: currentUser.displayName || currentUser.email
                            });

                        choreInput.value = '';
                        choreAssignee.value = '';
                        showNotification('✅ Chore added successfully!');
                    } catch (error) {
                        console.error('Error adding chore:', error);
                        showNotification('❌ Error adding chore. Please try again.');
                    }
                } else {
                    // Demo mode
                    const chore = {
                        id: Date.now().toString(),
                        text: choreText,
                        assignee: assignee || 'Unassigned',
                        completed: false,
                        dateAdded: new Date(),
                        priority: 'medium',
                        createdByName: currentUser.displayName || currentUser.email
                    };

                    chores.push(chore);
                    choreInput.value = '';
                    choreAssignee.value = '';
                    loadChores();
                    updateStatistics();
                    showNotification('✅ Chore added successfully! (Demo Mode)');
                }
            }
        });
    }

    // Message form
    if (postMessageForm) {
        postMessageForm.addEventListener('submit', async function (e) {
            e.preventDefault();
            const author = authorInput.value.trim() || currentUser.displayName || currentUser.email;
            const messageText = messageInput.value.trim();

            if (author && messageText) {
                if (currentHousehold && db) {
                    // Firebase mode
                    try {
                        await db.collection('households')
                            .doc(currentHousehold.id)
                            .collection('messages')
                            .add({
                                author: author,
                                text: messageText,
                                timestamp: firebase.firestore.FieldValue.serverTimestamp(),
                                userId: currentUser.uid,
                                isNew: true
                            });

                        messageInput.value = '';
                        showNotification('📝 Message posted successfully!');
                    } catch (error) {
                        console.error('Error posting message:', error);
                        showNotification('❌ Error posting message. Please try again.');
                    }
                } else {
                    // Demo mode
                    const message = {
                        id: Date.now().toString(),
                        author: author,
                        text: messageText,
                        timestamp: new Date().toLocaleString(),
                        userId: currentUser.uid,
                        isNew: true
                    };

                    messages.unshift(message);
                    messageInput.value = '';
                    loadMessages();
                    updateStatistics();
                    showNotification('📝 Message posted successfully! (Demo Mode)');
                }
            }
        });
    }
}

function loadChores() {
    choreList.innerHTML = '';

    if (chores.length === 0) {
        choreList.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-tasks"></i>
                <h3>No chores yet!</h3>
                <p>Add your first chore using the form above to get started.</p>
            </div>
        `;
        return;
    }

    // Sort chores: incomplete first, then by date
    const sortedChores = chores.sort((a, b) => {
        if (a.completed === b.completed) {
            const aDate = a.dateAdded?.toDate?.() || new Date(a.dateAdded);
            const bDate = b.dateAdded?.toDate?.() || new Date(b.dateAdded);
            return bDate - aDate;
        }
        return a.completed - b.completed;
    });

    sortedChores.forEach((chore, index) => {
        const choreElement = document.createElement('div');
        choreElement.className = `chore-item ${chore.completed ? 'completed' : ''} animate-slide-in`;
        choreElement.style.animationDelay = `${index * 0.1}s`;

        const priorityIcon = chore.priority === 'high' ? '🔴' : chore.priority === 'low' ? '🟢' : '🟡';
        const dateAdded = chore.dateAdded?.toDate?.()?.toLocaleDateString() || chore.dateAdded;
        const completedDate = chore.completedDate?.toDate?.()?.toLocaleDateString() || chore.completedDate;

        choreElement.innerHTML = `
            <div class="flex items-start justify-between">
                <div class="flex items-start space-x-4 flex-1">
                    <input type="checkbox" ${chore.completed ? 'checked' : ''} 
                           onchange="toggleChore('${chore.id}')" 
                           class="custom-checkbox mt-1">
                    <div class="flex-1">
                        <div class="flex items-center space-x-2">
                            <span class="${chore.completed ? 'line-through text-gray-500' : 'text-gray-800'} font-semibold text-lg">
                                ${priorityIcon} ${chore.text}
                            </span>
                            <span class="chore-assignee">${chore.assignee}</span>
                        </div>
                        <div class="chore-date">
                            📅 Added: ${dateAdded} by ${chore.createdByName || 'Unknown'}
                            ${chore.completed ? ` | ✅ Completed: ${completedDate} by ${chore.completedByName || 'Unknown'}` : ''}
                        </div>
                    </div>
                </div>
                <div class="flex space-x-2 ml-4">
                    ${!chore.completed ? `<button onclick="markComplete('${chore.id}')" class="btn-complete">
                        <i class="fas fa-check mr-1"></i>Complete
                    </button>` : ''}
                    <button onclick="deleteChore('${chore.id}')" class="btn-delete">
                        <i class="fas fa-trash mr-1"></i>Delete
                    </button>
                </div>
            </div>
        `;

        choreList.appendChild(choreElement);
    });
}

// Message Board Functions
async function deleteMessage(id) {
    if (confirm('Are you sure you want to delete this message?')) {
        if (db && currentHousehold) {
            // Firebase mode
            try {
                await db.collection('households')
                    .doc(currentHousehold.id)
                    .collection('messages')
                    .doc(id)
                    .delete();

                showNotification('🗑️ Message deleted');
            } catch (error) {
                console.error('Error deleting message:', error);
                showNotification('❌ Error deleting message. Please try again.');
            }
        } else {
            // Demo mode
            messages = messages.filter(m => m.id !== id);
            loadMessages();
            updateStatistics();
            showNotification('🗑️ Message deleted (Demo Mode)');
        }
    }
}

function loadMessages() {
    messageList.innerHTML = '';

    if (messages.length === 0) {
        messageList.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-comments"></i>
                <h3>No messages yet!</h3>
                <p>Be the first to post a message to your roommates.</p>
            </div>
        `;
        return;
    }

    messages.forEach((message, index) => {
        const messageElement = document.createElement('div');
        messageElement.className = 'message-item animate-slide-in';
        messageElement.style.animationDelay = `${index * 0.1}s`;

        const avatarEmoji = getAvatarEmoji(message.author);

        messageElement.innerHTML = `
            <div class="flex justify-between items-start mb-3">
                <div class="flex items-center space-x-2">
                    <span class="text-2xl">${avatarEmoji}</span>
                    <span class="message-author">${message.author}</span>
                    ${message.isNew ? '<span class="bg-red-500 text-white text-xs px-2 py-1 rounded-full">NEW</span>' : ''}
                </div>
                <div class="flex items-center space-x-3">
                    <span class="message-timestamp">${message.timestamp}</span>
                    <button onclick="deleteMessage('${message.id}')" class="text-red-500 hover:text-red-700 transition-colors">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
            </div>
            <p class="message-text">${message.text}</p>
        `;

        messageList.appendChild(messageElement);
    });
}

// Statistics and UI Updates
function updateStatistics() {
    const activeChores = chores.filter(c => !c.completed).length;
    const today = new Date().toLocaleDateString();
    const completedToday = chores.filter(c => {
        if (!c.completed || !c.completedDate) return false;
        const completedDate = c.completedDate?.toDate?.()?.toLocaleDateString() || c.completedDate;
        return completedDate === today;
    }).length;
    const newMessages = messages.filter(m => m.isNew).length;

    activeChoresCount.textContent = activeChores;
    completedTodayCount.textContent = completedToday;
    newMessagesCount.textContent = newMessages;

    // Mark messages as read after viewing (only in Firebase mode)
    if (db && currentHousehold && newMessages > 0) {
        setTimeout(() => {
            messages.forEach(async (message) => {
                if (message.isNew) {
                    try {
                        await db.collection('households')
                            .doc(currentHousehold.id)
                            .collection('messages')
                            .doc(message.id)
                            .update({ isNew: false });
                    } catch (error) {
                        console.error('Error marking message as read:', error);
                    }
                }
            });
        }, 5000);
    } else if (!db) {
        // Demo mode - just mark as read after delay
        setTimeout(() => {
            messages.forEach(m => m.isNew = false);
            loadMessages();
            updateStatistics();
        }, 5000);
    }
}

// Utility Functions
function getAvatarEmoji(name) {
    const avatars = ['👨‍💻', '👩‍🎨', '👨‍🍳', '👩‍🔬', '👨‍🎵', '👩‍💼', '👨‍🏫', '👩‍⚕️'];
    const hash = name.split('').reduce((a, b) => {
        a = ((a << 5) - a) + b.charCodeAt(0);
        return a & a;
    }, 0);
    return avatars[Math.abs(hash) % avatars.length];
}

function showNotification(message) {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = 'fixed top-4 right-4 bg-white border border-gray-200 p-4 rounded-lg shadow-md z-50 animate-slide-in';
    notification.innerHTML = `
        <div class="flex items-center space-x-2">
            <span class="text-gray-800">${message}</span>
            <button onclick="this.parentElement.parentElement.remove()" class="text-gray-400 hover:text-gray-600">
                <i class="fas fa-times"></i>
            </button>
        </div>
    `;

    document.body.appendChild(notification);

    // Auto remove after 3 seconds
    setTimeout(() => {
        if (notification.parentElement) {
            notification.remove();
        }
    }, 3000);
}

// Keyboard shortcuts
document.addEventListener('keydown', function (e) {
    // Ctrl/Cmd + Enter to submit forms
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        if (document.activeElement === choreInput || document.activeElement === choreAssignee) {
            addChoreForm.dispatchEvent(new Event('submit'));
        } else if (document.activeElement === messageInput || document.activeElement === authorInput) {
            postMessageForm.dispatchEvent(new Event('submit'));
        }
    }

    // Tab switching with keyboard
    if (e.ctrlKey || e.metaKey) {
        if (e.key === '1') {
            e.preventDefault();
            switchTab('chores');
        } else if (e.key === '2') {
            e.preventDefault();
            switchTab('messages');
        }
    }
});

// Auto-resize textarea
if (messageInput) {
    messageInput.addEventListener('input', function () {
        this.style.height = 'auto';
        this.style.height = this.scrollHeight + 'px';
    });
}

// Chore Management Functions
async function toggleChore(id) {
    if (db && currentHousehold) {
        // Firebase mode
        try {
            const chore = chores.find(c => c.id === id);
            if (chore) {
                const updates = {
                    completed: !chore.completed
                };

                if (!chore.completed) {
                    updates.completedDate = firebase.firestore.FieldValue.serverTimestamp();
                    updates.completedBy = currentUser.uid;
                    updates.completedByName = currentUser.displayName || currentUser.email;
                    showNotification('🎉 Chore completed! Great job!');
                } else {
                    updates.completedDate = firebase.firestore.FieldValue.delete();
                    updates.completedBy = firebase.firestore.FieldValue.delete();
                    updates.completedByName = firebase.firestore.FieldValue.delete();
                }

                await db.collection('households')
                    .doc(currentHousehold.id)
                    .collection('chores')
                    .doc(id)
                    .update(updates);
            }
        } catch (error) {
            console.error('Error toggling chore:', error);
            showNotification('❌ Error updating chore. Please try again.');
        }
    } else {
        // Demo mode
        const chore = chores.find(c => c.id === id);
        if (chore) {
            chore.completed = !chore.completed;
            if (chore.completed) {
                chore.completedDate = new Date();
                chore.completedByName = currentUser.displayName || currentUser.email;
                showNotification('🎉 Chore completed! Great job! (Demo Mode)');
            } else {
                delete chore.completedDate;
                delete chore.completedByName;
            }
            loadChores();
            updateStatistics();
        }
    }
}

async function markComplete(id) {
    if (db && currentHousehold) {
        // Firebase mode
        try {
            await db.collection('households')
                .doc(currentHousehold.id)
                .collection('chores')
                .doc(id)
                .update({
                    completed: true,
                    completedDate: firebase.firestore.FieldValue.serverTimestamp(),
                    completedBy: currentUser.uid,
                    completedByName: currentUser.displayName || currentUser.email
                });

            showNotification('🎉 Awesome! Chore marked as complete!');
        } catch (error) {
            console.error('Error completing chore:', error);
            showNotification('❌ Error completing chore. Please try again.');
        }
    } else {
        // Demo mode
        const chore = chores.find(c => c.id === id);
        if (chore) {
            chore.completed = true;
            chore.completedDate = new Date();
            chore.completedByName = currentUser.displayName || currentUser.email;
            loadChores();
            updateStatistics();
            showNotification('🎉 Awesome! Chore marked as complete! (Demo Mode)');
        }
    }
}

async function deleteChore(id) {
    if (confirm('Are you sure you want to delete this chore?')) {
        if (db && currentHousehold) {
            // Firebase mode
            try {
                await db.collection('households')
                    .doc(currentHousehold.id)
                    .collection('chores')
                    .doc(id)
                    .delete();

                showNotification('🗑️ Chore deleted');
            } catch (error) {
                console.error('Error deleting chore:', error);
                showNotification('❌ Error deleting chore. Please try again.');
            }
        } else {
            // Demo mode
            chores = chores.filter(c => c.id !== id);
            loadChores();
            updateStatistics();
            showNotification('🗑️ Chore deleted (Demo Mode)');
        }
    }
}