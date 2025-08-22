import { Router } from 'express';
import { Request, Response } from 'express';

const router = Router();

// Mock user database for testing
const mockUsers = new Map([
  ['gurka@gurka.com', { 
    id: '1', 
    email: 'gurka@gurka.com', 
    username: 'Gurka', 
    password: 'gurka',
    level: 8, 
    totalXp: 2400, 
    coins: 150,
    gems: 25,
    createdAt: '2024-01-01T00:00:00.000Z',
    lastActive: new Date().toISOString(),
    preferences: {
      theme: 'system',
      language: 'en',
      notifications: true,
      soundEffects: true,
      dailyGoal: 50,
      timezone: 'UTC'
    }
  }],
  ['demo@studymaster.com', { 
    id: '2', 
    email: 'demo@studymaster.com', 
    username: 'DemoUser', 
    password: 'demo',
    level: 5, 
    totalXp: 2500, 
    coins: 150,
    gems: 25,
    createdAt: '2024-01-01T00:00:00.000Z',
    lastActive: new Date().toISOString(),
    preferences: {
      theme: 'system',
      language: 'en',
      notifications: true,
      soundEffects: true,
      dailyGoal: 50,
      timezone: 'UTC'
    }
  }]
]);

// POST /api/auth/register
router.post('/register', async (req: Request, res: Response) => {
  try {
    const { email, password, username } = req.body;
    
    if (!email || !password || !username) {
      return res.status(400).json({
        success: false,
        message: 'Email, username and password are required'
      });
    }
    
    if (password.length < 4) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 4 characters long'
      });
    }
    
    // Check if user already exists
    if (mockUsers.has(email.toLowerCase())) {
      return res.status(409).json({
        success: false,
        message: 'User with this email already exists'
      });
    }
    
    // Create new user
    const newUser = {
      id: Date.now().toString(),
      email: email.toLowerCase(),
      username,
      password, // In production, this should be hashed
      level: 1,
      totalXp: 0,
      coins: 100,
      gems: 10,
      createdAt: new Date().toISOString(),
      lastActive: new Date().toISOString(),
      preferences: {
        theme: 'system',
        language: 'en',
        notifications: true,
        soundEffects: true,
        dailyGoal: 50,
        timezone: 'UTC'
      }
    };
    
    // Add to mock database
    mockUsers.set(email.toLowerCase(), newUser);
    
    // Return user without password
    const { password: _, ...userWithoutPassword } = newUser;

    return res.status(201).json({
      success: true,
      user: userWithoutPassword,
      token: 'mock-jwt-token-' + newUser.id
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Registration failed'
    });
  }
});

// POST /api/auth/login
router.post('/login', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email and password are required'
      });
    }
    
    // Find user by email
    const user = mockUsers.get(email.toLowerCase());
    
    if (!user || user.password !== password) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }
    
    // Return user without password
    const { password: _, ...userWithoutPassword } = user;

    return res.json({
      success: true,
      user: userWithoutPassword,
      token: 'mock-jwt-token-' + user.id
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Login failed'
    });
  }
});

// POST /api/auth/logout
router.post('/logout', async (req: Request, res: Response) => {
  res.json({
    success: true,
    message: 'Logged out successfully'
  });
});

// GET /api/auth/me
router.get('/me', async (req: Request, res: Response) => {
  // Simulate getting current user
  const user = {
    id: '1',
    email: 'demo@example.com',
    name: 'Demo User',
    level: 8,
    xp: 2400,
    streak: 15,
    createdAt: '2024-01-01T00:00:00.000Z'
  };

  res.json({
    success: true,
    data: user
  });
});

export default router;