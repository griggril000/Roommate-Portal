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
        unreadMessageIds: new Set(),
        lastKnownAnnouncementCount: 0,
        unreadAnnouncementIds: new Set()
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
            const previousPermission = this.state.permission;
            this.state.permission = Notification.permission;
            console.log('🔔 Current browser notification permission:', this.state.permission);

            // If permission changed from previous state, reset the prompt flag
            if (previousPermission !== 'default' && previousPermission !== this.state.permission) {
                console.log('🔔 Permission state changed, resetting prompt flag');
                localStorage.removeItem('roommatePortal_hasPromptedNotifications');
            }
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
                this.state.lastKnownAnnouncementCount = settings.lastKnownAnnouncementCount || 0;
                this.state.unreadAnnouncementIds = new Set(settings.unreadAnnouncementIds || []);
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
            unreadMessageIds: Array.from(this.state.unreadMessageIds),
            lastKnownAnnouncementCount: this.state.lastKnownAnnouncementCount,
            unreadAnnouncementIds: Array.from(this.state.unreadAnnouncementIds)
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

        // Listen for tab switches to messages and announcements
        window.addEventListener('roommatePortal:tabSwitch', (event) => {
            if (event.detail.tab === 'messages' && this.state.isTabActive) {
                // User switched to messages tab - mark as read
                setTimeout(() => this.markVisibleMessagesAsRead(), 500);
            } else if (event.detail.tab === 'announcements' && this.state.isTabActive) {
                // User switched to announcements tab - mark as read
                setTimeout(() => this.markVisibleAnnouncementsAsRead(), 500);
            }
        });

        // Listen for permission changes and update UI
        window.addEventListener('roommatePortal:notificationPermissionChange', () => {
            if (window.RoommatePortal.ui && window.RoommatePortal.ui.updateNotificationButtons) {
                window.RoommatePortal.ui.updateNotificationButtons();
            }
        });

        // Check for permission changes when user returns to the page
        this.setupPermissionChangeDetection();
    },

    // Setup permission change detection on page focus/visibility
    setupPermissionChangeDetection() {
        if (!this.checkBrowserSupport()) return;

        const checkPermissionChange = () => {
            const currentBrowserPermission = Notification.permission;

            if (currentBrowserPermission !== this.state.permission) {
                console.log('🔔 Browser permission changed:', {
                    previous: this.state.permission,
                    current: currentBrowserPermission
                });

                // Reset prompt flag when permission changes
                if (this.state.permission !== 'default') {
                    localStorage.removeItem('roommatePortal_hasPromptedNotifications');
                }

                // Update our state
                this.state.permission = currentBrowserPermission;

                // Update enabled state based on new permission
                if (currentBrowserPermission !== 'granted' && this.state.isEnabled) {
                    this.state.isEnabled = false;
                    this.saveNotificationSettings();
                    this.stopNotifications();
                }

                // Dispatch permission change event to update UI
                window.dispatchEvent(new CustomEvent('roommatePortal:notificationPermissionChange', {
                    detail: { permission: currentBrowserPermission }
                }));

                // If user granted permission and we have a household, offer to enable notifications
                if (currentBrowserPermission === 'granted') {
                    const currentUser = window.RoommatePortal.state.getCurrentUser();
                    const currentHousehold = window.RoommatePortal.state.getCurrentHousehold();

                    if (currentUser && currentHousehold && !this.state.isEnabled) {
                        // Small delay to let UI update
                        setTimeout(() => {
                            this.promptForInitialSetup();
                        }, 1000);
                    }
                }
            }
        };

        // Check when page becomes visible (user returns from another tab/app)
        document.addEventListener('visibilitychange', () => {
            if (!document.hidden) {
                checkPermissionChange();
            }
        });

        // Check when window gains focus
        window.addEventListener('focus', () => {
            checkPermissionChange();
        });
    },

    // Request notification permission from user
    async requestPermission() {

        if (!this.checkBrowserSupport()) {
            console.error('🔔 Browser does not support notifications');
            return false;
        }

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

            this.state.permission = permission;

            // Dispatch permission change event
            window.dispatchEvent(new CustomEvent('roommatePortal:notificationPermissionChange', {
                detail: { permission: permission }
            }));

            if (permission === 'granted') {
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
            this.checkForNewAnnouncements();
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
                this.createNotification(`${icon} ${author}`, body, 'messages');
            }, index * 1000);
        });

        // If there are more authors, show a summary notification
        if (Object.keys(messagesByAuthor).length > 3) {
            const totalNewMessages = newMessages.length;
            const remainingAuthors = Object.keys(messagesByAuthor).length - 3;

            setTimeout(() => {
                this.createNotification(
                    '💬 Multiple roommates',
                    `${totalNewMessages} new messages from ${remainingAuthors + 3} roommates`,
                    'messages'
                );
            }, 3000);
        }

        this.saveNotificationSettings();
    },

    // Check for new announcements
    async checkForNewAnnouncements() {
        const currentUser = window.RoommatePortal.state.getCurrentUser();
        const currentHousehold = window.RoommatePortal.state.getCurrentHousehold();

        if (!currentUser || !currentHousehold || !this.state.isEnabled) {
            return;
        }

        try {
            const announcements = window.RoommatePortal.state.getAnnouncements() || [];
            const newAnnouncements = this.findNewAnnouncements(announcements);

            if (newAnnouncements.length > 0) {
                // Reset backoff on successful check with new announcements
                this.resetBackoff();

                // Show notifications for new announcements (but not if tab is active and on announcements)
                const isViewingAnnouncements = this.state.isTabActive &&
                    !document.getElementById('announcementsSection')?.classList.contains('hidden');

                if (!isViewingAnnouncements) {
                    this.showNewAnnouncementNotifications(newAnnouncements);
                }

                // Update state
                this.updateLastKnownAnnouncementState();
            } else {
                // No new announcements - maintain current backoff
                this.state.retryCount = 0;
            }

            this.state.lastCheckTime = Date.now();

        } catch (error) {
            console.error('Error checking for new announcements:', error);
            this.handleCheckError();
        }
    },

    // Find new announcements since last check
    findNewAnnouncements(announcements) {
        const currentUser = window.RoommatePortal.state.getCurrentUser();
        if (!currentUser) return [];

        const newAnnouncements = announcements.filter(announcement => {
            // Skip own announcements
            if (announcement.authorId === currentUser.uid) return false;

            // Check if announcement is unread by current user
            const isUnread = !announcement.readBy || !announcement.readBy.includes(currentUser.uid);

            // Check if we haven't already notified about this announcement
            const isNewToUs = !this.state.unreadAnnouncementIds.has(announcement.id);

            // Announcement must be both unread and new to our notification system
            return isUnread && isNewToUs;
        });

        return newAnnouncements;
    },

    // Show browser notifications for new announcements
    showNewAnnouncementNotifications(newAnnouncements) {
        // Group announcements by author to avoid spam
        const announcementsByAuthor = {};
        newAnnouncements.forEach(announcement => {
            if (!announcementsByAuthor[announcement.author]) {
                announcementsByAuthor[announcement.author] = [];
            }
            announcementsByAuthor[announcement.author].push(announcement);

            // Track that we've notified about this announcement
            this.state.unreadAnnouncementIds.add(announcement.id);
        });

        // Create notifications (max 3 to avoid overwhelming)
        const authors = Object.keys(announcementsByAuthor).slice(0, 3);

        authors.forEach((author, index) => {
            const announcements = announcementsByAuthor[author];
            const announcementCount = announcements.length;

            let body, icon;

            if (announcementCount === 1) {
                const announcement = announcements[0];
                const title = announcement.title || 'New Announcement';
                body = announcement.body.length > 100 ?
                    announcement.body.substring(0, 100) + '...' :
                    announcement.body;
                icon = '📢';
            } else {
                body = `${announcementCount} new announcements`;
                icon = '📢';
            }

            // Delay notifications slightly to avoid overwhelming
            setTimeout(() => {
                this.createNotification(`${icon} ${author}`, body, 'announcements');
            }, index * 1000);
        });

        // If there are more authors, show a summary notification
        if (Object.keys(announcementsByAuthor).length > 3) {
            const totalNewAnnouncements = newAnnouncements.length;
            const remainingAuthors = Object.keys(announcementsByAuthor).length - 3;

            setTimeout(() => {
                this.createNotification(
                    '📢 Multiple roommates',
                    `${totalNewAnnouncements} new announcements from ${remainingAuthors + 3} roommates`,
                    'announcements'
                );
            }, 3000);
        }
    },

    // Create and show a browser notification
    createNotification(title, body, type = 'messages') {
        if (this.state.permission !== 'granted') {
            return;
        }

        try {
            const notification = new Notification(title, {
                body: body,
                icon: 'favicons/android-chrome-192x192.png',
                badge: 'favicons/android-chrome-192x192.png',
                tag: `roommate-${type}`, // This helps replace previous notifications of the same type
                requireInteraction: false,
                silent: false
            });

            // Auto-close notification after 6 seconds
            setTimeout(() => {
                notification.close();
            }, 6000);

            // Handle notification click - navigate to appropriate tab based on type
            notification.onclick = () => {
                window.focus();
                window.RoommatePortal.utils.switchTab(type);
                notification.close();
            };

        } catch (error) {
            console.error('🔔 Error creating notification:', error);
        }
    },

    // Update last known state
    updateLastKnownState() {
        const messages = window.RoommatePortal.state.getMessages() || [];
        this.state.lastKnownMessageCount = messages.length;

        const announcements = window.RoommatePortal.state.getAnnouncements() || [];
        this.state.lastKnownAnnouncementCount = announcements.length;

        this.saveNotificationSettings();
    },

    // Update last known announcement state
    updateLastKnownAnnouncementState() {
        const announcements = window.RoommatePortal.state.getAnnouncements() || [];
        this.state.lastKnownAnnouncementCount = announcements.length;
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

    // Mark currently visible announcements as read (clear notification tracking)
    markVisibleAnnouncementsAsRead() {
        // Clear our tracking of unread announcements since user is viewing them
        this.state.unreadAnnouncementIds.clear();
        this.saveNotificationSettings();
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
        this.state.lastKnownAnnouncementCount = 0;
        this.state.unreadAnnouncementIds.clear();
        this.resetBackoff();
        this.saveNotificationSettings();
    },

    // Toggle notifications on/off
    async toggleNotifications() {

        // Always check current browser permission state
        if (this.checkBrowserSupport()) {
            this.state.permission = Notification.permission;
        }

        if (this.state.permission !== 'granted') {
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
            window.RoommatePortal.utils.showNotification('🔔 Message notifications enabled');
            this.startNotifications();
        } else {
            window.RoommatePortal.utils.showNotification('🔕 Message notifications disabled');
            this.stopNotifications();
        }

        return this.state.isEnabled;
    },

    // Get current notification status
    getStatus() {
        // Always get fresh permission state from browser
        if (this.checkBrowserSupport()) {
            const previousPermission = this.state.permission;
            this.state.permission = Notification.permission;

            // If permission changed, reset prompt flag
            if (previousPermission !== 'default' && previousPermission !== this.state.permission) {
                localStorage.removeItem('roommatePortal_hasPromptedNotifications');
            }
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

        // Only prompt if notifications are supported and permission hasn't been determined yet
        if (!this.checkBrowserSupport()) {
            return;
        }

        // Get fresh permission state
        this.state.permission = Notification.permission;

        if (this.state.permission !== 'default') {
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
            return;
        }

        // Delay the prompt slightly to let the UI settle
        setTimeout(() => {
            this.showNotificationPermissionModal();
        }, 2000); // 2 second delay
    },

    // Show custom modal for notification permission
    showNotificationPermissionModal() {
        // Create modal backdrop
        const modalBackdrop = document.createElement('div');
        modalBackdrop.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';
        modalBackdrop.style.zIndex = '10000';

        // Create modal content
        const modal = document.createElement('div');
        modal.className = 'bg-white rounded-lg p-6 max-w-md mx-4 shadow-xl';

        modal.innerHTML = `
            <div class="text-center">
                <div class="mb-4">
                    <div class="bg-yellow-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                        <i class="fas fa-bell text-yellow-600 text-2xl"></i>
                    </div>
                    <h3 class="text-lg font-semibold text-gray-800 mb-2">Enable Message Notifications?</h3>
                    <p class="text-gray-600 text-sm leading-relaxed">
                        Stay updated when your roommates post new messages. We'll send you browser notifications so you never miss important updates.
                    </p>
                </div>
                
                <div class="flex space-x-3">
                    <button id="notificationModalCancel" class="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors">
                        Not Now
                    </button>
                    <button id="notificationModalOk" class="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors">
                        Enable Notifications
                    </button>
                </div>
            </div>
        `;

        modalBackdrop.appendChild(modal);
        document.body.appendChild(modalBackdrop);

        // Handle button clicks
        const cancelBtn = modal.querySelector('#notificationModalCancel');
        const okBtn = modal.querySelector('#notificationModalOk');

        const closeModal = () => {
            document.body.removeChild(modalBackdrop);
            document.body.style.overflow = '';
        };

        cancelBtn.addEventListener('click', () => {
            console.log('🔔 User declined to enable notifications');

            // Mark that we've prompted this user
            localStorage.setItem('roommatePortal_hasPromptedNotifications', 'true');

            closeModal();
            window.RoommatePortal.utils.showNotification('ℹ️ You can enable notifications later using the bell button in the header.');
        });

        okBtn.addEventListener('click', async () => {
            console.log('🔔 User agreed to enable notifications');

            // Mark that we've prompted this user
            localStorage.setItem('roommatePortal_hasPromptedNotifications', 'true');

            closeModal();

            // Now request browser permission
            const success = await this.requestPermission();

            // Update UI buttons to reflect the new state
            if (window.RoommatePortal.ui && window.RoommatePortal.ui.updateNotificationButtons) {
                window.RoommatePortal.ui.updateNotificationButtons();
            }
        });

        // Close modal when clicking backdrop
        modalBackdrop.addEventListener('click', (e) => {
            if (e.target === modalBackdrop) {
                cancelBtn.click();
            }
        });

        // Prevent body scroll while modal is open
        document.body.style.overflow = 'hidden';
    },

    // Clear read messages and announcements from notification tracking
    clearReadItems() {
        const currentUser = window.RoommatePortal.state.getCurrentUser();
        if (!currentUser) return;

        const messages = window.RoommatePortal.state.getMessages() || [];
        const announcements = window.RoommatePortal.state.getAnnouncements() || [];

        // Clear read message IDs from tracking
        messages.forEach(message => {
            if (message.readBy && message.readBy.includes(currentUser.uid)) {
                this.state.unreadMessageIds.delete(message.id);
            }
        });

        // Clear read announcement IDs from tracking
        announcements.forEach(announcement => {
            if (announcement.readBy && announcement.readBy.includes(currentUser.uid)) {
                this.state.unreadAnnouncementIds.delete(announcement.id);
            }
        });

        // Save updated state
        this.saveNotificationSettings();
    }
};

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
    notificationsModule.cleanup();
});

// Export notifications module to global namespace
window.RoommatePortal.notifications = notificationsModule;
