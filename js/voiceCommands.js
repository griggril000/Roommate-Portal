// Roommate Portal - Voice Commands Module
// Handles speech-to-text functionality for mobile and desktop devices

window.RoommatePortal = window.RoommatePortal || {};

const voiceCommandsModule = {
    // Voice recognition instance
    recognition: null,

    // Current active input field
    activeInput: null,

    // Voice command state
    isListening: false,

    // Current context for section-specific voice input
    currentContext: null,

    // Supported browsers check
    isSupported: false,

    // Initialize voice commands
    init() {
        this.checkBrowserSupport();
        if (this.isSupported) {
            this.setupVoiceRecognition();
            this.createUnifiedVoiceButton();
            this.setupTabSwitchListener();
            this.setupVoiceHelpSection();
            this.showVoiceIntroduction();
            console.log('🎤 Unified voice commands initialized');
        } else {
            console.log('❌ Voice commands not supported in this browser');
        }
    },

    // Check for HTTPS requirement (Speech API requires secure context)
    checkSecureContext() {
        if (location.protocol !== 'https:' && location.hostname !== 'localhost' && location.hostname !== '127.0.0.1') {
            console.warn('🎤 Voice commands require HTTPS or localhost');
            return false;
        }
        return true;
    },

    // Enhanced browser support check
    checkBrowserSupport() {
        // Check secure context first
        if (!this.checkSecureContext()) {
            this.isSupported = false;
            return false;
        }

        // Check Speech Recognition API
        this.isSupported = !!(window.SpeechRecognition || window.webkitSpeechRecognition);

        if (this.isSupported) {
            console.log('🎤 Voice commands supported in this browser');
        } else {
            console.log('❌ Voice commands not supported in this browser');
        }

        return this.isSupported;
    },

    // Setup speech recognition
    setupVoiceRecognition() {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        this.recognition = new SpeechRecognition();

        // Configure recognition settings
        this.recognition.continuous = false;
        this.recognition.interimResults = false;
        this.recognition.maxAlternatives = 1;
        this.recognition.lang = 'en-US';

        // Handle successful recognition
        this.recognition.onresult = (event) => {
            const transcript = event.results[0][0].transcript;
            this.handleVoiceResult(transcript);
        };

        // Handle recognition errors
        this.recognition.onerror = (event) => {
            console.error('Voice recognition error:', event.error);
            this.handleVoiceError(event.error);
        };

        // Handle recognition end
        this.recognition.onend = () => {
            this.stopListening();
        };

        // Handle recognition start
        this.recognition.onstart = () => {
            console.log('🎤 Voice recognition started');
        };
    },

    // Create unified voice command button
    createUnifiedVoiceButton() {
        // Create floating voice command button that shows contextual help
        const voiceButton = document.createElement('button');
        voiceButton.id = 'unifiedVoiceButton';
        voiceButton.className = 'fixed bottom-4 right-4 w-16 h-16 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-full shadow-lg flex items-center justify-center z-50 hover:from-blue-700 hover:to-purple-700 transition-all duration-200 transform hover:scale-110';
        voiceButton.innerHTML = '<i class="fas fa-microphone text-xl"></i>';
        voiceButton.title = 'Voice Commands - Click to speak or get help';

        // Add click handler - shows help on first use, then directly activates voice
        voiceButton.addEventListener('click', () => {
            const hasSeenIntro = localStorage.getItem('voiceCommandsIntroSeen');
            if (hasSeenIntro) {
                // User has seen intro before - directly start voice command
                this.startUnifiedVoiceInput();
            } else {
                // First time user - show contextual help
                this.showContextualVoiceHelp();
            }
        });

        // Add to page
        document.body.appendChild(voiceButton);

        // Store reference
        this.voiceButton = voiceButton;

        // Show on all pages now that it's contextual help
        this.voiceButton.style.display = 'flex';

        console.log('🎤 Smart voice button created - shows help first time, then direct voice input');
    },

    // Update voice button visibility based on current tab (now always visible for contextual help)
    updateVoiceButtonVisibility(currentTab) {
        if (!this.voiceButton) return;

        // Voice button now always visible since it shows contextual help
        this.voiceButton.style.display = 'flex';
    },

    // Add voice buttons to modal forms (disabled - using unified voice FAB only)
    addVoiceButtonsToModals() {
        // Voice buttons disabled - users can use the unified voice FAB for help
        // and voice commands work through the "Try Voice Command" button
        console.log('🎤 Individual voice buttons disabled - using unified voice FAB');
    },

    // Add voice buttons to inputs within a modal (disabled)
    addVoiceButtonsToModalInputs(modal) {
        // Individual voice buttons disabled - using unified voice FAB only
        console.log('🎤 Individual voice input buttons disabled');
        return;
    },

    // Add voice button to specific input field (disabled)
    addVoiceButtonToInput(inputId, tooltip) {
        // Individual voice buttons disabled - using unified voice FAB only
        console.log(`🎤 Voice button creation disabled for ${inputId} - using unified voice FAB`);
        return;
    },

    // Toggle voice input for specific field
    toggleVoiceInput(input, button) {
        if (this.isListening && this.activeInput === input) {
            this.stopListening();
        } else {
            // Use mobile-specific start for mobile devices
            if (window.innerWidth <= 768) {
                this.startListeningMobile(input, button);
            } else {
                this.startListening(input, button);
            }
        }
    },

    // Start listening for voice input
    startListening(input, button) {
        if (!this.isSupported) {
            window.RoommatePortal.utils.showNotification('❌ Voice input not supported in this browser');
            return;
        }

        // Stop any existing recognition
        if (this.isListening) {
            this.stopListening();
        }

        this.activeInput = input;
        this.isListening = true;

        // Update button appearance
        button.style.background = '#ef4444';
        button.innerHTML = '<i class="fas fa-stop"></i>';
        button.style.animation = 'pulse 1.5s infinite';

        // Add pulse animation if not exists
        if (!document.getElementById('voice-pulse-animation')) {
            const style = document.createElement('style');
            style.id = 'voice-pulse-animation';
            style.textContent = `
                @keyframes pulse {
                    0% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.7); }
                    70% { box-shadow: 0 0 0 10px rgba(239, 68, 68, 0); }
                    100% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0); }
                }
            `;
            document.head.appendChild(style);
        }

        // Show listening feedback
        if (window.innerWidth <= 768) {
            this.showVoiceStatus('🎤 Listening... Speak now!', 'info');
        } else {
            window.RoommatePortal.utils.showNotification('🎤 Listening... Speak now!');
        }

        // Start recognition
        try {
            this.recognition.start();
        } catch (error) {
            console.error('Failed to start voice recognition:', error);
            this.handleVoiceError('start-failed');
        }
    },

    // Mobile-specific permission request
    async requestMobilePermission() {
        if (!this.isSupported) {
            this.showVoiceStatus('❌ Voice input not supported', 'error');
            return false;
        }

        try {
            // Check if permission is already granted
            if (navigator.permissions) {
                const permission = await navigator.permissions.query({ name: 'microphone' });
                if (permission.state === 'granted') {
                    return true;
                }
                if (permission.state === 'denied') {
                    this.showVoiceStatus('❌ Microphone access denied', 'error');
                    return false;
                }
            }

            // Request permission through getUserMedia
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            stream.getTracks().forEach(track => track.stop()); // Stop the stream immediately

            this.showVoiceStatus('✅ Microphone access granted', 'success');
            return true;
        } catch (error) {
            console.error('Microphone permission error:', error);
            this.showVoiceStatus('❌ Please allow microphone access', 'error');
            return false;
        }
    },

    // Enhanced start listening with mobile permission check
    async startListeningMobile(input, button) {
        // Check microphone permission first
        const hasPermission = await this.requestMobilePermission();
        if (!hasPermission) {
            return;
        }

        // Continue with regular start listening
        this.startListening(input, button);
    },

    // Stop listening
    stopListening() {
        if (!this.isListening) return;

        this.isListening = false;

        // Stop recognition
        if (this.recognition) {
            try {
                this.recognition.stop();
            } catch (error) {
                console.error('Error stopping recognition:', error);
            }
        }

        // Reset unified voice button
        if (this.voiceButton) {
            this.voiceButton.style.background = 'linear-gradient(to right, #2563eb, #7c3aed)';
            this.voiceButton.innerHTML = '<i class="fas fa-microphone text-xl"></i>';
            this.voiceButton.style.animation = '';
        }
    },

    // Reset all voice buttons to default state
    resetVoiceButtons() {
        const voiceButtons = document.querySelectorAll('.voice-button');
        voiceButtons.forEach(button => {
            button.style.background = '#3b82f6';
            button.innerHTML = '<i class="fas fa-microphone"></i>';
            button.style.animation = '';
            button.style.transform = 'translateY(-50%) scale(1)';
        });
    },

    // Handle voice recognition result
    handleVoiceResult(transcript) {
        console.log('Voice transcript:', transcript);

        // Parse and execute the voice command
        const success = this.parseVoiceCommand(transcript);

        if (!success) {
            this.showVoiceStatus('❌ Command not recognized. Try "announce football next week" or "add chore clean bathroom"', 'error');
        }

        // Vibrate on mobile if supported
        if (navigator.vibrate) {
            navigator.vibrate(100);
        }
    },

    // Desktop voice result handling
    handleVoiceResultDesktop(transcript) {
        if (!this.activeInput || !transcript) return;

        console.log('Voice transcript:', transcript);

        // Process the transcript based on input type
        const processedText = this.processVoiceCommand(transcript, this.activeInput.id);

        // Set the input value
        this.activeInput.value = processedText;

        // Trigger input event to update any listeners
        this.activeInput.dispatchEvent(new Event('input', { bubbles: true }));

        // Focus the input
        this.activeInput.focus();

        // Show success feedback
        window.RoommatePortal.utils.showNotification(`✅ Voice input: "${processedText}"`);

        // Auto-submit for certain forms if enabled
        this.handleAutoSubmit(this.activeInput);
    },

    // Show mobile-friendly voice status
    showVoiceStatus(message, type = 'info') {
        // Remove any existing status
        const existingStatus = document.getElementById('voiceStatus');
        if (existingStatus) {
            existingStatus.remove();
        }

        const status = document.createElement('div');
        status.id = 'voiceStatus';
        status.className = 'voice-status show';

        const colors = {
            info: 'background: rgba(59, 130, 246, 0.9);',
            success: 'background: rgba(34, 197, 94, 0.9);',
            error: 'background: rgba(239, 68, 68, 0.9);',
            warning: 'background: rgba(245, 158, 11, 0.9);'
        };

        status.style.cssText = `
            position: fixed;
            top: 20px;
            left: 50%;
            transform: translateX(-50%);
            ${colors[type] || colors.info}
            color: white;
            padding: 8px 16px;
            border-radius: 20px;
            font-size: 14px;
            z-index: 1000;
            display: block;
            animation: slideDown 0.3s ease;
            max-width: 80%;
            text-align: center;
        `;

        status.textContent = message;
        document.body.appendChild(status);

        // Auto-remove after 3 seconds
        setTimeout(() => {
            if (status && status.parentNode) {
                status.style.animation = 'slideUp 0.3s ease';
                setTimeout(() => status.remove(), 300);
            }
        }, 3000);
    },

    // Enhanced mobile voice result handling
    handleVoiceResultMobile(transcript) {
        if (!this.activeInput || !transcript) return;

        console.log('Voice transcript:', transcript);

        // Process the transcript
        const processedText = this.processVoiceCommand(transcript, this.activeInput.id);

        // Set the input value
        this.activeInput.value = processedText;

        // Trigger input event
        this.activeInput.dispatchEvent(new Event('input', { bubbles: true }));

        // Focus the input
        this.activeInput.focus();

        // Show mobile-friendly success feedback
        this.showVoiceStatus(`✅ "${processedText}"`, 'success');

        // Vibrate on mobile if supported
        if (navigator.vibrate) {
            navigator.vibrate(100);
        }
    },

    // Process voice command based on context
    processVoiceCommand(transcript, inputId) {
        let processed = transcript.trim();

        // Capitalize first letter
        processed = processed.charAt(0).toUpperCase() + processed.slice(1);

        // Remove trailing period if present
        processed = processed.replace(/\.$/, '');

        // Context-specific processing
        switch (inputId) {
            case 'choreInput':
                // Add common chore prefixes if missing
                if (!processed.toLowerCase().includes('clean') &&
                    !processed.toLowerCase().includes('wash') &&
                    !processed.toLowerCase().includes('take') &&
                    !processed.toLowerCase().includes('vacuum') &&
                    !processed.toLowerCase().includes('organize')) {
                    // For simple nouns, add appropriate verbs
                    if (processed.toLowerCase().includes('dishes')) {
                        processed = 'Wash ' + processed.toLowerCase();
                    } else if (processed.toLowerCase().includes('trash') || processed.toLowerCase().includes('garbage')) {
                        processed = 'Take out ' + processed.toLowerCase();
                    } else if (processed.toLowerCase().includes('floor') || processed.toLowerCase().includes('carpet')) {
                        processed = 'Vacuum ' + processed.toLowerCase();
                    }
                }
                break;

            case 'choreAssignee':
                // Capitalize names properly
                processed = processed.split(' ').map(word =>
                    word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
                ).join(' ');
                break;

            case 'announcementTitleInput':
                // Keep titles concise
                if (processed.length > 50) {
                    processed = processed.substring(0, 47) + '...';
                }
                break;
        }

        return processed;
    },

    // Handle auto-submit for certain forms
    handleAutoSubmit(input) {
        // Don't auto-submit, let user review and manually submit
        // This is safer for voice input which might have errors
        console.log('Voice input completed for:', input.id);
    },

    // Handle voice recognition errors
    handleVoiceError(error) {
        this.stopListening();

        let message = 'Voice recognition failed. ';
        switch (error) {
            case 'no-speech':
                message += 'No speech detected. Please try again.';
                break;
            case 'audio-capture':
                message += 'Microphone not accessible.';
                break;
            case 'not-allowed':
                message += 'Microphone permission denied.';
                break;
            case 'network':
                message += 'Network error occurred.';
                break;
            case 'start-failed':
                message += 'Could not start voice recognition.';
                break;
            default:
                message += 'Please try again.';
        }

        // Show mobile-friendly error or desktop notification
        if (window.innerWidth <= 768) {
            this.showVoiceStatus(`❌ ${message}`, 'error');
        } else {
            window.RoommatePortal.utils.showNotification(`❌ ${message}`);
        }
    },

    // Show voice commands help
    showVoiceHelp() {
        const helpModal = document.createElement('div');
        helpModal.className = 'fixed inset-0 bg-gray-800 bg-opacity-50 flex items-center justify-center z-50 p-4';
        helpModal.innerHTML = `
            <div class="bg-white rounded-lg shadow-lg p-6 max-w-md w-full max-h-[80vh] overflow-y-auto">
                <div class="flex justify-between items-center mb-4">
                    <h2 class="text-xl font-bold text-gray-800">🎤 Voice Commands</h2>
                    <button class="text-gray-500 hover:text-gray-700" onclick="this.closest('.fixed').remove()">
                        <i class="fas fa-times text-xl"></i>
                    </button>
                </div>
                
                <div class="space-y-4">
                    <div class="bg-gradient-to-r from-blue-50 to-purple-50 p-3 rounded-lg border border-blue-200">
                        <p class="text-sm text-gray-700 text-center font-medium">
                            🎯 <strong>One Button, Natural Commands!</strong><br>
                            Just click the voice button and speak naturally
                        </p>
                    </div>

                    <div>
                        <h3 class="font-semibold text-orange-600 mb-2">� Announcements</h3>
                        <ul class="text-sm text-gray-700 space-y-1">
                            <li>• "Announce football next week"</li>
                            <li>• "Announcement rent due Friday"</li>
                            <li>• "Post announcement house meeting Sunday"</li>
                        </ul>
                    </div>
                    
                    <div>
                        <h3 class="font-semibold text-blue-600 mb-2">� Chores</h3>
                        <ul class="text-sm text-gray-700 space-y-1">
                            <li>• "Add chore clean the bathroom"</li>
                            <li>• "Chore vacuum living room"</li>
                            <li>• "Assign wash dishes to John"</li>
                            <li>• "Create chore take out trash"</li>
                        </ul>
                    </div>
                    
                    <div>
                        <h3 class="font-semibold text-green-600 mb-2">� Messages</h3>
                        <ul class="text-sm text-gray-700 space-y-1">
                            <li>• "Message pizza party tonight"</li>
                            <li>• "Tell everyone movie at 8pm"</li>
                            <li>• "Post message please clean kitchen"</li>
                        </ul>
                    </div>
                    
                    <div class="bg-blue-50 p-3 rounded-lg">
                        <h4 class="font-semibold text-blue-800 mb-1">💡 Smart Recognition</h4>
                        <ul class="text-xs text-blue-700 space-y-1">
                            <li>• The system recognizes context automatically</li>
                            <li>• Words like "rent", "meeting" → Announcements</li>
                            <li>• Words like "clean", "wash" → Chores</li>
                            <li>• Words like "pizza", "tonight" → Messages</li>
                        </ul>
                    </div>
                </div>
                
                <div class="mt-6 flex justify-center">
                    <button 
                        class="px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 transition-colors"
                        onclick="this.closest('.fixed').remove()"
                    >
                        Got it!
                    </button>
                </div>
            </div>
        `;

        document.body.appendChild(helpModal);
    },

    // Show contextual voice commands help based on current page
    showContextualVoiceHelp() {
        // Determine current context based on active tab
        const currentContext = this.getCurrentPageContext();
        console.log(`🎤 Showing contextual help for: ${currentContext}`);

        const helpModal = document.createElement('div');
        helpModal.className = 'fixed inset-0 bg-gray-800 bg-opacity-50 flex items-center justify-center z-50 p-4';

        const contextContent = this.getContextualHelpContent(currentContext);
        console.log(`🎤 Context content title: ${contextContent.title}`);

        helpModal.innerHTML = `
            <div class="bg-white rounded-lg shadow-lg p-6 max-w-md w-full max-h-[80vh] overflow-y-auto">
                <div class="flex justify-between items-center mb-4">
                    <h2 class="text-xl font-bold text-gray-800">🎤 Voice Commands - ${contextContent.title}</h2>
                    <button class="text-gray-500 hover:text-gray-700" onclick="this.closest('.fixed').remove()">
                        <i class="fas fa-times text-xl"></i>
                    </button>
                </div>
                
                <div class="space-y-4">
                    ${contextContent.content}
                    
                    <div class="bg-blue-50 p-3 rounded-lg">
                        <h4 class="font-semibold text-blue-800 mb-1">🎯 How to Use</h4>
                        <p class="text-xs text-blue-700 mb-2">Use voice commands in two ways:</p>
                        <ul class="text-xs text-blue-700 space-y-1">
                            <li>• Click "Try Voice Command" below to speak directly</li>
                            <li>• Say natural commands like the examples above</li>
                            <li>• Voice will automatically create the right content type</li>
                        </ul>
                    </div>
                    
                    <div class="mt-4 text-center">
                        <button 
                            id="tryVoiceCommand"
                            class="px-4 py-2 bg-gradient-to-r from-green-600 to-green-700 text-white rounded-lg hover:from-green-700 hover:to-green-800 transition-colors mr-2"
                        >
                            Try Voice Command
                        </button>
                        <button 
                            class="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                            onclick="this.closest('.fixed').remove()"
                        >
                            Close
                        </button>
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(helpModal);

        // Add event listener for the "Try Voice Command" button
        const tryVoiceBtn = helpModal.querySelector('#tryVoiceCommand');
        if (tryVoiceBtn) {
            tryVoiceBtn.addEventListener('click', () => {
                helpModal.remove();
                this.startUnifiedVoiceInput();
            });
        }
    },

    // Get current page context
    getCurrentPageContext() {
        // Check which section is currently visible (using correct section IDs)
        const sections = [
            { id: 'dashboardSection', name: 'dashboard' },
            { id: 'choreSection', name: 'chores' },
            { id: 'messageSection', name: 'messages' },
            { id: 'announcementsSection', name: 'announcements' },
            { id: 'calendarSection', name: 'calendar' }
        ];

        for (const section of sections) {
            const sectionElement = document.getElementById(section.id);
            if (sectionElement && !sectionElement.classList.contains('hidden')) {
                console.log(`🎤 Current page context detected: ${section.name} (element: ${section.id})`);
                return section.name;
            }
        }

        console.log('🎤 No specific context found, defaulting to dashboard');
        return 'dashboard'; // Default fallback
    },

    // Get contextual help content based on current page
    getContextualHelpContent(context) {
        const contentMap = {
            dashboard: {
                title: 'Dashboard',
                content: `
                    <div class="bg-gradient-to-r from-blue-50 to-purple-50 p-3 rounded-lg border border-blue-200">
                        <p class="text-sm text-gray-700 text-center font-medium">
                            🎯 <strong>Quick Commands from Dashboard</strong><br>
                            Speak naturally to create anything instantly
                        </p>
                    </div>

                    <div>
                        <h3 class="font-semibold text-orange-600 mb-2">📢 Announcements</h3>
                        <ul class="text-sm text-gray-700 space-y-1">
                            <li>• "Announce football next week"</li>
                            <li>• "Announcement rent due Friday"</li>
                            <li>• "Post announcement house meeting Sunday"</li>
                        </ul>
                    </div>
                    
                    <div>
                        <h3 class="font-semibold text-blue-600 mb-2">🧹 Chores</h3>
                        <ul class="text-sm text-gray-700 space-y-1">
                            <li>• "Add chore clean the bathroom"</li>
                            <li>• "Chore vacuum living room"</li>
                            <li>• "Create chore take out trash"</li>
                        </ul>
                    </div>
                    
                    <div>
                        <h3 class="font-semibold text-green-600 mb-2">💬 Messages</h3>
                        <ul class="text-sm text-gray-700 space-y-1">
                            <li>• "Message pizza party tonight"</li>
                            <li>• "Tell everyone movie at 8pm"</li>
                            <li>• "Post message please clean kitchen"</li>
                        </ul>
                    </div>
                `
            },
            chores: {
                title: 'Chores',
                content: `
                    <div class="bg-gradient-to-r from-blue-50 to-blue-100 p-3 rounded-lg border border-blue-200">
                        <p class="text-sm text-gray-700 text-center font-medium">
                            🧹 <strong>Chore Voice Commands</strong><br>
                            Create chores quickly with voice
                        </p>
                    </div>

                    <div>
                        <h3 class="font-semibold text-blue-600 mb-2">🎯 Chore Examples</h3>
                        <ul class="text-sm text-gray-700 space-y-1">
                            <li>• "Add chore clean the bathroom"</li>
                            <li>• "Chore vacuum living room"</li>
                            <li>• "Create chore wash dishes"</li>
                            <li>• "Assign take out trash to John"</li>
                            <li>• "Chore organize kitchen cabinets"</li>
                        </ul>
                    </div>
                    
                    <div class="bg-yellow-50 p-3 rounded-lg">
                        <h4 class="font-semibold text-yellow-800 mb-1">💡 Smart Tips</h4>
                        <ul class="text-xs text-yellow-700 space-y-1">
                            <li>• System adds action words automatically (clean, wash, take out)</li>
                            <li>• Include assignee name for automatic assignment</li>
                            <li>• Say room names for location context</li>
                        </ul>
                    </div>
                `
            },
            messages: {
                title: 'Messages',
                content: `
                    <div class="bg-gradient-to-r from-green-50 to-green-100 p-3 rounded-lg border border-green-200">
                        <p class="text-sm text-gray-700 text-center font-medium">
                            💬 <strong>Message Voice Commands</strong><br>
                            Post messages instantly by voice
                        </p>
                    </div>

                    <div>
                        <h3 class="font-semibold text-green-600 mb-2">🎯 Message Examples</h3>
                        <ul class="text-sm text-gray-700 space-y-1">
                            <li>• "Message pizza party tonight"</li>
                            <li>• "Tell everyone movie at 8pm"</li>
                            <li>• "Post message please clean kitchen"</li>
                            <li>• "Message parking lot will be paved tomorrow"</li>
                            <li>• "Tell roommates WiFi password changed"</li>
                        </ul>
                    </div>
                    
                    <div class="bg-green-50 p-3 rounded-lg">
                        <h4 class="font-semibold text-green-800 mb-1">💡 Quick Tips</h4>
                        <ul class="text-xs text-green-700 space-y-1">
                            <li>• Start with "message" or "tell everyone"</li>
                            <li>• Casual language works perfectly</li>
                            <li>• Messages are encrypted automatically</li>
                        </ul>
                    </div>
                `
            },
            announcements: {
                title: 'Announcements',
                content: `
                    <div class="bg-gradient-to-r from-orange-50 to-orange-100 p-3 rounded-lg border border-orange-200">
                        <p class="text-sm text-gray-700 text-center font-medium">
                            📢 <strong>Announcement Voice Commands</strong><br>
                            Create important announcements by voice
                        </p>
                    </div>

                    <div>
                        <h3 class="font-semibold text-orange-600 mb-2">🎯 Announcement Examples</h3>
                        <ul class="text-sm text-gray-700 space-y-1">
                            <li>• "Announce football next week"</li>
                            <li>• "Announcement rent due Friday"</li>
                            <li>• "Post announcement house meeting Sunday"</li>
                            <li>• "Announce maintenance visit Thursday morning"</li>
                            <li>• "Announcement fire drill practice tomorrow"</li>
                        </ul>
                    </div>
                    
                    <div class="bg-orange-50 p-3 rounded-lg">
                        <h4 class="font-semibold text-orange-800 mb-1">💡 Best Practices</h4>
                        <ul class="text-xs text-orange-700 space-y-1">
                            <li>• Start with "announce" or "announcement"</li>
                            <li>• Include dates/times for clarity</li>
                            <li>• Keep important info brief and clear</li>
                        </ul>
                    </div>
                `
            },
            calendar: {
                title: 'Calendar',
                content: `
                    <div class="bg-gradient-to-r from-indigo-50 to-indigo-100 p-3 rounded-lg border border-indigo-200">
                        <p class="text-sm text-gray-700 text-center font-medium">
                            📅 <strong>Calendar Voice Commands</strong><br>
                            Add events quickly by voice
                        </p>
                    </div>

                    <div>
                        <h3 class="font-semibold text-indigo-600 mb-2">🎯 Event Examples</h3>
                        <ul class="text-sm text-gray-700 space-y-1">
                            <li>• "Add event party Saturday"</li>
                            <li>• "Event house meeting Sunday 7pm"</li>
                            <li>• "Create event movie night Friday"</li>
                            <li>• "Add event cleaning day next Saturday"</li>
                            <li>• "Event game night Thursday evening"</li>
                        </ul>
                    </div>
                    
                    <div class="bg-indigo-50 p-3 rounded-lg">
                        <h4 class="font-semibold text-indigo-800 mb-1">💡 Event Tips</h4>
                        <ul class="text-xs text-indigo-700 space-y-1">
                            <li>• Include day/time for automatic scheduling</li>
                            <li>• Use "next [day]" for future weeks</li>
                            <li>• Events auto-cleanup after 90 days</li>
                        </ul>
                    </div>
                `
            }
        };

        return contentMap[context] || contentMap.dashboard;
    },

    // Retry adding voice buttons to forms (disabled - using unified voice FAB only)
    retryAddingVoiceButtons() {
        // Individual voice buttons disabled - using unified voice FAB only
        console.log('🎤 Individual voice button retry disabled - using unified voice FAB');
        return;
    },

    // Listen for tab switches to add voice buttons to newly visible forms
    setupTabSwitchListener() {
        window.addEventListener('roommatePortal:tabSwitch', (event) => {
            // Update voice button visibility based on current tab
            this.updateVoiceButtonVisibility(event.detail.tab);

            // Add a small delay to ensure the tab content is fully rendered
            setTimeout(() => {
                this.retryAddingVoiceButtons();
            }, 200);
        });
    },

    // Cleanup when page unloads
    cleanup() {
        if (this.recognition) {
            this.recognition.stop();
        }
        this.isListening = false;
        this.activeInput = null;
    },

    // Show voice commands introduction on first load
    showVoiceIntroduction() {
        // Check if user has seen the introduction before
        const hasSeenIntro = localStorage.getItem('voiceCommandsIntroSeen');
        if (hasSeenIntro) return;

        // Show a brief notification about voice commands on first use only
        setTimeout(() => {
            if (window.innerWidth <= 768) {
                this.showVoiceStatus('🎤 New! Voice commands available - click the microphone button for help', 'info');
            } else {
                window.RoommatePortal.utils?.showNotification('🎤 Voice commands are now available! Click the microphone button for help, or say "help" for assistance');
            }

            // Mark as seen
            localStorage.setItem('voiceCommandsIntroSeen', 'true');
        }, 2000);
    },

    // Start unified voice input
    startUnifiedVoiceInput() {
        if (!this.isSupported) {
            this.showVoiceStatus('❌ Voice input not supported', 'error');
            return;
        }

        // Update button appearance
        this.voiceButton.style.background = 'linear-gradient(to right, #ef4444, #dc2626)';
        this.voiceButton.innerHTML = '<i class="fas fa-stop text-xl"></i>';
        this.voiceButton.style.animation = 'pulse 1.5s infinite';

        // Show listening status
        if (window.innerWidth <= 768) {
            this.showVoiceStatus('🎤 Say your command... e.g., "announce football next week"', 'info');
        } else {
            window.RoommatePortal.utils?.showNotification('🎤 Listening for voice command... Try "announce football next week" or "add chore clean bathroom"');
        }

        // Start recognition
        this.isListening = true;
        try {
            this.recognition.start();
        } catch (error) {
            console.error('Failed to start voice recognition:', error);
            this.handleVoiceError('start-failed');
        }
    },

    // Parse and execute voice commands
    parseVoiceCommand(transcript) {
        const command = transcript.toLowerCase().trim();
        console.log('Parsing voice command:', command);

        // Check if we have a specific context from section button
        if (this.currentContext) {
            const success = this.executeContextualCommand(this.currentContext, transcript);
            this.currentContext = null; // Clear context after use
            return success;
        }

        // Command patterns for unified voice input
        const patterns = [
            // Help command - shows contextual help
            {
                pattern: /^(help|voice help|show help|commands)$/,
                action: 'help',
                extract: (match) => ({})
            },

            // Announcements
            {
                pattern: /^(announce|announcement)\s+(.+)$/,
                action: 'announcement',
                extract: (match) => ({ text: match[2] })
            },
            {
                pattern: /^(post announcement|make announcement)\s+(.+)$/,
                action: 'announcement',
                extract: (match) => ({ text: match[2] })
            },

            // Chores
            {
                pattern: /^(add chore|chore|create chore)\s+(.+)$/,
                action: 'chore',
                extract: (match) => ({ text: match[2] })
            },
            {
                pattern: /^(assign|assign chore)\s+(.+?)\s+(to|for)\s+(.+)$/,
                action: 'chore',
                extract: (match) => ({ text: match[2], assignee: match[4] })
            },

            // Messages
            {
                pattern: /^(message|post message|send message)\s+(.+)$/,
                action: 'message',
                extract: (match) => ({ text: match[2] })
            },
            {
                pattern: /^(tell everyone|tell roommates)\s+(.+)$/,
                action: 'message',
                extract: (match) => ({ text: match[2] })
            },

            // Calendar events
            {
                pattern: /^(add event|create event|event)\s+(.+)$/,
                action: 'event',
                extract: (match) => ({ text: match[2] })
            }
        ];

        // Try to match command
        for (const { pattern, action, extract } of patterns) {
            const match = command.match(pattern);
            if (match) {
                const data = extract(match);
                this.executeCommand(action, data);
                return true;
            }
        }

        // If no pattern matches, try to infer from context
        return this.inferCommandFromContext(command);
    },

    // Execute contextual command from section buttons
    executeContextualCommand(context, transcript) {
        const cleanText = transcript.trim();

        // Remove common voice command prefixes if they exist
        const cleanedText = cleanText
            .replace(/^(add |create |post |make |announce |message |tell everyone )/i, '')
            .replace(/^(chore |announcement |event )/i, '');

        const finalText = cleanedText.charAt(0).toUpperCase() + cleanedText.slice(1);

        // Execute based on context
        switch (context) {
            case 'chore':
                this.createChore(finalText);
                return true;
            case 'message':
                this.createMessage(finalText);
                return true;
            case 'announcement':
                this.createAnnouncement(finalText);
                return true;
            case 'event':
                this.createEvent(finalText);
                return true;
            default:
                return false;
        }
    },

    // Infer command type from context
    inferCommandFromContext(command) {
        // Keywords that suggest different actions
        const announcementKeywords = ['meeting', 'rent', 'party', 'maintenance', 'inspection', 'visitor', 'rule', 'notice'];
        const choreKeywords = ['clean', 'wash', 'vacuum', 'take out', 'organize', 'sweep', 'mop', 'dishes', 'trash', 'garbage', 'bathroom', 'kitchen'];
        const messageKeywords = ['tonight', 'tomorrow', 'pizza', 'food', 'grocery', 'shopping', 'movie', 'game'];

        const hasAnnouncementKeywords = announcementKeywords.some(keyword => command.includes(keyword));
        const hasChoreKeywords = choreKeywords.some(keyword => command.includes(keyword));
        const hasMessageKeywords = messageKeywords.some(keyword => command.includes(keyword));

        if (hasAnnouncementKeywords) {
            this.executeCommand('announcement', { text: command });
            return true;
        } else if (hasChoreKeywords) {
            this.executeCommand('chore', { text: command });
            return true;
        } else if (hasMessageKeywords) {
            this.executeCommand('message', { text: command });
            return true;
        }

        // Default to message if can't determine
        this.executeCommand('message', { text: command });
        return true;
    },

    // Execute the parsed command
    executeCommand(action, data) {
        // Handle help command first (doesn't require user/household)
        if (action === 'help') {
            this.showVoiceStatus('📋 Opening help...', 'info');
            setTimeout(() => {
                this.showContextualVoiceHelp();
            }, 500);
            return;
        }

        const currentUser = window.RoommatePortal.state?.getCurrentUser();
        const currentHousehold = window.RoommatePortal.state?.getCurrentHousehold();

        if (!currentUser || !currentHousehold) {
            this.showVoiceStatus('❌ Please sign in and join a household first', 'error');
            return;
        }

        // Capitalize and clean the text for content creation commands
        const cleanText = data.text ? data.text.charAt(0).toUpperCase() + data.text.slice(1) : '';

        switch (action) {
            case 'announcement':
                this.createAnnouncement(cleanText);
                break;
            case 'chore':
                this.createChore(cleanText, data.assignee);
                break;
            case 'message':
                this.createMessage(cleanText);
                break;
            case 'event':
                this.createEvent(cleanText);
                break;
            default:
                this.showVoiceStatus('❌ Command not recognized', 'error');
        }
    },

    // Create announcement from voice
    async createAnnouncement(text) {
        try {
            const currentUser = window.RoommatePortal.state.getCurrentUser();
            const currentHousehold = window.RoommatePortal.state.getCurrentHousehold();

            // Encrypt the announcement content
            const encryptedData = await window.RoommatePortal.encryption.encryptSensitiveData({
                title: '',
                body: text
            }, ['body']);

            const announcement = {
                title: '',
                body: encryptedData.body,
                author: currentUser.displayName || currentUser.email,
                authorId: currentUser.uid,
                createdAt: new Date().toISOString(),
                expiresAt: null
            };

            // Only add encrypted flag if the field was actually encrypted
            if (encryptedData.body_encrypted) {
                announcement.body_encrypted = encryptedData.body_encrypted;
            }

            // Add to Firestore
            await window.RoommatePortal.config.db
                .collection('households')
                .doc(currentHousehold.id)
                .collection('announcements')
                .add(announcement);

            this.showVoiceStatus(`✅ Announcement created: "${text}"`, 'success');

            // Switch to announcements tab to show the result
            window.RoommatePortal.utils?.switchTab('announcements');

        } catch (error) {
            console.error('Error creating announcement:', error);
            this.showVoiceStatus('❌ Failed to create announcement', 'error');
        }
    },

    // Create chore from voice
    async createChore(text, assignee = null) {
        try {
            const currentUser = window.RoommatePortal.state.getCurrentUser();
            const currentHousehold = window.RoommatePortal.state.getCurrentHousehold();

            // Encrypt the chore text
            const encryptedData = await window.RoommatePortal.encryption.encryptSensitiveData({
                text: text
            }, ['text']);

            const chore = {
                text: encryptedData.text,
                assignee: assignee ? this.formatAssigneeName(assignee) : 'Unassigned',
                completed: false,
                dateAdded: new Date().toLocaleDateString(),
                priority: 'medium',
                createdBy: currentUser.uid,
                createdByName: currentUser.displayName,
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                points: 0
            };

            // Only add encrypted flag if the field was actually encrypted
            if (encryptedData.text_encrypted) {
                chore.text_encrypted = encryptedData.text_encrypted;
            }

            // Add to Firestore
            await window.RoommatePortal.config.db
                .collection('households')
                .doc(currentHousehold.id)
                .collection('chores')
                .add(chore);

            const message = assignee ?
                `✅ Chore created: "${text}" assigned to ${this.formatAssigneeName(assignee)}` :
                `✅ Chore created: "${text}"`;

            this.showVoiceStatus(message, 'success');

            // Switch to chores tab to show the result
            window.RoommatePortal.utils?.switchTab('chores');

        } catch (error) {
            console.error('Error creating chore:', error);
            this.showVoiceStatus('❌ Failed to create chore', 'error');
        }
    },

    // Create message from voice
    async createMessage(text) {
        try {
            const currentUser = window.RoommatePortal.state.getCurrentUser();
            const currentHousehold = window.RoommatePortal.state.getCurrentHousehold();

            // Encrypt the message content
            const encryptedData = await window.RoommatePortal.encryption.encryptSensitiveData({
                message: text
            }, ['message']);

            const message = {
                message: encryptedData.message,
                author: currentUser.displayName || currentUser.email,
                authorId: currentUser.uid,
                timestamp: new Date().toISOString(),
                readBy: [currentUser.uid] // Mark as read by author
            };

            // Only add encrypted flag if the field was actually encrypted
            if (encryptedData.message_encrypted) {
                message.message_encrypted = encryptedData.message_encrypted;
            }

            // Add to Firestore
            await window.RoommatePortal.config.db
                .collection('households')
                .doc(currentHousehold.id)
                .collection('messages')
                .add(message);

            this.showVoiceStatus(`✅ Message posted: "${text}"`, 'success');

            // Switch to messages tab to show the result
            window.RoommatePortal.utils?.switchTab('messages');

        } catch (error) {
            console.error('Error creating message:', error);
            this.showVoiceStatus('❌ Failed to post message', 'error');
        }
    },

    // Create calendar event from voice (placeholder)
    createEvent(text) {
        // For now, just show a message - could be expanded later
        this.showVoiceStatus(`📅 Event creation: "${text}" - Feature coming soon!`, 'warning');
    },

    // Format assignee name properly
    formatAssigneeName(name) {
        return name.split(' ').map(word =>
            word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
        ).join(' ');
    },

    // Setup voice help section on dashboard
    setupVoiceHelpSection() {
        const voiceHelpSection = document.getElementById('voiceHelpSection');
        const voiceHelpBtn = document.getElementById('voiceHelpBtn');

        // Only show help section on first time use
        const hasSeenIntro = localStorage.getItem('voiceCommandsIntroSeen');

        if (voiceHelpSection && this.isSupported && !hasSeenIntro) {
            voiceHelpSection.style.display = 'block';

            if (voiceHelpBtn) {
                voiceHelpBtn.addEventListener('click', () => {
                    this.showVoiceHelp();
                });
            }
        } else if (voiceHelpSection) {
            // Hide the help section after first use
            voiceHelpSection.style.display = 'none';
        }

        // Also update voice section buttons visibility
        this.updateVoiceSectionButtons();
    },

    // Update voice section buttons based on support
    updateVoiceSectionButtons() {
        const voiceButtons = document.querySelectorAll('.voice-section-btn');
        const voiceHelpButtons = document.querySelectorAll('.voice-help-btn');

        voiceButtons.forEach(btn => {
            if (this.isSupported) {
                btn.style.display = '';
                btn.classList.remove('unsupported');
            } else {
                btn.style.display = 'none';
                btn.classList.add('unsupported');
            }
        });

        voiceHelpButtons.forEach(btn => {
            if (this.isSupported) {
                btn.style.display = '';
                btn.classList.remove('unsupported');
            } else {
                btn.style.display = 'none';
                btn.classList.add('unsupported');
            }
        });
    },

    // ...existing code...
};

// Add help button to header
function addVoiceHelpButton() {
    const header = document.querySelector('header .max-w-7xl');
    if (header && voiceCommandsModule.isSupported) {
        const helpButton = document.createElement('button');
        helpButton.className = 'voice-help-btn hidden md:flex items-center space-x-2 px-3 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors text-sm';
        helpButton.innerHTML = `
            <i class="fas fa-microphone"></i>
            <span>Voice Help</span>
        `;
        helpButton.addEventListener('click', () => {
            voiceCommandsModule.showVoiceHelp();
        });

        // Find a good place to insert the button
        const brandSection = header.querySelector('div');
        if (brandSection) {
            brandSection.appendChild(helpButton);
        }
    }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
        voiceCommandsModule.init();
        addVoiceHelpButton();
    }, 1000); // Delay to ensure other modules are loaded
});

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
    voiceCommandsModule.cleanup();
});

// Export to global namespace
window.RoommatePortal.voiceCommands = voiceCommandsModule;
