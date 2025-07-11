# Roommate Portal - AI Coding Instructions

## Architecture Overview

This is a **modular vanilla JavaScript Firebase application** using a global namespace pattern. All modules attach to `window.RoommatePortal` and communicate through this shared namespace.

### Key Architectural Patterns

**Module Structure**: Each module exports its API to `window.RoommatePortal.{moduleName}`:
```javascript
window.RoommatePortal = window.RoommatePortal || {};
window.RoommatePortal.moduleName = { /* module API */ };
```

**Loading Order** (critical - modules depend on this sequence):
1. Firebase SDKs → `config.js` → `encryption.js` → `migration.js` 
2. Core: `state.js` → `utils.js` → `auth.js`
3. Features: `household.js` → `chores.js` → `messages.js` → `announcements.js` → `calendar.js` → `rewards.js`
4. UI/Management: `notifications.js` → `statistics.js` → `ui.js` → `dataCleanup.js` → `householdManagement.js`
5. Entry point: `main.js`

**State Management**: Centralized in `state.js` - all global variables, DOM references, and Firestore listeners are managed here. Other modules access state via `window.RoommatePortal.state.getCurrentUser()`, etc.

## Critical Patterns & Conventions

### Household-Scoped Data Model
- **Everything is household-scoped**: Users join households via 6-character codes
- **Permissions**: Admin role (household creator) vs member roles with different capabilities
- **Data isolation**: All Firestore queries filter by `householdId`

### End-to-End Encryption
- **AES-256-GCM encryption** for sensitive data (messages, chores, events)
- **Per-household keys** stored in Firestore household documents
- **Client-side encryption**: Use `window.RoommatePortal.encryption.encryptData(data, key)` before saving
- **Auto-migration**: Existing unencrypted data is gracefully handled

### Firebase Integration Patterns
```javascript
// Standard Firestore listener pattern used throughout
const listener = db.collection('collection')
    .where('householdId', '==', householdId)
    .onSnapshot(snapshot => {
        // Handle real-time updates
    });
// Always store listeners in state.js for cleanup
```

### UI Navigation System
- **Dashboard-centric**: Main navigation through clickable dashboard tiles
- **Tab switching**: `window.RoommatePortal.utils.switchTab(tabName)`
- **Floating Action Buttons (FAB)**: Context-sensitive forms that slide up from bottom
- **Mobile-first responsive**: Tailwind CSS with mobile breakpoints

## Development Workflows

### Adding New Features
1. Create module in `js/{feature}.js` following the namespace pattern
2. Add script tag to `index.html` in the correct loading order
3. Initialize in `main.js` with error handling
4. Add tab/section to `index.html` with proper Tailwind classes
5. Wire up dashboard tile if needed

### Working with Encrypted Data
```javascript
// Always encrypt before saving sensitive data
const encryptedData = await window.RoommatePortal.encryption.encryptData(data, household.encryptionKey);
// Decrypt when reading
const decryptedData = await window.RoommatePortal.encryption.decryptData(encryptedData, household.encryptionKey);
```

### Error Handling & Notifications
- Use `window.RoommatePortal.utils.showNotification(message, type)` for all user feedback
- Wrap async operations in try-catch blocks
- Log errors with context: `console.error('Context:', error)`

## Key Integration Points

### Real-time Synchronization
- **Firestore listeners** for live updates across all household members
- **State updates** trigger UI refreshes automatically
- **Cross-module events**: Custom events for tab switches, auth changes

### Authentication Flow
1. `auth.js` handles Firebase Auth state changes
2. Triggers `window.RoommatePortal.ui.updateUIForAuth()` 
3. Loads household data and initializes feature modules
4. Sets up real-time listeners for household-scoped data

### Data Migration Strategy
- `migration.js` handles schema changes and data upgrades
- Runs automatically on household data load
- Graceful fallbacks for missing fields

## Testing & Debugging

### Local Development
- Open `index.html` directly in browser (no build step required)
- Use browser DevTools → Application → Local Storage for offline data
- Monitor Network tab for Firebase calls

### Common Issues
- **Loading order**: If modules are undefined, check script tag order in `index.html`
- **State access**: Always use `window.RoommatePortal.state.getCurrentHousehold()` not direct variables
- **Encryption errors**: Ensure household has `encryptionKey` before encrypting data

## External Dependencies

- **Firebase v9.6.10** (Firestore, Auth) - loaded via CDN in compatibility mode
- **Tailwind CSS** - utility-first styling, mobile-responsive components
- **Font Awesome** - icons throughout the UI
- **Web Crypto API** - browser-native encryption (no external crypto libraries)
