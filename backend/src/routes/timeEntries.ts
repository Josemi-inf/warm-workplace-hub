import { Router, Response } from 'express';
import { query } from '../config/database';
import { authenticateToken, AuthRequest } from '../middleware/auth';

const router = Router();

// Create time entry
router.post('/', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { subtask_id, started_at, ended_at, duration_minutes, description, is_manual } = req.body;

    if (!subtask_id || !started_at) {
      return res.status(400).json({ message: 'subtask_id y started_at son requeridos' });
    }

    const result = await query(
      `INSERT INTO time_entries (subtask_id, user_id, started_at, ended_at, duration_minutes, description, is_manual)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [subtask_id, req.user!.id, started_at, ended_at, duration_minutes, description, is_manual || false]
    );

    // Log activity if completed
    if (ended_at && duration_minutes) {
      await query(
        `INSERT INTO activities (user_id, activity_type, title, subtask_id, metadata)
         VALUES ($1, 'time_logged', $2, $3, $4)`,
        [req.user!.id, `Registró ${duration_minutes} minutos de trabajo`, subtask_id, JSON.stringify({ duration_minutes })]
      );
    }

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Create time entry error:', error);
    res.status(500).json({ message: 'Error al crear registro de tiempo' });
  }
});

// Start timer (create entry without end time)
router.post('/start', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { subtask_id } = req.body;

    if (!subtask_id) {
      return res.status(400).json({ message: 'subtask_id es requerido' });
    }

    // Check if there's already an active timer
    const activeTimer = await query(
      `SELECT id FROM time_entries WHERE user_id = $1 AND ended_at IS NULL`,
      [req.user!.id]
    );

    if (activeTimer.rows.length > 0) {
      return res.status(409).json({ message: 'Ya tienes un timer activo', activeTimerId: activeTimer.rows[0].id });
    }

    const result = await query(
      `INSERT INTO time_entries (subtask_id, user_id, started_at)
       VALUES ($1, $2, NOW())
       RETURNING *`,
      [subtask_id, req.user!.id]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Start timer error:', error);
    res.status(500).json({ message: 'Error al iniciar timer' });
  }
});

// Stop timer
router.post('/:id/stop', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const result = await query(
      `UPDATE time_entries
       SET ended_at = NOW(),
           duration_minutes = EXTRACT(EPOCH FROM (NOW() - started_at)) / 60
       WHERE id = $1 AND user_id = $2 AND ended_at IS NULL
       RETURNING *`,
      [id, req.user!.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Timer no encontrado o ya detenido' });
    }

    // Log activity
    const entry = result.rows[0];
    await query(
      `INSERT INTO activities (user_id, activity_type, title, subtask_id, metadata)
       VALUES ($1, 'time_logged', $2, $3, $4)`,
      [req.user!.id, `Registró ${Math.round(entry.duration_minutes)} minutos de trabajo`, entry.subtask_id, JSON.stringify({ duration_minutes: entry.duration_minutes })]
    );

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Stop timer error:', error);
    res.status(500).json({ message: 'Error al detener timer' });
  }
});

// Update time entry
router.patch('/:id', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { started_at, ended_at, duration_minutes, description } = req.body;

    const updates: string[] = [];
    const values: unknown[] = [];
    let paramIndex = 1;

    if (started_at !== undefined) {
      updates.push(`started_at = $${paramIndex++}`);
      values.push(started_at);
    }
    if (ended_at !== undefined) {
      updates.push(`ended_at = $${paramIndex++}`);
      values.push(ended_at);
    }
    if (duration_minutes !== undefined) {
      updates.push(`duration_minutes = $${paramIndex++}`);
      values.push(duration_minutes);
    }
    if (description !== undefined) {
      updates.push(`description = $${paramIndex++}`);
      values.push(description);
    }

    if (updates.length === 0) {
      return res.status(400).json({ message: 'No hay campos para actualizar' });
    }

    values.push(id, req.user!.id);
    const result = await query(
      `UPDATE time_entries SET ${updates.join(', ')}
       WHERE id = $${paramIndex++} AND user_id = $${paramIndex}
       RETURNING *`,
      values
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Registro no encontrado' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Update time entry error:', error);
    res.status(500).json({ message: 'Error al actualizar registro' });
  }
});

// Delete time entry
router.delete('/:id', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const result = await query(
      'DELETE FROM time_entries WHERE id = $1 AND user_id = $2 RETURNING id',
      [id, req.user!.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Registro no encontrado' });
    }

    res.json({ message: 'Registro eliminado' });
  } catch (error) {
    console.error('Delete time entry error:', error);
    res.status(500).json({ message: 'Error al eliminar registro' });
  }
});

export default router;
