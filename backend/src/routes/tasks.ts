import { Router, Response } from 'express';
import { query } from '../config/database';
import { authenticateToken, AuthRequest } from '../middleware/auth';

const router = Router();

// Get all tasks (with assignees)
router.get('/', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { status, project_id, created_by } = req.query;

    let sql = `SELECT * FROM tasks_with_assignees WHERE 1=1`;
    const params: unknown[] = [];
    let paramIndex = 1;

    if (status) {
      sql += ` AND status = $${paramIndex++}`;
      params.push(status);
    }
    if (project_id) {
      sql += ` AND project_id = $${paramIndex++}`;
      params.push(project_id);
    }
    if (created_by) {
      sql += ` AND created_by = $${paramIndex++}`;
      params.push(created_by);
    }

    sql += ' ORDER BY created_at DESC';

    const result = await query(sql, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Get tasks error:', error);
    res.status(500).json({ message: 'Error al obtener tareas' });
  }
});

// Get time summary
router.get('/time-summary', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const result = await query('SELECT * FROM task_time_summary ORDER BY total_hours DESC');
    res.json(result.rows);
  } catch (error) {
    console.error('Get time summary error:', error);
    res.status(500).json({ message: 'Error al obtener resumen de tiempo' });
  }
});

// Get task by ID
router.get('/:id', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const result = await query('SELECT * FROM tasks_with_assignees WHERE id = $1', [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Tarea no encontrada' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Get task error:', error);
    res.status(500).json({ message: 'Error al obtener tarea' });
  }
});

// Get subtasks of a task
router.get('/:id/subtasks', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const result = await query(
      'SELECT * FROM subtasks_with_assignees WHERE task_id = $1 ORDER BY order_index',
      [id]
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Get subtasks error:', error);
    res.status(500).json({ message: 'Error al obtener subtareas' });
  }
});

// Get comments of a task
router.get('/:id/comments', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const result = await query(
      `SELECT c.*, u.username, u.avatar_url
       FROM task_comments c
       JOIN users u ON u.id = c.user_id
       WHERE c.task_id = $1
       ORDER BY c.created_at DESC`,
      [id]
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Get comments error:', error);
    res.status(500).json({ message: 'Error al obtener comentarios' });
  }
});

// Create task
router.post('/', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { title, description, project_id, status, priority, due_date, estimated_hours } = req.body;

    if (!title) {
      return res.status(400).json({ message: 'El título es requerido' });
    }

    const result = await query(
      `INSERT INTO tasks (title, description, project_id, status, priority, created_by, due_date, estimated_hours)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [title, description, project_id, status || 'pending', priority || 'medium', req.user!.id, due_date, estimated_hours]
    );

    // Log activity
    await query(
      `INSERT INTO activities (user_id, activity_type, title, task_id)
       VALUES ($1, 'task_created', $2, $3)`,
      [req.user!.id, `Creó la tarea: ${title}`, result.rows[0].id]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Create task error:', error);
    res.status(500).json({ message: 'Error al crear tarea' });
  }
});

// Update task
router.patch('/:id', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { title, description, project_id, status, priority, due_date, estimated_hours } = req.body;

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
    if (project_id !== undefined) {
      updates.push(`project_id = $${paramIndex++}`);
      values.push(project_id);
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

    if (updates.length === 0) {
      return res.status(400).json({ message: 'No hay campos para actualizar' });
    }

    values.push(id);
    const result = await query(
      `UPDATE tasks SET ${updates.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
      values
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Tarea no encontrada' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Update task error:', error);
    res.status(500).json({ message: 'Error al actualizar tarea' });
  }
});

// Delete task
router.delete('/:id', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const result = await query('DELETE FROM tasks WHERE id = $1 RETURNING id', [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Tarea no encontrada' });
    }

    res.json({ message: 'Tarea eliminada' });
  } catch (error) {
    console.error('Delete task error:', error);
    res.status(500).json({ message: 'Error al eliminar tarea' });
  }
});

// Assign user to task
router.post('/:id/assignees', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { user_id } = req.body;

    if (!user_id) {
      return res.status(400).json({ message: 'user_id es requerido' });
    }

    await query(
      `INSERT INTO task_assignees (task_id, user_id, assigned_by)
       VALUES ($1, $2, $3)
       ON CONFLICT (task_id, user_id) DO NOTHING`,
      [id, user_id, req.user!.id]
    );

    // Log activity
    const userResult = await query('SELECT username FROM users WHERE id = $1', [user_id]);
    const taskResult = await query('SELECT title FROM tasks WHERE id = $1', [id]);

    if (userResult.rows.length > 0 && taskResult.rows.length > 0) {
      await query(
        `INSERT INTO activities (user_id, activity_type, title, task_id)
         VALUES ($1, 'task_assigned', $2, $3)`,
        [req.user!.id, `Asignó a ${userResult.rows[0].username} a: ${taskResult.rows[0].title}`, id]
      );
    }

    res.json({ message: 'Usuario asignado' });
  } catch (error) {
    console.error('Assign user error:', error);
    res.status(500).json({ message: 'Error al asignar usuario' });
  }
});

// Remove user from task
router.delete('/:id/assignees/:userId', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { id, userId } = req.params;

    await query('DELETE FROM task_assignees WHERE task_id = $1 AND user_id = $2', [id, userId]);

    res.json({ message: 'Usuario removido de la tarea' });
  } catch (error) {
    console.error('Remove assignee error:', error);
    res.status(500).json({ message: 'Error al remover usuario' });
  }
});

export default router;
