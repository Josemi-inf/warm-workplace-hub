import { Router, Response } from 'express';
import { query } from '../config/database';
import { authenticateToken, AuthRequest } from '../middleware/auth';

const router = Router();

// Send message
router.post('/', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { channel_id, content } = req.body;

    if (!channel_id || !content) {
      return res.status(400).json({ message: 'channel_id y content son requeridos' });
    }

    const result = await query(
      `INSERT INTO messages (channel_id, user_id, content)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [channel_id, req.user!.id, content]
    );

    // Get user info
    const userResult = await query(
      'SELECT username, avatar_url FROM users WHERE id = $1',
      [req.user!.id]
    );

    const message = {
      ...result.rows[0],
      user: userResult.rows[0]
    };

    res.status(201).json(message);
  } catch (error) {
    console.error('Send message error:', error);
    res.status(500).json({ message: 'Error al enviar mensaje' });
  }
});

// Delete message (own messages only)
router.delete('/:id', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const result = await query(
      'DELETE FROM messages WHERE id = $1 AND user_id = $2 RETURNING id',
      [id, req.user!.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Mensaje no encontrado' });
    }

    res.json({ message: 'Mensaje eliminado' });
  } catch (error) {
    console.error('Delete message error:', error);
    res.status(500).json({ message: 'Error al eliminar mensaje' });
  }
});

export default router;
