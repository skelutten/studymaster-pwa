import { Router } from 'express';
import { Request, Response } from 'express';

const router = Router();

// GET /api/users/profile
router.get('/profile', async (req: Request, res: Response) => {
  const user = {
    id: '1',
    email: 'demo@example.com',
    name: 'Demo User',
    level: 8,
    xp: 2400,
    streak: 15,
    stats: {
      cardsStudied: 1247,
      decksCreated: 8,
      totalXP: 2400,
      currentStreak: 15
    }
  };

  res.json({
    success: true,
    data: user
  });
});

// PUT /api/users/profile
router.put('/profile', async (req: Request, res: Response) => {
  const { name, email } = req.body;
  
  res.json({
    success: true,
    data: {
      id: '1',
      name,
      email,
      level: 8,
      xp: 2400,
      streak: 15
    }
  });
});

export default router;