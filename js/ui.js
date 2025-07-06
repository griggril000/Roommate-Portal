// Roommate Portal - UI Management Module
// Handles UI updates, button management, and user interface states

window.RoommatePortal = window.RoommatePortal || {};

const ui = {
    // Update UI based on authentication state
    updateUIForAuth() {
        const currentUser = window.RoommatePortal.state.getCurrentUser();
        const currentHousehold = window.RoommatePortal.state.getCurrentHousehold();

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
            this.updateAuthButtons(true, true);

            // Hide login and household modals
            window.RoommatePortal.auth.hideLoginModal();
            window.RoommatePortal.household.hideHouseholdModal();

            // Update household info in header
            window.RoommatePortal.utils.updateHouseholdHeader();
        } else if (currentUser && !currentHousehold) {
            // Show main content but in disabled state when no household
            if (mainContent) {
                mainContent.style.display = 'block';
                mainContent.style.opacity = '0.3';
                mainContent.style.pointerEvents = 'none';
            }

            // User is logged in but not part of a household
            this.updateAuthButtons(true, false);
            window.RoommatePortal.auth.hideLoginModal();

            // Clean up data when no household
            window.RoommatePortal.dataCleanup.cleanupData();
            window.RoommatePortal.utils.clearHouseholdHeader();

            // Household modal will be shown by checkUserHousehold()
        } else {
            // Show main content but in disabled state when logged out
            if (mainContent) {
                mainContent.style.display = 'block';
                mainContent.style.opacity = '0.3';
                mainContent.style.pointerEvents = 'none';
            }

            // Show sign-in buttons and hide sign-out buttons
            this.updateAuthButtons(false, false);

            // Hide all modals when logged out
            window.RoommatePortal.auth.hideLoginModal();
            window.RoommatePortal.household.hideHouseholdModal();

            // Close any household management modal
            const householdMgmtModal = document.getElementById('householdManagementModal');
            if (householdMgmtModal) {
                householdMgmtModal.remove();
                document.body.style.overflow = '';
            }

            // Clean up all data and listeners when logged out
            window.RoommatePortal.dataCleanup.cleanupData();
            window.RoommatePortal.utils.clearHouseholdHeader();
        }
    },

    // Unified button management to eliminate mobile/desktop duplication
    updateAuthButtons(isSignedIn, hasHousehold) {
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
            },
            notification: {
                desktop: document.getElementById('notificationToggleBtn'),
                mobile: document.getElementById('notificationToggleBtnMobile')
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

        // Update notification buttons (show only when signed in and has household)
        Object.values(buttons.notification).forEach(btn => {
            if (btn) btn.classList.toggle('hidden', !isSignedIn || !hasHousehold);
        });

        // Update notification button appearance based on current status
        if (isSignedIn && hasHousehold) {
            this.updateNotificationButtons();
        }
    },

    // Update notification button appearance
    updateNotificationButtons() {
        if (!window.RoommatePortal.notifications) return;

        const status = window.RoommatePortal.notifications.getStatus();
        const elements = window.RoommatePortal.state.elements;

        const desktopBtn = elements.notificationToggleBtn;
        const mobileBtn = elements.notificationToggleBtnMobile;
        const desktopText = elements.notificationToggleText;
        const mobileText = elements.notificationToggleTextMobile;

        // Update button appearance based on status
        [desktopBtn, mobileBtn].forEach(btn => {
            if (!btn) return;

            // Remove all color classes
            btn.className = btn.className.replace(/bg-\w+-\d+/g, '').replace(/hover:bg-\w+-\d+/g, '');

            if (!status.supported) {
                // Browser doesn't support notifications
                btn.className += ' bg-gray-400 hover:bg-gray-500';
                btn.disabled = true;
                btn.title = 'Notifications not supported by this browser';
            } else if (status.permission === 'denied') {
                // Permission denied
                btn.className += ' bg-red-600 hover:bg-red-700';
                btn.disabled = false;
                btn.title = 'Notifications blocked - click to re-enable in browser settings';
            } else if (status.enabled) {
                // Notifications enabled
                btn.className += ' bg-green-600 hover:bg-green-700';
                btn.disabled = false;
                btn.title = 'Notifications enabled - click to disable';
            } else {
                // Notifications available but not enabled
                btn.className += ' bg-yellow-600 hover:bg-yellow-700';
                btn.disabled = false;
                btn.title = 'Click to enable message notifications';
            }
        });

        // Update button text
        if (desktopText) {
            if (!status.supported) {
                desktopText.textContent = 'N/A';
            } else if (status.permission === 'denied') {
                desktopText.textContent = 'Blocked';
            } else if (status.enabled) {
                desktopText.textContent = 'On';
            } else {
                desktopText.textContent = 'Off';
            }
        }

        if (mobileText) {
            if (!status.supported) {
                mobileText.textContent = 'Notifications Not Supported';
            } else if (status.permission === 'denied') {
                mobileText.textContent = 'Notifications Blocked';
            } else if (status.enabled) {
                mobileText.textContent = 'Notifications Enabled';
            } else {
                mobileText.textContent = 'Enable Notifications';
            }
        }
    },

    // Setup notification toggle buttons
    setupNotificationButtons() {
        const elements = window.RoommatePortal.state.elements;

        const handleNotificationToggle = async () => {
            if (window.RoommatePortal.notifications) {
                await window.RoommatePortal.notifications.toggleNotifications();
                this.updateNotificationButtons();
            }
        };

        if (elements.notificationToggleBtn) {
            elements.notificationToggleBtn.addEventListener('click', handleNotificationToggle);
        }

        if (elements.notificationToggleBtnMobile) {
            elements.notificationToggleBtnMobile.addEventListener('click', handleNotificationToggle);
        }
    },

    // Initialize UI
    initializeApp() {
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
            }
        }

        // Ensure main content is visible but disabled initially if no user is logged in
        const currentUser = window.RoommatePortal.state.getCurrentUser();
        const mainContent = document.getElementById('mainContent');
        if (!currentUser && mainContent) {
            mainContent.style.display = 'block';
            mainContent.style.opacity = '0.3';
            mainContent.style.pointerEvents = 'none';
        }

        this.updateUIForAuth();

        // Initialize tab to dashboard
        window.RoommatePortal.utils.switchTab('dashboard');
    },

    // Setup mobile menu toggle
    setupMobileMenu() {
        const elements = window.RoommatePortal.state.elements;

        if (elements.mobileMenuBtn && elements.mobileMenu) {
            elements.mobileMenuBtn.addEventListener('click', () => {
                elements.mobileMenu.classList.toggle('hidden');
            });
        }
    },

    // Setup household management buttons
    setupHouseholdManagementButtons() {
        const elements = window.RoommatePortal.state.elements;

        if (elements.householdManagementBtn) {
            elements.householdManagementBtn.addEventListener('click', window.RoommatePortal.householdManagement.showHouseholdManagement.bind(window.RoommatePortal.householdManagement));
        }

        if (elements.householdManagementBtnMobile) {
            elements.householdManagementBtnMobile.addEventListener('click', window.RoommatePortal.householdManagement.showHouseholdManagement.bind(window.RoommatePortal.householdManagement));
        }
    }
};

// Export ui module to global namespace
window.RoommatePortal.ui = ui;
