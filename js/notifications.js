// Roommate Portal - Notifications Module
// Handles browser notifications for new messages with efficient polling

window.RoommatePortal = window.RoommatePortal || {};

const notificationsModule = {
    // Configuration
    config: {
        checkInterval: 30000, // 30 seconds - balanced between responsiveness and battery life
        maxRetries: 3,
        backoffMultiplier: 2,
        maxBackoffTime: 300000, // 5 minutes max backoff
        title: 'Roommate Portal'
    },

    // State
    state: {
        isEnabled: false,
        permission: 'default',
        intervalId: null,
        lastCheckTime: null,
        lastKnownMessageCount: 0,
        retryCount: 0,
        currentBackoffTime: 30000,
        isTabActive: true,
        unreadMessageIds: new Set()
    },

    // Initialize notifications system
    init() {
        this.checkBrowserSupport();
        this.setupVisibilityHandling();
        this.restoreNotificationSettings();
        this.setupEventListeners();
        console.log('🔔 Notifications module initialized');
    },

    // Check if browser supports notifications
    checkBrowserSupport() {
        const supported = 'Notification' in window;
        if (!supported) {
            console.warn('🔔 This browser does not support notifications');
        } else {
            console.log('🔔 Browser supports notifications, current permission:', Notification.permission);
        }
        return supported;
    },

    // Setup page visibility handling to pause notifications when tab is not active
    setupVisibilityHandling() {
        // Handle page visibility changes
        document.addEventListener('visibilitychange', () => {
            this.state.isTabActive = !document.hidden;

            if (this.state.isTabActive) {
                // User returned to tab - mark messages as read and reduce check frequency briefly
                this.markVisibleMessagesAsRead();
                this.resetBackoff();
            } else if (this.state.isEnabled) {
                // User left tab - start/continue background checking
                this.startBackgroundChecking();
            }
        });

        // Handle focus events
        window.addEventListener('focus', () => {
            this.state.isTabActive = true;
            this.markVisibleMessagesAsRead();
        });

        window.addEventListener('blur', () => {
            this.state.isTabActive = false;
        });
    },

    // Restore notification settings from localStorage
    restoreNotificationSettings() {
        // Always get the current browser permission state first
        if (this.checkBrowserSupport()) {
            this.state.permission = Notification.permission;
            console.log('🔔 Current browser notification permission:', this.state.permission);
        } else {
            this.state.permission = 'unsupported';
        }

        const saved = localStorage.getItem('roommatePortal_notificationSettings');
        if (saved) {
            try {
                const settings = JSON.parse(saved);
                // Only enable if both saved settings say enabled AND browser permission is granted
                this.state.isEnabled = settings.enabled && this.state.permission === 'granted';
                this.state.lastKnownMessageCount = settings.lastKnownMessageCount || 0;
                this.state.unreadMessageIds = new Set(settings.unreadMessageIds || []);
                console.log('🔔 Restored settings:', {
                    savedEnabled: settings.enabled,
                    currentPermission: this.state.permission,
                    finalEnabled: this.state.isEnabled
                });
            } catch (error) {
                console.error('Error restoring notification settings:', error);
            }
        }
    },

    // Save notification settings to localStorage
    saveNotificationSettings() {
        const settings = {
            enabled: this.state.isEnabled,
            lastKnownMessageCount: this.state.lastKnownMessageCount,
            unreadMessageIds: Array.from(this.state.unreadMessageIds)
        };
        localStorage.setItem('roommatePortal_notificationSettings', JSON.stringify(settings));
    },

    // Setup event listeners for auth and household changes
    setupEventListeners() {
        // Listen for authentication state changes
        window.addEventListener('roommatePortal:authStateChange', (event) => {
            if (event.detail.user) {
                // User signed in - check if notifications should be enabled
                if (this.state.permission === 'granted') {
                    this.startNotifications();
                }
            } else {
                // User signed out - stop notifications
                this.stopNotifications();
            }
        });

        // Listen for household changes
        window.addEventListener('roommatePortal:householdChange', (event) => {
            if (event.detail.household) {
                // Reset state for new household
                this.resetState();
                if (this.state.isEnabled) {
                    this.startNotifications();
                }
                // Prompt for initial setup if appropriate
                this.promptForInitialSetup();
            } else {
                this.stopNotifications();
            }
        });

        // Listen for tab switches to messages
        window.addEventListener('roommatePortal:tabSwitch', (event) => {
            if (event.detail.tab === 'messages' && this.state.isTabActive) {
                // User switched to messages tab - mark as read
                setTimeout(() => this.markVisibleMessagesAsRead(), 500);
            }
        });

        // Listen for permission changes and update UI
        window.addEventListener('roommatePortal:notificationPermissionChange', () => {
            if (window.RoommatePortal.ui && window.RoommatePortal.ui.updateNotificationButtons) {
                window.RoommatePortal.ui.updateNotificationButtons();
            }
        });
    },

    // Request notification permission from user
    async requestPermission() {
        console.log('🔔 Requesting notification permission...');

        if (!this.checkBrowserSupport()) {
            console.error('🔔 Browser does not support notifications');
            return false;
        }

        // Check current permission state
        console.log('🔔 Current permission state:', Notification.permission);

        try {
            let permission;

            // Use the modern API if available, fallback to legacy
            if (Notification.requestPermission.length === 0) {
                // Modern Promise-based API
                permission = await Notification.requestPermission();
            } else {
                // Legacy callback-based API
                permission = await new Promise(resolve => {
                    Notification.requestPermission(resolve);
                });
            }

            console.log('🔔 Permission request result:', permission);
            this.state.permission = permission;

            // Dispatch permission change event
            window.dispatchEvent(new CustomEvent('roommatePortal:notificationPermissionChange', {
                detail: { permission: permission }
            }));

            if (permission === 'granted') {
                console.log('🔔 Permission granted, enabling notifications');
                window.RoommatePortal.utils.showNotification('🔔 Notifications enabled! You\'ll be notified of new messages.');
                this.state.isEnabled = true;
                this.saveNotificationSettings();
                this.startNotifications();
                return true;
            } else if (permission === 'denied') {
                console.log('🔔 Permission denied');
                window.RoommatePortal.utils.showNotification('🔕 Notifications blocked. Enable them in your browser settings to get message alerts.');
                this.state.isEnabled = false;
                this.saveNotificationSettings();
                return false;
            } else {
                console.log('🔔 Permission default/dismissed');
                window.RoommatePortal.utils.showNotification('ℹ️ Notification permission not granted. You can try again later.');
                return false;
            }
        } catch (error) {
            console.error('🔔 Error requesting notification permission:', error);
            window.RoommatePortal.utils.showNotification('❌ Unable to request notification permission.');
            return false;
        }
    },

    // Start notification checking
    startNotifications() {
        const currentUser = window.RoommatePortal.state.getCurrentUser();
        const currentHousehold = window.RoommatePortal.state.getCurrentHousehold();

        if (!currentUser || !currentHousehold || !this.state.isEnabled) {
            return;
        }

        // Initialize last known state
        this.updateLastKnownState();

        // Start checking
        this.startBackgroundChecking();

        console.log('🔔 Notification checking started');
    },

    // Stop notification checking
    stopNotifications() {
        if (this.state.intervalId) {
            clearInterval(this.state.intervalId);
            this.state.intervalId = null;
        }
        console.log('🔕 Notification checking stopped');
    },

    // Start background checking with adaptive interval
    startBackgroundChecking() {
        // Clear existing interval
        if (this.state.intervalId) {
            clearInterval(this.state.intervalId);
        }

        // Use adaptive interval based on activity and backoff
        const interval = this.state.isTabActive ?
            this.config.checkInterval :
            Math.min(this.state.currentBackoffTime, this.config.maxBackoffTime);

        this.state.intervalId = setInterval(() => {
            this.checkForNewMessages();
        }, interval);
    },

    // Check for new messages
    async checkForNewMessages() {
        const currentUser = window.RoommatePortal.state.getCurrentUser();
        const currentHousehold = window.RoommatePortal.state.getCurrentHousehold();

        if (!currentUser || !currentHousehold || !this.state.isEnabled) {
            return;
        }

        try {
            const messages = window.RoommatePortal.state.getMessages() || [];
            const newMessages = this.findNewMessages(messages);

            if (newMessages.length > 0) {
                // Reset backoff on successful check with new messages
                this.resetBackoff();

                // Show notifications for new messages (but not if tab is active and on messages)
                const isViewingMessages = this.state.isTabActive &&
                    !document.getElementById('messageSection')?.classList.contains('hidden');

                if (!isViewingMessages) {
                    this.showNewMessageNotifications(newMessages);
                }

                // Update state
                this.updateLastKnownState();
            } else {
                // No new messages - maintain current backoff
                this.state.retryCount = 0;
            }

            this.state.lastCheckTime = Date.now();

        } catch (error) {
            console.error('Error checking for new messages:', error);
            this.handleCheckError();
        }
    },

    // Find new messages since last check
    findNewMessages(messages) {
        const currentUser = window.RoommatePortal.state.getCurrentUser();
        if (!currentUser) return [];

        const newMessages = messages.filter(message => {
            // Skip own messages
            if (message.authorId === currentUser.uid) return false;

            // Check if message is unread by current user
            const isUnread = !message.readBy || !message.readBy.includes(currentUser.uid);

            // Check if we haven't already notified about this message
            const isNewToUs = !this.state.unreadMessageIds.has(message.id);

            // Message must be both unread and new to our notification system
            return isUnread && isNewToUs;
        });

        return newMessages;
    },

    // Show browser notifications for new messages
    showNewMessageNotifications(newMessages) {
        // Group messages by author to avoid spam
        const messagesByAuthor = {};
        newMessages.forEach(message => {
            if (!messagesByAuthor[message.author]) {
                messagesByAuthor[message.author] = [];
            }
            messagesByAuthor[message.author].push(message);

            // Track that we've notified about this message
            this.state.unreadMessageIds.add(message.id);
        });

        // Create notifications (max 3 to avoid overwhelming)
        const authors = Object.keys(messagesByAuthor).slice(0, 3);

        authors.forEach((author, index) => {
            const messages = messagesByAuthor[author];
            const messageCount = messages.length;

            let body, icon;

            if (messageCount === 1) {
                body = messages[0].text.length > 100 ?
                    messages[0].text.substring(0, 100) + '...' :
                    messages[0].text;
                icon = '💬';
            } else {
                body = `${messageCount} new messages`;
                icon = '💬';
            }

            // Delay notifications slightly to avoid overwhelming
            setTimeout(() => {
                this.createNotification(`${icon} ${author}`, body);
            }, index * 1000);
        });

        // If there are more authors, show a summary notification
        if (Object.keys(messagesByAuthor).length > 3) {
            const totalNewMessages = newMessages.length;
            const remainingAuthors = Object.keys(messagesByAuthor).length - 3;

            setTimeout(() => {
                this.createNotification(
                    '💬 Multiple roommates',
                    `${totalNewMessages} new messages from ${remainingAuthors + 3} roommates`
                );
            }, 3000);
        }

        this.saveNotificationSettings();
    },

    // Create and show a browser notification
    createNotification(title, body) {
        if (this.state.permission !== 'granted') {
            console.warn('🔔 Cannot create notification - permission not granted:', this.state.permission);
            return;
        }

        try {
            console.log('🔔 Creating notification:', title, body);
            const notification = new Notification(title, {
                body: body,
                icon: 'favicons/android-chrome-192x192.png',
                badge: 'favicons/android-chrome-192x192.png',
                tag: 'roommate-message', // This helps replace previous notifications
                requireInteraction: false,
                silent: false
            });

            // Auto-close notification after 6 seconds
            setTimeout(() => {
                notification.close();
            }, 6000);

            // Handle notification click
            notification.onclick = () => {
                window.focus();
                window.RoommatePortal.utils.switchTab('messages');
                notification.close();
            };

            console.log('🔔 Notification created successfully');

        } catch (error) {
            console.error('🔔 Error creating notification:', error);
        }
    },

    // Update last known state
    updateLastKnownState() {
        const messages = window.RoommatePortal.state.getMessages() || [];
        this.state.lastKnownMessageCount = messages.length;
        this.saveNotificationSettings();
    },

    // Mark currently visible messages as read
    markVisibleMessagesAsRead() {
        // Clear our tracking of unread messages since user is viewing them
        this.state.unreadMessageIds.clear();
        this.saveNotificationSettings();

        // Call the existing mark as read function
        if (window.RoommatePortal.messages && window.RoommatePortal.messages.markMessagesAsRead) {
            window.RoommatePortal.messages.markMessagesAsRead();
        }
    },

    // Handle check errors with exponential backoff
    handleCheckError() {
        this.state.retryCount++;

        if (this.state.retryCount <= this.config.maxRetries) {
            this.state.currentBackoffTime = Math.min(
                this.state.currentBackoffTime * this.config.backoffMultiplier,
                this.config.maxBackoffTime
            );

            // Restart checking with new backoff time
            this.startBackgroundChecking();
        } else {
            // Max retries reached - stop checking temporarily
            console.warn('Max notification check retries reached, stopping temporarily');
            this.stopNotifications();

            // Retry after 5 minutes
            setTimeout(() => {
                if (this.state.isEnabled) {
                    this.resetBackoff();
                    this.startNotifications();
                }
            }, 300000);
        }
    },

    // Reset backoff to default values
    resetBackoff() {
        this.state.retryCount = 0;
        this.state.currentBackoffTime = this.config.checkInterval;
    },

    // Reset state for new household or user
    resetState() {
        this.state.lastKnownMessageCount = 0;
        this.state.unreadMessageIds.clear();
        this.resetBackoff();
        this.saveNotificationSettings();
    },

    // Toggle notifications on/off
    async toggleNotifications() {
        console.log('🔔 Toggling notifications...', {
            currentPermission: this.state.permission,
            currentEnabled: this.state.isEnabled
        });

        // Always check current browser permission state
        if (this.checkBrowserSupport()) {
            this.state.permission = Notification.permission;
        }

        if (this.state.permission !== 'granted') {
            console.log('🔔 Permission not granted, requesting...');
            const success = await this.requestPermission();
            return success;
        }

        // Permission is granted, toggle the enabled state
        this.state.isEnabled = !this.state.isEnabled;
        this.saveNotificationSettings();

        // Dispatch state change event
        window.dispatchEvent(new CustomEvent('roommatePortal:notificationPermissionChange', {
            detail: { enabled: this.state.isEnabled }
        }));

        if (this.state.isEnabled) {
            console.log('🔔 Enabling notifications');
            window.RoommatePortal.utils.showNotification('🔔 Message notifications enabled');
            this.startNotifications();
        } else {
            console.log('🔔 Disabling notifications');
            window.RoommatePortal.utils.showNotification('🔕 Message notifications disabled');
            this.stopNotifications();
        }

        return this.state.isEnabled;
    },

    // Get current notification status
    getStatus() {
        // Always get fresh permission state from browser
        if (this.checkBrowserSupport()) {
            this.state.permission = Notification.permission;
        }

        return {
            supported: this.checkBrowserSupport(),
            permission: this.state.permission,
            enabled: this.state.isEnabled && this.state.permission === 'granted',
            checking: !!this.state.intervalId,
            lastCheck: this.state.lastCheckTime
        };
    },

    // Cleanup when page unloads
    cleanup() {
        this.stopNotifications();
        this.saveNotificationSettings();
    },

    // Prompt for initial notification setup when user first gets access
    async promptForInitialSetup() {
        console.log('🔔 Checking if should prompt for initial setup...');

        // Only prompt if notifications are supported and permission hasn't been determined yet
        if (!this.checkBrowserSupport()) {
            console.log('🔔 Not prompting - browser does not support notifications');
            return;
        }

        // Get fresh permission state
        this.state.permission = Notification.permission;
        console.log('🔔 Current permission state:', this.state.permission);

        if (this.state.permission !== 'default') {
            console.log('🔔 Not prompting - permission already determined:', this.state.permission);
            return;
        }

        const currentUser = window.RoommatePortal.state.getCurrentUser();
        const currentHousehold = window.RoommatePortal.state.getCurrentHousehold();

        // Only prompt if user is signed in and part of household
        if (!currentUser || !currentHousehold) {
            console.log('🔔 Not prompting - user not signed in or no household');
            return;
        }

        // Check if we've already prompted this user before
        const hasPromptedBefore = localStorage.getItem('roommatePortal_hasPromptedNotifications');
        if (hasPromptedBefore) {
            console.log('🔔 Not prompting - already prompted before');
            return;
        }

        console.log('🔔 Prompting user for notification permission...');

        // Delay the prompt slightly to let the UI settle
        setTimeout(async () => {
            const shouldPrompt = confirm(
                '🔔 Would you like to enable notifications for new roommate messages?\n\n' +
                'This will help you stay updated when your roommates post new messages.\n\n' +
                'Click OK to enable notifications, or Cancel to skip.'
            );

            // Mark that we've prompted this user
            localStorage.setItem('roommatePortal_hasPromptedNotifications', 'true');

            if (shouldPrompt) {
                console.log('🔔 User agreed to enable notifications');
                const success = await this.requestPermission();

                // Update UI buttons to reflect the new state
                if (window.RoommatePortal.ui && window.RoommatePortal.ui.updateNotificationButtons) {
                    window.RoommatePortal.ui.updateNotificationButtons();
                }
            } else {
                console.log('🔔 User declined to enable notifications');
                window.RoommatePortal.utils.showNotification('ℹ️ You can enable notifications later using the bell button in the header.');
            }
        }, 2000); // 2 second delay
    },
};

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
    notificationsModule.cleanup();
});

// Export notifications module to global namespace
window.RoommatePortal.notifications = notificationsModule;
