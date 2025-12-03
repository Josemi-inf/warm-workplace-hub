import { Router, Response } from 'express';
import { query } from '../config/database';
import { authenticateToken, AuthRequest } from '../middleware/auth';

const router = Router();

// Create comment
router.post('/', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { task_id, subtask_id, content } = req.body;

    if (!content) {
      return res.status(400).json({ message: 'content es requerido' });
    }

    if (!task_id && !subtask_id) {
      return res.status(400).json({ message: 'task_id o subtask_id es requerido' });
    }

    const result = await query(
      `INSERT INTO task_comments (task_id, subtask_id, user_id, content)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [task_id || null, subtask_id || null, req.user!.id, content]
    );

    // Get user info
    const userResult = await query(
      'SELECT username, avatar_url FROM users WHERE id = $1',
      [req.user!.id]
    );

    const comment = {
      ...result.rows[0],
      username: userResult.rows[0].username,
      avatar_url: userResult.rows[0].avatar_url
    };

    // Log activity
    await query(
      `INSERT INTO activities (user_id, activity_type, title, task_id, subtask_id)
       VALUES ($1, 'comment_added', 'Agregó un comentario', $2, $3)`,
      [req.user!.id, task_id, subtask_id]
    );

    res.status(201).json(comment);
  } catch (error) {
    console.error('Create comment error:', error);
    res.status(500).json({ message: 'Error al crear comentario' });
  }
});

// Update comment
router.patch('/:id', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { content } = req.body;

    if (!content) {
      return res.status(400).json({ message: 'content es requerido' });
    }

    const result = await query(
      `UPDATE task_comments SET content = $1
       WHERE id = $2 AND user_id = $3
       RETURNING *`,
      [content, id, req.user!.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Comentario no encontrado' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Update comment error:', error);
    res.status(500).json({ message: 'Error al actualizar comentario' });
  }
});

// Delete comment
router.delete('/:id', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const result = await query(
      'DELETE FROM task_comments WHERE id = $1 AND user_id = $2 RETURNING id',
      [id, req.user!.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Comentario no encontrado' });
    }

    res.json({ message: 'Comentario eliminado' });
  } catch (error) {
    console.error('Delete comment error:', error);
    res.status(500).json({ message: 'Error al eliminar comentario' });
  }
});

export default router;
