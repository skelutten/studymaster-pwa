import { Router } from 'express';
import { Request, Response } from 'express';

const router = Router();

// GET /api/social/friends/:userId
router.get('/friends/:userId', async (req: Request, res: Response) => {
  const friends = [
    {
      id: '1',
      username: 'StudyBuddy',
      level: 9,
      streak: 23,
      status: 'online'
    },
    {
      id: '2',
      username: 'FlashMaster',
      level: 7,
      streak: 15,
      status: 'offline'
    }
  ];

  res.json({
    success: true,
    data: friends
  });
});

// GET /api/social/challenges/:userId
router.get('/challenges/:userId', async (req: Request, res: Response) => {
  const challenges = [
    {
      id: '1',
      name: 'Weekly Study Challenge',
      description: 'Study 100 cards this week',
      progress: 75,
      target: 100,
      reward: '50 XP',
      expiresAt: '2024-01-07T23:59:59.000Z'
    },
    {
      id: '2',
      name: 'Perfect Week',
      description: 'Get 100% accuracy for 7 days',
      progress: 5,
      target: 7,
      reward: '100 XP + Badge',
      expiresAt: '2024-01-14T23:59:59.000Z'
    }
  ];

  res.json({
    success: true,
    data: challenges
  });
});

// POST /api/social/share
router.post('/share', async (req: Request, res: Response) => {
  const { userId, deckId, message } = req.body;
  
  const share = {
    id: Date.now().toString(),
    userId,
    deckId,
    message,
    createdAt: new Date().toISOString(),
    likes: 0,
    comments: []
  };

  res.status(201).json({
    success: true,
    data: share
  });
});

export default router;