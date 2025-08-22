import { Router } from 'express';
import { Request, Response } from 'express';

const router = Router();

// GET /api/study/:deckId/next
router.get('/:deckId/next', async (req: Request, res: Response) => {
  const { deckId } = req.params;
  
  // Mock card for study session
  const card = {
    id: '1',
    deckId,
    front: 'Hola',
    back: 'Hello',
    difficulty: 1,
    nextReview: new Date().toISOString(),
    reviewCount: 5,
    correctCount: 4
  };

  res.json({
    success: true,
    data: card
  });
});

// POST /api/study/review
router.post('/review', async (req: Request, res: Response) => {
  const { cardId, correct, difficulty } = req.body;
  
  // Mock spaced repetition calculation
  const nextReview = new Date();
  if (correct) {
    nextReview.setDate(nextReview.getDate() + Math.pow(2, difficulty));
  } else {
    nextReview.setHours(nextReview.getHours() + 1);
  }

  const updatedCard = {
    id: cardId,
    nextReview: nextReview.toISOString(),
    difficulty: correct ? Math.min(difficulty + 1, 5) : 1,
    reviewCount: 1,
    correctCount: correct ? 1 : 0
  };

  res.json({
    success: true,
    data: updatedCard
  });
});

// GET /api/study/stats/:userId
router.get('/stats/:userId', async (req: Request, res: Response) => {
  const stats = {
    totalCards: 425,
    masteredCards: 357,
    cardsToReview: 23,
    streak: 15,
    xp: 2450,
    level: 8
  };

  res.json({
    success: true,
    data: stats
  });
});

export default router;