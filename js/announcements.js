// Roommate Portal - Announcements Management Module
// Handles announcement posting, loading, and deletion with expiration dates

window.RoommatePortal = window.RoommatePortal || {};

const announcementsModule = {
    // Initialize announcement management
    init() {
        this.setupAnnouncementForm();
        this.startExpirationCheck();
    },

    // Setup announcement form event listener
    setupAnnouncementForm() {
        const elements = window.RoommatePortal.state.elements;

        if (elements.postAnnouncementForm) {
            elements.postAnnouncementForm.addEventListener('submit', this.handlePostAnnouncement.bind(this));
        }
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
                householdId: currentHousehold.id
            };

            // Only add encrypted flags if the fields were actually encrypted
            if (encryptedData.title_encrypted) {
                announcement.title_encrypted = encryptedData.title_encrypted;
            }
            if (encryptedData.body_encrypted) {
                announcement.body_encrypted = encryptedData.body_encrypted;
            }

            // Add to Firestore
            await window.RoommatePortal.config.db.collection('announcements').add(announcement);

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
            .collection('announcements')
            .where('householdId', '==', currentHousehold.id)
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

            return `
                <div class="bg-gradient-to-r from-orange-50 to-yellow-50 border border-orange-200 rounded-lg p-6 shadow-sm">
                    <div class="flex items-start justify-between">
                        <div class="flex-1">
                            ${announcement.title ? `
                                <h3 class="text-lg font-semibold text-gray-800 mb-2">
                                    <i class="fas fa-bullhorn text-orange-600 mr-2"></i>
                                    ${window.RoommatePortal.utils.escapeHtml(announcement.title)}
                                </h3>
                            ` : ''}
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

        window.RoommatePortal.config.db.collection('announcements').doc(announcementId).delete()
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
            .collection('announcements')
            .where('householdId', '==', currentHousehold.id)
            .where('expiresAt', '<', now.toISOString())
            .get()
            .then(snapshot => {
                snapshot.forEach(doc => {
                    // Delete expired announcements silently
                    window.RoommatePortal.config.db.collection('announcements').doc(doc.id).delete()
                        .catch(error => {
                            console.error('Error auto-deleting expired announcement:', error);
                        });
                });
            })
            .catch(error => {
                console.error('Error checking expired announcements:', error);
            });
    }
};

// Export announcements module to global namespace
window.RoommatePortal.announcements = announcementsModule;
