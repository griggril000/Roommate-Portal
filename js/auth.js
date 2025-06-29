// Roommate Portal - Authentication Module
// Handles user authentication, sign-in/sign-out, and auth state management

window.RoommatePortal = window.RoommatePortal || {};

const authModule = {
    // Initialize authentication listeners and setup
    init() {
        this.setupAuthStateListener();
        this.setupSignInButtons();
        this.setupSignOutButtons();
    },

    // Setup authentication state change listener
    setupAuthStateListener() {
        const { auth } = window.RoommatePortal.config;

        auth.onAuthStateChanged(async (user) => {
            if (user) {
                window.RoommatePortal.state.setCurrentUser(user);

                // Check if we need to collect the user's name
                if (!user.displayName || user.displayName.trim() === '') {
                    try {
                        await this.promptForUserName();
                    } catch (error) {
                        console.error('Error prompting for user name:', error);
                    }
                }

                window.RoommatePortal.household.checkUserHousehold();
            } else {
                window.RoommatePortal.state.setCurrentUser(null);
                window.RoommatePortal.state.setCurrentHousehold(null);
                window.RoommatePortal.dataCleanup.cleanupData();
                window.RoommatePortal.ui.updateUIForAuth();
            }
        });
    },

    // Setup sign-in button event listeners
    setupSignInButtons() {
        const elements = window.RoommatePortal.state.elements;

        // Main sign-in buttons (show modal)
        if (elements.signInButton) {
            elements.signInButton.addEventListener('click', this.showLoginModal);
        }

        if (elements.signInButtonMobile) {
            elements.signInButtonMobile.addEventListener('click', this.showLoginModal);
        }

        // Initialize modal sign-in buttons
        setTimeout(() => {
            const googleSignInButton = document.getElementById('googleSignInButton');
            const emailSignInButton = document.getElementById('emailSignInButton');

            elements.setGoogleSignInButton(googleSignInButton);
            elements.setEmailSignInButton(emailSignInButton);

            if (googleSignInButton) {
                googleSignInButton.addEventListener('click', this.signInWithGoogle);
            }

            if (emailSignInButton) {
                emailSignInButton.addEventListener('click', this.showEmailSignInForm);
            }
        }, 100);
    },

    // Setup sign-out button event listeners
    setupSignOutButtons() {
        const elements = window.RoommatePortal.state.elements;
        const { auth } = window.RoommatePortal.config;

        if (elements.signOutButton) {
            elements.signOutButton.addEventListener('click', () => {
                auth.signOut();
            });
        }

        if (elements.signOutButtonMobile) {
            elements.signOutButtonMobile.addEventListener('click', () => {
                auth.signOut();
            });
        }
    },

    // Sign in with Google
    async signInWithGoogle() {
        try {
            const { auth } = window.RoommatePortal.config;
            const provider = new firebase.auth.GoogleAuthProvider();
            const result = await auth.signInWithPopup(provider);

            window.RoommatePortal.state.setCurrentUser(result.user);
            window.RoommatePortal.utils.showNotification('🎉 Successfully signed in with Google!');
            window.RoommatePortal.auth.hideLoginModal();
        } catch (error) {
            console.error('Error during Google sign-in:', error);
            window.RoommatePortal.utils.showNotification('❌ Failed to sign in with Google. Please try again.');
        }
    },

    // Show email sign-in form
    showEmailSignInForm() {
        // Implementation for email sign-in form would go here
        // This is a simplified version - full implementation would include form handling
        window.RoommatePortal.utils.showNotification('📧 Email sign-in form would appear here');
    },

    // Show login modal
    showLoginModal() {
        const loginModal = document.getElementById('loginModal');
        if (loginModal) {
            loginModal.classList.remove('hidden');
            document.body.style.overflow = 'hidden';
        }
    },

    // Hide login modal
    hideLoginModal() {
        const loginModal = document.getElementById('loginModal');
        if (loginModal) {
            loginModal.classList.add('hidden');
            document.body.style.overflow = '';
        }
    },

    // Prompt for user name if not available from auth provider
    async promptForUserName() {
        return new Promise((resolve, reject) => {
            const currentUser = window.RoommatePortal.state.getCurrentUser();
            if (!currentUser) {
                reject(new Error('No current user'));
                return;
            }

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
                    window.RoommatePortal.utils.showNotification('❌ Please enter your name.');
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
                    window.RoommatePortal.utils.showNotification('❌ Failed to update profile. Please try again.');
                    reject(error);
                }
            });
        });
    }
};

// Export auth module to global namespace
window.RoommatePortal.auth = authModule;
