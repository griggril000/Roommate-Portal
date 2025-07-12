// Roommate Portal - Announcements Management Module
// Handles announcement posting, loading, and deletion with expiration dates

window.RoommatePortal = window.RoommatePortal || {};

const announcementsModule = {
    // Initialize announcement management
    init() {
        this.setupAnnouncementForm();
        this.setupAutoMarkAsRead();
        this.startExpirationCheck();
    },

    // Setup announcement form event listener
    setupAnnouncementForm() {
        const elements = window.RoommatePortal.state.elements;

        if (elements.postAnnouncementForm) {
            elements.postAnnouncementForm.addEventListener('submit', this.handlePostAnnouncement.bind(this));
        }
    },

    // Setup automatic mark as read when viewing announcements
    setupAutoMarkAsRead() {
        // Listen for tab switches to announcements
        window.addEventListener('roommatePortal:tabSwitch', (event) => {
            if (event.detail.tab === 'announcements') {
                // Delay slightly to ensure DOM is updated
                setTimeout(() => this.markAnnouncementsAsRead(), 500);
            }
        });

        // Also mark as read when page becomes visible and announcements tab is active
        document.addEventListener('visibilitychange', () => {
            if (!document.hidden) {
                const announcementSection = document.getElementById('announcementSection');
                if (announcementSection && !announcementSection.classList.contains('hidden')) {
                    setTimeout(() => this.markAnnouncementsAsRead(), 500);
                }
            }
        });
    },

    // Handle post announcement form submission
    async handlePostAnnouncement(e) {
        e.preventDefault();

        const currentHousehold = window.RoommatePortal.state.getCurrentHousehold();
        const currentUser = window.RoommatePortal.state.getCurrentUser();

        if (!currentHousehold || !currentUser) {
            window.RoommatePortal.utils.showNotification('⚠️ Please sign in and join a household first.');
            return;
        }

        const elements = window.RoommatePortal.state.elements;
        const titleInput = elements.announcementTitleInput;
        const bodyInput = elements.announcementBodyInput;
        const expirationInput = elements.announcementExpirationInput;

        if (!bodyInput || !bodyInput.value.trim()) {
            window.RoommatePortal.utils.showNotification('⚠️ Please enter an announcement.');
            return;
        }

        try {
            // Encrypt the announcement content
            const encryptedData = await window.RoommatePortal.encryption.encryptSensitiveData({
                title: titleInput?.value.trim() || '',
                body: bodyInput.value.trim()
            }, ['title', 'body']);

            const announcement = {
                title: encryptedData.title,
                body: encryptedData.body,
                author: currentUser.displayName || currentUser.email,
                authorId: currentUser.uid,
                createdAt: new Date().toISOString(),
                expiresAt: expirationInput?.value ? new Date(expirationInput.value).toISOString() : null,
                // Track which users have read this announcement (author has read it by default)
                readBy: [currentUser.uid]
            };

            // Only add encrypted flags if the fields were actually encrypted
            if (encryptedData.title_encrypted) {
                announcement.title_encrypted = encryptedData.title_encrypted;
            }
            if (encryptedData.body_encrypted) {
                announcement.body_encrypted = encryptedData.body_encrypted;
            }

            // Add to Firestore subcollection
            await window.RoommatePortal.config.db
                .collection('households')
                .doc(currentHousehold.id)
                .collection('announcements')
                .add(announcement);

            window.RoommatePortal.utils.showNotification('📢 Announcement posted successfully!');

            // Clear form
            if (titleInput) titleInput.value = '';
            if (bodyInput) bodyInput.value = '';
            if (expirationInput) expirationInput.value = '';
        } catch (error) {
            console.error('Error posting announcement:', error);
            window.RoommatePortal.utils.showNotification('❌ Failed to post announcement. Please try again.');
        }
    },

    // Load announcements from Firestore
    loadAnnouncements() {
        const currentHousehold = window.RoommatePortal.state.getCurrentHousehold();

        if (!currentHousehold) {
            this.displayAnnouncements([]);
            return;
        }

        // Set up real-time listener for announcements
        if (window.RoommatePortal.state.getAnnouncementsListener()) {
            window.RoommatePortal.state.getAnnouncementsListener()();
        }

        window.RoommatePortal.state.setAnnouncementsListener(window.RoommatePortal.config.db
            .collection('households')
            .doc(currentHousehold.id)
            .collection('announcements')
            .orderBy('createdAt', 'desc')
            .onSnapshot(async snapshot => {
                let announcements = [];
                snapshot.forEach(doc => {
                    const announcement = { id: doc.id, ...doc.data() };

                    // Check if announcement is expired
                    if (announcement.expiresAt && new Date(announcement.expiresAt) < new Date()) {
                        // Delete expired announcement silently
                        this.deleteAnnouncement(doc.id, true);
                    } else {
                        announcements.push(announcement);
                    }
                });

                // Decrypt announcement content
                try {
                    announcements = await window.RoommatePortal.encryption.decryptDataArray(announcements, ['title', 'body']);
                } catch (error) {
                    console.error('Error decrypting announcements:', error);
                    window.RoommatePortal.utils.showNotification('⚠️ Some announcements could not be decrypted.');
                }

                this.displayAnnouncements(announcements);
                window.RoommatePortal.state.setAnnouncements(announcements);
                window.RoommatePortal.statistics.updateStatistics();
            }, error => {
                console.error('Error loading announcements:', error);
                window.RoommatePortal.utils.showNotification('❌ Failed to load announcements.');
            }));
    },

    // Generate read receipts display for announcements
    generateReadReceipts(announcement) {
        const currentHousehold = window.RoommatePortal.state.getCurrentHousehold();
        const currentUser = window.RoommatePortal.state.getCurrentUser();

        if (!currentHousehold || !currentHousehold.memberDetails || !announcement.readBy) {
            return '';
        }

        // Get all household members except the announcement author
        const allMembers = Object.keys(currentHousehold.memberDetails)
            .filter(uid => uid !== announcement.authorId);

        // Get read members (excluding author)
        const readMembers = announcement.readBy.filter(uid => uid !== announcement.authorId);

        // Get unread members
        const unreadMembers = allMembers.filter(uid => !announcement.readBy.includes(uid));

        if (allMembers.length === 0) {
            return '';
        }

        let receiptsHtml = '<div class="read-receipts mt-3 pt-3 border-t border-orange-200 text-xs">';

        // Show read count
        if (readMembers.length > 0) {
            const readNames = readMembers
                .map(uid => currentHousehold.memberDetails[uid]?.displayName || 'Unknown')
                .slice(0, 3); // Show max 3 names

            receiptsHtml += `<div class="text-green-600 mb-1">
                <i class="fas fa-check-double mr-1"></i>
                Read by: ${readNames.join(', ')}`;

            if (readMembers.length > 3) {
                receiptsHtml += ` +${readMembers.length - 3} more`;
            }
            receiptsHtml += '</div>';
        }

        // Show unread count
        if (unreadMembers.length > 0) {
            receiptsHtml += `<div class="text-gray-500">
                <i class="fas fa-clock mr-1"></i>
                ${unreadMembers.length} unread
            </div>`;
        }

        receiptsHtml += '</div>';
        return receiptsHtml;
    },

    // Display announcements in the UI
    displayAnnouncements(announcements) {
        const announcementList = document.getElementById('announcementList');
        if (!announcementList) return;

        if (announcements.length === 0) {
            announcementList.innerHTML = `
                <div class="text-center py-8 text-gray-500">
                    <i class="fas fa-bullhorn text-4xl mb-4 opacity-50"></i>
                    <p>No announcements yet. Be the first to post one!</p>
                </div>
            `;
            return;
        }

        announcementList.innerHTML = announcements.map(announcement => {
            const createdDate = new Date(announcement.createdAt);
            const expiresDate = announcement.expiresAt ? new Date(announcement.expiresAt) : null;
            const currentUser = window.RoommatePortal.state.getCurrentUser();
            const isAuthor = currentUser && announcement.authorId === currentUser.uid;
            const readReceipts = isAuthor ? this.generateReadReceipts(announcement) : '';
            const isUnread = currentUser && (!announcement.readBy || !announcement.readBy.includes(currentUser.uid));

            return `
                <div class="bg-gradient-to-r from-orange-50 to-yellow-50 border border-orange-200 rounded-lg p-6 shadow-sm">
                    <div class="flex items-start justify-between">
                        <div class="flex-1">
                            <div class="flex items-center justify-between mb-2">
                                ${announcement.title ? `
                                    <h3 class="text-lg font-semibold text-gray-800 flex items-center">
                                        <i class="fas fa-bullhorn text-orange-600 mr-2"></i>
                                        ${window.RoommatePortal.utils.escapeHtml(announcement.title)}
                                        ${isUnread ? '<span class="bg-red-500 text-white text-xs px-2 py-1 rounded-full ml-2">NEW</span>' : ''}
                                    </h3>
                                ` : `
                                    <div class="flex items-center">
                                        <i class="fas fa-bullhorn text-orange-600 mr-2"></i>
                                        ${isUnread ? '<span class="bg-red-500 text-white text-xs px-2 py-1 rounded-full">NEW</span>' : ''}
                                    </div>
                                `}
                            </div>
                            <p class="text-gray-700 mb-3 whitespace-pre-wrap">${window.RoommatePortal.utils.escapeHtml(announcement.body)}</p>
                            <div class="flex flex-wrap items-center gap-4 text-sm text-gray-600">
                                <span class="flex items-center">
                                    <i class="fas fa-user mr-1"></i>
                                    ${window.RoommatePortal.utils.escapeHtml(announcement.author)}
                                </span>
                                <span class="flex items-center">
                                    <i class="fas fa-clock mr-1"></i>
                                    ${window.RoommatePortal.utils.formatDate(createdDate)}
                                </span>
                                ${expiresDate ? `
                                    <span class="flex items-center text-orange-600">
                                        <i class="fas fa-calendar-times mr-1"></i>
                                        Expires: ${window.RoommatePortal.utils.formatDate(expiresDate)}
                                    </span>
                                ` : ''}
                            </div>
                            ${readReceipts}
                        </div>
                        ${isAuthor ? `
                            <button onclick="window.RoommatePortal.announcements.deleteAnnouncement('${announcement.id}')"
                                class="ml-4 px-3 py-1 bg-red-500 text-white rounded-lg text-sm hover:bg-red-600 transition-colors">
                                <i class="fas fa-trash"></i>
                            </button>
                        ` : ''}
                    </div>
                </div>
            `;
        }).join('');
    },

    // Delete an announcement
    deleteAnnouncement(announcementId, isExpired = false) {
        // Skip confirmation for expired announcements
        if (!isExpired && !confirm('Are you sure you want to delete this announcement?')) {
            return;
        }

        window.RoommatePortal.config.db
            .collection('households')
            .doc(currentHousehold.id)
            .collection('announcements')
            .doc(announcementId)
            .delete()
            .then(() => {
                if (!isExpired) {
                    window.RoommatePortal.utils.showNotification('🗑️ Announcement deleted successfully!');
                }
            })
            .catch(error => {
                console.error('Error deleting announcement:', error);
                if (!isExpired) {
                    window.RoommatePortal.utils.showNotification('❌ Failed to delete announcement.');
                }
            });
    },

    // Start periodic expiration check
    startExpirationCheck() {
        // Check for expired announcements every 5 minutes
        setInterval(() => {
            this.checkExpiredAnnouncements();
        }, 5 * 60 * 1000); // 5 minutes

        // Also check on page load
        this.checkExpiredAnnouncements();
    },

    // Check for and delete expired announcements
    checkExpiredAnnouncements() {
        const currentHousehold = window.RoommatePortal.state.getCurrentHousehold();
        if (!currentHousehold) return;

        const now = new Date();

        window.RoommatePortal.config.db
            .collection('households')
            .doc(currentHousehold.id)
            .collection('announcements')
            .where('expiresAt', '<', now.toISOString())
            .get()
            .then(snapshot => {
                snapshot.forEach(doc => {
                    // Delete expired announcements silently
                    window.RoommatePortal.config.db
                        .collection('households')
                        .doc(currentHousehold.id)
                        .collection('announcements')
                        .doc(doc.id)
                        .delete()
                        .catch(error => {
                            console.error('Error auto-deleting expired announcement:', error);
                        });
                });
            })
            .catch(error => {
                console.error('Error checking expired announcements:', error);
            });
    },

    // Mark announcements as read for the current user
    markAnnouncementsAsRead() {
        const currentUser = window.RoommatePortal.state.getCurrentUser();
        const currentHousehold = window.RoommatePortal.state.getCurrentHousehold();
        const announcements = window.RoommatePortal.state.getAnnouncements();

        if (!currentUser || !currentHousehold || !announcements) return;

        const { db } = window.RoommatePortal.config;
        const batch = db.batch();
        let hasUpdates = false;

        announcements.forEach(announcement => {
            if (announcement.id && (!announcement.readBy || !announcement.readBy.includes(currentUser.uid))) {
                const announcementRef = db.collection('households')
                    .doc(currentHousehold.id)
                    .collection('announcements')
                    .doc(announcement.id);
                batch.update(announcementRef, {
                    readBy: firebase.firestore.FieldValue.arrayUnion(currentUser.uid)
                });
                hasUpdates = true;
            }
        });

        if (hasUpdates) {
            batch.commit().then(() => {
                // Clear read announcements from notification tracking
                if (window.RoommatePortal.notifications) {
                    window.RoommatePortal.notifications.clearReadItems();
                }
            }).catch(error => {
                // Only show error if user is still logged in
                if (currentUser && currentHousehold) {
                    console.error('Error updating announcement read status:', error);
                }
            });
        }
    }
};

// Export announcements module to global namespace
window.RoommatePortal.announcements = announcementsModule;
