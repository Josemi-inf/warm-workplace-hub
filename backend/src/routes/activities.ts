import { Router, Response } from 'express';
import { query } from '../config/database';
import { authenticateToken, AuthRequest } from '../middleware/auth';

const router = Router();

// Get all activities
router.get('/', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { limit = 50 } = req.query;

    const result = await query(
      `SELECT a.*, u.username, u.avatar_url
       FROM activities a
       JOIN users u ON u.id = a.user_id
       ORDER BY a.created_at DESC
       LIMIT $1`,
      [Number(limit)]
    );

    res.json(result.rows);
  } catch (error) {
    console.error('Get activities error:', error);
    res.status(500).json({ message: 'Error al obtener actividades' });
  }
});

export default router;
