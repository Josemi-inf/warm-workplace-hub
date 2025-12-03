import { Router, Response } from 'express';
import { query } from '../config/database';
import { authenticateToken, AuthRequest } from '../middleware/auth';

const router = Router();

// Get subtask by ID
router.get('/:id', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const result = await query('SELECT * FROM subtasks_with_assignees WHERE id = $1', [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Subtarea no encontrada' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Get subtask error:', error);
    res.status(500).json({ message: 'Error al obtener subtarea' });
  }
});

// Get comments of a subtask
router.get('/:id/comments', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const result = await query(
      `SELECT c.*, u.username, u.avatar_url
       FROM task_comments c
       JOIN users u ON u.id = c.user_id
       WHERE c.subtask_id = $1
       ORDER BY c.created_at DESC`,
      [id]
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Get comments error:', error);
    res.status(500).json({ message: 'Error al obtener comentarios' });
  }
});

// Create subtask
router.post('/', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { task_id, title, description, status, priority, due_date, estimated_hours, order_index } = req.body;

    if (!task_id || !title) {
      return res.status(400).json({ message: 'task_id y title son requeridos' });
    }

    // Get max order_index if not provided
    let finalOrderIndex = order_index;
    if (finalOrderIndex === undefined) {
      const maxResult = await query(
        'SELECT COALESCE(MAX(order_index), -1) + 1 as next_index FROM subtasks WHERE task_id = $1',
        [task_id]
      );
      finalOrderIndex = maxResult.rows[0].next_index;
    }

    const result = await query(
      `INSERT INTO subtasks (task_id, title, description, status, priority, due_date, estimated_hours, order_index)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [task_id, title, description, status || 'pending', priority || 'medium', due_date, estimated_hours, finalOrderIndex]
    );

    // Log activity
    await query(
      `INSERT INTO activities (user_id, activity_type, title, subtask_id, task_id)
       VALUES ($1, 'subtask_created', $2, $3, $4)`,
      [req.user!.id, `Creó la subtarea: ${title}`, result.rows[0].id, task_id]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Create subtask error:', error);
    res.status(500).json({ message: 'Error al crear subtarea' });
  }
});

// Update subtask
router.patch('/:id', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { title, description, status, priority, due_date, estimated_hours, order_index } = req.body;

    const updates: string[] = [];
    const values: unknown[] = [];
    let paramIndex = 1;

    if (title !== undefined) {
      updates.push(`title = $${paramIndex++}`);
      values.push(title);
    }
    if (description !== undefined) {
      updates.push(`description = $${paramIndex++}`);
      values.push(description);
    }
    if (status !== undefined) {
      updates.push(`status = $${paramIndex++}`);
      values.push(status);
    }
    if (priority !== undefined) {
      updates.push(`priority = $${paramIndex++}`);
      values.push(priority);
    }
    if (due_date !== undefined) {
      updates.push(`due_date = $${paramIndex++}`);
      values.push(due_date);
    }
    if (estimated_hours !== undefined) {
      updates.push(`estimated_hours = $${paramIndex++}`);
      values.push(estimated_hours);
    }
    if (order_index !== undefined) {
      updates.push(`order_index = $${paramIndex++}`);
      values.push(order_index);
    }

    if (updates.length === 0) {
      return res.status(400).json({ message: 'No hay campos para actualizar' });
    }

    values.push(id);
    const result = await query(
      `UPDATE subtasks SET ${updates.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
      values
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Subtarea no encontrada' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Update subtask error:', error);
    res.status(500).json({ message: 'Error al actualizar subtarea' });
  }
});

// Start subtask
router.post('/:id/start', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const result = await query(
      `UPDATE subtasks SET status = 'in_progress', started_at = NOW()
       WHERE id = $1 AND status = 'pending'
       RETURNING *`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Subtarea no encontrada o ya iniciada' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Start subtask error:', error);
    res.status(500).json({ message: 'Error al iniciar subtarea' });
  }
});

// Complete subtask
router.post('/:id/complete', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const result = await query(
      `UPDATE subtasks SET status = 'completed', completed_at = NOW()
       WHERE id = $1 AND status != 'completed'
       RETURNING *`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Subtarea no encontrada o ya completada' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Complete subtask error:', error);
    res.status(500).json({ message: 'Error al completar subtarea' });
  }
});

// Delete subtask
router.delete('/:id', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const result = await query('DELETE FROM subtasks WHERE id = $1 RETURNING id', [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Subtarea no encontrada' });
    }

    res.json({ message: 'Subtarea eliminada' });
  } catch (error) {
    console.error('Delete subtask error:', error);
    res.status(500).json({ message: 'Error al eliminar subtarea' });
  }
});

// Assign user to subtask
router.post('/:id/assignees', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { user_id } = req.body;

    if (!user_id) {
      return res.status(400).json({ message: 'user_id es requerido' });
    }

    await query(
      `INSERT INTO subtask_assignees (subtask_id, user_id, assigned_by)
       VALUES ($1, $2, $3)
       ON CONFLICT (subtask_id, user_id) DO NOTHING`,
      [id, user_id, req.user!.id]
    );

    res.json({ message: 'Usuario asignado' });
  } catch (error) {
    console.error('Assign user error:', error);
    res.status(500).json({ message: 'Error al asignar usuario' });
  }
});

// Remove user from subtask
router.delete('/:id/assignees/:userId', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { id, userId } = req.params;

    await query('DELETE FROM subtask_assignees WHERE subtask_id = $1 AND user_id = $2', [id, userId]);

    res.json({ message: 'Usuario removido de la subtarea' });
  } catch (error) {
    console.error('Remove assignee error:', error);
    res.status(500).json({ message: 'Error al remover usuario' });
  }
});

export default router;
