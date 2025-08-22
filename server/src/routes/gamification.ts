import { Router } from 'express';
import { Request, Response } from 'express';

const router = Router();

// GET /api/gamification/achievements/:userId
router.get('/achievements/:userId', async (req: Request, res: Response) => {
  const achievements = [
    {
      id: '1',
      name: 'First Steps',
      description: 'Complete your first study session',
      icon: '🎯',
      unlocked: true,
      unlockedAt: '2024-01-01T00:00:00.000Z'
    },
    {
      id: '2',
      name: 'Week Warrior',
      description: 'Study for 7 consecutive days',
      icon: '🔥',
      unlocked: true,
      unlockedAt: '2024-01-08T00:00:00.000Z'
    },
    {
      id: '3',
      name: 'Master Scholar',
      description: 'Master 100 cards',
      icon: '🏆',
      unlocked: false,
      unlockedAt: null
    }
  ];

  res.json({
    success: true,
    data: achievements
  });
});

// GET /api/gamification/leaderboard
router.get('/leaderboard', async (req: Request, res: Response) => {
  const leaderboard = [
    {
      rank: 1,
      username: 'StudyMaster',
      xp: 5420,
      level: 12,
      streak: 45
    },
    {
      rank: 2,
      username: 'FlashcardPro',
      xp: 4890,
      level: 11,
      streak: 32
    },
    {
      rank: 3,
      username: 'MemoryChamp',
      xp: 4250,
      level: 10,
      streak: 28
    }
  ];

  res.json({
    success: true,
    data: leaderboard
  });
});

// POST /api/gamification/xp
router.post('/xp', async (req: Request, res: Response) => {
  const { userId, action, amount } = req.body;
  
  const xpGained = {
    action,
    amount,
    totalXp: 2450 + amount,
    levelUp: false,
    newLevel: 8
  };

  res.json({
    success: true,
    data: xpGained
  });
});

export default router;