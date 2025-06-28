// RoomieHub - Enhanced Roommate Portal

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
const app = firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
const auth = firebase.auth();

// Data storage
let chores = JSON.parse(localStorage.getItem('roomieHub_chores')) || [];
let messages = JSON.parse(localStorage.getItem('roomieHub_messages')) || [];

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

// Firebase Authentication
const signInButton = document.getElementById('signInButton');
const signOutButton = document.getElementById('signOutButton');
let currentUser = null;

// Initialize the app
document.addEventListener('DOMContentLoaded', function () {
    initializeApp();
});

function initializeApp() {
    updateUIForAuth();

    if (!currentUser) {
        showLoginModal();
    }
}

// Load chores from Firestore
function loadChoresFromFirestore() {
    db.collection('chores').onSnapshot((snapshot) => {
        chores = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        loadChores();
        updateStatistics();
    }, (error) => {
        console.error('Error loading chores:', error);
        showNotification('❌ Failed to load chores. Please try again later.');
    });
}

// Load messages from Firestore
function loadMessagesFromFirestore() {
    db.collection('messages').onSnapshot((snapshot) => {
        messages = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        loadMessages();
    }, (error) => {
        console.error('Error loading messages:', error);
        showNotification('❌ Failed to load messages. Please try again later.');
    });
}

// Tab switching functionality
function switchTab(tabName) {
    const choresTab = document.getElementById('choresTab');
    const messagesTab = document.getElementById('messagesTab');
    const choreSection = document.getElementById('choreSection');
    const messageSection = document.getElementById('messageSection');

    if (tabName === 'chores') {
        choresTab.className = "flex-1 flex items-center justify-center space-x-2 py-3 px-4 rounded-lg font-medium transition-all duration-300 bg-blue-600 text-white shadow-sm";
        messagesTab.className = "flex-1 flex items-center justify-center space-x-2 py-3 px-4 rounded-lg font-medium transition-all duration-300 text-gray-600 hover:bg-gray-100";
        choreSection.className = "tab-content";
        messageSection.className = "tab-content hidden";
    } else {
        messagesTab.className = "flex-1 flex items-center justify-center space-x-2 py-3 px-4 rounded-lg font-medium transition-all duration-300 bg-purple-600 text-white shadow-sm";
        choresTab.className = "flex-1 flex items-center justify-center space-x-2 py-3 px-4 rounded-lg font-medium transition-all duration-300 text-gray-600 hover:bg-gray-100";
        messageSection.className = "tab-content";
        choreSection.className = "tab-content hidden";
    }
}

// Chore Management Functions
addChoreForm.addEventListener('submit', function (e) {
    e.preventDefault();
    const choreText = choreInput.value.trim();
    const assignee = choreAssignee.value;

    if (choreText) {
        const chore = {
            id: Date.now(),
            text: choreText,
            assignee: assignee || 'Unassigned',
            completed: false,
            dateAdded: new Date().toLocaleDateString(),
            priority: 'medium'
        };

        chores.push(chore);
        saveChores();
        loadChores();
        updateStatistics();

        // Clear form
        choreInput.value = '';
        choreAssignee.value = '';

        // Show success feedback
        showNotification('✅ Chore added successfully!');
    }
});

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
            return new Date(b.dateAdded) - new Date(a.dateAdded);
        }
        return a.completed - b.completed;
    });

    sortedChores.forEach((chore, index) => {
        const choreElement = document.createElement('div');
        choreElement.className = `chore-item ${chore.completed ? 'completed' : ''} animate-slide-in`;
        choreElement.style.animationDelay = `${index * 0.1}s`;

        const priorityIcon = chore.priority === 'high' ? '🔴' : chore.priority === 'low' ? '🟢' : '🟡';

        choreElement.innerHTML = `
            <div class="flex items-start justify-between">
                <div class="flex items-start space-x-4 flex-1">
                    <input type="checkbox" ${chore.completed ? 'checked' : ''} 
                           onchange="toggleChore(${chore.id})" 
                           class="custom-checkbox mt-1">
                    <div class="flex-1">
                        <div class="flex items-center space-x-2">
                            <span class="${chore.completed ? 'line-through text-gray-500' : 'text-gray-800'} font-semibold text-lg">
                                ${priorityIcon} ${chore.text}
                            </span>
                            <span class="chore-assignee">${chore.assignee}</span>
                        </div>
                        <div class="chore-date">
                            📅 Added: ${chore.dateAdded}
                            ${chore.completed ? ` | ✅ Completed: ${new Date().toLocaleDateString()}` : ''}
                        </div>
                    </div>
                </div>
                <div class="flex space-x-2 ml-4">
                    ${!chore.completed ? `<button onclick="markComplete(${chore.id})" class="btn-complete">
                        <i class="fas fa-check mr-1"></i>Complete
                    </button>` : ''}
                    <button onclick="deleteChore(${chore.id})" class="btn-delete">
                        <i class="fas fa-trash mr-1"></i>Delete
                    </button>
                </div>
            </div>
        `;

        choreList.appendChild(choreElement);
    });
}

function toggleChore(id) {
    const chore = chores.find(c => c.id === id);
    if (chore) {
        chore.completed = !chore.completed;
        if (chore.completed) {
            chore.completedDate = new Date().toLocaleDateString();
            showNotification('🎉 Chore completed! Great job!');
        } else {
            delete chore.completedDate;
        }
        saveChores();
        loadChores();
        updateStatistics();
    }
}

function markComplete(id) {
    const chore = chores.find(c => c.id === id);
    if (chore) {
        chore.completed = true;
        chore.completedDate = new Date().toLocaleDateString();
        saveChores();
        loadChores();
        updateStatistics();
        showNotification('🎉 Awesome! Chore marked as complete!');
    }
}

function deleteChore(id) {
    if (confirm('Are you sure you want to delete this chore?')) {
        db.collection('chores').doc(id.toString()).delete()
            .then(() => {
                chores = chores.filter(c => c.id !== id);
                loadChores();
                updateStatistics();
                showNotification('🗑️ Chore deleted');
            })
            .catch(error => {
                console.error('Error deleting chore:', error);
                showNotification('❌ Failed to delete chore. Please try again later.');
            });
    }
}

function saveChores() {
    chores.forEach(chore => {
        if (chore.id) {
            // Update existing chore
            db.collection('chores').doc(chore.id.toString()).set(chore)
                .catch(error => console.error('Error updating chore:', error));
        } else {
            // Add new chore
            db.collection('chores').add(chore)
                .then(docRef => chore.id = docRef.id)
                .catch(error => console.error('Error adding chore:', error));
        }
    });
}

// Message Board Functions
postMessageForm.addEventListener('submit', function (e) {
    e.preventDefault();
    const author = authorInput.value.trim();
    const messageText = messageInput.value.trim();

    if (author && messageText) {
        const message = {
            id: Date.now(),
            author: author,
            text: messageText,
            timestamp: new Date().toLocaleString(),
            isNew: true
        };

        messages.unshift(message); // Add to beginning for newest first
        saveMessages();
        loadMessages();
        updateStatistics();

        // Clear message input but keep author name
        messageInput.value = '';

        showNotification('📝 Message posted successfully!');
    }
});

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
                    <button onclick="deleteMessage(${message.id})" class="text-red-500 hover:text-red-700 transition-colors">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
            </div>
            <p class="message-text">${message.text}</p>
        `;

        messageList.appendChild(messageElement);
    });
}

function saveMessages() {
    messages.forEach(message => {
        if (message.id) {
            // Update existing message
            db.collection('messages').doc(message.id.toString()).set(message)
                .catch(error => console.error('Error updating message:', error));
        } else {
            // Add new message
            db.collection('messages').add(message)
                .then(docRef => message.id = docRef.id)
                .catch(error => console.error('Error adding message:', error));
        }
    });
}

function deleteMessage(id) {
    if (confirm('Are you sure you want to delete this message?')) {
        db.collection('messages').doc(id.toString()).delete()
            .then(() => {
                messages = messages.filter(m => m.id !== id);
                loadMessages();
                updateStatistics();
                showNotification('🗑️ Message deleted');
            })
            .catch(error => {
                console.error('Error deleting message:', error);
                showNotification('❌ Failed to delete message. Please try again later.');
            });
    }
}

// Statistics and UI Updates
function updateStatistics() {
    const activeChores = chores.filter(c => !c.completed).length;
    const completedToday = chores.filter(c =>
        c.completed && c.completedDate === new Date().toLocaleDateString()
    ).length;
    const newMessages = messages.filter(m => m.isNew).length;

    activeChoresCount.textContent = activeChores;
    completedTodayCount.textContent = completedToday;
    newMessagesCount.textContent = newMessages;

    // Mark messages as read after viewing
    setTimeout(() => {
        messages.forEach(m => m.isNew = false);
        saveMessages();
    }, 5000);
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

// Show login modal if user is not authenticated
function showLoginModal() {
    const loginModal = document.getElementById('loginModal');
    loginModal.classList.remove('hidden');
}

// Hide login modal
function hideLoginModal() {
    const loginModal = document.getElementById('loginModal');
    loginModal.classList.add('hidden');
}

// Firebase Authentication
signInButton.addEventListener('click', () => {
    const provider = new firebase.auth.GoogleAuthProvider();
    auth.signInWithPopup(provider)
        .then(result => {
            currentUser = result.user;
            updateUIForAuth();
            showNotification(`👋 Welcome, ${currentUser.displayName}!`);
        })
        .catch(error => {
            console.error('Error during sign-in:', error);
            showNotification('❌ Sign-in failed. Please try again.');
        });
});

signOutButton.addEventListener('click', () => {
    auth.signOut()
        .then(() => {
            currentUser = null;
            updateUIForAuth();
            showNotification('👋 You have signed out.');
        })
        .catch(error => {
            console.error('Error during sign-out:', error);
            showNotification('❌ Sign-out failed. Please try again.');
        });
});

// Google Sign-In Button
const googleSignInButton = document.getElementById('googleSignInButton');
googleSignInButton.addEventListener('click', () => {
    const provider = new firebase.auth.GoogleAuthProvider();
    auth.signInWithPopup(provider)
        .then(result => {
            currentUser = result.user;
            hideLoginModal();
            updateUIForAuth();
            showNotification(`👋 Welcome, ${currentUser.displayName}!`);
        })
        .catch(error => {
            console.error('Error during Google sign-in:', error);
            showNotification('❌ Google sign-in failed. Please try again.');
        });
});

// Email Sign-In Button
const emailSignInButton = document.getElementById('emailSignInButton');
emailSignInButton.addEventListener('click', () => {
    showNotification('⚠️ Email sign-in is not implemented yet.');
});

function updateUIForAuth() {
    if (currentUser) {
        signInButton.classList.add('hidden');
        signOutButton.classList.remove('hidden');
        // Filter chores and messages by user
        loadChoresFromFirestore();
        loadMessagesFromFirestore();
    } else {
        signInButton.classList.remove('hidden');
        signOutButton.classList.add('hidden');
        chores = [];
        messages = [];
        loadChores();
        loadMessages();
    }
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
messageInput.addEventListener('input', function () {
    this.style.height = 'auto';
    this.style.height = this.scrollHeight + 'px';
});