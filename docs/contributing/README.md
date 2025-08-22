# Contributing to StudyMaster PWA

We welcome contributions to StudyMaster PWA! This guide will help you get started with contributing to the project.

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ and npm 9+
- Git
- Basic knowledge of React, TypeScript, and Node.js

### Development Setup
1. Fork the repository
2. Clone your fork: `git clone <your-fork-url>`
3. Install dependencies: `npm install`
4. Start development: `npm run dev`
5. Make your changes
6. Test your changes
7. Submit a pull request

## 📋 Contribution Guidelines

### Code Style
- **TypeScript**: Use TypeScript for all new code
- **ESLint**: Follow the project's ESLint configuration
- **Prettier**: Use Prettier for code formatting
- **Conventional Commits**: Use conventional commit messages

### Commit Message Format
```
type(scope): description

[optional body]

[optional footer]
```

Examples:
- `feat(auth): add social login support`
- `fix(cards): resolve card rendering issue`
- `docs(readme): update installation instructions`

### Pull Request Process

1. **Create a Feature Branch**
   ```bash
   git checkout -b feature/amazing-feature
   ```

2. **Make Your Changes**
   - Write clean, well-documented code
   - Add tests for new features
   - Update documentation as needed

3. **Test Your Changes**
   ```bash
   npm run test
   npm run lint
   npm run build
   ```

4. **Commit Your Changes**
   ```bash
   git commit -m 'feat: add some amazing feature'
   ```

5. **Push to Your Branch**
   ```bash
   git push origin feature/amazing-feature
   ```

6. **Open a Pull Request**
   - Use a clear title and description
   - Reference any related issues
   - Include screenshots for UI changes

## 🧪 Testing

### Running Tests
```bash
# Run all tests
npm run test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage
```

### Writing Tests
- Write unit tests for new functions and components
- Write integration tests for complex features
- Use Jest and React Testing Library
- Aim for good test coverage

### Test Structure
```typescript
describe('ComponentName', () => {
  it('should render correctly', () => {
    // Test implementation
  });

  it('should handle user interaction', () => {
    // Test implementation
  });
});
```

## 🐛 Bug Reports

### Before Submitting a Bug Report
- Check if the bug has already been reported
- Try to reproduce the bug with the latest version
- Gather relevant information about your environment

### Bug Report Template
```markdown
**Describe the bug**
A clear description of what the bug is.

**To Reproduce**
Steps to reproduce the behavior:
1. Go to '...'
2. Click on '....'
3. See error

**Expected behavior**
What you expected to happen.

**Screenshots**
If applicable, add screenshots.

**Environment:**
- OS: [e.g. iOS]
- Browser: [e.g. chrome, safari]
- Version: [e.g. 22]
```

## 💡 Feature Requests

### Before Submitting a Feature Request
- Check if the feature has already been requested
- Consider if the feature fits the project's goals
- Think about how it would benefit other users

### Feature Request Template
```markdown
**Is your feature request related to a problem?**
A clear description of what the problem is.

**Describe the solution you'd like**
A clear description of what you want to happen.

**Describe alternatives you've considered**
Other solutions you've considered.

**Additional context**
Any other context or screenshots.
```

## 📚 Documentation

### Documentation Guidelines
- Write clear, concise documentation
- Include code examples where helpful
- Update documentation when making changes
- Use proper markdown formatting

### Documentation Structure
- Keep documentation in the `docs/` directory
- Use descriptive filenames
- Include a README.md in each subdirectory
- Cross-reference related documents

## 🏗️ Architecture Guidelines

### Project Structure
- Follow the established project structure
- Keep components small and focused
- Use proper separation of concerns
- Follow React best practices

### State Management
- Use Zustand for global state
- Keep local state in components when appropriate
- Use React Query for server state
- Follow established patterns

### API Guidelines
- Use RESTful API design
- Include proper error handling
- Add input validation
- Document API endpoints

## 🔒 Security Guidelines

- Never commit API keys or secrets
- Use environment variables for configuration
- Follow security best practices
- Report security issues privately

## 📞 Getting Help

### Community Support
- Join our Discord community
- Ask questions in GitHub Discussions
- Check existing issues and documentation

### Maintainer Contact
- For security issues: security@studymaster.app
- For general questions: contribute@studymaster.app

## 🎉 Recognition

Contributors will be recognized in:
- The project README
- Release notes for significant contributions
- Our community hall of fame

## 📄 License

By contributing to StudyMaster PWA, you agree that your contributions will be licensed under the MIT License.

---

**Thank you for contributing! 🙏**