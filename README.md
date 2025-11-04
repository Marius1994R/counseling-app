# Consiliere360

A comprehensive desktop and mobile-responsive application for managing church counseling cases, counselors, and appointments.

## Features

### 🔐 Authentication & Authorization
- Secure login system with Firebase Authentication
- Three role levels: Counselor, Administrator, Leader
- Role-based access control

### 📊 Dashboard
- Real-time overview of cases and counselors
- Workload distribution tracking
- Recent activity feed
- Upcoming appointments summary

### 👥 Case Management
- Create, update, and delete counseling cases
- Track case status: Waiting, Active, Unfinished, Finished
- Categorize issues: Spiritual, Relational, Personal
- Assign cases to counselors
- Secure case descriptions (hidden by default)

### 👨‍⚕️ Counselor Management
- Manage counselor profiles and specialties
- Track active cases and workload levels
- Workload indicators: Low, Moderate, High
- Case assignment and history

### 📅 Appointment Scheduling
- Calendar view for all appointments
- Schedule recurring appointments
- Link appointments to specific cases
- View all counselor schedules

### 📝 Session Reporting
- Add session notes and observations
- Track progress and next steps
- Record prayer requests
- Maintain case history

### 📱 Responsive Design
- Works on desktop and mobile devices
- Modern, clean interface
- Touch-friendly navigation

### 🔄 Offline Support
- Works offline with data sync when online
- Local data storage
- Automatic synchronization

## Technology Stack

- **Frontend**: React 18 with TypeScript
- **UI Framework**: Material-UI (MUI)
- **Backend**: Firebase (Authentication + Firestore)
- **Routing**: React Router
- **State Management**: React Context API
- **Styling**: Emotion (CSS-in-JS)

## Getting Started

### Prerequisites
- Node.js (v16 or higher)
- npm or yarn
- Firebase project

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd consiliere360
```

2. Install dependencies:
```bash
npm install
```

3. Configure Firebase:
   - Create a Firebase project at https://console.firebase.google.com
   - Enable Authentication and Firestore
   - Copy your Firebase config to `src/firebase.ts`

4. Start the development server:
```bash
npm start
```

5. Open [http://localhost:3000](http://localhost:3000) in your browser

### Firebase Setup

1. Create a new Firebase project
2. Enable Authentication (Email/Password)
3. Enable Firestore Database
4. Update `src/firebase.ts` with your project credentials:

```typescript
const firebaseConfig = {
  apiKey: "your-api-key",
  authDomain: "your-project.firebaseapp.com",
  projectId: "your-project-id",
  storageBucket: "your-project.appspot.com",
  messagingSenderId: "your-sender-id",
  appId: "your-app-id"
};
```

## Project Structure

```
src/
├── components/          # React components
│   ├── Auth/           # Authentication components
│   ├── Dashboard/      # Dashboard components
│   └── Layout/         # Layout components
├── contexts/           # React contexts
├── types/              # TypeScript type definitions
├── firebase.ts         # Firebase configuration
└── App.tsx            # Main application component
```

## User Roles

### Counselor
- View assigned cases
- Add session reports
- Update case progress
- View own appointments

### Administrator
- Full case management
- Counselor management
- Appointment scheduling
- View all data and reports

### Leader
- All administrator privileges
- System configuration
- User management
- Advanced reporting

## Data Models

### Case
- Basic information (name, age, contact)
- Issue categorization
- Status tracking
- Assignment to counselor
- Session history

### Counselor
- Profile information
- Specialties and expertise
- Workload tracking
- Case assignments

### Session Report
- Date and counselor
- Notes and observations
- Progress updates
- Next steps

### Appointment
- Date and time
- Counselor assignment
- Case linkage
- Description

## Security & Privacy

- All data encrypted in transit and at rest
- Role-based access control
- Secure authentication
- Privacy-focused design for sensitive counseling data

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

This project is licensed under the MIT License.

## Deployment

### Firebase Hosting (Recommended)

This project is configured for Firebase Hosting. To deploy:

1. Install Firebase CLI:
```bash
npm install -g firebase-tools
```

2. Login to Firebase:
```bash
firebase login
```

3. Initialize Firebase Hosting (if not already done):
```bash
firebase init hosting
```
   - Select your Firebase project
   - Set `build` as the public directory
   - Configure as single-page app: Yes
   - Set up automatic builds: No (for now)

4. Build your app:
```bash
npm run build
```

5. Deploy to Firebase:
```bash
firebase deploy --only hosting
```

6. Your app will be live at: `https://your-project-id.web.app`

### Custom Domain

1. Go to Firebase Console → Hosting
2. Click "Add custom domain"
3. Follow the instructions to verify your domain
4. Firebase automatically provides SSL certificates

### Alternative Hosting Options

- **Vercel**: Connect GitHub repo, automatic deployments
- **Netlify**: Similar to Vercel, excellent for React apps
- **Cloudflare Pages**: Fast, free CDN with custom domains

## Support

For support and questions, please contact the development team or create an issue in the repository.