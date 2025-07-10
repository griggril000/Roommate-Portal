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

                // Dispatch auth state change event for notifications
                window.dispatchEvent(new CustomEvent('roommatePortal:authStateChange', {
                    detail: { user: user }
                }));

                window.RoommatePortal.household.checkUserHousehold();
            } else {
                window.RoommatePortal.state.setCurrentUser(null);
                window.RoommatePortal.state.setCurrentHousehold(null);
                window.RoommatePortal.dataCleanup.cleanupData();
                window.RoommatePortal.ui.updateUIForAuth();

                // Dispatch auth state change event for notifications
                window.dispatchEvent(new CustomEvent('roommatePortal:authStateChange', {
                    detail: { user: null }
                }));
            }
        });
    },

    // Setup sign-in button event listeners
    setupSignInButtons() {
        const elements = window.RoommatePortal.state.elements;

        // Main sign-in buttons (show modal)
        if (elements.signInButton) {
            elements.signInButton.addEventListener('click', this.showLoginModal.bind(this));
        }

        if (elements.signInButtonMobile) {
            elements.signInButtonMobile.addEventListener('click', this.showLoginModal.bind(this));
        }

        // Initialize modal sign-in buttons
        setTimeout(() => {
            const googleSignInButton = document.getElementById('googleSignInButton');
            const emailSignInButton = document.getElementById('emailSignInButton');

            elements.setGoogleSignInButton(googleSignInButton);
            elements.setEmailSignInButton(emailSignInButton);

            if (googleSignInButton) {
                googleSignInButton.addEventListener('click', this.signInWithGoogle.bind(this));
            }

            if (emailSignInButton) {
                emailSignInButton.addEventListener('click', this.showEmailSignInForm.bind(this));
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

            // Check if we need to collect the user's name
            if (!result.user.displayName || result.user.displayName.trim() === '') {
                await this.promptForUserName();
            }

            this.hideLoginModal();
            window.RoommatePortal.ui.updateUIForAuth();
            window.RoommatePortal.utils.showNotification(`👋 Welcome, ${result.user.displayName || result.user.email}!`);
        } catch (error) {
            console.error('Error during Google sign-in:', error);
            window.RoommatePortal.utils.showNotification('❌ Failed to sign in with Google. Please try again.');
        }
    },

    // Show email sign-in form
    showEmailSignInForm() {
        const loginModal = document.getElementById('loginModal');
        if (!loginModal) return;

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

        // Set up email login form
        const emailLoginForm = document.getElementById('emailLoginForm');
        emailLoginForm.addEventListener('submit', this.handleEmailSignIn.bind(this));

        // Set up navigation buttons
        document.getElementById('showSignUp').addEventListener('click', this.showSignUpForm.bind(this));
        document.getElementById('showResetPassword').addEventListener('click', this.showResetPasswordForm.bind(this));
    },

    // Handle email sign-in
    async handleEmailSignIn(e) {
        e.preventDefault();
        const email = document.getElementById('emailInput').value;
        const password = document.getElementById('passwordInput').value;

        try {
            const { auth } = window.RoommatePortal.config;
            const result = await auth.signInWithEmailAndPassword(email, password);
            const currentUser = result.user;

            window.RoommatePortal.state.setCurrentUser(currentUser);

            // Check if we need to collect the user's name
            if (!currentUser.displayName || currentUser.displayName.trim() === '') {
                await this.promptForUserName();
            }

            this.hideLoginModal();
            window.RoommatePortal.ui.updateUIForAuth();
            window.RoommatePortal.utils.showNotification(`👋 Welcome, ${currentUser.displayName || currentUser.email}!`);
        } catch (error) {
            console.error('Error during email sign-in:', error);
            window.RoommatePortal.utils.showNotification('❌ Email sign-in failed. Please check your credentials.');
        }
    },

    // Show sign-up form
    showSignUpForm() {
        const loginModal = document.getElementById('loginModal');
        if (!loginModal) return;

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

        // Set up sign-up form
        const signUpForm = document.getElementById('signUpForm');
        signUpForm.addEventListener('submit', this.handleSignUp.bind(this));

        // Set up back button
        document.getElementById('backToSignIn').addEventListener('click', this.showEmailSignInForm.bind(this));
    },

    // Handle sign-up
    async handleSignUp(e) {
        e.preventDefault();
        const name = document.getElementById('signUpName').value.trim();
        const email = document.getElementById('signUpEmail').value;
        const password = document.getElementById('signUpPassword').value;

        if (!name) {
            window.RoommatePortal.utils.showNotification('❌ Please enter your name.');
            return;
        }

        try {
            const { auth } = window.RoommatePortal.config;
            const result = await auth.createUserWithEmailAndPassword(email, password);

            // Update the user's profile with their name
            await result.user.updateProfile({
                displayName: name
            });

            window.RoommatePortal.state.setCurrentUser(result.user);
            this.hideLoginModal();
            window.RoommatePortal.ui.updateUIForAuth();
            window.RoommatePortal.utils.showNotification(`🎉 Account created! Welcome, ${name}!`);
        } catch (error) {
            console.error('Error during sign-up:', error);
            window.RoommatePortal.utils.showNotification('❌ Sign-up failed. Please try again.');
        }
    },

    // Show reset password form
    showResetPasswordForm() {
        const loginModal = document.getElementById('loginModal');
        if (!loginModal) return;

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

        // Set up reset password form
        const resetPasswordForm = document.getElementById('resetPasswordForm');
        resetPasswordForm.addEventListener('submit', this.handlePasswordReset.bind(this));

        // Set up back button
        document.getElementById('backToSignInFromReset').addEventListener('click', this.showEmailSignInForm.bind(this));
    },

    // Handle password reset
    async handlePasswordReset(e) {
        e.preventDefault();
        const email = document.getElementById('resetEmail').value;

        try {
            const { auth } = window.RoommatePortal.config;
            await auth.sendPasswordResetEmail(email);
            window.RoommatePortal.utils.showNotification('📧 Password reset email sent! Check your inbox.');
            this.showEmailSignInForm();
        } catch (error) {
            console.error('Error during password reset:', error);
            window.RoommatePortal.utils.showNotification('❌ Failed to send password reset email. Please try again.');
        }
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
            const { auth } = window.RoommatePortal.config;
            const currentUser = auth.currentUser;

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
