# 🏠 Roommate Portal

A modern, household-based roommate management application built with Firebase and Vanilla JavaScript.

## ✨ Features

### 🔐 Authentication
- Google Sign-In integration
- Email/Password authentication
- Persistent login sessions

### 🏡 Household Management
- **Create Household**: Set up a new shared living space with a unique code
- **Join Household**: Join an existing household using a 6-character code
- **Household Roles**: Admin and member roles with different permissions
- **Leave Household**: Leave a household with proper admin transfer
- **Member Management**: View all household members and their roles

### ✅ Chore Management
- **Full CRUD Access**: All household members can create, read, update, and delete chores
- **Assignee System**: Assign chores to specific household members
- **Priority Levels**: Set chore priorities (high, medium, low)
- **Completion Tracking**: Mark chores as complete with timestamps
- **Real-time Updates**: Changes sync across all household members instantly

### 💬 Message Board
- **Personal Messages**: Full CRUD access to your own messages
- **Message Privacy**: Cannot delete other roommates' messages
- **Real-time Chat**: Messages appear instantly for all household members
- **Author Attribution**: Messages show the author's name and timestamp
- **New Message Indicators**: Visual indicators for unread messages

### 📊 Dashboard & Statistics
- Active chore count
- Completed chores today
- New message count
- Member activity status

## 🚀 Getting Started

1. **Sign In**: Use Google or Email authentication
2. **Create or Join**: Either create a new household or join existing one with a code
3. **Start Collaborating**: Add chores, post messages, and manage your shared living space

## 🔐 Data Encryption

### End-to-End Encryption
- **AES-256-GCM Encryption**: All sensitive user data is encrypted using industry-standard AES-256-GCM encryption
- **Household-Level Keys**: Each household has its own unique encryption key stored securely in Firebase
- **Client-Side Encryption**: Data is encrypted in the browser before being sent to the server
- **Automatic Key Generation**: Encryption keys are automatically generated when households are created

### Encrypted Data Types
- **Messages**: All message content is encrypted
- **Announcements**: Titles and content are encrypted
- **Calendar Events**: Event titles and descriptions are encrypted
- **Chores**: Chore descriptions are encrypted
- **Rewards**: Reward names and descriptions are encrypted

### Key Management
- **Persistent Keys**: Encryption keys are stored in the household document in Firebase
- **Cross-Device Sync**: Keys are automatically available across all devices for household members
- **Migration Support**: Existing households are automatically migrated to use encryption
- **Backup Protection**: Keys are safely stored and accessible only to household members

### Security Features
- **Browser-Based Encryption**: Uses the Web Crypto API for secure encryption operations
- **No Server-Side Decryption**: Firebase only stores encrypted data, never plaintext
- **Access Control**: Only household members can access the encryption key
- **Automatic Migration**: Existing data is handled gracefully with backward compatibility

## 🛡️ Security & Permissions

### Household Access Control
- Users must be part of a household to access chores and messages
- All data is scoped to the household level
- Household codes provide secure access control

### Message Permissions
- ✅ **Can Do**: Create, edit, and delete your own messages
- ❌ **Cannot Do**: Delete or edit other members' messages

### Chore Permissions
- ✅ **Can Do**: Full CRUD access to all household chores
- ✅ **Can Do**: Mark any chore as complete
- ✅ **Can Do**: Assign chores to any household member

### Admin Features
- Create household and get admin role
- Admin role transfers automatically when leaving household
- Last member leaving deletes the household

## 🔧 Technical Details

### Architecture
- **Frontend**: Vanilla JavaScript (Modular), HTML5, CSS3
- **Styling**: Tailwind CSS
- **Backend**: Firebase Firestore
- **Authentication**: Firebase Auth (Google + Email/Password)
- **Real-time Updates**: Firestore listeners

### Code Structure
The application uses a modular JavaScript architecture for better maintainability:

```
js/
├── config.js              # Firebase configuration
├── state.js               # Global state management  
├── utils.js               # Utility functions
├── auth.js                # Authentication management
├── household.js           # Household operations
├── chores.js              # Chore management
├── messages.js            # Message board
├── statistics.js          # Dashboard statistics
├── ui.js                  # UI management
├── dataCleanup.js         # Data cleanup operations
├── householdManagement.js # Advanced household features
├── main.js                # Application orchestration
└── README.md              # Module documentation
```

### Key Benefits
- **Modular Design**: Each module has a single responsibility
- **Maintainable**: Easy to locate and modify specific features
- **Testable**: Individual modules can be tested in isolation
- **Scalable**: New features can be added as separate modules
- **Authentication**: Firebase Auth
- **Real-time**: Firebase real-time listeners
- **Storage**: Client-side persistence with Firebase sync

## 🌟 User Experience

- **Responsive Design**: Works on desktop and mobile
- **Real-time Updates**: No page refresh needed
- **Intuitive Interface**: Clean, modern UI with clear navigation
- **Keyboard Shortcuts**: Ctrl/Cmd + Enter to submit forms
- **Visual Feedback**: Toast notifications for all actions
- **Animated Interactions**: Smooth transitions and loading states