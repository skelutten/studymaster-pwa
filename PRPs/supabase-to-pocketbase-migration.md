# Supabase to PocketBase Migration PRP

## Goal
Replace Supabase database and authentication with PocketBase to reduce external dependencies, improve offline capabilities, and provide a locally hosted backend solution. Migrate all database schemas, authentication flows, and service integrations while maintaining full compatibility with existing features.

## Why
- **Reduced External Dependencies**: Remove reliance on Supabase cloud service
- **Local Development**: Enable fully local development environment with embedded SQLite  
- **Cost Optimization**: Eliminate monthly Supabase costs for smaller deployments
- **Offline Capabilities**: Better offline support with local database
- **Simplified Deployment**: Single executable deployment with embedded database
- **Educational Purpose**: Test user "gurka" with password "gurka123" for development

## What
Complete migration from Supabase to PocketBase involving:
- Database schema migration (profiles, decks, cards tables)
- Authentication system replacement (password-based auth)
- Service layer migration (userDataService patterns)
- Environment configuration updates
- Test suite updates for new backend
- Unit and integration test coverage

### Success Criteria
- [ ] PocketBase server runs locally and serves application
- [ ] All existing authentication flows work with PocketBase
- [ ] All database operations (CRUD) function correctly
- [ ] Test user "gurka/gurka123" can authenticate successfully
- [ ] Existing tests pass with PocketBase backend
- [ ] All service layers properly integrated with PocketBase SDK
- [ ] Environment variables properly configured

## All Needed Context

### Documentation & References
```yaml
# MUST READ - Include these in your context window
- url: https://pocketbase.io/docs/
  why: Official PocketBase documentation for setup and usage
  
- url: https://github.com/pocketbase/js-sdk
  why: JavaScript SDK patterns, authentication, and CRUD operations
  
- url: https://pocketbase.io/docs/authentication/
  section: Password-based auth and auth store management
  critical: Stateless authentication vs Supabase session-based auth
  
- url: https://pocketbase.io/docs/api-records/
  section: Record CRUD operations and query patterns
  critical: API differences from Supabase queries

- file: client/src/lib/supabase.ts
  why: Current Supabase client configuration and database types
  
- file: client/src/stores/supabaseAuthStore.ts
  why: Existing authentication patterns to replicate
  
- file: client/src/stores/authStore.ts  
  why: Fallback auth store patterns for offline mode
  
- file: client/src/services/userDataService.ts
  why: Service layer patterns that make API calls
  
- file: client/src/services/__tests__/ankiScheduler.test.ts
  why: Testing patterns using vitest framework
```

### Current Codebase Structure
```bash
studymaster-pwa/
├── client/                     # React frontend
│   ├── src/
│   │   ├── lib/supabase.ts    # Supabase client (TO REPLACE)
│   │   ├── stores/
│   │   │   ├── supabaseAuthStore.ts  # Auth store (TO REPLACE)
│   │   │   └── authStore.ts    # Fallback auth (REFERENCE)
│   │   ├── services/
│   │   │   ├── userDataService.ts     # API service layer
│   │   │   └── __tests__/            # Vitest tests
│   │   └── types/index.ts      # TypeScript types
│   └── package.json           # Client dependencies
├── server/                    # Express backend (MINIMAL USAGE)
├── shared/                    # Shared TypeScript types
├── pocketbase/               # PocketBase installation
│   └── pocketbase.exe        # PocketBase executable
└── supabase/                # Supabase schemas (REFERENCE)
    └── schema.sql            # Database schema to migrate
```

### Desired Codebase Structure with PocketBase
```bash
studymaster-pwa/
├── client/
│   ├── src/
│   │   ├── lib/
│   │   │   ├── pocketbase.ts         # NEW: PocketBase client
│   │   │   └── supabase.ts          # DEPRECATED: Keep for reference
│   │   ├── stores/
│   │   │   ├── pocketbaseAuthStore.ts # NEW: PocketBase auth store
│   │   │   ├── supabaseAuthStore.ts   # DEPRECATED: Keep for reference
│   │   │   └── authStore.ts          # UPDATED: Primary auth store
│   │   ├── services/
│   │   │   ├── userDataService.ts    # UPDATED: Use PocketBase client
│   │   │   └── __tests__/           # UPDATED: Tests for PocketBase
│   │   └── types/
│   │       └── pocketbase.ts        # NEW: PocketBase-specific types
│   └── package.json                 # UPDATED: PocketBase SDK dependency
├── pocketbase/
│   ├── pb_data/                     # PocketBase data directory
│   ├── pb_migrations/              # Database migrations
│   └── pocketbase.exe              # PocketBase server
└── scripts/
    └── setup-pocketbase.js         # NEW: Setup and seed script
```

### Known Gotchas & Library Quirks
```javascript
// CRITICAL: PocketBase uses different auth patterns than Supabase
// Supabase: Session-based with automatic refresh
// PocketBase: Token-based with manual refresh

// CRITICAL: Different query syntax
// Supabase: .select().from().eq()
// PocketBase: .getList() with filter string

// CRITICAL: Auth store differences
// Supabase: Built-in session management
// PocketBase: Manual token storage in authStore

// CRITICAL: Different error handling
// Supabase: PostgrestError
// PocketBase: ClientResponseError

// CRITICAL: File uploads different
// Supabase: Storage buckets
// PocketBase: FormData with record operations

// CRITICAL: Real-time subscriptions different syntax
// Supabase: .on() with channels
// PocketBase: .subscribe() with collections
```

## Implementation Blueprint

### Data Models and Structure

Migrate existing Supabase database schema to PocketBase collections:
```typescript
// PocketBase Collections Structure
interface PocketBaseCollections {
  users: {
    // Built-in auth fields: id, email, password, created, updated
    username: string
    level: number
    total_xp: number
    coins: number
    gems: number
    last_active: string
    preferences: UserPreferences // JSON field
  }
  
  decks: {
    id: string
    user_id: string // relation to users
    title: string
    description: string
    card_count: number
    is_public: boolean
    settings: any // JSON field
    tags: string[] // JSON array
    category: string
    created: string // auto
    updated: string // auto
  }
  
  cards: {
    id: string
    deck_id: string // relation to decks
    front_content: string
    back_content: string
    card_type: any // JSON field
    state: string
    due: number
    interval_days: number
    ease_factor: number
    review_count: number
    lapse_count: number
    created: string // auto
    updated: string // auto
  }
}
```

### List of Tasks to Complete the PRP

```yaml
Task 1 - Install and Setup PocketBase:
  CREATE scripts/setup-pocketbase.js:
    - Download PocketBase if not exists
    - Start PocketBase server
    - Create initial admin account
    - Setup collections via API
  
  MODIFY package.json:
    - ADD pocketbase dependency to client
    - ADD setup script to scripts

Task 2 - Create PocketBase Client:
  CREATE client/src/lib/pocketbase.ts:
    - MIRROR pattern from: client/src/lib/supabase.ts
    - MODIFY to use PocketBase constructor
    - PRESERVE debug logging patterns
    - ADD environment variable configuration

Task 3 - Create Database Schema Migration:
  CREATE pocketbase/pb_migrations/001_initial_schema.js:
    - MIGRATE profiles table to users collection
    - MIGRATE decks table structure  
    - MIGRATE cards table structure
    - ADD proper field types and constraints
  
  MODIFY client/src/types/index.ts:
    - ADD PocketBase-specific types
    - PRESERVE existing types for compatibility

Task 4 - Create PocketBase Auth Store:
  CREATE client/src/stores/pocketbaseAuthStore.ts:
    - MIRROR pattern from: client/src/stores/supabaseAuthStore.ts
    - MODIFY authentication methods for PocketBase
    - PRESERVE error handling and state management
    - ADD token refresh logic
    - KEEP debug logging patterns

Task 5 - Update Primary Auth Store:
  MODIFY client/src/stores/authStore.ts:
    - INJECT PocketBase auth methods
    - PRESERVE fallback localStorage patterns
    - MODIFY to use PocketBase as primary
    - KEEP existing demo user functionality

Task 6 - Update Service Layer:
  MODIFY client/src/services/userDataService.ts:
    - FIND pattern: supabase client usage
    - REPLACE with: PocketBase client calls
    - PRESERVE error handling and fallback patterns
    - MODIFY API calls to use PocketBase syntax

Task 7 - Create Test User Setup:
  CREATE scripts/seed-test-user.js:
    - CREATE test user "gurka" with password "gurka123"
    - ADD sample deck and card data
    - INJECT into PocketBase via admin API

Task 8 - Update Tests:
  MODIFY client/src/services/__tests__/*.test.ts:
    - FIND pattern: Supabase mocking
    - REPLACE with: PocketBase mocking  
    - PRESERVE test structure and assertions
    - ADD PocketBase-specific test utilities

Task 9 - Environment Configuration:
  CREATE .env.local:
    - ADD VITE_POCKETBASE_URL variable
    - REMOVE Supabase environment variables
    - ADD PocketBase admin credentials for scripts

  MODIFY client/src/lib/pocketbase.ts:
    - USE environment variables for configuration
    - ADD development vs production URL handling

Task 10 - Integration Testing:
  CREATE client/src/__tests__/integration/pocketbase.test.ts:
    - TEST authentication flow end-to-end
    - TEST CRUD operations for all collections
    - TEST test user login
    - VERIFY data persistence

Task 11 - Update Documentation:
  MODIFY README.md:
    - UPDATE setup instructions for PocketBase
    - ADD PocketBase server startup instructions
    - PRESERVE existing development workflow
    - ADD troubleshooting section

Task 12 - Migration Script:
  CREATE scripts/migrate-from-supabase.js:
    - OPTIONAL: Export data from existing Supabase
    - IMPORT into PocketBase collections
    - VERIFY data integrity
```

### Per Task Pseudocode

```typescript
// Task 2: PocketBase Client
import PocketBase from 'pocketbase'
import { debugLogger } from '../utils/debugLogger'

const pocketbaseUrl = import.meta.env.VITE_POCKETBASE_URL || 'http://127.0.0.1:8090'

export const pb = new PocketBase(pocketbaseUrl)

// PATTERN: Auth state change listener similar to Supabase
pb.authStore.onChange((token, record) => {
  debugLogger.log('[POCKETBASE]', 'Auth state change', {
    hasToken: !!token,
    hasRecord: !!record,
    userId: record?.id
  })
})

// Task 4: PocketBase Auth Store
export const usePocketbaseAuthStore = create<AuthState>()((set, get) => ({
  signIn: async (email: string, password: string) => {
    // PATTERN: Similar error handling as Supabase
    set({ isLoading: true, error: null })
    
    try {
      // CRITICAL: PocketBase auth method differs
      const authData = await pb.collection('users').authWithPassword(email, password)
      
      const user = convertPocketbaseUser(authData.record)
      
      set({
        user,
        session: authData, // Different from Supabase session
        isAuthenticated: true,
        isLoading: false
      })
    } catch (error) {
      // PATTERN: Same error handling as Supabase store
      set({
        error: error.message,
        isLoading: false
      })
    }
  }
}))

// Task 6: Service Layer Update  
export class UserDataService {
  async getUserStats(user: AuthenticatedUser): Promise<UserStats> {
    try {
      // CRITICAL: Different query syntax
      const record = await pb.collection('users').getOne(user.id, {
        fields: 'level,total_xp,coins,gems' // PocketBase field selection
      })
      
      return this.convertToUserStats(record)
    } catch (error) {
      // PATTERN: Same fallback as current implementation
      return this.generatePersonalizedMockStats(user)
    }
  }
}
```

### Integration Points
```yaml
DATABASE:
  - collections: "Create users, decks, cards collections in PocketBase"
  - relations: "Setup proper foreign key relationships"
  
CONFIG:
  - add to: client/.env.local
  - pattern: "VITE_POCKETBASE_URL=http://127.0.0.1:8090"
  
ROUTES:
  - modify: client/src/main.tsx
  - pattern: "Initialize PocketBase auth before React app"
  
DEPENDENCIES:
  - add to: client/package.json
  - remove: "@supabase/supabase-js": "^2.52.0"
  - add: "pocketbase": "^0.21.0"
```

## Validation Loop

### Level 1: Syntax & Style
```bash
# Run these FIRST - fix any errors before proceeding
cd client && npm run lint        # ESLint checks
cd client && npm run test        # Vitest type checking

# Expected: No errors. If errors, READ the error and fix.
```

### Level 2: Unit Tests
```typescript
// UPDATE existing tests with PocketBase patterns
describe('PocketbaseAuthStore', () => {
  it('should authenticate user successfully', async () => {
    const mockAuthData = {
      record: { id: 'test-user', email: 'test@example.com' },
      token: 'mock-token'
    }
    
    // Mock PocketBase client
    vi.spyOn(pb.collection('users'), 'authWithPassword')
      .mockResolvedValue(mockAuthData)
    
    const store = usePocketbaseAuthStore.getState()
    await store.signIn('test@example.com', 'password')
    
    expect(store.isAuthenticated).toBe(true)
    expect(store.user?.id).toBe('test-user')
  })

  it('should handle authentication errors', async () => {
    vi.spyOn(pb.collection('users'), 'authWithPassword')
      .mockRejectedValue(new Error('Invalid credentials'))
    
    const store = usePocketbaseAuthStore.getState()
    await store.signIn('invalid@example.com', 'wrong')
    
    expect(store.error).toBe('Invalid credentials')
    expect(store.isAuthenticated).toBe(false)
  })
})
```

```bash
# Run and iterate until passing:
cd client && npm run test
# If failing: Read error, understand root cause, fix code, re-run
```

### Level 3: Integration Test
```bash
# Start PocketBase server
cd pocketbase && ./pocketbase serve

# Start development server
cd client && npm run dev

# Test authentication manually
# 1. Go to http://localhost:5173
# 2. Try to log in with gurka/gurka123
# 3. Verify dashboard loads with user data
# 4. Test deck creation and card operations

# Expected: All features work without Supabase
# If error: Check browser console and PocketBase logs
```

### Level 4: Database Operations Test
```bash
# Test CRUD operations
curl -X POST http://127.0.0.1:8090/api/collections/users/auth-with-password \
  -H "Content-Type: application/json" \
  -d '{"identity": "gurka", "password": "gurka123"}'

# Expected: Returns auth token and user record
# Test other endpoints similarly
```

## Final Validation Checklist
- [ ] All tests pass: `cd client && npm run test`
- [ ] No linting errors: `cd client && npm run lint`
- [ ] PocketBase server starts: `cd pocketbase && ./pocketbase serve`
- [ ] Test user can authenticate: Login with gurka/gurka123
- [ ] Database operations work: Create deck, add cards, study session
- [ ] Error cases handled gracefully: Invalid login, network errors
- [ ] Existing features preserved: All current functionality works
- [ ] Environment properly configured: Local and production settings

---

## Anti-Patterns to Avoid
- ❌ Don't remove Supabase files immediately - keep as reference during migration
- ❌ Don't skip the test user creation - it's required for testing  
- ❌ Don't use Supabase query patterns in PocketBase - syntax is different
- ❌ Don't ignore auth token management - PocketBase requires manual handling
- ❌ Don't hardcode PocketBase URL - use environment variables
- ❌ Don't assume same error formats - handle PocketBase-specific errors
- ❌ Don't skip migration testing - verify all data transfers correctly

## Migration Confidence Score: 8/10

**Reasoning**: 
- ✅ Clear documentation available for PocketBase
- ✅ Well-defined current architecture to migrate from
- ✅ Strong testing patterns already in place
- ✅ Local development environment controllable
- ⚠️ Different authentication patterns require careful handling
- ⚠️ Query syntax differences need systematic replacement
- ✅ PocketBase SDK provides clear migration path
- ✅ Existing fallback patterns reduce migration risk

The migration has high success probability with the comprehensive research and clear implementation path provided. The main risks are in authentication flow differences and query syntax changes, both of which are well-documented and testable.