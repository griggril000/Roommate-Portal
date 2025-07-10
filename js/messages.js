// Roommate Portal - Messages Management Module
// Handles message posting, loading, and deletion

window.RoommatePortal = window.RoommatePortal || {};

const messagesModule = {
    // Initialize message management
    init() {
        this.setupMessageForm();
    },

    // Setup message form event listener
    setupMessageForm() {
        const elements = window.RoommatePortal.state.elements;

        if (elements.postMessageForm) {
            elements.postMessageForm.addEventListener('submit', this.handlePostMessage.bind(this));
        }

        // Setup auto mark-as-read when viewing messages
        this.setupAutoMarkAsRead();
    },

    // Setup automatic mark as read when viewing messages
    setupAutoMarkAsRead() {
        // Listen for tab switches to messages
        window.addEventListener('roommatePortal:tabSwitch', (event) => {
            if (event.detail.tab === 'messages') {
                // Delay slightly to ensure DOM is updated
                setTimeout(() => this.markMessagesAsRead(), 500);
            }
        });

        // Also mark as read when page becomes visible and messages tab is active
        document.addEventListener('visibilitychange', () => {
            if (!document.hidden) {
                const messageSection = document.getElementById('messageSection');
                if (messageSection && !messageSection.classList.contains('hidden')) {
                    setTimeout(() => this.markMessagesAsRead(), 500);
                }
            }
        });
    },

    // Handle post message form submission
    async handlePostMessage(e) {
        e.preventDefault();

        const currentHousehold = window.RoommatePortal.state.getCurrentHousehold();
        const currentUser = window.RoommatePortal.state.getCurrentUser();
        const elements = window.RoommatePortal.state.elements;

        if (!currentHousehold) {
            window.RoommatePortal.utils.showNotification('❌ You must be part of a household to post messages.');
            return;
        }

        const author = elements.authorInput.value.trim();
        const messageText = elements.messageInput.value.trim();

        if (author && messageText) {
            try {
                // Encrypt the message content
                const encryptedMessage = await window.RoommatePortal.encryption.encryptSensitiveData({
                    text: messageText
                }, ['text']);

                const message = {
                    author: author,
                    text: encryptedMessage.text,
                    timestamp: firebase.firestore.FieldValue.serverTimestamp(),
                    authorId: currentUser.uid,
                    // Track which users have read this message (author has read it by default)
                    readBy: [currentUser.uid]
                };

                // Only add encrypted flag if the field was actually encrypted
                if (encryptedMessage.text_encrypted) {
                    message.text_encrypted = encryptedMessage.text_encrypted;
                }

                // Add to Firestore subcollection
                const { db } = window.RoommatePortal.config;
                await db.collection('households')
                    .doc(currentHousehold.id)
                    .collection('messages')
                    .add(message);

                // Clear message input but keep author name
                elements.messageInput.value = '';
                window.RoommatePortal.utils.showNotification('📝 Message posted successfully!');
            } catch (error) {
                console.error('Error posting message:', error);
                window.RoommatePortal.utils.showNotification('❌ Failed to post message. Please try again.');
            }
        }
    },

    // Load messages from Firestore
    loadMessagesFromFirestore() {
        const currentHousehold = window.RoommatePortal.state.getCurrentHousehold();
        if (!currentHousehold) return;

        const { db } = window.RoommatePortal.config;

        // Clean up any existing listener
        const messagesListener = window.RoommatePortal.state.getMessagesListener();
        if (messagesListener) {
            messagesListener();
            window.RoommatePortal.state.setMessagesListener(null);
        }

        const listener = db.collection('households')
            .doc(currentHousehold.id)
            .collection('messages')
            .onSnapshot(async (snapshot) => {
                let messagesList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

                // Decrypt message content
                try {
                    messagesList = await window.RoommatePortal.encryption.decryptDataArray(messagesList, ['text']);
                } catch (error) {
                    console.error('Error decrypting messages:', error);
                    window.RoommatePortal.utils.showNotification('⚠️ Some messages could not be decrypted.');
                }

                // Sort messages in JavaScript instead of Firestore to avoid index issues
                messagesList.sort((a, b) => {
                    const aTime = a.timestamp ? a.timestamp.seconds : 0;
                    const bTime = b.timestamp ? b.timestamp.seconds : 0;
                    return bTime - aTime; // Most recent first
                });
                window.RoommatePortal.state.setMessages(messagesList);
                this.loadMessages();
                window.RoommatePortal.statistics.updateStatistics();
            }, (error) => {
                console.error('Error loading messages:', error);
                const currentUser = window.RoommatePortal.state.getCurrentUser();

                if (error.code === 'permission-denied') {
                    if (currentUser && currentHousehold) {
                        window.RoommatePortal.utils.showNotification('❌ Failed to load messages. Please check your permissions.');
                    }
                } else {
                    if (currentUser && currentHousehold) {
                        window.RoommatePortal.utils.showNotification('❌ Failed to load messages. Please try again later.');
                    }
                }
            });

        window.RoommatePortal.state.setMessagesListener(listener);
    },

    // Load and display messages
    loadMessages() {
        const elements = window.RoommatePortal.state.elements;
        const messagesList = window.RoommatePortal.state.getMessages();
        const currentUser = window.RoommatePortal.state.getCurrentUser();
        const currentHousehold = window.RoommatePortal.state.getCurrentHousehold();

        elements.messageList.innerHTML = '';

        if (messagesList.length === 0) {
            const emptyStateMessage = !currentUser ?
                '<p>Sign in to see messages from your roommates.</p>' :
                !currentHousehold ?
                    '<p>Join or create a household to start messaging with roommates.</p>' :
                    '<p>Be the first to post a message to your roommates.</p>';

            elements.messageList.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-comments"></i>
                    <h3>No messages yet!</h3>
                    ${emptyStateMessage}
                </div>
            `;
            return;
        }

        messagesList.forEach((message, index) => {
            const messageElement = document.createElement('div');
            messageElement.className = 'message-item animate-slide-in';
            messageElement.style.animationDelay = `${index * 0.1}s`;

            const avatarEmoji = window.RoommatePortal.utils.getAvatarEmoji(message.author, message.authorId);
            // Only check if it's own message if user is logged in
            const isOwnMessage = currentUser && message.authorId === currentUser.uid;

            messageElement.innerHTML = `
                <div class="flex justify-between items-start mb-3">
                    <div class="flex items-center space-x-2">
                        ${avatarEmoji}
                        <span class="message-author">${message.author}</span>
                        ${!message.readBy || !message.readBy.includes(currentUser.uid) ? '<span class="bg-red-500 text-white text-xs px-2 py-1 rounded-full">NEW</span>' : ''}
                    </div>
                    <div class="flex items-center space-x-3">
                        <span class="message-timestamp">${message.timestamp ? new Date(message.timestamp.seconds * 1000).toLocaleString() : 'Just now'}</span>
                        ${isOwnMessage ? `<button onclick="window.RoommatePortal.messages.deleteMessage('${message.id}')" class="text-red-500 hover:text-red-700 transition-colors">
                            <i class="fas fa-times"></i>
                        </button>` : ''}
                    </div>
                </div>
                <p class="message-text">${message.text}</p>
            `;

            elements.messageList.appendChild(messageElement);
        });
    },

    // Delete message
    deleteMessage(id) {
        const currentUser = window.RoommatePortal.state.getCurrentUser();

        if (!currentUser) {
            window.RoommatePortal.utils.showNotification('❌ You must be logged in to delete messages.');
            return;
        }

        const messagesList = window.RoommatePortal.state.getMessages();
        const message = messagesList.find(m => m.id === id);

        // Check if user can delete this message (only their own messages)
        if (!message || message.authorId !== currentUser.uid) {
            window.RoommatePortal.utils.showNotification('❌ You can only delete your own messages.');
            return;
        }

        if (confirm('Are you sure you want to delete this message?')) {
            const { db } = window.RoommatePortal.config;
            db.collection('households')
                .doc(currentHousehold.id)
                .collection('messages')
                .doc(id)
                .delete()
                .then(() => {
                    window.RoommatePortal.utils.showNotification('🗑️ Message deleted');
                })
                .catch(error => {
                    console.error('Error deleting message:', error);
                    window.RoommatePortal.utils.showNotification('❌ Failed to delete message. Please try again.');
                });
        }
    },

    // Mark messages as read for the current user
    markMessagesAsRead() {
        const currentUser = window.RoommatePortal.state.getCurrentUser();
        const currentHousehold = window.RoommatePortal.state.getCurrentHousehold();
        const messagesList = window.RoommatePortal.state.getMessages();

        if (!currentUser || !currentHousehold) return;

        const { db } = window.RoommatePortal.config;
        const batch = db.batch();
        let hasUpdates = false;

        messagesList.forEach(message => {
            if (message.id && (!message.readBy || !message.readBy.includes(currentUser.uid))) {
                const messageRef = db.collection('households')
                    .doc(currentHousehold.id)
                    .collection('messages')
                    .doc(message.id);
                batch.update(messageRef, {
                    readBy: firebase.firestore.FieldValue.arrayUnion(currentUser.uid)
                });
                hasUpdates = true;
            }
        });

        if (hasUpdates) {
            batch.commit().catch(error => {
                // Only show error if user is still logged in
                if (currentUser && currentHousehold) {
                    console.error('Error updating message read status:', error);
                }
            });
        }
    }
};

// Export messages module to global namespace
window.RoommatePortal.messages = messagesModule;
