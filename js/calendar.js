// Roommate Portal - Calendar Module
// Handles calendar events and shared scheduling functionality

window.RoommatePortal = window.RoommatePortal || {};

const calendar = {
    // Initialize calendar module
    init() {
        console.log('🗓️ Initializing Calendar Module...');
        try {
            // Verify Firebase and required modules are available
            if (!window.firebase) {
                console.error('❌ Calendar: Firebase is not loaded. Calendar features will not work.');
                return;
            }

            const { db } = window.RoommatePortal.config || {};
            if (!db) {
                console.error('❌ Calendar: Firebase database is not available in config. Calendar features will not work.');
                return;
            }

            console.log('✅ Calendar: Firebase database connection available');

            // Setup event listeners
            this.setupEventListeners();

            // Check auth state
            const currentUser = window.RoommatePortal.state.getCurrentUser();
            const currentHousehold = window.RoommatePortal.state.getCurrentHousehold();

            console.log('📊 Calendar initial state:', {
                user: currentUser ? `ID: ${currentUser.uid}` : 'Not logged in',
                household: currentHousehold ? `ID: ${currentHousehold.id}` : 'No household'
            });

            // Render initial state (empty or with events if authenticated)
            this.renderEvents();

            // If already authenticated, attach listeners immediately
            if (currentUser && currentHousehold) {
                console.log('🔄 Calendar: User already authenticated, attaching listeners now');
                this.attachDatabaseListeners();
            }

            // Listen for auth state change events
            window.addEventListener('roommatePortal:authStateChange', (e) => {
                console.log('🔔 Calendar: Auth state changed:', e.detail?.user ? 'User logged in' : 'User logged out');

                if (e.detail?.user) {
                    // User logged in, but we need household too, so don't attach listeners yet
                    console.log('🔍 Calendar: User authenticated, waiting for household information');
                } else {
                    // User logged out
                    console.log('🔍 Calendar: User signed out, detaching listeners');
                    this.detachDatabaseListeners();
                    this.renderEvents();
                }
            });

            // Listen for household change events
            window.addEventListener('roommatePortal:householdChange', (e) => {
                console.log('🔔 Calendar: Household changed:', e.detail?.household?.id || 'No household');

                const currentUser = window.RoommatePortal.state.getCurrentUser();
                if (currentUser && e.detail?.household) {
                    // Both user and household are available, attach listeners
                    console.log('🔍 Calendar: Both user and household available, attaching listeners');
                    this.attachDatabaseListeners();
                }
            });

            // Listen for tab switches to ensure empty state is visible
            window.addEventListener('roommatePortal:tabSwitch', (e) => {
                console.log(`🔔 Calendar: Tab switch event received: ${e.detail.tab}`);
                if (e.detail.tab === 'calendar') {
                    // Re-render events when switching to calendar tab
                    console.log('🔄 Calendar: Switched to calendar tab, refreshing events');
                    setTimeout(() => this.renderEvents(), 50);
                }
            });

            console.log('✅ Calendar Module initialized successfully!');
        } catch (error) {
            console.error('❌ Error initializing Calendar Module:', error);
        }
    },

    // Setup event listeners
    setupEventListeners() {
        console.log('🔍 Calendar: Setting up event listeners...');

        // We don't need a separate tab switch listener here since it's already in init()
        // This prevents double rendering when switching to the calendar tab

        // Add event form handler for the hidden form
        const addEventForm = document.getElementById('addEventForm');

        // Log diagnostic info about the form and its fields
        console.log('🔍 Calendar: Form elements check:', {
            addEventForm: !!addEventForm,
            eventTitleHidden: !!document.getElementById('eventTitleHidden'),
            eventDateHidden: !!document.getElementById('eventDateHidden'),
            eventTimeHidden: !!document.getElementById('eventTimeHidden'),
            eventCategoryHidden: !!document.getElementById('eventCategoryHidden'),
            eventDescriptionHidden: !!document.getElementById('eventDescriptionHidden'),
            eventAllDayHidden: !!document.getElementById('eventAllDayHidden'),
        });

        // Add event listener for the "All Day" checkbox in the hidden form
        const eventAllDayHiddenCheckbox = document.getElementById('eventAllDayHidden');
        const timeFieldContainerHidden = document.getElementById('timeFieldContainerHidden');

        if (eventAllDayHiddenCheckbox && timeFieldContainerHidden) {
            console.log('🔍 Calendar: Setting up All Day checkbox toggle behavior for hidden form');

            // Initial state
            if (eventAllDayHiddenCheckbox.checked) {
                timeFieldContainerHidden.classList.add('hidden');
            }

            // Toggle time field visibility when checkbox is clicked
            eventAllDayHiddenCheckbox.addEventListener('change', (e) => {
                console.log(`🔍 Calendar: Hidden All Day checkbox changed to ${e.target.checked ? 'checked' : 'unchecked'}`);
                if (e.target.checked) {
                    timeFieldContainerHidden.classList.add('hidden');
                } else {
                    timeFieldContainerHidden.classList.remove('hidden');
                }
            });
        } else {
            console.log('❌ Calendar: Hidden All Day checkbox or time container not found in DOM');
        }

        // Add event listener for the hidden form
        if (addEventForm) {
            console.log('🔍 Calendar: Found add event form (hidden), adding submit listener');

            addEventForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                console.log('🔍 Calendar: Add event form submitted');

                // Use the addNewEvent method which uses the correct IDs
                this.addNewEvent();
            });
        } else {
            console.error('❌ Calendar: Add event form not found in the DOM');
        }

        // Add delete event confirmation modal to the DOM if it doesn't exist
        if (!document.getElementById('deleteEventConfirmModal')) {
            console.log('🔧 Calendar: Creating delete confirmation modal in the DOM');
            const modal = document.createElement('div');
            modal.id = 'deleteEventConfirmModal';
            modal.className = 'fixed inset-0 bg-gray-900 bg-opacity-50 flex items-center justify-center z-50 hidden';
            modal.innerHTML = `
                <div class="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
                    <h3 class="text-xl font-medium text-gray-900 mb-4">Delete Event</h3>
                    <p class="text-gray-600 mb-6">Are you sure you want to delete this event? This action cannot be undone.</p>
                    <div class="flex justify-end space-x-3">
                        <button type="button" class="py-2 px-4 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 transition-colors" 
                            onclick="document.getElementById('deleteEventConfirmModal').classList.add('hidden')">
                            Cancel
                        </button>
                        <button id="confirmDeleteEventBtn" type="button" class="py-2 px-4 bg-red-600 text-white rounded hover:bg-red-700 transition-colors">
                            Delete
                        </button>
                    </div>
                </div>
            `;
            document.body.appendChild(modal);
        }

        // Handle delete event confirmation modal
        const confirmDeleteEventBtn = document.getElementById('confirmDeleteEventBtn');
        if (confirmDeleteEventBtn) {
            console.log('🔍 Calendar: Found confirm delete button, adding click listener');

            confirmDeleteEventBtn.addEventListener('click', () => {
                const eventId = confirmDeleteEventBtn.dataset.eventId;
                console.log(`🔍 Calendar: Confirming deletion of event ID: ${eventId}`);

                if (eventId) {
                    this.deleteEvent(eventId);

                    // Close the modal
                    const modal = document.getElementById('deleteEventConfirmModal');
                    if (modal) {
                        modal.classList.add('hidden');
                    }
                }
            });
        } else {
            console.error('❌ Calendar: Confirm delete event button not found in the DOM');
        }

        console.log('✅ Calendar: Event listeners setup complete');
    },

    // Filter events by category
    filterEventsByCategory(category) {
        const eventItems = document.querySelectorAll('.event-item');

        // Reset all filters
        document.querySelectorAll('.event-filter').forEach(filter => {
            filter.classList.remove('bg-blue-600', 'text-white');
            filter.classList.add('bg-gray-200', 'text-gray-700');
        });

        // Highlight selected filter
        const selectedFilter = document.querySelector(`.event-filter[data-category="${category}"]`);
        if (selectedFilter) {
            selectedFilter.classList.remove('bg-gray-200', 'text-gray-700');
            selectedFilter.classList.add('bg-blue-600', 'text-white');
        }

        // Show/hide events based on category
        eventItems.forEach(item => {
            if (category === 'all') {
                item.classList.remove('hidden');
            } else {
                const eventCategory = item.dataset.category;
                if (eventCategory === category) {
                    item.classList.remove('hidden');
                } else {
                    item.classList.add('hidden');
                }
            }
        });
    },

    // Add new event
    async addNewEvent() {
        console.log('🔍 Calendar: addNewEvent called');
        try {
            const currentUser = window.RoommatePortal.state.getCurrentUser();
            const currentHousehold = window.RoommatePortal.state.getCurrentHousehold();

            console.log('🔍 Calendar: Current auth state:', {
                user: currentUser ? `ID: ${currentUser.uid}` : 'Not logged in',
                household: currentHousehold ? `ID: ${currentHousehold.id}` : 'No household'
            });

            if (!currentUser || !currentHousehold) {
                console.error('❌ Calendar: Cannot add event - missing user or household');
                window.RoommatePortal.utils.showNotification('❌ You must be signed in and connected to a household');
                return;
            }

            // Safely get form values from the hidden form
            const getElementValue = (id, defaultValue = '') => {
                // Get value from the hidden form
                const element = document.getElementById(id);

                if (!element) {
                    console.error(`❌ Calendar: Form element with ID '${id}' not found`);
                    return defaultValue;
                }
                return element.type === 'checkbox' ? element.checked : element.value.trim();
            };

            // Get form values from the hidden form
            const eventTitle = getElementValue('eventTitleHidden');
            const eventDate = getElementValue('eventDateHidden');
            const eventTime = getElementValue('eventTimeHidden');
            const eventCategory = getElementValue('eventCategoryHidden', 'other');
            const eventDescription = getElementValue('eventDescriptionHidden');
            const isAllDay = getElementValue('eventAllDayHidden', false);

            console.log('🔍 Calendar: Form data collected:', {
                title: eventTitle,
                date: eventDate,
                time: eventTime,
                category: eventCategory,
                isAllDay: isAllDay
            });

            if (!eventTitle || !eventDate) {
                console.warn('⚠️ Calendar: Missing required fields');
                window.RoommatePortal.utils.showNotification('❌ Event title and date are required');
                return;
            }

            // Create timestamp from date and time
            let eventTimestamp;
            try {
                if (isAllDay) {
                    // Fix for all-day events to prevent timezone issues
                    // Split the date to get year, month, day and create a date with local timezone
                    const [year, month, day] = eventDate.split('-').map(num => parseInt(num, 10));
                    // Month is 0-indexed in JavaScript Date
                    const dateObj = new Date(year, month - 1, day, 12, 0, 0, 0);
                    console.log(`🔍 Calendar: All-day event date parsed: ${dateObj.toISOString()}`);
                    eventTimestamp = dateObj.getTime();
                } else {
                    // Combine date and time
                    if (!eventTime) {
                        console.warn('⚠️ Calendar: Missing time for non-all-day event');
                        window.RoommatePortal.utils.showNotification('❌ Event time is required for non all-day events');
                        return;
                    }
                    eventTimestamp = new Date(`${eventDate}T${eventTime}`).getTime();
                }

                // Validate timestamp
                if (isNaN(eventTimestamp)) {
                    throw new Error('Invalid date/time format');
                }

                console.log('🔍 Calendar: Event timestamp calculated:', {
                    timestamp: eventTimestamp,
                    dateString: new Date(eventTimestamp).toString()
                });
            } catch (error) {
                console.error('❌ Calendar: Error calculating timestamp:', error);
                window.RoommatePortal.utils.showNotification('❌ Invalid date or time format');
                return;
            }

            // Create event object with ISO date strings like announcements module
            const eventDateObj = new Date(eventTimestamp);
            const newEvent = {
                title: eventTitle,
                date: eventDateObj.toISOString(), // Store as ISO string for consistency with announcements
                category: eventCategory || 'other', // Default to 'other' if category is missing
                description: eventDescription || '',
                isAllDay: Boolean(isAllDay),
                createdBy: currentUser.uid,
                createdAt: new Date().toISOString(), // Also use ISO string for creation time
                householdId: currentHousehold.id
            };

            console.log('🔍 Calendar: Prepared event object:', newEvent);

            // Save to database
            const { db } = window.RoommatePortal.config;
            if (!db || typeof db.collection !== 'function') {
                console.error('❌ Calendar: Firebase database not properly initialized');
                window.RoommatePortal.utils.showNotification('❌ Database connection error');
                return;
            }

            console.log('🔍 Calendar: Adding event to Firestore...');
            const docRef = await db.collection('events').add(newEvent);
            console.log(`✅ Calendar: Event successfully added with ID: ${docRef.id}`);

            // Reset the form
            const addEventForm = document.getElementById('addEventForm');
            if (addEventForm) {
                addEventForm.reset();
                console.log('🔍 Calendar: Reset event form');
            }

            // Close any FAB modal if it exists
            const fabModal = document.querySelector('.input-modal');
            if (fabModal) {
                fabModal.remove();
                console.log('🔍 Calendar: Removed FAB input modal');
            }

            window.RoommatePortal.utils.showNotification('✅ Event added successfully');
        } catch (error) {
            console.error('❌ Error adding event:', error);
            window.RoommatePortal.utils.showNotification('❌ Failed to add event');
        }
    },

    // Delete event
    async deleteEvent(eventId) {
        try {
            const currentUser = window.RoommatePortal.state.getCurrentUser();
            if (!currentUser) {
                window.RoommatePortal.utils.showNotification('❌ You must be signed in to delete events');
                return;
            }

            const { db } = window.RoommatePortal.config;
            await db.collection('events').doc(eventId).delete();

            window.RoommatePortal.utils.showNotification('✅ Event deleted successfully');
        } catch (error) {
            console.error('Error deleting event:', error);
            window.RoommatePortal.utils.showNotification('❌ Failed to delete event');
        }
    },

    // Show event details in a modal
    showEventDetails(eventId) {
        console.log(`🔍 Calendar: Showing details for event ID: ${eventId}`);
        const events = window.RoommatePortal.state.getEvents();
        const event = events.find(e => e.id === eventId);

        if (!event) {
            console.warn(`⚠️ Calendar: Event with ID ${eventId} not found`);
            return;
        }

        const eventDetailsModal = document.getElementById('eventDetailsModal');
        const eventDetailsTitle = document.getElementById('eventDetailsTitle');
        const eventDetailsDate = document.getElementById('eventDetailsDate');
        const eventDetailsCreator = document.getElementById('eventDetailsCreator');
        const eventDetailsDescription = document.getElementById('eventDetailsDescription');
        const eventDetailsDeleteBtn = document.getElementById('eventDetailsDeleteBtn');

        if (!eventDetailsModal) {
            console.error('❌ Calendar: Event details modal not found in the DOM');
            return;
        }

        console.log('🔍 Calendar: Populating event details modal');

        // Populate modal with event details
        eventDetailsTitle.textContent = event.title;

        const eventDate = new Date(event.date);
        const dateString = event.isAllDay
            ? eventDate.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }) + ' (All day)'
            : eventDate.toLocaleString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: 'numeric', minute: 'numeric' });

        eventDetailsDate.textContent = dateString;

        const creatorName = window.RoommatePortal.utils.getUserDisplayName(event.createdBy);
        eventDetailsCreator.textContent = `Created by ${creatorName || 'Unknown'}`;

        eventDetailsDescription.textContent = event.description || 'No description provided';

        // Setup delete button
        const currentUser = window.RoommatePortal.state.getCurrentUser();
        if (currentUser && (currentUser.uid === event.createdBy)) {
            if (eventDetailsDeleteBtn) {
                eventDetailsDeleteBtn.classList.remove('hidden');
                eventDetailsDeleteBtn.onclick = () => {
                    // Close details modal
                    eventDetailsModal.classList.add('hidden');

                    // Show delete confirmation modal
                    const deleteConfirmModal = document.getElementById('deleteEventConfirmModal');
                    if (deleteConfirmModal) {
                        const confirmBtn = document.getElementById('confirmDeleteEventBtn');
                        if (confirmBtn) {
                            confirmBtn.dataset.eventId = eventId;
                        }
                        deleteConfirmModal.classList.remove('hidden');
                        console.log(`🔍 Calendar: Showing delete confirmation for event ID: ${eventId}`);
                    } else {
                        // Fallback if confirmation modal doesn't exist
                        console.log(`⚠️ Calendar: No confirmation modal found, deleting event directly`);
                        this.deleteEvent(eventId);
                    }
                };
            }
        } else {
            if (eventDetailsDeleteBtn) {
                eventDetailsDeleteBtn.classList.add('hidden');
            }
        }

        // Show modal
        eventDetailsModal.classList.remove('hidden');
        console.log('✅ Calendar: Event details modal displayed');
    },

    // Render events in the UI
    renderEvents() {
        console.log('🔍 Calendar: renderEvents called');
        const events = window.RoommatePortal.state.getEvents() || [];
        console.log(`🔍 Calendar: Retrieved ${events.length} events from state to render`);

        const eventList = document.getElementById('eventList');
        const upcomingEventsCount = document.getElementById('upcomingEventsCount');

        if (!eventList) {
            console.error('❌ Calendar: Event list container not found in the DOM');
            return;
        }

        // Clear event list
        eventList.innerHTML = '';

        if (!events || events.length === 0) {
            console.log('🔍 Calendar: No events found, showing empty state');
            // Create a more visually appealing empty state
            eventList.innerHTML = `
                <div class="text-center py-16">
                    <div class="inline-flex items-center justify-center p-6 bg-gray-100 rounded-full mb-6">
                        <i class="fas fa-calendar-alt text-gray-400 text-5xl"></i>
                    </div>
                    <h3 class="text-xl font-medium text-gray-700 mb-2">No events yet. Be the first to add one!</h3>
                    <p class="text-gray-500 max-w-md mx-auto">
                        Create events to share with your roommates - social gatherings, bill due dates, chores, shopping trips, and more.
                    </p>
                </div>
            `;
            if (upcomingEventsCount) {
                console.log('🔍 Calendar: Updating dashboard count to 0');
                upcomingEventsCount.textContent = '0';
            }
            return;
        }

        console.log('🔍 Calendar: Found events, preparing to render');

        // Sort events by date (upcoming first)
        const sortedEvents = [...events].sort((a, b) => {
            // Handle Firebase Timestamp objects or ISO date strings
            const dateA = a.date?.toDate ? a.date.toDate().getTime() : new Date(a.date).getTime();
            const dateB = b.date?.toDate ? b.date.toDate().getTime() : new Date(b.date).getTime();
            return dateA - dateB;
        });

        // Filter out past events (more than 1 day old)
        const now = new Date().getTime();
        const oneDayMs = 24 * 60 * 60 * 1000;
        const upcomingEvents = sortedEvents.filter(event => {
            const eventDate = event.date?.toDate ? event.date.toDate().getTime() : new Date(event.date).getTime();
            return eventDate > (now - oneDayMs);
        });

        console.log(`🔍 Calendar: Filtered to ${upcomingEvents.length} upcoming events`);

        // Update dashboard count
        if (upcomingEventsCount) {
            console.log(`🔍 Calendar: Updating dashboard count to ${upcomingEvents.length}`);
            upcomingEventsCount.textContent = upcomingEvents.length.toString();
        }

        // Render events
        upcomingEvents.forEach(event => {
            try {
                console.log(`🔍 Calendar: Rendering event "${event.title}"`);

                // Handle both Firestore timestamp and ISO string formats
                const eventDate = event.date?.toDate ? event.date.toDate() : new Date(event.date);
                console.log(`🔍 Calendar: Event date for "${event.title}": ${eventDate.toISOString()}, isAllDay: ${event.isAllDay}`);
                const isToday = new Date().toDateString() === eventDate.toDateString();
                const isPast = eventDate < new Date();

                let dateDisplay;
                if (isToday) {
                    dateDisplay = 'Today';
                    if (!event.isAllDay) {
                        dateDisplay += ` at ${eventDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`;
                    }
                } else {
                    dateDisplay = eventDate.toLocaleDateString('en-US', {
                        weekday: 'short',
                        month: 'short',
                        day: 'numeric'
                    });
                    if (!event.isAllDay) {
                        dateDisplay += ` at ${eventDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`;
                    }
                }

                const creatorName = window.RoommatePortal.utils.getUserDisplayName(event.createdBy);
                // Get category icon
                let categoryIcon = 'calendar';
                let categoryColor = 'blue';

                switch (event.category) {
                    case 'social':
                        categoryIcon = 'users';
                        categoryColor = 'purple';
                        break;
                    case 'chore':
                        categoryIcon = 'broom';
                        categoryColor = 'green';
                        break;
                    case 'bill':
                        categoryIcon = 'dollar-sign';
                        categoryColor = 'yellow';
                        break;
                    case 'shopping':
                        categoryIcon = 'shopping-cart';
                        categoryColor = 'red';
                        break;
                    case 'other':
                        categoryIcon = 'calendar';
                        categoryColor = 'blue';
                        break;
                }

                const eventItem = document.createElement('div');
                eventItem.className = `event-item p-4 bg-white rounded-lg shadow-md mb-4 border-l-4 border-${categoryColor}-500 hover:shadow-lg transition-shadow ${isPast ? 'opacity-50' : ''}`;
                eventItem.dataset.category = event.category;
                eventItem.dataset.id = event.id;

                eventItem.innerHTML = `
                    <div class="flex items-center justify-between">
                        <div class="flex items-start">
                            <div class="bg-${categoryColor}-100 p-2.5 rounded-lg mr-4">
                                <i class="fas fa-${categoryIcon} text-${categoryColor}-600 text-lg"></i>
                            </div>
                            <div>
                                <h3 class="font-medium text-lg text-gray-800">${window.RoommatePortal.utils.escapeHtml(event.title)}</h3>
                                <p class="text-sm text-gray-500">
                                    ${isToday ? '<span class="text-green-600 font-medium">Today</span>' : dateDisplay}
                                    ${event.isAllDay ? ' • All day' : ''}
                                </p>
                                ${event.description ? `<p class="text-sm text-gray-600 mt-1 line-clamp-1">${window.RoommatePortal.utils.escapeHtml(event.description)}</p>` : ''}
                                <p class="text-xs text-gray-400 mt-1">Created by ${creatorName || 'Unknown'}</p>
                            </div>
                        </div>
                        <button class="text-gray-400 hover:text-gray-600" title="View event details">
                            <i class="fas fa-ellipsis-v"></i>
                        </button>
                    </div>
                `;

                // Add click event to show event details
                eventItem.addEventListener('click', () => {
                    this.showEventDetails(event.id);
                });

                eventList.appendChild(eventItem);
                console.log(`✅ Calendar: Event "${event.title}" rendered successfully`);
            } catch (error) {
                console.error(`❌ Error rendering event:`, error, event);
            }
        });

        console.log(`✅ Calendar: Rendering complete - ${upcomingEvents.length} events displayed`);
    },

    // Add a new event to Firestore
    async addEvent(eventData) {
        console.log('🔍 Calendar: addEvent called with data:', eventData);

        const currentUser = window.RoommatePortal.state.getCurrentUser();
        const currentHousehold = window.RoommatePortal.state.getCurrentHousehold();

        if (!currentUser || !currentHousehold) {
            console.error('❌ Calendar: Cannot add event - missing user or household');
            return false;
        }

        try {
            console.log('🔍 Calendar: Creating event object for Firestore');

            // Create the event object
            const event = {
                ...eventData,
                householdId: currentHousehold.id,
                createdBy: currentUser.uid,
                creatorName: currentUser.displayName || currentUser.email,
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            };

            console.log('🔍 Calendar: Event object ready for Firestore:', event);

            const { db } = window.RoommatePortal.config;
            console.log('🔍 Firebase db object available:', !!db);

            // Add the event to Firestore
            console.log('🔍 Calendar: Adding event to Firestore "events" collection');
            const docRef = await db.collection('events').add(event);

            console.log(`✅ Calendar: Event added successfully with ID: ${docRef.id}`);
            this.displayNotification('Event added successfully!', 'success');
            return true;
        } catch (error) {
            console.error('❌ Error adding event:', error);
            this.displayNotification('Error adding event. Please try again.', 'error');
            return false;
        }
    },

    // Attach Firestore listeners
    attachDatabaseListeners() {
        const currentUser = window.RoommatePortal.state.getCurrentUser();
        const currentHousehold = window.RoommatePortal.state.getCurrentHousehold();

        console.log('🔍 Calendar: Attempting to attach database listeners...');
        console.log('🔍 Current user:', currentUser ? `ID: ${currentUser.uid}` : 'No user found');
        console.log('🔍 Current household:', currentHousehold ? `ID: ${currentHousehold.id}` : 'No household found');

        if (!currentUser || !currentHousehold) {
            console.warn('⚠️ Calendar: Cannot attach listeners - missing user or household');
            return;
        }

        try {
            const { db } = window.RoommatePortal.config;
            console.log('🔍 Firebase db object available:', !!db);

            if (!db || typeof db.collection !== 'function') {
                console.error('❌ Calendar: Firebase db object is invalid or not properly initialized');
                return;
            }

            // Detach existing listeners first
            this.detachDatabaseListeners();

            console.log(`🔍 Setting up Firestore query for events where householdId == ${currentHousehold.id}`);

            try {
                // Listen for events in the current household
                const eventsListener = db.collection('events')
                    .where('householdId', '==', currentHousehold.id)
                    .onSnapshot(
                        snapshot => {
                            console.log(`🔍 Calendar: Firestore events snapshot received, docs: ${snapshot.size}`);
                            const events = [];

                            snapshot.forEach(doc => {
                                console.log(`🔍 Calendar: Event data received for ID ${doc.id}:`, doc.data());
                                events.push({
                                    id: doc.id,
                                    ...doc.data()
                                });
                            });

                            console.log(`🔍 Calendar: Total events processed: ${events.length}`);
                            window.RoommatePortal.state.setEvents(events);
                            this.renderEvents();
                        },
                        error => {
                            console.error('❌ Error getting events:', error);
                            // Check for permission denied errors which suggest Firestore rules issues
                            if (error.code === 'permission-denied') {
                                console.error('❌ Firestore permission denied. Please check your security rules for the events collection.');
                                window.RoommatePortal.utils.showNotification('❌ Calendar access denied. Contact your administrator.');
                            }
                        }
                    );

                window.RoommatePortal.state.setEventsListener(eventsListener);
                console.log('✅ Calendar: Database listeners attached successfully');
            } catch (error) {
                console.error('❌ Error setting up event listener:', error);
            }
        } catch (error) {
            console.error('❌ Error in attachDatabaseListeners:', error);
        }
    },

    // Detach Firestore listeners
    detachDatabaseListeners() {
        const eventsListener = window.RoommatePortal.state.getEventsListener();

        if (eventsListener) {
            eventsListener();
            window.RoommatePortal.state.setEventsListener(null);
            // Reset events array and re-render empty state
            window.RoommatePortal.state.setEvents([]);
            this.renderEvents();
        }
    },

    // Helper functions for date/time formatting and HTML escaping
    formatDate(date) {
        return date.toLocaleDateString('en-US', {
            weekday: 'short',
            month: 'short',
            day: 'numeric',
            year: 'numeric'
        });
    },

    formatTime(date) {
        return date.toLocaleTimeString('en-US', {
            hour: 'numeric',
            minute: '2-digit'
        });
    },

    escapeHTML(unsafe) {
        if (!unsafe) return '';
        return String(unsafe)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    },

    // Display notification
    displayNotification(message, type = 'info') {
        if (window.RoommatePortal.utils && window.RoommatePortal.utils.showNotification) {
            window.RoommatePortal.utils.showNotification(message);
        } else {
            console.log(`Notification (${type}): ${message}`);
            alert(message);
        }
    },
};

// Export calendar to global namespace
window.RoommatePortal.calendar = calendar;

console.log('🔍 Calendar module attached to global RoommatePortal object:', {
    moduleAttached: !!window.RoommatePortal.calendar,
    methodsAvailable: {
        init: typeof window.RoommatePortal.calendar?.init === 'function',
        addEvent: typeof window.RoommatePortal.calendar?.addEvent === 'function',
        renderEvents: typeof window.RoommatePortal.calendar?.renderEvents === 'function',
        attachDatabaseListeners: typeof window.RoommatePortal.calendar?.attachDatabaseListeners === 'function'
    }
});
