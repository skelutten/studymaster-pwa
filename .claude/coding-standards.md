## 📝 CODING STANDARDS

### Follow [Clean code](clean_code.md)
### Code Style
- **TypeScript**: Strict mode enabled
- **ESLint**: Enforced linting rules
- **Prettier**: Consistent code formatting
- **Naming**: camelCase for variables, PascalCase for components

### Component Guidelines
- **Functional components** with hooks
- **TypeScript interfaces** for all props
- **Consistent file structure** and naming
- **Proper error handling** and loading states

### API Design
- **RESTful endpoints** where appropriate
- **Consistent error responses** with proper HTTP codes
- **Input validation** on all endpoints
- **Rate limiting** for production

### 🧱 Code Structure & Modularity
- **Never create a file longer than 500 lines of code.** If a file approaches this limit, refactor by splitting it into modules or helper files.
- **Organize code into clearly separated modules**, grouped by feature or responsibility.
  For React components this looks like:
    - `ComponentName.tsx` - Main component definition
    - `hooks/useComponentName.ts` - Custom hooks for component logic
    - `services/componentNameService.ts` - API calls and business logic
- **Use clear, consistent imports** (prefer relative imports within the project structure).
- **Use environment variables** through Vite's `import.meta.env` for client-side configuration.

### 📎 Style & Conventions
- **Use TypeScript** as the primary language for both frontend and backend.
- **Follow ESLint rules**, use type annotations, and format consistently.
- **Use Zod or similar** for data validation on both client and server.
- Use **Supabase client** for database operations and **Express.js** for API endpoints.
- Write **JSDoc comments for functions** using standard format:
  ```typescript
  /**
   * Brief summary.
   * @param param1 - Description
   * @returns Description
   */
  function example(param1: string): string {
    // implementation
  }
  ```

### 📚 Documentation & Explainability
- **Update `README.md`** when new features are added, dependencies change, or setup steps are modified.
- **Comment non-obvious code** and ensure everything is understandable to a mid-level developer.
- When writing complex logic, **add inline comments** explaining the why, not just the what.
