// Roommate Portal - Main Application Module
// Initializes and coordinates all other modules

window.RoommatePortal = window.RoommatePortal || {};

const appModule = {
    // Initialize the entire application
    init() {
        // Wait for DOM to be fully loaded
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', this.initializeApp.bind(this));
        } else {
            this.initializeApp();
        }
    },

    // Initialize all application components
    initializeApp() {
        console.log('🚀 Initializing Roommate Portal...');

        try {
            // Initialize UI first
            window.RoommatePortal.ui.initializeApp();
            window.RoommatePortal.ui.setupMobileMenu();
            window.RoommatePortal.ui.setupHouseholdManagementButtons();
            window.RoommatePortal.ui.setupNotificationButtons();

            // Initialize authentication
            window.RoommatePortal.auth.init();

            // Initialize chores and messages modules
            window.RoommatePortal.chores.init();
            window.RoommatePortal.messages.init();
            window.RoommatePortal.announcements.init();

            // Initialize notifications module
            window.RoommatePortal.notifications.init();

            // Setup global click handlers for tabs
            this.setupTabHandlers();

            console.log('✅ Roommate Portal initialized successfully!');
        } catch (error) {
            console.error('❌ Error initializing Roommate Portal:', error);
            window.RoommatePortal.utils.showNotification('❌ Application failed to initialize. Please refresh the page.');
        }
    },

    // Setup tab switching handlers
    setupTabHandlers() {
        const choresTab = document.getElementById('choresTab');
        const messagesTab = document.getElementById('messagesTab');
        const announcementsTab = document.getElementById('announcementsTab');

        if (choresTab) {
            choresTab.addEventListener('click', () => {
                window.RoommatePortal.utils.switchTab('chores');
                // Dispatch tab switch event for notifications
                window.dispatchEvent(new CustomEvent('roommatePortal:tabSwitch', {
                    detail: { tab: 'chores' }
                }));
            });
        }

        if (messagesTab) {
            messagesTab.addEventListener('click', () => {
                window.RoommatePortal.utils.switchTab('messages');
                // Dispatch tab switch event for notifications
                window.dispatchEvent(new CustomEvent('roommatePortal:tabSwitch', {
                    detail: { tab: 'messages' }
                }));
            });
        }

        if (announcementsTab) {
            announcementsTab.addEventListener('click', () => {
                window.RoommatePortal.utils.switchTab('announcements');
                // Dispatch tab switch event for notifications
                window.dispatchEvent(new CustomEvent('roommatePortal:tabSwitch', {
                    detail: { tab: 'announcements' }
                }));
            });
        }
    }
};

// Export app module and auto-initialize
window.RoommatePortal.app = appModule;

// Auto-start the application
window.RoommatePortal.app.init();
