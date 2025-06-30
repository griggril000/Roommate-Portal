// Roommate Portal - Utility Functions Module
// Handles common utility functions and helpers

window.RoommatePortal = window.RoommatePortal || {};

const utils = {
    // Show notification to user
    showNotification(message) {
        // Create notification element
        const notification = document.createElement('div');
        notification.className = 'fixed top-4 right-4 bg-gray-800 text-white px-6 py-3 rounded-lg shadow-lg z-50 transform transition-all duration-300 translate-x-full';
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

    // Tab switching functionality
    switchTab(tabName) {
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
};

// Export utils to global namespace
window.RoommatePortal.utils = utils;
