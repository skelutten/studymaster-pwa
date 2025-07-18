import { Router } from 'express';
import { Request, Response } from 'express';

const router = Router();

// POST /api/auth/register
router.post('/register', async (req: Request, res: Response) => {
  try {
    const { email, password, name } = req.body;
    
    // Simulate user registration
    const user = {
      id: Date.now().toString(),
      email,
      name,
      level: 1,
      xp: 0,
      streak: 0,
      createdAt: new Date().toISOString()
    };

    res.status(201).json({
      success: true,
      data: {
        user,
        token: 'mock-jwt-token-' + user.id
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Registration failed'
    });
  }
});

// POST /api/auth/login
router.post('/login', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;
    
    // Simulate user login
    const user = {
      id: '1',
      email,
      name: 'Demo User',
      level: 8,
      xp: 2400,
      streak: 15,
      createdAt: '2024-01-01T00:00:00.000Z'
    };

    res.json({
      success: true,
      data: {
        user,
        token: 'mock-jwt-token-' + user.id
      }
    });
  } catch (error) {
    res.status(500).json({
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