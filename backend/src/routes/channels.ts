import { Router, Response } from 'express';
import { query } from '../config/database';
import { authenticateToken, requireRole, AuthRequest } from '../middleware/auth';

const router = Router();

// Get all channels
router.get('/', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const result = await query('SELECT * FROM channels ORDER BY type, name');
    res.json(result.rows);
  } catch (error) {
    console.error('Get channels error:', error);
    res.status(500).json({ message: 'Error al obtener canales' });
  }
});

// Get channel by ID
router.get('/:id', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const result = await query('SELECT * FROM channels WHERE id = $1', [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Canal no encontrado' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Get channel error:', error);
    res.status(500).json({ message: 'Error al obtener canal' });
  }
});

// Get messages of a channel
router.get('/:id/messages', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { limit = 100, before } = req.query;

    let sql = `
      SELECT m.*, u.username, u.avatar_url
      FROM messages m
      JOIN users u ON u.id = m.user_id
      WHERE m.channel_id = $1
    `;
    const params: unknown[] = [id];
    let paramIndex = 2;

    if (before) {
      sql += ` AND m.created_at < $${paramIndex++}`;
      params.push(before);
    }

    sql += ` ORDER BY m.created_at ASC LIMIT $${paramIndex}`;
    params.push(Number(limit));

    const result = await query(sql, params);

    // Transform to include user object
    const messages = result.rows.map(row => ({
      id: row.id,
      channel_id: row.channel_id,
      user_id: row.user_id,
      content: row.content,
      created_at: row.created_at,
      user: {
        username: row.username,
        avatar_url: row.avatar_url
      }
    }));

    res.json(messages);
  } catch (error) {
    console.error('Get messages error:', error);
    res.status(500).json({ message: 'Error al obtener mensajes' });
  }
});

// Create channel (admin only)
router.post('/', authenticateToken, requireRole('admin', 'manager'), async (req: AuthRequest, res: Response) => {
  try {
    const { name, type, description } = req.body;

    if (!name || !type) {
      return res.status(400).json({ message: 'name y type son requeridos' });
    }

    if (!['voice', 'text'].includes(type)) {
      return res.status(400).json({ message: 'type debe ser "voice" o "text"' });
    }

    const result = await query(
      `INSERT INTO channels (name, type, description)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [name, type, description]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Create channel error:', error);
    res.status(500).json({ message: 'Error al crear canal' });
  }
});

// Delete channel (admin only)
router.delete('/:id', authenticateToken, requireRole('admin'), async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const result = await query('DELETE FROM channels WHERE id = $1 RETURNING id', [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Canal no encontrado' });
    }

    res.json({ message: 'Canal eliminado' });
  } catch (error) {
    console.error('Delete channel error:', error);
    res.status(500).json({ message: 'Error al eliminar canal' });
  }
});

export default router;
