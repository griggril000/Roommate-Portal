// RoomieHub - Enhanced Roommate Portal
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
let chores = JSON.parse(localStorage.getItem('roomieHub_chores')) || [];
let messages = JSON.parse(localStorage.getItem('roomieHub_messages')) || [];

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
            emailLoginForm.addEventListener('submit', (e) => {
                e.preventDefault();
                const email = document.getElementById('emailInput').value;
                const password = document.getElementById('passwordInput').value;

                auth.signInWithEmailAndPassword(email, password)
                    .then(result => {
                        currentUser = result.user;
                        hideLoginModal();
                        updateUIForAuth();
                        showNotification(`👋 Welcome, ${currentUser.email}!`);
                    })
                    .catch(error => {
                        console.error('Error during email sign-in:', error);
                        showNotification('❌ Email sign-in failed. Please check your credentials.');
                    });
            });

            document.getElementById('showSignUp').addEventListener('click', () => {
                loginModal.innerHTML = `
                    <div class="bg-white rounded-lg shadow-lg p-6 w-96">
                        <h2 class="text-2xl font-bold text-gray-800 mb-4">Sign Up</h2>
                        <form id="signUpForm" class="space-y-4">
                            <input type="email" id="signUpEmail" class="w-full px-4 py-2 border rounded-lg" placeholder="Email" required />
                            <input type="password" id="signUpPassword" class="w-full px-4 py-2 border rounded-lg" placeholder="Password" required />
                            <button type="submit" class="w-full px-4 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors">Sign Up</button>
                        </form>
                        <div class="text-sm text-center mt-4">
                            <button id="backToSignIn" class="text-blue-600 hover:underline">Back to Sign In</button>
                        </div>
                    </div>
                `;

                document.getElementById('signUpForm').addEventListener('submit', (e) => {
                    e.preventDefault();
                    const email = document.getElementById('signUpEmail').value;
                    const password = document.getElementById('signUpPassword').value;

                    auth.createUserWithEmailAndPassword(email, password)
                        .then(result => {
                            currentUser = result.user;
                            hideLoginModal();
                            updateUIForAuth();
                            showNotification(`🎉 Account created! Welcome, ${currentUser.email}!`);
                        })
                        .catch(error => {
                            console.error('Error during sign-up:', error);
                            showNotification('❌ Sign-up failed. Please try again.');
                        });
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
auth.onAuthStateChanged((user) => {
    if (user) {
        currentUser = user;
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
            // Only show error notification if user is still logged in and has a household
            if (currentUser && currentHousehold) {
                showNotification('❌ Failed to load chores. Please try again later.');
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
        }, (error) => {
            console.error('Error loading messages:', error);
            // Only show error notification if user is still logged in and has a household
            if (currentUser && currentHousehold) {
                showNotification('❌ Failed to load messages. Please try again later.');
            }
        });
}

function updateHouseholdMembers() {
    if (!currentHousehold || !currentHousehold.memberDetails) return;

    // Update assignee dropdown with household members
    const choreAssignee = document.getElementById('choreAssignee');
    if (choreAssignee) {
        choreAssignee.innerHTML = '<option value="">Assign to...</option>';

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
                            📅 Added: ${chore.dateAdded}
                            ${chore.completed ? ` | ✅ Completed: ${chore.completedDate || new Date().toLocaleDateString()}` : ''}
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
            showNotification('🎉 Chore completed! Great job!');
        } else {
            delete chore.completedDate;
        }

        // Update in Firestore
        db.collection('chores').doc(id).update({
            completed: chore.completed,
            completedDate: chore.completedDate || firebase.firestore.FieldValue.delete()
        }).catch(error => {
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

        // Update in Firestore
        db.collection('chores').doc(id).update({
            completed: true,
            completedDate: chore.completedDate
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
                isNew: true
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
                    ${message.isNew ? '<span class="bg-red-500 text-white text-xs px-2 py-1 rounded-full">NEW</span>' : ''}
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
    if (!currentUser || !currentHousehold || chores.length === 0) {
        if (activeChoresCount) activeChoresCount.textContent = '0';
        if (completedTodayCount) completedTodayCount.textContent = '0';
        if (newMessagesCount) newMessagesCount.textContent = messages.filter(m => m.isNew).length || '0';
        return;
    }

    const activeChores = chores.filter(c => !c.completed).length;
    const completedToday = chores.filter(c =>
        c.completed && c.completedDate === new Date().toLocaleDateString()
    ).length;
    const newMessages = messages.filter(m => m.isNew).length;

    if (activeChoresCount) activeChoresCount.textContent = activeChores;
    if (completedTodayCount) completedTodayCount.textContent = completedToday;
    if (newMessagesCount) newMessagesCount.textContent = newMessages;

    // Mark messages as read after viewing (only if user is logged in and has household)
    if (currentUser && currentHousehold && messages.length > 0) {
        setTimeout(() => {
            messages.forEach(m => m.isNew = false);
            // Update in Firestore (batch update for efficiency)
            const batch = db.batch();
            messages.forEach(m => {
                if (m.id) {
                    const messageRef = db.collection('messages').doc(m.id);
                    batch.update(messageRef, { isNew: false });
                }
            });
            batch.commit().catch(error => {
                // Only show error if user is still logged in
                if (currentUser && currentHousehold) {
                    console.error('Error updating message status:', error);
                }
            });
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

    // Auto remove after 5 seconds
    setTimeout(() => {
        if (notification.parentElement) {
            notification.remove();
        }
    }, 5000);
}

// Show login modal if user is not authenticated
function showLoginModal() {
    const loginModal = document.getElementById('loginModal');
    loginModal.classList.remove('hidden');

    // Disable scrolling but allow background to be visible
    document.body.style.overflow = 'hidden';
    // Don't disable pointer events on body - let the modal handle it
}

// Hide login modal
function hideLoginModal() {
    const loginModal = document.getElementById('loginModal');
    loginModal.classList.add('hidden');

    // Re-enable scrolling
    document.body.style.overflow = '';
}

// Firebase Authentication
if (signInButton) {
    signInButton.addEventListener('click', () => {
        showLoginModal();
    });
}

if (signInButtonMobile) {
    signInButtonMobile.addEventListener('click', () => {
        showLoginModal();
    });
}

if (signOutButton) {
    signOutButton.addEventListener('click', () => {
        auth.signOut()
            .then(() => {
                currentUser = null;
                currentHousehold = null;
                updateUIForAuth();
                showNotification('👋 You have signed out.');
            })
            .catch(error => {
                console.error('Error during sign-out:', error);
                showNotification('❌ Sign-out failed. Please try again.');
            });
    });
}

if (signOutButtonMobile) {
    signOutButtonMobile.addEventListener('click', () => {
        auth.signOut()
            .then(() => {
                currentUser = null;
                currentHousehold = null;
                updateUIForAuth();
                showNotification('👋 You have signed out.');
            })
            .catch(error => {
                console.error('Error during sign-out:', error);
                showNotification('❌ Sign-out failed. Please try again.');
            });
    });
}

if (householdManagementBtn) {
    householdManagementBtn.addEventListener('click', showHouseholdManagement);
}

if (householdManagementBtnMobile) {
    householdManagementBtnMobile.addEventListener('click', showHouseholdManagement);
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

    // Force desktop header to be visible on desktop
    const desktopHeader = document.querySelector('.hidden.md\\:flex');
    if (desktopHeader && window.innerWidth >= 768) {
        desktopHeader.style.display = 'flex';
        desktopHeader.classList.remove('hidden');
    }

    // Force mobile header to be visible on mobile
    const mobileHeader = document.querySelector('.flex.flex-col.md\\:hidden');
    if (mobileHeader && window.innerWidth < 768) {
        mobileHeader.style.display = 'flex';
    }

    if (currentUser && currentHousehold) {
        // Show main content
        if (mainContent) {
            mainContent.style.display = 'block';
            mainContent.style.opacity = '1';
            mainContent.style.pointerEvents = 'auto';
        }

        // Hide sign-in buttons and show sign-out buttons
        if (signInButton) signInButton.classList.add('hidden');
        if (signInButtonMobile) signInButtonMobile.classList.add('hidden');
        if (signOutButton) signOutButton.classList.remove('hidden');
        if (signOutButtonMobile) signOutButtonMobile.classList.remove('hidden');
        if (householdManagementBtn) householdManagementBtn.classList.remove('hidden');
        if (householdManagementBtnMobile) householdManagementBtnMobile.classList.remove('hidden');

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
        if (signInButton) signInButton.classList.add('hidden');
        if (signInButtonMobile) signInButtonMobile.classList.add('hidden');
        if (signOutButton) signOutButton.classList.remove('hidden');
        if (signOutButtonMobile) signOutButtonMobile.classList.remove('hidden');
        if (householdManagementBtn) householdManagementBtn.classList.add('hidden');
        if (householdManagementBtnMobile) householdManagementBtnMobile.classList.add('hidden');
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
        if (signInButton) signInButton.classList.remove('hidden');
        if (signInButtonMobile) signInButtonMobile.classList.remove('hidden');
        if (signOutButton) signOutButton.classList.add('hidden');
        if (signOutButtonMobile) signOutButtonMobile.classList.add('hidden');
        if (householdManagementBtn) householdManagementBtn.classList.add('hidden');
        if (householdManagementBtnMobile) householdManagementBtnMobile.classList.add('hidden');

        // Hide login modal when logged out (only show when sign-in button is clicked)
        hideLoginModal();

        // Clean up all data and listeners when logged out
        cleanupData();
        clearHouseholdHeader();
    }
}

function clearHouseholdHeader() {
    // Clear header household name and code (desktop)
    const headerInfo = document.querySelector('header .hidden.md\\:flex .flex.items-center.space-x-3 div:last-child');
    if (headerInfo) {
        headerInfo.innerHTML = `
            <h1 class="text-2xl font-bold text-gray-800">
                RoomieHub
            </h1>
            <p class="text-sm text-gray-600">
                Your Roommate Portal
            </p>
        `;
    }

    // Clear mobile header title
    const mobileHeaderInfo = document.querySelector('header .flex.flex-col .flex.items-center.space-x-3 div:last-child');
    if (mobileHeaderInfo) {
        mobileHeaderInfo.innerHTML = `
            <h1 class="text-xl font-bold text-gray-800">
                RoomieHub
            </h1>
            <p class="text-xs text-gray-600">
                Roommate Portal
            </p>
        `;
    }

    // Clear household info section (desktop)
    const householdInfo = document.getElementById('householdInfo');
    if (householdInfo) {
        householdInfo.innerHTML = `
            <span class="text-gray-500 font-medium">
                🏠 Not connected to a household
            </span>
        `;
    }

    // Clear household info section (mobile)
    const householdInfoMobile = document.getElementById('householdInfoMobile');
    if (householdInfoMobile) {
        householdInfoMobile.innerHTML = `
            <span class="text-gray-500 font-medium text-sm">
                🏠 No household
            </span>
        `;
    }
}

function updateHouseholdHeader() {
    if (!currentHousehold) return;

    // Update header to show household name and code (desktop)
    const headerInfo = document.querySelector('header .hidden.md\\:flex .flex.items-center.space-x-3 div:last-child');
    if (headerInfo) {
        headerInfo.innerHTML = `
            <h1 class="text-2xl font-bold text-gray-800">
                Roommate Portal
            </h1>
            <p class="text-sm text-gray-600">
                ${currentHousehold.name} • Code: ${currentHousehold.code}
            </p>
        `;
    }

    // Update mobile header title
    const mobileHeaderInfo = document.querySelector('header .flex.flex-col .flex.items-center.space-x-3 div:last-child');
    if (mobileHeaderInfo) {
        mobileHeaderInfo.innerHTML = `
            <h1 class="text-xl font-bold text-gray-800">
                ${currentHousehold.name}
            </h1>
            <p class="text-xs text-gray-600">
                Code: ${currentHousehold.code}
            </p>
        `;
    }

    // Update household info section (desktop)
    const householdInfo = document.getElementById('householdInfo');
    if (householdInfo && currentHousehold.memberDetails) {
        const memberCount = Object.keys(currentHousehold.memberDetails).length;
        householdInfo.innerHTML = `
            <span class="text-green-700 font-medium">
                🏠 ${currentHousehold.name} • ${memberCount} member${memberCount !== 1 ? 's' : ''}
            </span>
        `;
    }

    // Update household info section (mobile)
    const householdInfoMobile = document.getElementById('householdInfoMobile');
    if (householdInfoMobile && currentHousehold.memberDetails) {
        const memberCount = Object.keys(currentHousehold.memberDetails).length;
        householdInfoMobile.innerHTML = `
            <span class="text-green-700 font-medium text-sm">
                🏠 ${memberCount} member${memberCount !== 1 ? 's' : ''}
            </span>
        `;
    }
}

// Keyboard shortcuts
document.addEventListener('keydown', function (e) {
    // Ctrl/Cmd + Enter to submit forms
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        if (document.activeElement === choreInput || document.activeElement === choreAssignee) {
            if (addChoreForm) addChoreForm.dispatchEvent(new Event('submit'));
        } else if (document.activeElement === messageInput || document.activeElement === authorInput) {
            if (postMessageForm) postMessageForm.dispatchEvent(new Event('submit'));
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

// Household Management Panel
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
                    <button id="leaveHouseholdBtn" class="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition-colors">
                        Leave Household
                    </button>
                    <button id="closeHouseholdManagementBtn" class="flex-1 px-4 py-2 bg-gray-600 text-white rounded-lg font-medium hover:bg-gray-700 transition-colors">
                        Close
                    </button>
                </div>
            </div>
        </div>
    `;

    document.body.appendChild(modal);
    document.body.style.overflow = 'hidden';

    // Add event listeners
    document.getElementById('leaveHouseholdBtn').addEventListener('click', leaveHousehold);
    document.getElementById('closeHouseholdManagementBtn').addEventListener('click', () => {
        modal.remove();
        document.body.style.overflow = '';
    });
}

async function leaveHousehold() {
    if (!currentHousehold || !currentUser) return;

    const isAdmin = currentHousehold.memberDetails[currentUser.uid]?.role === 'admin';
    const memberCount = Object.keys(currentHousehold.memberDetails || {}).length;

    let confirmMessage = 'Are you sure you want to leave this household?';
    if (isAdmin && memberCount > 1) {
        confirmMessage = 'You are the admin of this household. Leaving will transfer admin rights to another member. Are you sure?';
    } else if (isAdmin && memberCount === 1) {
        confirmMessage = 'You are the only member of this household. Leaving will delete the household permanently. Are you sure?';
    }

    if (confirm(confirmMessage)) {
        try {
            if (memberCount === 1) {
                // Delete the household entirely
                await db.collection('households').doc(currentHousehold.id).delete();
                showNotification('🏠 Household deleted successfully.');
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

                showNotification('👋 You have left the household.');
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

// Handle window resize to ensure proper header display
window.addEventListener('resize', function () {
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
});