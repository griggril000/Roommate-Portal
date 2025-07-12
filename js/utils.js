// Roommate Portal - Utility Functions Module
// Handles common utility functions and helpers

window.RoommatePortal = window.RoommatePortal || {};

const utils = {
    // Show notification to user
    showNotification(message) {
        // Create notification element
        const notification = document.createElement('div');
        notification.className = 'fixed bottom-4 left-4 bg-gray-800 text-white px-6 py-3 rounded-lg shadow-lg transform transition-all duration-300 translate-x-full';
        notification.style.zIndex = '10000';
        notification.textContent = message;

        document.body.appendChild(notification);

        // Animate in
        setTimeout(() => {
            notification.classList.remove('translate-x-full');
        }, 100);

        // Remove after 4 seconds
        setTimeout(() => {
            notification.classList.add('translate-x-full');
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 300);
        }, 4000);
    },

    // Generate avatar (Google profile picture or emoji fallback)
    getAvatarEmoji(name, uid = null) {
        // If UID is provided, try to get user's profile picture from household data
        if (uid) {
            const currentHousehold = window.RoommatePortal.state.getCurrentHousehold();
            if (currentHousehold && currentHousehold.memberDetails && currentHousehold.memberDetails[uid]) {
                const member = currentHousehold.memberDetails[uid];
                if (member.photoURL) {
                    return `<img src="${member.photoURL}" alt="${member.displayName || 'User'}" class="w-8 h-8 rounded-full object-cover border-2 border-gray-200" onerror="this.style.display='none'; this.nextElementSibling.style.display='inline'" />
                            <span style="display:none;" class="text-2xl">👤</span>`;
                }
            }
        }

        // If no UID provided or no photo found, try to get current user's photo
        if (!uid) {
            const currentUser = window.RoommatePortal.state.getCurrentUser();
            if (currentUser && currentUser.photoURL) {
                return `<img src="${currentUser.photoURL}" alt="${currentUser.displayName || 'User'}" class="w-8 h-8 rounded-full object-cover border-2 border-gray-200" onerror="this.style.display='none'; this.nextElementSibling.style.display='inline'" />
                        <span style="display:none;" class="text-2xl">👤</span>`;
            }
        }

        // Fallback to default emoji
        return '<span class="text-2xl">👤</span>';
    },

    // Generate unique household code
    async generateHouseholdCode() {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        const { db } = window.RoommatePortal.config;
        let attempts = 0;
        const maxAttempts = 10; // Prevent infinite loops

        // Ensure database connection exists
        if (!db) {
            console.error('Database connection not available, generating random code without uniqueness check');
            let result = '';
            for (let i = 0; i < 6; i++) {
                result += chars.charAt(Math.floor(Math.random() * chars.length));
            }
            return result;
        }

        while (attempts < maxAttempts) {
            // Generate a random code
            let result = '';
            for (let i = 0; i < 6; i++) {
                result += chars.charAt(Math.floor(Math.random() * chars.length));
            }

            try {
                // Check if this code already exists in the database
                const existingHousehold = await db.collection('households')
                    .where('code', '==', result)
                    .limit(1)
                    .get();

                // If no household exists with this code, it's unique
                if (existingHousehold.empty) {
                    console.log(`Generated unique household code: ${result} (attempt ${attempts + 1})`);
                    return result;
                }

                console.log(`Code ${result} already exists, trying again (attempt ${attempts + 1})`);
                attempts++;
            } catch (error) {
                console.error('Error checking household code uniqueness:', error);
                // If there's an error checking the database, return the generated code
                // This prevents the function from failing completely
                console.warn(`Database check failed, returning code without uniqueness verification: ${result}`);
                return result;
            }
        }

        // If we've tried maxAttempts times and still haven't found a unique code,
        // add a timestamp suffix to ensure uniqueness
        const timestamp = Date.now().toString(36).substring(0, 6).toUpperCase();
        const fallbackCode = timestamp;
        console.warn(`Could not generate unique household code after ${maxAttempts} attempts, using timestamp-based fallback: ${fallbackCode}`);
        return fallbackCode;
    },

    // Clear localStorage
    clearLocalStorage() {
        localStorage.removeItem('roommatePortal_chores');
        localStorage.removeItem('roommatePortal_messages');
    },

    // Get user display name by UID
    getUserDisplayName(uid) {
        if (!uid) return 'Unknown User';

        const currentHousehold = window.RoommatePortal.state.getCurrentHousehold();
        if (!currentHousehold || !currentHousehold.memberDetails) return 'Unknown User';

        const member = currentHousehold.memberDetails[uid];
        return member ? member.displayName : 'Former Member';
    },

    // Update brand info in header
    updateBrandInfo(title, subtitle) {
        const brandInfo = document.getElementById('brandInfo');
        if (!brandInfo) return;

        const titleElement = brandInfo.querySelector('h1');
        const subtitleElement = brandInfo.querySelector('p');

        if (titleElement) titleElement.textContent = title;
        if (subtitleElement) subtitleElement.textContent = subtitle;
    },

    // Update household status in header
    updateHouseholdStatus(statusText, isConnected) {
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
    },

    // Update household header
    updateHouseholdHeader() {
        const currentHousehold = window.RoommatePortal.state.getCurrentHousehold();
        if (currentHousehold) {
            const memberCount = Object.keys(currentHousehold.memberDetails || {}).length;
            const statusText = `${currentHousehold.name} • ${memberCount} member${memberCount !== 1 ? 's' : ''}`;
            this.updateHouseholdStatus(statusText, true);
        } else {
            this.updateHouseholdStatus('No household', false);
        }
    },

    // Clear household header
    clearHouseholdHeader() {
        this.updateBrandInfo('Roommate Portal', 'Your Shared Living Dashboard');
        this.updateHouseholdStatus('Not connected to a household', false);
    },

    // Tab switching functionality (dashboard-first navigation)
    switchTab(tabName) {
        const dashboardSection = document.getElementById('dashboardSection');
        const choreSection = document.getElementById('choreSection');
        const messageSection = document.getElementById('messageSection');
        const announcementsSection = document.getElementById('announcementsSection');
        const calendarSection = document.getElementById('calendarSection');

        // Hide all sections
        if (dashboardSection) dashboardSection.className = "tab-content hidden";
        if (choreSection) choreSection.className = "tab-content hidden";
        if (messageSection) messageSection.className = "tab-content hidden";
        if (announcementsSection) announcementsSection.className = "tab-content hidden";
        if (calendarSection) calendarSection.className = "tab-content hidden";

        // Show selected section
        if (tabName === 'dashboard') {
            if (dashboardSection) dashboardSection.className = "tab-content";
        } else if (tabName === 'chores') {
            if (choreSection) choreSection.className = "tab-content";
        } else if (tabName === 'messages') {
            if (messageSection) messageSection.className = "tab-content";
        } else if (tabName === 'announcements') {
            if (announcementsSection) announcementsSection.className = "tab-content";
        } else if (tabName === 'calendar') {
            if (calendarSection) calendarSection.className = "tab-content";
        }

        // Dispatch tab switch event for notification system
        window.dispatchEvent(new CustomEvent('roommatePortal:tabSwitch', {
            detail: { tab: tabName }
        }));
    },

    // Escape HTML to prevent XSS attacks
    escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    },

    // Format date for display
    formatDate(date) {
        if (!date) return '';

        const now = new Date();
        const inputDate = new Date(date);

        // Check if it's today
        if (inputDate.toDateString() === now.toDateString()) {
            return inputDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        }

        // Check if it's yesterday
        const yesterday = new Date(now);
        yesterday.setDate(yesterday.getDate() - 1);
        if (inputDate.toDateString() === yesterday.toDateString()) {
            return `Yesterday ${inputDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
        }

        // Check if it's this week (within the past 7 days)
        const weekAgo = new Date(now);
        weekAgo.setDate(weekAgo.getDate() - 7);
        // Check if it's more than a week in the future
        const weekAhead = new Date(now);
        weekAhead.setDate(weekAhead.getDate() + 7);

        if (inputDate > weekAgo && inputDate < weekAhead) {
            const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
            return `${days[inputDate.getDay()]} ${inputDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
        }

        // For older dates and dates more than a week in the future, show full date
        return inputDate.toLocaleDateString() + ' ' + inputDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    },

    // Helper function to get local date string for HTML date input (YYYY-MM-DD)
    getLocalDateString(date) {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    },

    // Helper function to get local time string for HTML time input (HH:MM)
    getLocalTimeString(date) {
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');
        return `${hours}:${minutes}`;
    },

    // Helper function to create a date object from date and time inputs that preserves local time
    createLocalDateTime(dateStr, timeStr) {
        // Parse date components
        const [year, month, day] = dateStr.split('-').map(Number);
        // Parse time components
        const [hours, minutes] = timeStr.split(':').map(Number);

        // Create date object using local timezone
        return new Date(year, month - 1, day, hours, minutes);
    },

    // Helper function to create a local datetime string that preserves timezone
    getLocalDateTimeString(date) {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');
        const seconds = String(date.getSeconds()).padStart(2, '0');

        return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}`;
    },

    // Helper function to parse local datetime string back to Date object
    parseLocalDateTimeString(dateTimeStr) {
        try {
            // Handle both old ISO format and new local format
            if (dateTimeStr.includes('Z') || dateTimeStr.includes('+')) {
                // Old ISO format - convert from UTC
                return new Date(dateTimeStr);
            } else {
                // New local format - parse as local time
                const [datePart, timePart] = dateTimeStr.split('T');
                const [year, month, day] = datePart.split('-').map(Number);
                const [hours, minutes, seconds] = timePart.split(':').map(Number);

                return new Date(year, month - 1, day, hours, minutes, seconds || 0);
            }
        } catch (error) {
            console.error('Utils: Error parsing datetime string:', dateTimeStr, error);
            // Return a very old date so the event gets cleaned up
            return new Date('1970-01-01');
        }
    },

    // Check if date is today
    isToday(date) {
        const today = new Date();
        return date.toDateString() === today.toDateString();
    },
};

// Export utils to global namespace
window.RoommatePortal.utils = utils;
