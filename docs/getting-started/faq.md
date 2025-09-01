# Frequently Asked Questions

Common questions and answers about StudyMaster PWA.

## 🚀 Getting Started

### Q: What are the minimum requirements to run StudyMaster PWA?
**A:** You need Node.js 18+ and npm 9+. The app will work on any modern browser and can be installed as a PWA on mobile devices.

### Q: How do I start the development environment?
**A:** Run `npm install` followed by `npm run dev`. The client will be available at http://localhost:3000 and the API at http://localhost:3001.

### Q: Can I use StudyMaster offline?
**A:** Yes! StudyMaster is a Progressive Web App with full offline functionality. You can study without an internet connection and your progress will sync when you're back online.

## 🔧 Development

### Q: How do I add new features?
**A:** Check our [Contributing Guide](../contributing/README.md) for the complete process. Generally: fork the repo, create a feature branch, make your changes, test them, and submit a pull request.

### Q: What's the project structure?
**A:** The project is organized into `client/` (React frontend), `server/` (Node.js backend), `shared/` (shared types), and `docs/` (documentation). See the [Development Guide](../development/README.md) for details.

### Q: How do I run tests?
**A:** Use `npm run test` to run all tests, or `npm run test:client` and `npm run test:server` for individual components.

## 🔒 Security

### Q: How are API keys managed?
**A:** All API keys and credentials are stored in `.env.production` files that are NOT tracked by Git. See our [Security Guide](../security/README.md) for complete details.

### Q: Is my study data secure?
**A:** Yes! We use JWT authentication, Row Level Security (RLS) in the database, and follow security best practices throughout the application.

## 🎮 Features

### Q: How does the spaced repetition algorithm work?
**A:** StudyMaster uses an advanced SM-2 implementation that schedules card reviews at scientifically-optimized intervals based on your performance.

### Q: Can I share my study decks with others?
**A:** Absolutely! You can make decks public for anyone to discover, or share them privately with friends and study groups.

### Q: How do I earn XP and achievements?
**A:** You earn XP by studying cards, with bonuses for accuracy and streaks. Achievements are unlocked by reaching various milestones. See the [Features Guide](../features/README.md) for details.

## 🚀 Deployment

### Q: How do I deploy StudyMaster to production?
**A:** We recommend Vercel for both client and server deployment. See our [Deployment Guide](../deployment/README.md) for step-by-step instructions.

### Q: What environment variables do I need?
**A:** You'll need PocketBase server URL and admin credentials. Check the [Security Guide](../security/README.md) for the complete list.

## 🐛 Troubleshooting

### Q: The development server won't start. What should I do?
**A:** Check that ports 3000 and 3001 are available, ensure all dependencies are installed with `npm install`, and see our [Troubleshooting Guide](../development/troubleshooting.md).

### Q: I'm getting database connection errors. How do I fix this?
**A:** Verify your PocketBase URL in the `.env` file, check your internet connection, and ensure your PocketBase server is running.

### Q: Hot reload isn't working. What's wrong?
**A:** Make sure you're editing files in the `src/` directories, check for TypeScript errors in the terminal, and try clearing your browser cache.

## 📱 PWA Features

### Q: How do I install StudyMaster on my phone?
**A:** Visit the app in your mobile browser and look for the "Add to Home Screen" prompt, or use your browser's install option.

### Q: Does StudyMaster work offline on mobile?
**A:** Yes! Once installed as a PWA, you can study completely offline and your progress will sync when you're back online.

## 🤝 Community

### Q: How can I contribute to StudyMaster?
**A:** We welcome contributions! Check our [Contributing Guide](../contributing/README.md) for guidelines on code contributions, bug reports, and feature requests.

### Q: Where can I get help or ask questions?
**A:** You can create GitHub issues, join our Discord community, or email support@studymaster.app.

### Q: How do I report a bug?
**A:** Please create a GitHub issue with details about the bug, steps to reproduce it, and your environment. See our [Contributing Guide](../contributing/README.md) for the bug report template.

---

**Still have questions?** Feel free to ask in our community channels or create a GitHub issue!