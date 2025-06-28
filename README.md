# 🏠 RoomieHub - Smart Roommate Portal

A modern, real-time web application for roommates to manage chores, share messages, and coordinate their shared living space. Built with Firebase for seamless multi-user collaboration.

## ✨ Features

### 🔐 Authentication & Multi-User Support
- **Google Sign-In**: Secure authentication with Google accounts
- **Household System**: Create or join households with unique codes
- **Real-time Sync**: All data syncs instantly across devices and users

### 📋 Chore Management
- **Smart Task Tracking**: Add, assign, and complete chores
- **Priority Levels**: High, medium, and low priority indicators
- **Completion History**: Track who completed what and when
- **Real-time Updates**: See chore updates instantly
- **Progress Statistics**: View active chores and daily completions

### 💬 Message Board
- **Instant Messaging**: Post messages to all household members
- **Real-time Notifications**: See new messages as they arrive
- **Author Attribution**: Messages show who posted them and when
- **Message Management**: Delete messages with confirmation

### 🎨 Modern UI/UX
- **Responsive Design**: Works perfectly on desktop, tablet, and mobile
- **Beautiful Interface**: Modern design with consistent color schemes
- **Smooth Animations**: Polished interactions and transitions
- **Keyboard Shortcuts**: Power-user features for quick navigation
- **Auto-resizing Forms**: Textarea expands as you type

## 🚀 Quick Start

### Prerequisites
- Modern web browser
- Google account for authentication
- Firebase project (see setup guide below)

### Installation
1. **Clone or download** this repository
2. **Set up Firebase** (see `FIREBASE_SETUP.md` for detailed instructions)
3. **Update configuration** in `script.js` with your Firebase config
4. **Open `index.html`** in your web browser or deploy to a web server

### Firebase Setup (Required)
This app requires Firebase for authentication and data storage. See `FIREBASE_SETUP.md` for complete setup instructions.

## 📱 How to Use

### Getting Started
1. **Sign In**: Click "Sign In with Google" to authenticate
2. **Create/Join Household**: 
   - Create a new household and get a shareable code
   - Or join an existing household with a code from your roommates
3. **Start Collaborating**: Add chores, post messages, and coordinate with your roommates!

### Managing Chores
- **Add Chores**: Use the form to add new tasks and assign them
- **Complete Tasks**: Check off completed chores or use the "Complete" button
- **Track Progress**: View statistics on active chores and daily completions
- **Priority System**: Use 🔴 High, 🟡 Medium, 🟢 Low priority indicators

### Using the Message Board
- **Post Messages**: Share updates, reminders, or just say hi
- **Real-time Chat**: Messages appear instantly for all household members
- **Stay Connected**: Keep everyone informed about household activities

### Keyboard Shortcuts
- **Ctrl/Cmd + Enter**: Submit the current form
- **Ctrl/Cmd + 1**: Switch to Chore Manager
- **Ctrl/Cmd + 2**: Switch to Message Board

## 🛠️ Technical Features

### Architecture
- **Frontend**: Vanilla JavaScript, HTML5, CSS3
- **Styling**: Tailwind CSS for modern, responsive design
- **Backend**: Firebase (Authentication, Firestore Database)
- **Real-time**: Firebase Firestore real-time listeners
- **Security**: Firestore security rules for data protection

### Performance
- **Real-time Updates**: Instant synchronization across all users
- **Offline Support**: Basic offline functionality with Firebase
- **Optimized Queries**: Efficient data fetching and updates
- **Responsive**: Fast loading and smooth interactions

### Security
- **Authentication Required**: All features require Google sign-in
- **Household Isolation**: Users can only access their household's data
- **Secure Rules**: Firestore security rules prevent unauthorized access
- **Input Validation**: Client and server-side validation

## 🎯 Use Cases

### Perfect For
- **College Roommates**: Coordinate dorm or apartment responsibilities
- **Shared Houses**: Manage household chores and communication
- **Family Homes**: Keep everyone updated on tasks and activities
- **Co-living Spaces**: Professional shared living arrangements

### Features in Action
- **Moving In**: Create a household and invite roommates
- **Weekly Planning**: Assign and track weekly chores
- **Communication**: Share updates about utilities, visitors, or issues
- **Accountability**: See who's completing their responsibilities

## 🔧 Development

### Project Structure
```
roomie-hub/
├── index.html          # Main application file
├── script.js           # Firebase integration & app logic
├── styles.css          # Custom styles (extends Tailwind)
├── README.md           # This file
├── FIREBASE_SETUP.md   # Firebase configuration guide
└── robots.txt          # SEO configuration
```

### Customization
- **Colors**: Modify CSS variables in `styles.css`
- **Features**: Extend functionality in `script.js`
- **UI**: Update layouts in `index.html`
- **Firebase Rules**: Customize security in Firebase console

## 🚀 Deployment

### Firebase Hosting (Recommended)
1. `npm install -g firebase-tools`
2. `firebase login`
3. `firebase init hosting`
4. `firebase deploy`

### Other Options
- **GitHub Pages**: Perfect for static hosting
- **Netlify**: Drag-and-drop deployment
- **Vercel**: Easy Git integration
- **Any Web Server**: Just upload the files!

## 🤝 Contributing

We welcome contributions! Areas for improvement:
- Additional chore features (recurring tasks, categories)
- Enhanced messaging (file uploads, notifications)
- Mobile app development
- Integration with calendar apps
- Expense tracking features

## 📝 License

This project is open source and available under the MIT License.

## 🙏 Acknowledgments

- **Firebase**: For providing excellent backend services
- **Tailwind CSS**: For the beautiful, responsive design system
- **Font Awesome**: For the comprehensive icon library
- **Google Fonts**: For typography

---

**Made with ❤️ for awesome roommates everywhere!**

*Turn your shared living space into a well-coordinated home with RoomieHub.*