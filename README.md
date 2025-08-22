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

### Backend & Database
- **Node.js** with Express.js and TypeScript
- **Supabase** (PostgreSQL with real-time features)
- **Supabase Auth** for authentication
- **Supabase Storage** for file management
- **Supabase Edge Functions** for server-side logic

### Infrastructure & Deployment
- **Vercel** for frontend and backend deployment
- **Supabase** for database, auth, real-time, and storage
- **Push API** for notifications
- **JWT** tokens via Supabase Auth

## 📋 Prerequisites

- Node.js 18+ and npm 9+

## 🚀 Quick Start

### 1. Clone and Install
```bash
git clone <repository-url>
cd studymaster-pwa
npm install
```

### 2. Start Development
```bash
npm run dev
```

### 3. Access the Application
- **Client**: http://localhost:3000
- **Server API**: http://localhost:3001

## 📚 Documentation

### 📖 Complete Guides
- **[Getting Started](docs/getting-started/README.md)** - Detailed setup and installation
- **[Development Guide](docs/development/README.md)** - Development workflow and tools
- **[Features Overview](docs/features/README.md)** - Complete feature documentation
- **[Deployment Guide](docs/deployment/README.md)** - Production deployment
- **[Security Guide](docs/security/README.md)** - Security configuration
- **[Contributing](docs/contributing/README.md)** - How to contribute

### 🏗️ Architecture
- **Frontend**: React 18 + TypeScript + Vite + Tailwind CSS
- **Backend**: Node.js + Express + TypeScript + Supabase
- **Database**: Supabase (PostgreSQL with real-time subscriptions)
- **Authentication**: Supabase Auth with JWT tokens
- **PWA**: Workbox + Service Workers + Offline Support
- **Deployment**: Vercel (client + server)

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](docs/contributing/README.md) for details.

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 📞 Support

- **Documentation**: [docs/](docs/)
- **Issues**: GitHub Issues
- **Email**: support@studymaster.app

---

**Happy Learning! 🎓**