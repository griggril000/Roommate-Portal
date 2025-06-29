// Roommate Portal - Enhanced Roommate Portal
// 
// HOUSEHOLD MANAGEMENT FEATURES:
// 1. After login, users must create or join a household
// 2. Household members have full CRUD access to household chores
// 3. Household members have full CRUD access to their own messages
// 4. Users cannot delete other members' messages
// 5. Household admin can manage household settings
// 6. Users can leave households (with proper admin transfer)

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

// Set Firebase Authentication persistence to local
auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL)
    .then(() => {
        console.log("Persistence set to local.");
    })
    .catch((error) => {
        console.error("Error setting persistence:", error);
    });

// Data storage
let chores = JSON.parse(localStorage.getItem('roommatePortal_chores')) || [];
let messages = JSON.parse(localStorage.getItem('roommatePortal_messages')) || [];

// Household management
let currentHousehold = null;
let userHouseholds = [];

// Firestore listeners (to manage cleanup)
let choresListener = null;
let messagesListener = null;

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
const householdManagementBtn = document.getElementById('householdManagementBtn');

// Mobile buttons
const signInButtonMobile = document.getElementById('signInButtonMobile');
const signOutButtonMobile = document.getElementById('signOutButtonMobile');
const householdManagementBtnMobile = document.getElementById('householdManagementBtnMobile');
const mobileMenuBtn = document.getElementById('mobileMenuBtn');
const mobileMenu = document.getElementById('mobileMenu');

let currentUser = null;

// Declare variables at the top of the script to avoid redeclaration
let googleSignInButton = null;
let emailSignInButton = null;

// Initialize the app
document.addEventListener('DOMContentLoaded', function () {
    initializeApp();

    // Initialize buttons only once in a setup function or at the start of the script
    googleSignInButton = document.getElementById('googleSignInButton');
    emailSignInButton = document.getElementById('emailSignInButton');

    // Mobile menu toggle
    if (mobileMenuBtn && mobileMenu) {
        mobileMenuBtn.addEventListener('click', () => {
            mobileMenu.classList.toggle('hidden');
        });
    }

    if (googleSignInButton) {
        googleSignInButton.addEventListener('click', () => {
            const provider = new firebase.auth.GoogleAuthProvider();
            auth.signInWithPopup(provider)
                .then(async result => {
                    currentUser = result.user;

                    // Check if we need to collect the user's name
                    if (!currentUser.displayName || currentUser.displayName.trim() === '') {
                        await promptForUserName();
                    }

                    hideLoginModal();
                    updateUIForAuth();
                    showNotification(`👋 Welcome, ${currentUser.displayName || currentUser.email}!`);
                })
                .catch(error => {
                    console.error('Error during Google sign-in:', error);
                    showNotification('❌ Google sign-in failed. Please try again.');
                });
        });
    }

    if (emailSignInButton) {
        emailSignInButton.addEventListener('click', () => {
            const loginModal = document.getElementById('loginModal');
            loginModal.innerHTML = `
                <div class="bg-white rounded-lg shadow-lg p-6 w-96">
                    <h2 class="text-2xl font-bold text-gray-800 mb-4">Sign In with Email</h2>
                    <form id="emailLoginForm" class="space-y-4">
                        <input type="email" id="emailInput" class="w-full px-4 py-2 border rounded-lg" placeholder="Email" required />
                        <input type="password" id="passwordInput" class="w-full px-4 py-2 border rounded-lg" placeholder="Password" required />
                        <button type="submit" class="w-full px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors">Sign In</button>
                    </form>
                    <div class="text-sm text-center mt-4">
                        <button id="showSignUp" class="text-blue-600 hover:underline">Create an account</button>
                        <span class="mx-2">|</span>
                        <button id="showResetPassword" class="text-blue-600 hover:underline">Forgot password?</button>
                    </div>
                </div>
            `;

            const emailLoginForm = document.getElementById('emailLoginForm');
            emailLoginForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                const email = document.getElementById('emailInput').value;
                const password = document.getElementById('passwordInput').value;

                try {
                    const result = await auth.signInWithEmailAndPassword(email, password);
                    currentUser = result.user;

                    // Check if we need to collect the user's name
                    if (!currentUser.displayName || currentUser.displayName.trim() === '') {
                        await promptForUserName();
                    }

                    hideLoginModal();
                    updateUIForAuth();
                    showNotification(`👋 Welcome, ${currentUser.displayName || currentUser.email}!`);
                } catch (error) {
                    console.error('Error during email sign-in:', error);
                    showNotification('❌ Email sign-in failed. Please check your credentials.');
                }
            });

            document.getElementById('showSignUp').addEventListener('click', () => {
                loginModal.innerHTML = `
                    <div class="bg-white rounded-lg shadow-lg p-6 w-96">
                        <h2 class="text-2xl font-bold text-gray-800 mb-4">Sign Up</h2>
                        <form id="signUpForm" class="space-y-4">
                            <input type="text" id="signUpName" class="w-full px-4 py-2 border rounded-lg" placeholder="Your Name" required />
                            <input type="email" id="signUpEmail" class="w-full px-4 py-2 border rounded-lg" placeholder="Email" required />
                            <input type="password" id="signUpPassword" class="w-full px-4 py-2 border rounded-lg" placeholder="Password" required />
                            <button type="submit" class="w-full px-4 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors">Sign Up</button>
                        </form>
                        <div class="text-sm text-center mt-4">
                            <button id="backToSignIn" class="text-blue-600 hover:underline">Back to Sign In</button>
                        </div>
                    </div>
                `;

                document.getElementById('signUpForm').addEventListener('submit', async (e) => {
                    e.preventDefault();
                    const name = document.getElementById('signUpName').value.trim();
                    const email = document.getElementById('signUpEmail').value;
                    const password = document.getElementById('signUpPassword').value;

                    if (!name) {
                        showNotification('❌ Please enter your name.');
                        return;
                    }

                    try {
                        const result = await auth.createUserWithEmailAndPassword(email, password);

                        // Update the user's profile with their name
                        await result.user.updateProfile({
                            displayName: name
                        });

                        currentUser = result.user;
                        hideLoginModal();
                        updateUIForAuth();
                        showNotification(`🎉 Account created! Welcome, ${name}!`);
                    } catch (error) {
                        console.error('Error during sign-up:', error);
                        showNotification('❌ Sign-up failed. Please try again.');
                    }
                });

                document.getElementById('backToSignIn').addEventListener('click', () => {
                    emailSignInButton.click();
                });
            });

            document.getElementById('showResetPassword').addEventListener('click', () => {
                loginModal.innerHTML = `
                    <div class="bg-white rounded-lg shadow-lg p-6 w-96">
                        <h2 class="text-2xl font-bold text-gray-800 mb-4">Reset Password</h2>
                        <form id="resetPasswordForm" class="space-y-4">
                            <input type="email" id="resetEmail" class="w-full px-4 py-2 border rounded-lg" placeholder="Email" required />
                            <button type="submit" class="w-full px-4 py-2 bg-yellow-600 text-white rounded-lg font-medium hover:bg-yellow-700 transition-colors">Reset Password</button>
                        </form>
                        <div class="text-sm text-center mt-4">
                            <button id="backToSignInFromReset" class="text-blue-600 hover:underline">Back to Sign In</button>
                        </div>
                    </div>
                `;

                document.getElementById('resetPasswordForm').addEventListener('submit', (e) => {
                    e.preventDefault();
                    const email = document.getElementById('resetEmail').value;

                    auth.sendPasswordResetEmail(email)
                        .then(() => {
                            showNotification('📧 Password reset email sent! Check your inbox.');
                            emailSignInButton.click();
                        })
                        .catch(error => {
                            console.error('Error during password reset:', error);
                            showNotification('❌ Failed to send password reset email. Please try again.');
                        });
                });

                document.getElementById('backToSignInFromReset').addEventListener('click', () => {
                    emailSignInButton.click();
                });
            });
        });
    }

    // Set up sign-out button event listeners
    if (signOutButton) {
        signOutButton.addEventListener('click', () => {
            auth.signOut();
        });
    }

    if (signOutButtonMobile) {
        signOutButtonMobile.addEventListener('click', () => {
            auth.signOut();
        });
    }

    // Set up household management button event listeners
    if (householdManagementBtn) {
        householdManagementBtn.addEventListener('click', showHouseholdManagement);
    }

    if (householdManagementBtnMobile) {
        householdManagementBtnMobile.addEventListener('click', showHouseholdManagement);
    }

    // Set up main sign-in button event listeners to show login modal
    if (signInButton) {
        signInButton.addEventListener('click', showLoginModal);
    }

    if (signInButtonMobile) {
        signInButtonMobile.addEventListener('click', showLoginModal);
    }
});

function initializeApp() {
    // Ensure header is always visible
    const header = document.querySelector('header');
    if (header) {
        header.style.display = 'block';
        header.style.opacity = '1';
        header.style.visibility = 'visible';
    }

    // Force correct responsive header display
    const desktopHeader = document.querySelector('.hidden.md\\:flex');
    const mobileHeader = document.querySelector('.flex.flex-col.md\\:hidden');

    if (window.innerWidth >= 768) {
        // Desktop view
        if (desktopHeader) {
            desktopHeader.style.display = 'flex';
            desktopHeader.classList.remove('hidden');
        }
        if (mobileHeader) {
            mobileHeader.style.display = 'none';
        }
    } else {
        // Mobile view
        if (mobileHeader) {
            mobileHeader.style.display = 'flex';
        }
        if (desktopHeader) {
            desktopHeader.style.display = 'none';
            desktopHeader.classList.add('hidden');
        }
    }

    // Ensure main content is visible but disabled initially if no user is logged in
    const mainContent = document.getElementById('mainContent');
    if (!currentUser && mainContent) {
        mainContent.style.display = 'block';
        mainContent.style.opacity = '0.3';
        mainContent.style.pointerEvents = 'none';
    }

    updateUIForAuth();

    // Initialize tab to chores
    switchTab('chores');
}

// Check authentication state on page load
auth.onAuthStateChanged(async (user) => {
    if (user) {
        currentUser = user;

        // Check if we need to collect the user's name (only for existing users who don't have a displayName)
        if (!currentUser.displayName || currentUser.displayName.trim() === '') {
            try {
                await promptForUserName();
            } catch (error) {
                console.error('Error prompting for user name:', error);
            }
        }

        checkUserHousehold();
    } else {
        currentUser = null;
        currentHousehold = null;
        // Clean up data and listeners immediately when user logs out
        cleanupData();
        updateUIForAuth();
    }
});

// Household Management Functions
async function checkUserHousehold() {
    try {
        // Check if user is member of any household
        const userDoc = await db.collection('users').doc(currentUser.uid).get();

        if (userDoc.exists && userDoc.data().householdId) {
            const householdId = userDoc.data().householdId;
            const householdDoc = await db.collection('households').doc(householdId).get();

            if (householdDoc.exists) {
                currentHousehold = { id: householdDoc.id, ...householdDoc.data() };
                updateUIForAuth();
                loadHouseholdData();
            } else {
                // Household doesn't exist, clear user's household reference
                await db.collection('users').doc(currentUser.uid).update({
                    householdId: firebase.firestore.FieldValue.delete()
                });
                showHouseholdModal();
            }
        } else {
            // User is not part of any household
            showHouseholdModal();
        }
    } catch (error) {
        console.error('Error checking user household:', error);
        showHouseholdModal();
    }
}

function showHouseholdModal() {
    const householdModal = document.getElementById('householdModal');
    if (!householdModal) {
        createHouseholdModal();
    }

    const modal = document.getElementById('householdModal');
    modal.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
}

function hideHouseholdModal() {
    const householdModal = document.getElementById('householdModal');
    if (householdModal) {
        householdModal.classList.add('hidden');
        document.body.style.overflow = '';
    }
}

function hideLoginModal() {
    const loginModal = document.getElementById('loginModal');
    if (loginModal) {
        loginModal.classList.add('hidden');
        document.body.style.overflow = '';
    }
}

function showLoginModal() {
    const loginModal = document.getElementById('loginModal');
    if (loginModal) {
        loginModal.classList.remove('hidden');
        document.body.style.overflow = 'hidden';
    }
}

function createHouseholdModal() {
    const modalHTML = `
        <div id="householdModal" class="fixed inset-0 bg-gray-800 bg-opacity-40 flex items-center justify-center z-50">
            <div class="bg-white rounded-lg shadow-lg p-6 w-96 max-w-md mx-4">
                <h2 class="text-2xl font-bold text-gray-800 mb-4">🏠 Household Setup</h2>
                <p class="text-gray-600 mb-6">You need to create or join a household to continue.</p>
                
                <div class="space-y-4">
                    <button id="createHouseholdBtn" class="w-full px-4 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors">
                        <i class="fas fa-plus mr-2"></i>Create New Household
                    </button>
                    <button id="joinHouseholdBtn" class="w-full px-4 py-3 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors">
                        <i class="fas fa-users mr-2"></i>Join Existing Household
                    </button>
                </div>
            </div>
        </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHTML);

    // Add event listeners
    document.getElementById('createHouseholdBtn').addEventListener('click', showCreateHouseholdForm);
    document.getElementById('joinHouseholdBtn').addEventListener('click', showJoinHouseholdForm);
}

function showCreateHouseholdForm() {
    const modal = document.getElementById('householdModal');
    modal.innerHTML = `
        <div class="bg-white rounded-lg shadow-lg p-6 w-96 max-w-md mx-4">
            <h2 class="text-2xl font-bold text-gray-800 mb-4">🏠 Create Household</h2>
            <form id="createHouseholdForm" class="space-y-4">
                <input type="text" id="householdNameInput" class="w-full px-4 py-3 border rounded-lg focus:border-blue-500 focus:outline-none" placeholder="Household Name" required>
                <textarea id="householdDescInput" class="w-full px-4 py-3 border rounded-lg focus:border-blue-500 focus:outline-none resize-none" rows="3" placeholder="Description (optional)"></textarea>
                <div class="flex space-x-3">
                    <button type="submit" class="flex-1 px-4 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors">
                        Create
                    </button>
                    <button type="button" id="backToHouseholdOptions" class="flex-1 px-4 py-3 bg-gray-600 text-white rounded-lg font-medium hover:bg-gray-700 transition-colors">
                        Back
                    </button>
                </div>
            </form>
        </div>
    `;

    document.getElementById('createHouseholdForm').addEventListener('submit', handleCreateHousehold);
    document.getElementById('backToHouseholdOptions').addEventListener('click', () => {
        modal.remove();
        createHouseholdModal();
        showHouseholdModal();
    });
}

function showJoinHouseholdForm() {
    const modal = document.getElementById('householdModal');
    modal.innerHTML = `
        <div class="bg-white rounded-lg shadow-lg p-6 w-96 max-w-md mx-4">
            <h2 class="text-2xl font-bold text-gray-800 mb-4">🏠 Join Household</h2>
            <form id="joinHouseholdForm" class="space-y-4">
                <input type="text" id="householdCodeInput" class="w-full px-4 py-3 border rounded-lg focus:border-blue-500 focus:outline-none" placeholder="Household Code" required>
                <div class="flex space-x-3">
                    <button type="submit" class="flex-1 px-4 py-3 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors">
                        Join
                    </button>
                    <button type="button" id="backToHouseholdOptionsJoin" class="flex-1 px-4 py-3 bg-gray-600 text-white rounded-lg font-medium hover:bg-gray-700 transition-colors">
                        Back
                    </button>
                </div>
            </form>
        </div>
    `;

    document.getElementById('joinHouseholdForm').addEventListener('submit', handleJoinHousehold);
    document.getElementById('backToHouseholdOptionsJoin').addEventListener('click', () => {
        modal.remove();
        createHouseholdModal();
        showHouseholdModal();
    });
}

async function handleCreateHousehold(e) {
    e.preventDefault();
    const householdName = document.getElementById('householdNameInput').value.trim();
    const householdDesc = document.getElementById('householdDescInput').value.trim();

    if (!householdName) return;

    try {
        // Generate a unique household code
        const householdCode = generateHouseholdCode();

        // Create household document
        const householdData = {
            name: householdName,
            description: householdDesc || '',
            code: householdCode,
            createdBy: currentUser.uid,
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            members: [currentUser.uid],
            memberDetails: {
                [currentUser.uid]: {
                    displayName: currentUser.displayName || currentUser.email,
                    email: currentUser.email,
                    joinedAt: firebase.firestore.FieldValue.serverTimestamp(),
                    role: 'admin'
                }
            }
        };

        const householdRef = await db.collection('households').add(householdData);

        // Update user document with household reference
        await db.collection('users').doc(currentUser.uid).set({
            householdId: householdRef.id,
            email: currentUser.email,
            displayName: currentUser.displayName || currentUser.email
        }, { merge: true });

        currentHousehold = { id: householdRef.id, ...householdData };
        hideHouseholdModal();
        updateUIForAuth();
        loadHouseholdData();

        showNotification(`🎉 Household "${householdName}" created! Code: ${householdCode}`);
    } catch (error) {
        console.error('Error creating household:', error);
        showNotification('❌ Failed to create household. Please try again.');
    }
}

async function handleJoinHousehold(e) {
    e.preventDefault();
    const householdCode = document.getElementById('householdCodeInput').value.trim().toUpperCase();

    if (!householdCode) return;

    try {
        // Find household by code
        const householdQuery = await db.collection('households')
            .where('code', '==', householdCode)
            .limit(1)
            .get();

        if (householdQuery.empty) {
            showNotification('❌ Invalid household code. Please check and try again.');
            return;
        }

        const householdDoc = householdQuery.docs[0];
        const householdData = householdDoc.data();

        // Check if user is already a member
        if (householdData.members && householdData.members.includes(currentUser.uid)) {
            showNotification('ℹ️ You are already a member of this household.');
            currentHousehold = { id: householdDoc.id, ...householdData };
            hideHouseholdModal();
            updateUIForAuth();
            loadHouseholdData();
            return;
        }

        // Add user to household
        await db.collection('households').doc(householdDoc.id).update({
            members: firebase.firestore.FieldValue.arrayUnion(currentUser.uid),
            [`memberDetails.${currentUser.uid}`]: {
                displayName: currentUser.displayName || currentUser.email,
                email: currentUser.email,
                joinedAt: firebase.firestore.FieldValue.serverTimestamp(),
                role: 'member'
            }
        });

        // Update user document
        await db.collection('users').doc(currentUser.uid).set({
            householdId: householdDoc.id,
            email: currentUser.email,
            displayName: currentUser.displayName || currentUser.email
        }, { merge: true });

        currentHousehold = { id: householdDoc.id, ...householdData };
        hideHouseholdModal();
        updateUIForAuth();
        loadHouseholdData();

        showNotification(`🎉 Successfully joined household "${householdData.name}"!`);
    } catch (error) {
        console.error('Error joining household:', error);
        showNotification('❌ Failed to join household. Please try again.');
    }
}

function generateHouseholdCode() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < 6; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
}

function loadHouseholdData() {
    if (currentHousehold) {
        // Enable main content when household data is loaded
        const mainContent = document.getElementById('mainContent');
        if (mainContent) {
            mainContent.style.display = 'block';
            mainContent.style.opacity = '1';
            mainContent.style.pointerEvents = 'auto';
        }

        loadChoresFromFirestore();
        loadMessagesFromFirestore();
        updateHouseholdMembers();
    }
}

// Clean up listeners and data when logging out
function cleanupData() {
    // Stop listening to Firestore
    if (choresListener) {
        choresListener();
        choresListener = null;
    }

    if (messagesListener) {
        messagesListener();
        messagesListener = null;
    }

    // Clear data arrays
    chores = [];
    messages = [];

    // Clear current user and household if logging out completely
    if (!currentUser) {
        currentHousehold = null;
    }

    // Force clear the UI elements directly to ensure no stale data
    if (choreList) {
        choreList.innerHTML = '';
    }
    if (messageList) {
        messageList.innerHTML = '';
    }

    // Reset statistics to zero
    if (activeChoresCount) activeChoresCount.textContent = '0';
    if (completedTodayCount) completedTodayCount.textContent = '0';
    if (newMessagesCount) newMessagesCount.textContent = '0';

    // Clear form inputs
    const choreInput = document.getElementById('choreInput');
    const choreAssignee = document.getElementById('choreAssignee');
    const chorePriority = document.getElementById('chorePriority');
    const messageInput = document.getElementById('messageInput');
    const authorInput = document.getElementById('authorInput');

    if (choreInput) choreInput.value = '';
    if (choreAssignee) choreAssignee.value = '';
    if (chorePriority) chorePriority.value = 'medium';
    if (messageInput) messageInput.value = '';
    if (authorInput) {
        authorInput.value = '';
        authorInput.readOnly = false; // Make it editable again
    }

    // Always update UI to show empty state, but don't hide main content
    loadChores();
    loadMessages();
    updateStatistics();
}

// Load chores from Firestore (updated for household)
function loadChoresFromFirestore() {
    if (!currentHousehold) return;

    // Clean up any existing listener
    if (choresListener) {
        choresListener();
        choresListener = null;
    }

    choresListener = db.collection('chores')
        .where('householdId', '==', currentHousehold.id)
        .onSnapshot((snapshot) => {
            chores = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            loadChores();
            updateStatistics();
        }, (error) => {
            console.error('Error loading chores:', error);
            // Handle case where chores collection doesn't exist yet (not an error)
            if (error.code === 'permission-denied') {
                // Permission denied - this is a real error
                if (currentUser && currentHousehold) {
                    showNotification('❌ Failed to load chores. Please check your permissions.');
                }
            } else if (error.code === 'not-found' || error.message.includes('collection')) {
                // Collection doesn't exist yet - this is normal for new households
                chores = [];
                loadChores();
                updateStatistics();
            } else {
                // Other errors
                if (currentUser && currentHousehold) {
                    showNotification('❌ Failed to load chores. Please try again later.');
                }
            }
        });
}

// Load messages from Firestore (updated for household)
function loadMessagesFromFirestore() {
    if (!currentHousehold) return;

    // Clean up any existing listener
    if (messagesListener) {
        messagesListener();
        messagesListener = null;
    }

    messagesListener = db.collection('messages')
        .where('householdId', '==', currentHousehold.id)
        .onSnapshot((snapshot) => {
            messages = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            // Sort messages in JavaScript instead of Firestore to avoid index issues
            messages.sort((a, b) => {
                const aTime = a.timestamp ? a.timestamp.seconds : 0;
                const bTime = b.timestamp ? b.timestamp.seconds : 0;
                return bTime - aTime; // Most recent first
            });
            loadMessages();
            updateStatistics(); // Update statistics when messages change
        }, (error) => {
            console.error('Error loading messages:', error);
            // Handle different types of errors appropriately
            if (error.code === 'permission-denied') {
                // Permission denied - this is a real error
                if (currentUser && currentHousehold) {
                    showNotification('❌ Failed to load messages. Please check your permissions.');
                }
            } else {
                // Other errors
                if (currentUser && currentHousehold) {
                    showNotification('❌ Failed to load messages. Please try again later.');
                }
            }
        });
}

function updateHouseholdMembers() {
    if (!currentHousehold || !currentHousehold.memberDetails) return;

    // Update assignee dropdown with household members
    const choreAssignee = document.getElementById('choreAssignee');
    if (choreAssignee) {
        // Clear existing options more efficiently
        choreAssignee.innerHTML = '';

        // Create and add default option
        const defaultOption = document.createElement('option');
        defaultOption.value = '';
        defaultOption.textContent = 'Assign to...';
        choreAssignee.appendChild(defaultOption);

        // Add member options
        Object.values(currentHousehold.memberDetails).forEach(member => {
            const option = document.createElement('option');
            option.value = member.displayName;
            option.textContent = member.displayName;
            choreAssignee.appendChild(option);
        });

        // Add "Everyone" option
        const everyoneOption = document.createElement('option');
        everyoneOption.value = 'Everyone';
        everyoneOption.textContent = 'Everyone';
        choreAssignee.appendChild(everyoneOption);
    }

    // Update author input with current user's name
    const authorInput = document.getElementById('authorInput');
    if (authorInput && currentUser) {
        const userDetails = currentHousehold.memberDetails[currentUser.uid];
        if (userDetails) {
            authorInput.value = userDetails.displayName;
            authorInput.readOnly = true;
        }
    }
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
if (addChoreForm) {
    addChoreForm.addEventListener('submit', function (e) {
        e.preventDefault();

        if (!currentHousehold) {
            showNotification('❌ You must be part of a household to add chores.');
            return;
        }

        const choreText = choreInput.value.trim();
        const assignee = choreAssignee.value;

        if (choreText) {
            const chore = {
                text: choreText,
                assignee: assignee || 'Unassigned',
                completed: false,
                dateAdded: new Date().toLocaleDateString(),
                priority: 'medium',
                householdId: currentHousehold.id,
                createdBy: currentUser.uid,
                createdByName: currentUser.displayName,
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            };

            // Add to Firestore
            db.collection('chores').add(chore)
                .then(() => {
                    // Clear form
                    choreInput.value = '';
                    choreAssignee.value = '';
                    showNotification('✅ Chore added successfully!');
                })
                .catch(error => {
                    console.error('Error adding chore:', error);
                    showNotification('❌ Failed to add chore. Please try again.');
                });
        }
    });
}

// Function to prompt for user name if not available from auth provider
async function promptForUserName() {
    return new Promise((resolve, reject) => {
        const nameModal = document.createElement('div');
        nameModal.id = 'nameModal';
        nameModal.className = 'fixed inset-0 bg-gray-800 bg-opacity-40 flex items-center justify-center z-50';
        nameModal.innerHTML = `
            <div class="bg-white rounded-lg shadow-lg p-6 w-96 max-w-md mx-4">
                <h2 class="text-2xl font-bold text-gray-800 mb-4">👋 What's your name?</h2>
                <p class="text-gray-600 mb-6">Help your roommates know who you are!</p>
                
                <form id="nameForm" class="space-y-4">
                    <input type="text" id="userNameInput" class="w-full px-4 py-3 border rounded-lg focus:border-blue-500 focus:outline-none" placeholder="Enter your name" required />
                    <button type="submit" class="w-full px-4 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors">
                        Continue
                    </button>
                </form>
            </div>
        `;

        document.body.appendChild(nameModal);
        document.body.style.overflow = 'hidden';

        const nameForm = document.getElementById('nameForm');
        const userNameInput = document.getElementById('userNameInput');

        // Focus on the input field
        setTimeout(() => userNameInput.focus(), 100);

        nameForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const name = userNameInput.value.trim();

            if (!name) {
                showNotification('❌ Please enter your name.');
                return;
            }

            try {
                // Update the user's profile with their name
                await currentUser.updateProfile({
                    displayName: name
                });

                // Remove the modal
                document.body.removeChild(nameModal);
                document.body.style.overflow = '';

                resolve(name);
            } catch (error) {
                console.error('Error updating user profile:', error);
                showNotification('❌ Failed to update profile. Please try again.');
                reject(error);
            }
        });
    });
}

// Helper function to get user display name by UID
function getUserDisplayName(uid) {
    if (!uid) return 'Unknown User';
    if (!currentHousehold || !currentHousehold.memberDetails) return 'Unknown User';

    const member = currentHousehold.memberDetails[uid];
    return member ? member.displayName : 'Former Member';
}

function loadChores() {
    choreList.innerHTML = '';

    if (chores.length === 0) {
        const emptyStateMessage = !currentUser ?
            '<p>Sign in to manage your household chores and tasks.</p>' :
            !currentHousehold ?
                '<p>Join or create a household to start managing chores together.</p>' :
                '<p>Add your first chore using the form above to get started.</p>';

        choreList.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-tasks"></i>
                <h3>No chores yet!</h3>
                ${emptyStateMessage}
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
        const isFormerMemberChore = chore.createdBy === 'former-member';
        const createdByName = isFormerMemberChore ?
            (chore.originalCreator || 'Former Member') :
            (chore.createdByName || getUserDisplayName(chore.createdBy));
        const completedByName = chore.completedBy ?
            (chore.completedByName || getUserDisplayName(chore.completedBy)) :
            null;

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
                            ${isFormerMemberChore ? '<span class="bg-gray-200 text-gray-600 text-xs px-2 py-1 rounded-full">Legacy</span>' : ''}
                        </div>
                        <div class="chore-date">
                            📅 Added: ${chore.dateAdded} • Created by: <span class="font-medium">${createdByName}</span>
                            ${chore.completed ? ` | ✅ Completed: ${chore.completedDate || new Date().toLocaleDateString()}` : ''}
                            ${chore.completed && completedByName ? ` • by: <span class="font-medium">${completedByName}</span>` : ''}
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

function toggleChore(id) {
    // Don't proceed if user is not logged in
    if (!currentUser || !currentHousehold) {
        showNotification('❌ You must be logged in and part of a household to manage chores.');
        return;
    }

    const chore = chores.find(c => c.id === id);
    if (chore) {
        chore.completed = !chore.completed;
        if (chore.completed) {
            chore.completedDate = new Date().toLocaleDateString();
            chore.completedBy = currentUser.uid;
            chore.completedByName = currentUser.displayName;
            showNotification('🎉 Chore completed! Great job!');
        } else {
            delete chore.completedDate;
            delete chore.completedBy;
            delete chore.completedByName;
        }

        // Update in Firestore
        const updateData = {
            completed: chore.completed,
            completedDate: chore.completedDate || firebase.firestore.FieldValue.delete(),
            completedBy: chore.completedBy || firebase.firestore.FieldValue.delete(),
            completedByName: chore.completedByName || firebase.firestore.FieldValue.delete()
        };

        db.collection('chores').doc(id).update(updateData).catch(error => {
            console.error('Error updating chore:', error);
            showNotification('❌ Failed to update chore. Please try again.');
        });
    }
}

function markComplete(id) {
    // Don't proceed if user is not logged in
    if (!currentUser || !currentHousehold) {
        showNotification('❌ You must be logged in and part of a household to manage chores.');
        return;
    }

    const chore = chores.find(c => c.id === id);
    if (chore) {
        chore.completed = true;
        chore.completedDate = new Date().toLocaleDateString();
        chore.completedBy = currentUser.uid;
        chore.completedByName = currentUser.displayName;

        // Update in Firestore
        db.collection('chores').doc(id).update({
            completed: true,
            completedDate: chore.completedDate,
            completedBy: chore.completedBy,
            completedByName: chore.completedByName
        }).then(() => {
            showNotification('🎉 Awesome! Chore marked as complete!');
        }).catch(error => {
            console.error('Error updating chore:', error);
            showNotification('❌ Failed to update chore. Please try again.');
        });
    }
}

function deleteChore(id) {
    // Don't proceed if user is not logged in
    if (!currentUser || !currentHousehold) {
        showNotification('❌ You must be logged in and part of a household to manage chores.');
        return;
    }

    if (confirm('Are you sure you want to delete this chore?')) {
        db.collection('chores').doc(id).delete()
            .then(() => {
                showNotification('🗑️ Chore deleted');
            })
            .catch(error => {
                console.error('Error deleting chore:', error);
                showNotification('❌ Failed to delete chore. Please try again.');
            });
    }
}

// Message Board Functions
if (postMessageForm) {
    postMessageForm.addEventListener('submit', function (e) {
        e.preventDefault();

        if (!currentHousehold) {
            showNotification('❌ You must be part of a household to post messages.');
            return;
        }

        const author = authorInput.value.trim();
        const messageText = messageInput.value.trim();

        if (author && messageText) {
            const message = {
                author: author,
                text: messageText,
                timestamp: firebase.firestore.FieldValue.serverTimestamp(),
                householdId: currentHousehold.id,
                authorId: currentUser.uid,
                // Track which users have read this message (author has read it by default)
                readBy: [currentUser.uid]
            };

            // Add to Firestore
            db.collection('messages').add(message)
                .then(() => {
                    // Clear message input but keep author name
                    messageInput.value = '';
                    showNotification('📝 Message posted successfully!');
                })
                .catch(error => {
                    console.error('Error posting message:', error);
                    showNotification('❌ Failed to post message. Please try again.');
                });
        }
    });
}

function loadMessages() {
    messageList.innerHTML = '';

    if (messages.length === 0) {
        const emptyStateMessage = !currentUser ?
            '<p>Sign in to see messages from your roommates.</p>' :
            !currentHousehold ?
                '<p>Join or create a household to start messaging with roommates.</p>' :
                '<p>Be the first to post a message to your roommates.</p>';

        messageList.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-comments"></i>
                <h3>No messages yet!</h3>
                ${emptyStateMessage}
            </div>
        `;
        return;
    }

    messages.forEach((message, index) => {
        const messageElement = document.createElement('div');
        messageElement.className = 'message-item animate-slide-in';
        messageElement.style.animationDelay = `${index * 0.1}s`;

        const avatarEmoji = getAvatarEmoji(message.author);
        // Only check if it's own message if user is logged in
        const isOwnMessage = currentUser && message.authorId === currentUser.uid;

        messageElement.innerHTML = `
            <div class="flex justify-between items-start mb-3">
                <div class="flex items-center space-x-2">
                    <span class="text-2xl">${avatarEmoji}</span>
                    <span class="message-author">${message.author}</span>
                    ${!message.readBy || !message.readBy.includes(currentUser.uid) ? '<span class="bg-red-500 text-white text-xs px-2 py-1 rounded-full">NEW</span>' : ''}

                </div>
                <div class="flex items-center space-x-3">
                    <span class="message-timestamp">${message.timestamp ? new Date(message.timestamp.seconds * 1000).toLocaleString() : 'Just now'}</span>
                    ${isOwnMessage ? `<button onclick="deleteMessage('${message.id}')" class="text-red-500 hover:text-red-700 transition-colors">
                        <i class="fas fa-times"></i>
                    </button>` : ''}
                </div>
            </div>
            <p class="message-text">${message.text}</p>
        `;

        messageList.appendChild(messageElement);
    });
}

function deleteMessage(id) {
    // Don't proceed if user is not logged in
    if (!currentUser) {
        showNotification('❌ You must be logged in to delete messages.');
        return;
    }

    const message = messages.find(m => m.id === id);

    // Check if user can delete this message (only their own messages)
    if (!message || message.authorId !== currentUser.uid) {
        showNotification('❌ You can only delete your own messages.');
        return;
    }

    if (confirm('Are you sure you want to delete this message?')) {
        db.collection('messages').doc(id).delete()
            .then(() => {
                showNotification('🗑️ Message deleted');
            })
            .catch(error => {
                console.error('Error deleting message:', error);
                showNotification('❌ Failed to delete message. Please try again.');
            });
    }
}

// Statistics and UI Updates
function updateStatistics() {
    // Handle case when there's no data (logged out or no household)
    if (!currentUser || !currentHousehold) {
        if (activeChoresCount) activeChoresCount.textContent = '0';
        if (completedTodayCount) completedTodayCount.textContent = '0';
        if (newMessagesCount) newMessagesCount.textContent = '0';
        return;
    }

    const activeChores = chores.filter(c => !c.completed).length;
    const completedToday = chores.filter(c =>
        c.completed && c.completedDate === new Date().toLocaleDateString()
    ).length;

    // Count messages that the current user hasn't read yet
    const newMessages = messages.filter(m =>
        !m.readBy || !m.readBy.includes(currentUser.uid)
    ).length;

    if (activeChoresCount) activeChoresCount.textContent = activeChores;
    if (completedTodayCount) completedTodayCount.textContent = completedToday;
    if (newMessagesCount) newMessagesCount.textContent = newMessages;

    // Mark messages as read after viewing (only if user is still logged in and has household)
    if (currentUser && currentHousehold && messages.length > 0) {
        setTimeout(() => {
            markMessagesAsRead();
        }, 5000);
    }
}

// New function to mark messages as read for the current user
function markMessagesAsRead() {
    if (!currentUser || !currentHousehold) return;

    const batch = db.batch();
    let hasUpdates = false;

    messages.forEach(message => {
        if (message.id && (!message.readBy || !message.readBy.includes(currentUser.uid))) {
            const messageRef = db.collection('messages').doc(message.id);
            batch.update(messageRef, {
                readBy: firebase.firestore.FieldValue.arrayUnion(currentUser.uid)
            });
            hasUpdates = true;
        }
    });

    if (hasUpdates) {
        batch.commit().catch(error => {
            // Only show error if user is still logged in
            if (currentUser && currentHousehold) {
                console.error('Error updating message read status:', error);
            }
        });
    }
}

// Unified button management to eliminate mobile/desktop duplication
function updateAuthButtons(isSignedIn, hasHousehold) {
    const buttons = {
        signIn: {
            desktop: document.getElementById('signInButton'),
            mobile: document.getElementById('signInButtonMobile')
        },
        signOut: {
            desktop: document.getElementById('signOutButton'),
            mobile: document.getElementById('signOutButtonMobile')
        },
        household: {
            desktop: document.getElementById('householdManagementBtn'),
            mobile: document.getElementById('householdManagementBtnMobile')
        }
    };

    // Update sign in/out buttons
    Object.values(buttons.signIn).forEach(btn => {
        if (btn) btn.classList.toggle('hidden', isSignedIn);
    });

    Object.values(buttons.signOut).forEach(btn => {
        if (btn) btn.classList.toggle('hidden', !isSignedIn);
    });

    // Update household management buttons
    Object.values(buttons.household).forEach(btn => {
        if (btn) btn.classList.toggle('hidden', !isSignedIn || !hasHousehold);
    });
}

// Helper functions to update UI without HTML overwriting
function updateBrandInfo(title, subtitle) {
    const brandInfo = document.getElementById('brandInfo');
    if (!brandInfo) return;

    const titleElement = brandInfo.querySelector('h1');
    const subtitleElement = brandInfo.querySelector('p');

    if (titleElement) titleElement.textContent = title;
    if (subtitleElement) subtitleElement.textContent = subtitle;
}

function updateHouseholdStatus(statusText, isConnected) {
    // Update desktop household info
    const householdInfo = document.getElementById('householdInfo');
    if (householdInfo) {
        const statusSpan = householdInfo.querySelector('span');
        if (statusSpan) {
            statusSpan.textContent = `🏠 ${statusText}`;
            statusSpan.className = `font-medium ${isConnected ? 'text-green-700' : 'text-gray-500'}`;
        }
    }

    // Update mobile household info
    const householdInfoMobile = document.getElementById('householdInfoMobile');
    if (householdInfoMobile) {
        const statusSpan = householdInfoMobile.querySelector('span');
        if (statusSpan) {
            statusSpan.textContent = isConnected ? `🏠 ${statusText.split(' • ')[1] || statusText}` : '🏠 No household';
            statusSpan.className = `font-medium text-sm ${isConnected ? 'text-green-700' : 'text-gray-500'}`;
        }
    }
}

function updateHouseholdHeader() {
    if (currentHousehold) {
        const memberCount = Object.keys(currentHousehold.memberDetails || {}).length;
        const statusText = `${currentHousehold.name} • ${memberCount} member${memberCount !== 1 ? 's' : ''}`;
        updateHouseholdStatus(statusText, true);
    } else {
        updateHouseholdStatus('No household', false);
    }
}

function clearHouseholdHeader() {
    // Update brand info to show default state
    updateBrandInfo('Roommate Portal', 'Your Shared Living Dashboard');

    // Update household status
    updateHouseholdStatus('Not connected to a household', false);
}

function updateUIForAuth() {
    const mainContent = document.getElementById('mainContent');
    const header = document.querySelector('header');

    // Ensure header is always visible
    if (header) {
        header.style.display = 'block';
        header.style.opacity = '1';
        header.style.visibility = 'visible';
        header.style.position = 'static';
    }

    if (currentUser && currentHousehold) {
        // Show main content
        if (mainContent) {
            mainContent.style.display = 'block';
            mainContent.style.opacity = '1';
            mainContent.style.pointerEvents = 'auto';
        }

        // Use unified button management
        updateAuthButtons(true, true);

        // Hide login and household modals
        hideLoginModal();
        hideHouseholdModal();

        // Update household info in header
        updateHouseholdHeader();
    } else if (currentUser && !currentHousehold) {
        // Show main content but in disabled state when no household
        if (mainContent) {
            mainContent.style.display = 'block';
            mainContent.style.opacity = '0.3';
            mainContent.style.pointerEvents = 'none';
        }

        // User is logged in but not part of a household
        updateAuthButtons(true, false);
        hideLoginModal();

        // Clean up data when no household
        cleanupData();
        clearHouseholdHeader();

        // Household modal will be shown by checkUserHousehold()
    } else {
        // Show main content but in disabled state when logged out
        if (mainContent) {
            mainContent.style.display = 'block';
            mainContent.style.opacity = '0.3';
            mainContent.style.pointerEvents = 'none';
        }

        // Show sign-in buttons and hide sign-out buttons
        updateAuthButtons(false, false);

        // Hide all modals when logged out
        hideLoginModal();
        hideHouseholdModal();

        // Close any household management modal
        const householdMgmtModal = document.getElementById('householdManagementModal');
        if (householdMgmtModal) {
            householdMgmtModal.remove();
            document.body.style.overflow = '';
        }

        // Clean up all data and listeners when logged out
        cleanupData();
        clearHouseholdHeader();
    }
}

function showHouseholdManagement() {
    if (!currentHousehold) return;

    const modal = document.createElement('div');
    modal.id = 'householdManagementModal';
    modal.className = 'fixed inset-0 bg-gray-800 bg-opacity-40 flex items-center justify-center z-50';

    const membersList = Object.entries(currentHousehold.memberDetails || {})
        .map(([uid, member]) => `
            <div class="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div class="flex items-center space-x-3">
                    <span class="text-2xl">${getAvatarEmoji(member.displayName)}</span>
                    <div>
                        <p class="font-medium text-gray-800">${member.displayName}</p>
                        <p class="text-sm text-gray-500">${member.email}</p>
                    </div>
                </div>
                <span class="px-2 py-1 text-xs font-medium rounded-full ${member.role === 'admin' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'
            }">${member.role}</span>
            </div>
        `).join('');

    modal.innerHTML = `
        <div class="bg-white rounded-lg shadow-lg p-6 w-full max-w-md mx-4">
            <h2 class="text-2xl font-bold text-gray-800 mb-4">🏠 Household Management</h2>
            
            <div class="space-y-4">
                <div class="bg-blue-50 p-4 rounded-lg">
                    <h3 class="font-semibold text-blue-800 mb-2">Household Details</h3>
                    <p class="text-gray-700"><strong>Name:</strong> ${currentHousehold.name}</p>
                    <p class="text-gray-700"><strong>Code:</strong> ${currentHousehold.code}</p>
                    <p class="text-gray-700"><strong>Members:</strong> ${Object.keys(currentHousehold.memberDetails || {}).length}</p>
                </div>
                
                <div>
                    <h3 class="font-semibold text-gray-800 mb-3">Members</h3>
                    <div class="space-y-2 max-h-48 overflow-y-auto">
                        ${membersList}
                    </div>
                </div>
                
                <div class="flex space-x-3 pt-4 border-t">
                    <button id="editProfileBtn" class="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors">
                        Edit Profile
                    </button>
                    <button id="leaveHouseholdBtn" class="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition-colors">
                        Leave Household
                    </button>
                    <button id="closeHouseholdManagementBtn" class="flex-1 px-4 py-2 bg-gray-600 text-white rounded-lg font-medium hover:bg-gray-700 transition-colors">
                        Close
                    </button>
                </div>
                
                <div class="pt-3 border-t border-gray-200 mt-3">
                    <button id="deleteAccountBtn" class="w-full px-4 py-2 bg-red-800 text-white rounded-lg font-medium hover:bg-red-900 transition-colors text-sm">
                        ⚠️ Delete Account Permanently
                    </button>
                </div>
            </div>
        </div>
    `;

    document.body.appendChild(modal);
    document.body.style.overflow = 'hidden';

    // Add event listeners
    document.getElementById('editProfileBtn').addEventListener('click', () => {
        modal.remove();
        document.body.style.overflow = '';
        showEditProfileModal();
    });
    document.getElementById('leaveHouseholdBtn').addEventListener('click', leaveHousehold);
    document.getElementById('deleteAccountBtn').addEventListener('click', deleteUserAccount);
    document.getElementById('closeHouseholdManagementBtn').addEventListener('click', () => {
        modal.remove();
        document.body.style.overflow = '';
    });
}

async function leaveHousehold() {
    if (!currentHousehold || !currentUser) return;

    const isAdmin = currentHousehold.memberDetails[currentUser.uid]?.role === 'admin';
    const memberCount = Object.keys(currentHousehold.memberDetails || {}).length;

    let confirmMessage = 'Are you sure you want to leave this household? This will unassign chores assigned to you and delete your messages, but preserve all chores for household history.';
    if (isAdmin && memberCount > 1) {
        confirmMessage = 'You are the admin of this household. Leaving will transfer admin rights to another member, unassign your chores, and delete your messages. All chores will be preserved. Are you sure?';
    } else if (isAdmin && memberCount === 1) {
        confirmMessage = 'You are the only member of this household. Leaving will delete the household and ALL data permanently (including all chores and messages). Are you sure?';
    }

    if (confirm(confirmMessage)) {
        try {
            const isLastMember = memberCount === 1;

            // Delete user's data from the household
            await deleteUserDataFromHousehold(currentUser.uid, currentHousehold.id, isLastMember);

            if (isLastMember) {
                // Delete the household entirely (including all remaining data)
                await deleteEntireHousehold(currentHousehold.id);
                showNotification('🏠 Household and all data deleted successfully.');
            } else {
                // Remove user from household
                await db.collection('households').doc(currentHousehold.id).update({
                    members: firebase.firestore.FieldValue.arrayRemove(currentUser.uid),
                    [`memberDetails.${currentUser.uid}`]: firebase.firestore.FieldValue.delete()
                });

                // If user was admin, transfer admin to first remaining member
                if (isAdmin) {
                    const remainingMembers = Object.keys(currentHousehold.memberDetails).filter(uid => uid !== currentUser.uid);
                    if (remainingMembers.length > 0) {
                        await db.collection('households').doc(currentHousehold.id).update({
                            [`memberDetails.${remainingMembers[0]}.role`]: 'admin'
                        });
                    }
                }

                showNotification('👋 You have left the household. Your chores have been unassigned and marked as created by "Former Member", and your messages have been deleted.');
            }

            // Remove household reference from user
            await db.collection('users').doc(currentUser.uid).update({
                householdId: firebase.firestore.FieldValue.delete()
            });

            // Reset household state
            currentHousehold = null;

            // Close modal and show household selection
            const modal = document.getElementById('householdManagementModal');
            if (modal) {
                modal.remove();
                document.body.style.overflow = '';
            }

            showHouseholdModal();

        } catch (error) {
            console.error('Error leaving household:', error);
            showNotification('❌ Failed to leave household. Please try again.');
        }
    }
}

// Data cleanup functions
async function deleteUserDataFromHousehold(userId, householdId, isLastMember = false) {
    try {
        if (isLastMember) {
            // If this is the last member, delete all chores in the household
            const deleteBatch = db.batch();

            const allChoresQuery = await db.collection('chores')
                .where('householdId', '==', householdId)
                .get();

            allChoresQuery.docs.forEach(doc => {
                deleteBatch.delete(doc.ref);
            });

            // Delete all messages in the household
            const userMessagesQuery = await db.collection('messages')
                .where('householdId', '==', householdId)
                .get();

            userMessagesQuery.docs.forEach(doc => {
                deleteBatch.delete(doc.ref);
            });

            // Commit all deletions for last member
            await deleteBatch.commit();
        } else {
            // Get user's display name for operations
            const userDetails = currentHousehold.memberDetails[userId];
            const userDisplayName = userDetails ? userDetails.displayName : 'Unknown User';

            // First batch: Handle updates only (no deletions)
            const updateBatch = db.batch();

            // Unassign chores assigned to this user (set to "Unassigned")
            const userAssignedChoresQuery = await db.collection('chores')
                .where('householdId', '==', householdId)
                .where('assignee', '==', userDisplayName)
                .get();

            userAssignedChoresQuery.docs.forEach(doc => {
                updateBatch.update(doc.ref, {
                    assignee: 'Unassigned'
                });
            });

            // Update ALL chores created by this user to mark as "former-member" (preserve all chores)
            const userCreatedChoresQuery = await db.collection('chores')
                .where('householdId', '==', householdId)
                .where('createdBy', '==', userId)
                .get();

            userCreatedChoresQuery.docs.forEach(doc => {
                // Keep ALL chores (completed and incomplete) but mark as created by "Former Member"
                updateBatch.update(doc.ref, {
                    createdBy: 'former-member',
                    originalCreator: userDisplayName
                });
            });

            // Remove user from readBy arrays in remaining messages
            const allMessagesQuery = await db.collection('messages')
                .where('householdId', '==', householdId)
                .get();

            allMessagesQuery.docs.forEach(doc => {
                const messageData = doc.data();
                if (messageData.readBy && messageData.readBy.includes(userId)) {
                    updateBatch.update(doc.ref, {
                        readBy: firebase.firestore.FieldValue.arrayRemove(userId)
                    });
                }
            });

            // Commit all updates first
            await updateBatch.commit();

            // Second batch: Handle deletions only
            const deleteBatch = db.batch();

            // Delete all messages posted by this user
            const userMessagesQuery = await db.collection('messages')
                .where('householdId', '==', householdId)
                .where('authorId', '==', userId)
                .get();

            userMessagesQuery.docs.forEach(doc => {
                deleteBatch.delete(doc.ref);
            });

            // Commit all deletions
            await deleteBatch.commit();
        }

        console.log(`Cleaned up data for user ${userId} from household ${householdId}${isLastMember ? ' (last member)' : ''}`);
    } catch (error) {
        console.error('Error cleaning up user data from household:', error);

        // Provide more specific error information
        if (error.code === 'permission-denied') {
            throw new Error('Permission denied: Unable to delete user data from household. Check Firestore security rules.');
        } else if (error.code === 'not-found') {
            console.warn('Some data was not found (may have been already deleted)');
            // This is not necessarily an error, continue
        } else {
            throw new Error(`Failed to clean up user data: ${error.message || error.code || 'Unknown error'}`);
        }
    }
}

async function deleteEntireHousehold(householdId) {
    try {
        const batch = db.batch();

        // Delete all chores in the household
        const choresQuery = await db.collection('chores')
            .where('householdId', '==', householdId)
            .get();

        choresQuery.docs.forEach(doc => {
            batch.delete(doc.ref);
        });

        // Delete all messages in the household
        const messagesQuery = await db.collection('messages')
            .where('householdId', '==', householdId)
            .get();

        messagesQuery.docs.forEach(doc => {
            batch.delete(doc.ref);
        });

        // Delete the household document itself
        batch.delete(db.collection('households').doc(householdId));

        // Commit all deletions
        await batch.commit();
        console.log(`Deleted entire household ${householdId} and all associated data`);
    } catch (error) {
        console.error('Error deleting entire household:', error);

        // Provide more specific error information
        if (error.code === 'permission-denied') {
            throw new Error('Permission denied: Unable to delete household data. Check Firestore security rules.');
        } else {
            throw new Error(`Failed to delete household: ${error.message || error.code || 'Unknown error'}`);
        }
    }
}

async function deleteUserAccount() {
    if (!currentUser) {
        showNotification('❌ No user is currently signed in.');
        return;
    }

    const confirmMessage = 'Are you sure you want to delete your account? This will:\n\n' +
        '• Remove you from your current household\n' +
        '• Unassign chores assigned to you (chores will be preserved)\n' +
        '• Mark chores you created as "Former Member"\n' +
        '• Delete your messages\n' +
        '• Permanently delete your account\n\n' +
        'This action cannot be undone!';

    if (confirm(confirmMessage)) {
        let householdDataDeleted = false;
        let userRemovedFromHousehold = false;

        try {
            // If user is part of a household, clean up their data first
            if (currentHousehold) {
                try {
                    // Check if user was the only member
                    const memberCount = Object.keys(currentHousehold.memberDetails || {}).length;
                    const isLastMember = memberCount === 1;

                    await deleteUserDataFromHousehold(currentUser.uid, currentHousehold.id, isLastMember);
                    householdDataDeleted = true;

                    if (isLastMember) {
                        // Delete the entire household since user was the only member
                        await deleteEntireHousehold(currentHousehold.id);
                    } else {
                        // Remove user from household
                        await db.collection('households').doc(currentHousehold.id).update({
                            members: firebase.firestore.FieldValue.arrayRemove(currentUser.uid),
                            [`memberDetails.${currentUser.uid}`]: firebase.firestore.FieldValue.delete()
                        });
                        userRemovedFromHousehold = true;

                        // If user was admin, transfer admin to first remaining member
                        const isAdmin = currentHousehold.memberDetails[currentUser.uid]?.role === 'admin';
                        if (isAdmin) {
                            const remainingMembers = Object.keys(currentHousehold.memberDetails).filter(uid => uid !== currentUser.uid);
                            if (remainingMembers.length > 0) {
                                await db.collection('households').doc(currentHousehold.id).update({
                                    [`memberDetails.${remainingMembers[0]}.role`]: 'admin'
                                });
                            }
                        }
                    }
                } catch (householdError) {
                    console.error('Error cleaning up household data:', householdError);
                    // Continue with account deletion even if household cleanup fails
                    showNotification('⚠️ Warning: Could not fully clean up household data, but proceeding with account deletion.');
                }
            }

            // Delete user document from Firestore
            try {
                await db.collection('users').doc(currentUser.uid).delete();
            } catch (userDocError) {
                console.error('Error deleting user document:', userDocError);
                // Continue with auth user deletion even if user document deletion fails
            }

            // Delete the Firebase Auth user account
            await currentUser.delete();

            // Clear local state
            currentUser = null;
            currentHousehold = null;

            // Close the management modal
            const modal = document.getElementById('householdManagementModal');
            if (modal) {
                modal.remove();
                document.body.style.overflow = '';
            }

            // Clean up data and update UI
            cleanupData();
            clearLocalStorage();
            updateUIForAuth();

            // Show success message based on what was actually deleted
            if (householdDataDeleted) {
                showNotification('✅ Your account and all associated data have been deleted successfully.');
            } else {
                showNotification('✅ Your account has been deleted (some household data may remain).');
            }

        } catch (error) {
            console.error('Error deleting user account:', error);

            // Handle different types of errors with specific messages
            if (error.code === 'auth/requires-recent-login') {
                showNotification('❌ Please sign out and sign back in to delete your account (for security).');
            } else if (error.code === 'permission-denied') {
                showNotification('❌ Permission denied. Unable to delete account data. Please contact support.');
            } else if (error.code === 'not-found') {
                // Some data might already be deleted, continue with auth deletion
                try {
                    await currentUser.delete();
                    currentUser = null;
                    currentHousehold = null;
                    cleanupData();
                    clearLocalStorage();
                    updateUIForAuth();
                    showNotification('✅ Account deleted (some data was already removed).');
                } catch (authError) {
                    console.error('Error deleting auth user:', authError);
                    showNotification('❌ Failed to completely delete account. Please try again.');
                }
            } else if (error.message && error.message.includes('Missing or insufficient permissions')) {
                showNotification('❌ Insufficient permissions to delete account data. This may be due to Firestore security rules. Please contact support or try leaving the household first.');
            } else if (error.message && error.message.includes('chores')) {
                showNotification('❌ Unable to delete chore data due to permission restrictions. Please try leaving the household first, then delete your account.');
            } else if (error.message && error.message.includes('messages')) {
                showNotification('❌ Unable to delete message data due to permission restrictions. Please try leaving the household first, then delete your account.');
            } else {
                showNotification(`❌ Failed to delete account: ${error.message || 'Unknown error'}. Please try again.`);
            }

            // Close the management modal on any error
            const modal = document.getElementById('householdManagementModal');
            if (modal) {
                modal.remove();
                document.body.style.overflow = '';
            }
        }
    }
}

// Utility functions
function showNotification(message) {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = 'fixed bottom-4 right-4 bg-white border border-gray-200 rounded-lg shadow-lg p-4 max-w-sm z-50 transform translate-x-full transition-transform duration-300';
    notification.innerHTML = `
        <div class="flex items-start space-x-3">
            <div class="flex-1">
                <p class="text-sm text-gray-800">${message}</p>
            </div>
            <button onclick="this.parentElement.parentElement.remove()" class="text-gray-400 hover:text-gray-600">
                <i class="fas fa-times"></i>
            </button>
        </div>
    `;

    document.body.appendChild(notification);

    // Animate in
    setTimeout(() => {
        notification.classList.remove('translate-x-full');
    }, 100);

    // Auto-remove after 5 seconds
    setTimeout(() => {
        notification.classList.add('translate-x-full');
        setTimeout(() => {
            if (notification.parentElement) {
                notification.remove();
            }
        }, 300);
    }, 5000);
}

function getAvatarEmoji(name) {
    const emojis = ['👨', '👩', '🧑', '👨‍💻', '👩‍💻', '👨‍🎓', '👩‍🎓', '👨‍🏫', '👩‍🏫', '👨‍⚕️', '👩‍⚕️', '👨‍🍳', '👩‍🍳', '👨‍🎨', '👩‍🎨'];
    const index = name ? name.charCodeAt(0) % emojis.length : 0;
    return emojis[index];
}

// Clear localStorage function
function clearLocalStorage() {
    localStorage.removeItem('roommatePortal_chores');
    localStorage.removeItem('roommatePortal_messages');
    console.log('Local storage cleared');
}

function showEditProfileModal() {
    const modal = document.createElement('div');
    modal.id = 'editProfileModal';
    modal.className = 'fixed inset-0 bg-gray-800 bg-opacity-40 flex items-center justify-center z-50';

    modal.innerHTML = `
        <div class="bg-white rounded-lg shadow-lg p-6 w-96 max-w-md mx-4">
            <h2 class="text-2xl font-bold text-gray-800 mb-4">✏️ Edit Profile</h2>
            
            <form id="editProfileForm" class="space-y-4">
                <div>
                    <label for="newDisplayName" class="block text-sm font-medium text-gray-700 mb-2">Your Name</label>
                    <input type="text" id="newDisplayName" 
                           class="w-full px-4 py-3 border rounded-lg focus:border-blue-500 focus:outline-none" 
                           placeholder="Enter your name" 
                           value="${currentUser.displayName || ''}" 
                           required />
                    <p class="text-sm text-gray-500 mt-1">This name will be updated across all chores and messages.</p>
                </div>
                
                <div class="flex space-x-3 pt-4">
                    <button type="submit" class="flex-1 px-4 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors">
                        Update Name
                    </button>
                    <button type="button" id="cancelEditProfile" class="flex-1 px-4 py-3 bg-gray-600 text-white rounded-lg font-medium hover:bg-gray-700 transition-colors">
                        Cancel
                    </button>
                </div>
            </form>
        </div>
    `;

    document.body.appendChild(modal);
    document.body.style.overflow = 'hidden';

    const newDisplayNameInput = document.getElementById('newDisplayName');
    setTimeout(() => newDisplayNameInput.focus(), 100);

    // Add event listeners
    document.getElementById('editProfileForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const newName = newDisplayNameInput.value.trim();

        if (!newName) {
            showNotification('❌ Please enter a valid name.');
            return;
        }

        if (newName === currentUser.displayName) {
            showNotification('ℹ️ No changes to save.');
            modal.remove();
            document.body.style.overflow = '';
            return;
        }

        // Disable form while updating
        const submitBtn = e.target.querySelector('button[type="submit"]');
        submitBtn.disabled = true;
        submitBtn.textContent = 'Updating...';

        try {
            await updateUserName(newName);
            modal.remove();
            document.body.style.overflow = '';
            showNotification('✅ Profile updated successfully!');
        } catch (error) {
            console.error('Error updating profile:', error);
            showNotification('❌ Failed to update profile. Please try again.');
            submitBtn.disabled = false;
            submitBtn.textContent = 'Update Name';
        }
    });

    document.getElementById('cancelEditProfile').addEventListener('click', () => {
        modal.remove();
        document.body.style.overflow = '';
    });
}

async function updateUserName(newName) {
    if (!currentUser || !currentHousehold) {
        throw new Error('User must be logged in and part of a household');
    }

    const oldName = currentUser.displayName;
    const userId = currentUser.uid;

    try {
        // 1. Update Firebase Auth profile
        await currentUser.updateProfile({
            displayName: newName
        });

        // 2. Update user document in Firestore
        await db.collection('users').doc(userId).update({
            displayName: newName
        });

        // 3. Update household member details
        await db.collection('households').doc(currentHousehold.id).update({
            [`memberDetails.${userId}.displayName`]: newName
        });

        // 4. Update all chores created by this user
        const choresQuery = await db.collection('chores')
            .where('householdId', '==', currentHousehold.id)
            .where('createdBy', '==', userId)
            .get();

        const choreUpdates = [];
        choresQuery.docs.forEach(doc => {
            choreUpdates.push(
                db.collection('chores').doc(doc.id).update({
                    createdByName: newName
                })
            );
        });

        // 5. Update all chores completed by this user
        const completedChoresQuery = await db.collection('chores')
            .where('householdId', '==', currentHousehold.id)
            .where('completedBy', '==', userId)
            .get();

        completedChoresQuery.docs.forEach(doc => {
            choreUpdates.push(
                db.collection('chores').doc(doc.id).update({
                    completedByName: newName
                })
            );
        });

        // 6. Update all chores assigned to this user (by name)
        if (oldName) {
            const assignedChoresQuery = await db.collection('chores')
                .where('householdId', '==', currentHousehold.id)
                .where('assignee', '==', oldName)
                .get();

            assignedChoresQuery.docs.forEach(doc => {
                choreUpdates.push(
                    db.collection('chores').doc(doc.id).update({
                        assignee: newName
                    })
                );
            });
        }

        // 7. Update all messages authored by this user
        const messagesQuery = await db.collection('messages')
            .where('householdId', '==', currentHousehold.id)
            .where('authorId', '==', userId)
            .get();

        const messageUpdates = [];
        messagesQuery.docs.forEach(doc => {
            messageUpdates.push(
                db.collection('messages').doc(doc.id).update({
                    author: newName
                })
            );
        });

        // Execute all updates
        await Promise.all([...choreUpdates, ...messageUpdates]);

        // Update local current user object
        // Note: Firebase Auth automatically updates currentUser.displayName after updateProfile

        // Update local household data
        if (currentHousehold.memberDetails && currentHousehold.memberDetails[userId]) {
            currentHousehold.memberDetails[userId].displayName = newName;
        }

        // Refresh household members dropdown
        updateHouseholdMembers();

        // Refresh UI components that show user names
        updateUIForAuth();

    } catch (error) {
        console.error('Error in updateUserName:', error);
        throw error;
    }
}