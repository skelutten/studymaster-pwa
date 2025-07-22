# StudyMaster PWA

A modern Progressive Web App that combines the best features of Anki, AnkiDroid, and Quizlet with advanced gamification elements. StudyMaster uses spaced repetition algorithms, collaborative study features, and engaging game mechanics to enhance learning effectiveness.

## 🚀 Features

### Core Learning Features
- **Spaced Repetition Algorithm**: Advanced SM-2 implementation for optimal learning retention
- **Multiple Card Types**: Basic, cloze deletion, multiple choice, image occlusion, and audio cards
- **Offline Study**: Complete offline functionality with background sync
- **Multiple Study Modes**: Flashcards, matching games, multiple choice quizzes, and more

### Gamification System
- **XP & Leveling**: Earn experience points and level up through studying
- **Achievement System**: Unlock badges for various milestones and accomplishments
- **Streak System**: Maintain daily study streaks with streak freezes and recovery
- **Challenges**: Daily, weekly, and monthly challenges with rewards
- **Leaderboards**: Compete with friends and global community
- **Virtual Currency**: Earn coins and gems for customizations and rewards

### Social Features
- **Collaborative Decks**: Share and collaborate on study materials
- **Study Groups**: Create and join study groups with friends
- **Friend System**: Add friends and compete in study challenges
- **Community Marketplace**: Discover and share public study decks

### Technical Features
- **Progressive Web App**: Install on any device, works offline
- **Real-time Sync**: Seamless synchronization across devices
- **Dark/Light Theme**: Automatic theme switching with system preference
- **Responsive Design**: Optimized for mobile, tablet, and desktop
- **Push Notifications**: Study reminders and achievement notifications

## 🛠 Technology Stack

### Frontend
- **React 18** with TypeScript
- **Vite** for fast development and building
- **Tailwind CSS** for styling
- **Framer Motion** for animations
- **React Query** for state management and caching
- **Zustand** for global state management
- **Workbox** for PWA functionality

### Backend
- **Node.js** with Express.js
- **TypeScript** for type safety
- **PostgreSQL** for primary database
- **Redis** for caching and real-time features
- **Socket.io** for real-time collaboration
- **Bull Queue** for background job processing

### Infrastructure
- **Docker** for containerization
- **AWS S3** for media storage
- **Push API** for notifications
- **JWT** for authentication

## 📋 Prerequisites

- Node.js 18+ and npm 9+
- PostgreSQL 14+
- Redis 6+
- Docker (optional, for containerized development)

## 🚀 Quick Start

### 1. Clone the Repository
```bash
git clone <repository-url>
cd studymaster-pwa
```

### 2. Install Dependencies
```bash
# Install root dependencies
npm install

# Install client dependencies
cd client && npm install

# Install server dependencies
cd ../server && npm install

# Install shared dependencies
cd ../shared && npm install
```

### 3. Environment Setup
```bash
# Copy environment files
cp server/.env.example server/.env
cp client/.env.example client/.env

# Edit the environment files with your configuration
```

### 4. Database Setup
```bash
# Create PostgreSQL database
createdb studymaster

# Run migrations (when implemented)
cd server && npm run migrate

# Seed initial data (when implemented)
npm run seed
```

### 5. Start Development Servers
```bash
# From the root directory, start both client and server
npm run dev

# Or start individually:
npm run dev:client  # Starts React app on http://localhost:3000
npm run dev:server  # Starts API server on http://localhost:3001
```

## 📁 Project Structure

```
studymaster-pwa/
├── client/                     # React PWA Frontend
│   ├── public/                 # Static assets and PWA manifest
│   ├── src/
│   │   ├── components/         # React components
│   │   │   ├── cards/          # Card-related components
│   │   │   ├── decks/          # Deck management components
│   │   │   ├── study/          # Study session components
│   │   │   ├── gamification/   # Gamification UI components
│   │   │   ├── social/         # Social features components
│   │   │   ├── ui/             # Reusable UI components
│   │   │   └── layout/         # Layout components
│   │   ├── hooks/              # Custom React hooks
│   │   ├── services/           # API and external services
│   │   ├── stores/             # Zustand state stores
│   │   ├── utils/              # Utility functions
│   │   ├── types/              # TypeScript type definitions
│   │   └── pages/              # Page components
│   ├── package.json
│   └── vite.config.ts
├── server/                     # Node.js Backend
│   ├── src/
│   │   ├── controllers/        # Route controllers
│   │   ├── middleware/         # Express middleware
│   │   ├── models/             # Database models
│   │   ├── routes/             # API routes
│   │   ├── services/           # Business logic services
│   │   ├── jobs/               # Background job processors
│   │   └── utils/              # Utility functions
│   ├── migrations/             # Database migrations
│   ├── seeds/                  # Database seed files
│   └── package.json
├── shared/                     # Shared types and utilities
│   ├── types/                  # Shared TypeScript types
│   ├── constants/              # Shared constants
│   └── utils/                  # Shared utility functions
├── docs/                       # Documentation
├── docker-compose.yml          # Docker configuration
├── package.json                # Root package.json for workspace
└── README.md
```

## 🎮 Gamification System

### XP & Leveling
- **Base XP**: 10 XP per card reviewed
- **Accuracy Bonus**: Additional XP based on accuracy percentage
- **Streak Multiplier**: XP multiplier based on current study streak
- **Challenge Bonus**: Extra XP during active challenges

### Achievement Categories
- **Study Milestones**: Cards reviewed, sessions completed, time studied
- **Accuracy Achievements**: Perfect sessions, improvement streaks
- **Streak Achievements**: Daily streaks, comeback achievements
- **Social Achievements**: Friends added, decks shared, collaborations
- **Challenge Achievements**: Challenge completions, leaderboard positions
- **Special Achievements**: Holiday events, app anniversaries, hidden achievements

### Challenge Types
- **Daily Challenges**: Quick 5-10 minute focused tasks
- **Weekly Challenges**: Longer-term goals with bigger rewards
- **Monthly Challenges**: Major milestones and competitions
- **Community Challenges**: Global participation events
- **Friend Challenges**: Direct competition with friends

## 🔧 Development

### Available Scripts

#### Root Level
- `npm run dev` - Start both client and server in development mode
- `npm run build` - Build both client and server for production
- `npm run test` - Run tests for both client and server
- `npm run lint` - Lint both client and server code

#### Client
- `npm run dev` - Start Vite development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run test` - Run Vitest tests
- `npm run lint` - Run ESLint

#### Server
- `npm run dev` - Start development server with nodemon
- `npm run build` - Compile TypeScript to JavaScript
- `npm run start` - Start production server
- `npm run test` - Run Jest tests
- `npm run lint` - Run ESLint

### Code Style
- TypeScript for type safety
- ESLint for code linting
- Prettier for code formatting
- Conventional commits for commit messages

## 🐳 Docker Development

```bash
# Start all services with Docker Compose
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

## 📱 PWA Features

- **Offline Functionality**: Study without internet connection
- **Install Prompt**: Add to home screen on mobile devices
- **Background Sync**: Sync data when connection is restored
- **Push Notifications**: Study reminders and achievement alerts
- **Responsive Design**: Works on all screen sizes

## 🔒 Security Features

- JWT authentication with refresh tokens
- Rate limiting on API endpoints
- CORS protection
- Helmet.js security headers
- Input validation and sanitization
- SQL injection prevention

## 🚀 Deployment

### Environment Variables
Ensure all required environment variables are set in production:
- Database connection strings
- Redis connection
- JWT secrets
- AWS S3 credentials
- Push notification keys

### Build Process
```bash
# Build for production
npm run build

# Start production server
npm start
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Inspired by Anki's spaced repetition algorithm
- UI/UX inspiration from Quizlet and modern learning apps
- Gamification concepts from successful educational games

## 📞 Support

For support, email support@studymaster.app or join our Discord community.

---

**Happy Learning! 🎓**