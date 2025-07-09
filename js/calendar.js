// Roommate Portal - Calendar Management Module
// Handles calendar events creation, editing, and management

window.RoommatePortal = window.RoommatePortal || {};

const calendarModule = {
    currentDate: new Date(),
    events: [],

    // Initialize calendar management
    init() {
        this.setupCalendarForm();
        this.setupCalendarNavigation();
        this.setupCleanupSchedule();

        // Load events if user is already in a household
        if (window.RoommatePortal.state.getCurrentHousehold()) {
            this.loadEvents();
            this.renderCalendar();
        }
    },

    // Refresh calendar when household context changes
    refresh() {
        this.loadEvents();
        this.renderCalendar();
    },

    // Setup calendar form event listener
    setupCalendarForm() {
        const elements = window.RoommatePortal.state.elements;
        const addEventForm = document.getElementById('addEventForm');

        if (addEventForm) {
            addEventForm.addEventListener('submit', this.handleAddEvent.bind(this));
        }
    },

    // Setup calendar navigation
    setupCalendarNavigation() {
        const prevMonthBtn = document.getElementById('prevMonthBtn');
        const nextMonthBtn = document.getElementById('nextMonthBtn');
        const todayBtn = document.getElementById('todayBtn');

        if (prevMonthBtn) {
            prevMonthBtn.addEventListener('click', () => {
                this.currentDate.setMonth(this.currentDate.getMonth() - 1);
                this.renderCalendar();
            });
        }

        if (nextMonthBtn) {
            nextMonthBtn.addEventListener('click', () => {
                this.currentDate.setMonth(this.currentDate.getMonth() + 1);
                this.renderCalendar();
            });
        }

        if (todayBtn) {
            todayBtn.addEventListener('click', () => {
                this.currentDate = new Date();
                this.renderCalendar();
            });
        }
    },

    // Handle add event form submission
    handleAddEvent(e) {
        if (e.preventDefault) e.preventDefault();

        const currentHousehold = window.RoommatePortal.state.getCurrentHousehold();
        const currentUser = window.RoommatePortal.state.getCurrentUser();

        if (!currentHousehold || !currentUser) {
            window.RoommatePortal.utils.showNotification('❌ You must be part of a household to add events.');
            return;
        }

        const eventTitle = document.getElementById('eventTitle').value.trim();
        const eventDate = document.getElementById('eventDate').value;
        const eventTime = document.getElementById('eventTime').value;
        const eventEndDate = document.getElementById('eventEndDate').value;
        const eventEndTime = document.getElementById('eventEndTime').value;
        const eventDescription = document.getElementById('eventDescription').value.trim();
        const eventPrivacy = document.getElementById('eventPrivacy').value;

        if (!eventTitle || !eventDate || !eventTime) {
            window.RoommatePortal.utils.showNotification('❌ Please fill in all required fields.');
            return;
        }

        // Create start and end datetime objects using helper function
        const startDateTime = this.createLocalDateTime(eventDate, eventTime);
        let endDateTime;

        if (eventEndDate && eventEndTime) {
            endDateTime = this.createLocalDateTime(eventEndDate, eventEndTime);
        } else {
            // Default to 1 hour after start time
            endDateTime = new Date(startDateTime.getTime() + 60 * 60 * 1000);
        }

        // Validate dates
        if (endDateTime <= startDateTime) {
            window.RoommatePortal.utils.showNotification('❌ End time must be after start time.');
            return;
        }

        // Check if we're editing an existing event
        const form = document.getElementById('addEventForm');
        const editingEventId = form.dataset.editingEventId;

        const eventData = {
            title: eventTitle,
            description: eventDescription,
            startDate: this.getLocalDateTimeString(startDateTime),
            endDate: this.getLocalDateTimeString(endDateTime),
            privacy: eventPrivacy,
            createdBy: currentUser.uid,
            createdByName: currentUser.displayName || currentUser.email,
            householdId: currentHousehold.id
        };

        if (editingEventId) {
            // Editing existing event
            eventData.id = editingEventId;
            // Keep original creation time
            const originalEvent = this.events.find(e => e.id === editingEventId);
            if (originalEvent) {
                eventData.createdAt = originalEvent.createdAt;
            }
            this.updateEvent(eventData);
        } else {
            // Creating new event
            eventData.id = Date.now().toString();
            eventData.createdAt = this.getLocalDateTimeString(new Date());
            this.saveEvent(eventData);
        }

        this.clearForm();
        window.RoommatePortal.utils.showNotification(editingEventId ? '✅ Event updated successfully!' : '✅ Event added successfully!');

        // Close modal if it exists
        const modal = document.querySelector('.input-modal');
        if (modal) {
            modal.style.display = 'none';
        }
    },

    // Save new event to Firestore
    async saveEvent(event) {
        try {
            const currentHousehold = window.RoommatePortal.state.getCurrentHousehold();
            if (!currentHousehold) return;

            const eventsCollection = firebase.firestore()
                .collection('households')
                .doc(currentHousehold.id)
                .collection('events');

            await eventsCollection.doc(event.id).set(event);

        } catch (error) {
            console.error('Error saving event:', error);
            window.RoommatePortal.utils.showNotification('❌ Error saving event. Please try again.');
        }
    },

    // Update existing event in Firestore
    async updateEvent(event) {
        try {
            const currentHousehold = window.RoommatePortal.state.getCurrentHousehold();
            if (!currentHousehold) return;

            const eventsCollection = firebase.firestore()
                .collection('households')
                .doc(currentHousehold.id)
                .collection('events');

            await eventsCollection.doc(event.id).update(event);

            // Don't add to local array - let the Firestore listener handle it

        } catch (error) {
            console.error('Error updating event:', error);
            window.RoommatePortal.utils.showNotification('❌ Error updating event. Please try again.');
        }
    },

    // Load events from Firestore
    loadEvents() {
        const currentHousehold = window.RoommatePortal.state.getCurrentHousehold();
        if (!currentHousehold) {
            console.log('Calendar: No household found, cannot load events');
            return;
        }

        const eventsCollection = firebase.firestore()
            .collection('households')
            .doc(currentHousehold.id)
            .collection('events');

        // Set up real-time listener
        const eventsListener = eventsCollection.orderBy('startDate', 'asc').onSnapshot((snapshot) => {
            this.events = [];
            snapshot.forEach((doc) => {
                const eventData = { ...doc.data(), id: doc.id };
                this.events.push(eventData);
            });
            this.renderCalendar();
            this.updateCalendarStats();
        }, (error) => {
            console.error('Calendar: Error loading events:', error);
            window.RoommatePortal.utils.showNotification('❌ Error loading calendar events. Please refresh the page.');
        });

        // Store listener for cleanup
        window.RoommatePortal.state.setEventsListener(eventsListener);
    },

    // Render calendar
    renderCalendar() {
        const calendarGrid = document.getElementById('calendarGrid');
        const currentMonthYear = document.getElementById('currentMonthYear');

        if (!calendarGrid || !currentMonthYear) return;

        // Update month/year display
        const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
            'July', 'August', 'September', 'October', 'November', 'December'];
        currentMonthYear.textContent = `${monthNames[this.currentDate.getMonth()]} ${this.currentDate.getFullYear()}`;

        // Clear calendar
        calendarGrid.innerHTML = '';

        // Get first day of month and number of days
        const firstDay = new Date(this.currentDate.getFullYear(), this.currentDate.getMonth(), 1);
        const lastDay = new Date(this.currentDate.getFullYear(), this.currentDate.getMonth() + 1, 0);
        const daysInMonth = lastDay.getDate();
        const startingDayOfWeek = firstDay.getDay();

        // Add day headers
        const dayHeaders = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        dayHeaders.forEach(day => {
            const dayHeader = document.createElement('div');
            dayHeader.className = 'calendar-day-header text-center font-semibold text-gray-600 py-2';
            dayHeader.textContent = day;
            calendarGrid.appendChild(dayHeader);
        });

        // Add empty cells for days before the first day of the month
        for (let i = 0; i < startingDayOfWeek; i++) {
            const emptyDay = document.createElement('div');
            emptyDay.className = 'calendar-day calendar-day-empty';
            calendarGrid.appendChild(emptyDay);
        }

        // Add days of the month
        for (let day = 1; day <= daysInMonth; day++) {
            const dayElement = document.createElement('div');
            dayElement.className = 'calendar-day cursor-pointer hover:bg-gray-100 transition-colors';

            const currentDate = new Date(this.currentDate.getFullYear(), this.currentDate.getMonth(), day);
            const isToday = this.isToday(currentDate);

            if (isToday) {
                dayElement.classList.add('calendar-day-today');
            }

            // Get events for this day
            const dayEvents = this.getEventsForDay(currentDate);

            dayElement.innerHTML = `
                <div class="calendar-day-number ${isToday ? 'font-bold text-blue-600' : 'text-gray-700'}">${day}</div>
                <div class="calendar-day-events">
                    ${dayEvents.map(event => `
                        <div class="calendar-event ${event.privacy === 'private' ? 'calendar-event-private' : 'calendar-event-shared'}" 
                             title="${event.title}${event.description ? ' - ' + event.description : ''}"
                             data-event-id="${event.id}">
                            ${event.privacy === 'private' ? '🔒' : '👥'} ${event.title}
                        </div>
                    `).join('')}
                </div>
            `;

            // Add click handler using event delegation
            dayElement.addEventListener('click', (e) => {
                // Prevent event bubbling issues
                e.stopPropagation();

                // Both day and event clicks show the day modal
                this.showDayEvents(currentDate, dayEvents);
            });

            calendarGrid.appendChild(dayElement);
        }
    },

    // Check if date is today
    isToday(date) {
        const today = new Date();
        return date.toDateString() === today.toDateString();
    },

    // Get events for a specific day
    getEventsForDay(date) {
        const currentUser = window.RoommatePortal.state.getCurrentUser();

        const filteredEvents = this.events.filter(event => {
            const eventStart = this.parseLocalDateTimeString(event.startDate);
            const eventEnd = this.parseLocalDateTimeString(event.endDate);

            // Check if event occurs on this day
            const eventOnDay = eventStart.toDateString() === date.toDateString() ||
                (eventStart <= date && eventEnd >= date);

            // Filter private events (only show to creator)
            if (event.privacy === 'private' && event.createdBy !== currentUser?.uid) {
                return false;
            }

            return eventOnDay;
        });

        return filteredEvents;
    },

    // Show day events in a modal
    showDayEvents(date, events) {

        const modal = document.getElementById('dayEventsModal');
        const modalDate = document.getElementById('modalDate');
        const modalEventsList = document.getElementById('modalEventsList');

        if (!modal || !modalDate || !modalEventsList) {
            console.error('Calendar: Modal elements not found', { modal: !!modal, modalDate: !!modalDate, modalEventsList: !!modalEventsList });
            return;
        }

        modalDate.textContent = date.toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });

        modalEventsList.innerHTML = '';

        if (events.length === 0) {
            modalEventsList.innerHTML = '<p class="text-gray-500 text-center py-4">No events scheduled for this day.</p>';
        } else {
            events.forEach(event => {
                const eventElement = document.createElement('div');
                eventElement.className = `event-item p-4 border rounded-lg mb-3 ${event.privacy === 'private' ? 'border-purple-200 bg-purple-50' : 'border-green-200 bg-green-50'
                    }`;

                const startTime = this.parseLocalDateTimeString(event.startDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                const endTime = this.parseLocalDateTimeString(event.endDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

                eventElement.innerHTML = `
                    <div class="flex justify-between items-start mb-2">
                        <h4 class="font-semibold text-lg">
                            ${event.privacy === 'private' ? '🔒' : '👥'} ${window.RoommatePortal.utils.escapeHtml(event.title)}
                        </h4>
                        <div class="flex space-x-2">
                            <button class="edit-event-btn text-blue-600 hover:text-blue-800" data-event-id="${event.id}">
                                <i class="fas fa-edit"></i>
                            </button>
                            <button class="delete-event-btn text-red-600 hover:text-red-800" data-event-id="${event.id}">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                    </div>
                    <p class="text-gray-600 mb-2">${startTime} - ${endTime}</p>
                    ${event.description ? `<p class="text-gray-700">${window.RoommatePortal.utils.escapeHtml(event.description)}</p>` : ''}
                    <p class="text-sm text-gray-500 mt-2">Created by: ${window.RoommatePortal.utils.escapeHtml(event.createdByName)}</p>
                `;

                modalEventsList.appendChild(eventElement);
            });
        }

        // Setup event handlers for edit/delete buttons
        modal.querySelectorAll('.edit-event-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const eventId = e.target.closest('.edit-event-btn').dataset.eventId;
                this.editEvent(eventId);
            });
        });

        modal.querySelectorAll('.delete-event-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const eventId = e.target.closest('.delete-event-btn').dataset.eventId;
                this.deleteEvent(eventId);
            });
        });

        modal.classList.remove('hidden');
    },

    // Edit event
    editEvent(eventId) {
        const event = this.events.find(e => e.id === eventId);
        if (!event) return;

        const currentUser = window.RoommatePortal.state.getCurrentUser();
        if (event.createdBy !== currentUser?.uid) {
            window.RoommatePortal.utils.showNotification('❌ You can only edit events you created.');
            return;
        }

        // Close day events modal
        const dayEventsModal = document.getElementById('dayEventsModal');
        if (dayEventsModal) {
            dayEventsModal.classList.add('hidden');
        }

        // Store event data for population after modal opens
        this.editingEventData = {
            id: eventId,
            title: event.title,
            description: event.description || '',
            privacy: event.privacy,
            startDate: this.parseLocalDateTimeString(event.startDate),
            endDate: this.parseLocalDateTimeString(event.endDate)
        };

        // Show form modal using main.js method
        if (window.RoommatePortal.app && window.RoommatePortal.app.openInputModal) {
            window.RoommatePortal.app.openInputModal('calendar');
            // Populate form after a delay to ensure modal is fully loaded
            setTimeout(() => {
                this.populateEditForm();
            }, 250);
        } else {
            // Fallback - try to find existing modal
            const modal = document.querySelector('.input-modal');
            if (modal) {
                modal.style.display = 'block';
                this.populateEditForm();
            }
        }
    },

    // Delete event
    async deleteEvent(eventId) {
        const event = this.events.find(e => e.id === eventId);
        if (!event) return;

        const currentUser = window.RoommatePortal.state.getCurrentUser();
        if (event.createdBy !== currentUser?.uid) {
            window.RoommatePortal.utils.showNotification('❌ You can only delete events you created.');
            return;
        }

        if (!confirm('Are you sure you want to delete this event?')) return;

        try {
            const currentHousehold = window.RoommatePortal.state.getCurrentHousehold();
            if (!currentHousehold) return;

            await firebase.firestore()
                .collection('households')
                .doc(currentHousehold.id)
                .collection('events')
                .doc(eventId)
                .delete();

            window.RoommatePortal.utils.showNotification('✅ Event deleted successfully!');

            // Close modal
            const dayEventsModal = document.getElementById('dayEventsModal');
            if (dayEventsModal) {
                dayEventsModal.classList.add('hidden');
            }

        } catch (error) {
            console.error('Error deleting event:', error);
            window.RoommatePortal.utils.showNotification('❌ Error deleting event. Please try again.');
        }
    },

    // Populate form with editing event data
    populateEditForm() {
        if (!this.editingEventData) return;

        // Find form elements (could be in cloned form within modal)
        const modal = document.querySelector('.input-modal');
        if (!modal) {
            // Try original form if no modal
            this.populateFormElements(document);
            return;
        }

        // Check if the modal content is ready
        const modalContent = modal.querySelector('form');
        if (!modalContent) {
            console.log('Calendar: Modal content not ready, retrying...');
            // Retry after a short delay
            setTimeout(() => {
                this.populateEditForm();
            }, 50);
            return;
        }

        // Populate form elements within the modal
        this.populateFormElements(modal);
    },

    // Helper method to populate form elements
    populateFormElements(container) {
        if (!this.editingEventData) return;

        // Try to find elements by ID first (for original form), then by data attributes, then by more robust selectors
        const titleField = container.querySelector('#eventTitle') ||
            container.querySelector('input[placeholder*="Event title"]') ||
            container.querySelector('input[type="text"]:first-of-type');

        const descriptionField = container.querySelector('#eventDescription') ||
            container.querySelector('textarea[placeholder*="Event description"]') ||
            container.querySelector('textarea');

        const privacyField = container.querySelector('#eventPrivacy') ||
            container.querySelector('select');

        const dateField = container.querySelector('#eventDate') ||
            container.querySelector('input[data-field="start-date"]') ||
            container.querySelector('input[type="date"]:first-of-type');

        // More robust selectors for time fields using data attributes, labels, and position
        const timeField = container.querySelector('#eventTime') ||
            container.querySelector('input[data-field="start-time"]') ||
            this.findTimeFieldByLabel(container, 'Start Time') ||
            container.querySelector('input[type="time"]:first-of-type');

        const endDateField = container.querySelector('#eventEndDate') ||
            container.querySelector('input[data-field="end-date"]') ||
            container.querySelector('input[type="date"]:last-of-type');

        const endTimeField = container.querySelector('#eventEndTime') ||
            container.querySelector('input[data-field="end-time"]') ||
            this.findTimeFieldByLabel(container, 'End Time') ||
            container.querySelector('input[type="time"]:last-of-type');

        const form = container.querySelector('#addEventForm') ||
            container.querySelector('form');

        if (titleField) {
            titleField.value = this.editingEventData.title;
        }
        if (descriptionField) {
            descriptionField.value = this.editingEventData.description;
        }
        if (privacyField) {
            privacyField.value = this.editingEventData.privacy;
        }

        if (dateField) {
            const dateValue = this.getLocalDateString(this.editingEventData.startDate);
            dateField.value = dateValue;
        }
        if (timeField) {
            const timeValue = this.getLocalTimeString(this.editingEventData.startDate);
            timeField.value = timeValue;
        }
        if (endDateField) {
            const endDateValue = this.getLocalDateString(this.editingEventData.endDate);
            endDateField.value = endDateValue;
        }
        if (endTimeField) {
            const endTimeValue = this.getLocalTimeString(this.editingEventData.endDate);
            endTimeField.value = endTimeValue;
        }

        // Store event ID for updating
        if (form) {
            form.dataset.editingEventId = this.editingEventData.id;
        }

        // Also set on original form
        const originalForm = document.getElementById('addEventForm');
        if (originalForm) {
            originalForm.dataset.editingEventId = this.editingEventData.id;
        }
    },

    // Helper method to find time field by associated label text
    findTimeFieldByLabel(container, labelText) {
        const labels = container.querySelectorAll('label');
        for (let label of labels) {
            if (label.textContent.includes(labelText)) {
                // Try to find the associated input field
                const inputId = label.getAttribute('for');
                if (inputId) {
                    const input = container.querySelector(`#${inputId}`);
                    if (input) return input;
                }

                // If no 'for' attribute, look for the next input sibling
                const nextInput = label.nextElementSibling;
                if (nextInput && nextInput.tagName === 'INPUT' && nextInput.type === 'time') {
                    return nextInput;
                }

                // Look for input within the same parent container
                const parent = label.parentElement;
                if (parent) {
                    const input = parent.querySelector('input[type="time"]');
                    if (input) return input;
                }
            }
        }
        return null;
    },

    // Clear form
    clearForm() {
        document.getElementById('eventTitle').value = '';
        document.getElementById('eventDescription').value = '';
        document.getElementById('eventDate').value = '';
        document.getElementById('eventTime').value = '';
        document.getElementById('eventEndDate').value = '';
        document.getElementById('eventEndTime').value = '';
        document.getElementById('eventPrivacy').value = 'shared';

        // Remove editing state
        const form = document.getElementById('addEventForm');
        if (form) {
            delete form.dataset.editingEventId;
        }

        // Clear editing event data
        this.editingEventData = null;
    },

    // Update calendar statistics
    updateCalendarStats() {
        const currentUser = window.RoommatePortal.state.getCurrentUser();
        const now = new Date();
        const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

        console.log('Calendar: Updating stats. Current time:', now.toLocaleString());

        // Count upcoming events (next 7 days including events happening today)
        const upcomingEvents = this.events.filter(event => {
            const eventStart = this.parseLocalDateTimeString(event.startDate);
            const eventEnd = this.parseLocalDateTimeString(event.endDate);

            // Include events that:
            // 1. Start in the future (within next 7 days)
            // 2. Are happening right now (started but not ended)
            // 3. Start later today but haven't started yet
            const startsInFuture = eventStart >= now && eventStart <= nextWeek;
            const isCurrentlyOngoing = eventStart <= now && eventEnd >= now;
            const eventInRange = startsInFuture || isCurrentlyOngoing;

            // Filter private events
            if (event.privacy === 'private' && event.createdBy !== currentUser?.uid) {
                return false;
            }

            if (eventInRange) {
                console.log('Calendar: Including event:', event.title,
                    'Start:', eventStart.toLocaleString(),
                    'End:', eventEnd.toLocaleString(),
                    'Future:', startsInFuture,
                    'Ongoing:', isCurrentlyOngoing);
            }

            return eventInRange;
        });

        console.log('Calendar: Found', upcomingEvents.length, 'upcoming/current events');

        // Update dashboard tile
        const upcomingEventsCount = document.getElementById('upcomingEventsCount');
        if (upcomingEventsCount) {
            upcomingEventsCount.textContent = upcomingEvents.length;
        }
    },

    // Setup automatic cleanup of old events
    setupCleanupSchedule() {
        // Clean up old events daily (24 hours)
        setInterval(() => {
            this.cleanupOldEvents();
        }, 24 * 60 * 60 * 1000);

        // Initial cleanup on login
        this.cleanupOldEvents();
    },

    // Clean up events older than 30 days past their end date
    async cleanupOldEvents() {
        const currentHousehold = window.RoommatePortal.state.getCurrentHousehold();
        if (!currentHousehold) return;

        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        const eventsToDelete = this.events.filter(event => {
            const eventEnd = this.parseLocalDateTimeString(event.endDate);
            return eventEnd < thirtyDaysAgo;
        });

        if (eventsToDelete.length === 0) return;

        console.log(`Cleaning up ${eventsToDelete.length} old events`);

        try {
            const batch = firebase.firestore().batch();
            const eventsCollection = firebase.firestore()
                .collection('households')
                .doc(currentHousehold.id)
                .collection('events');

            eventsToDelete.forEach(event => {
                batch.delete(eventsCollection.doc(event.id));
            });

            await batch.commit();
            console.log('Old events cleaned up successfully');

        } catch (error) {
            console.error('Error cleaning up old events:', error);
        }
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
    },
};

// Add calendar module to RoommatePortal namespace
window.RoommatePortal.calendar = calendarModule;
