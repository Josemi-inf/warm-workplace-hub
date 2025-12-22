import { Router, Response } from 'express';
import { query } from '../config/database';
import { authenticateToken, AuthRequest } from '../middleware/auth';

const router = Router();

// Get all projects
router.get('/', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { department_id, status, service_id } = req.query;

    let sql = `
      SELECT p.*,
        d.name as department_name,
        u.username as owner_name,
        s.name as service_name,
        s.color as service_color,
        COALESCE((SELECT COUNT(*) FROM tasks WHERE project_id = p.id)::integer, 0) AS task_count,
        COALESCE((SELECT COUNT(*) FROM tasks WHERE project_id = p.id AND status = 'completed')::integer, 0) AS completed_tasks
      FROM projects p
      LEFT JOIN departments d ON d.id = p.department_id
      LEFT JOIN users u ON u.id = p.owner_id
      LEFT JOIN services s ON s.id = p.service_id
      WHERE 1=1
    `;
    const params: unknown[] = [];
    let paramIndex = 1;

    if (department_id) {
      sql += ` AND p.department_id = $${paramIndex++}`;
      params.push(department_id);
    }
    if (status) {
      sql += ` AND p.status = $${paramIndex++}`;
      params.push(status);
    }
    if (service_id) {
      sql += ` AND p.service_id = $${paramIndex++}`;
      params.push(service_id);
    }

    sql += ' ORDER BY p.created_at DESC';

    const result = await query(sql, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Get projects error:', error);
    res.status(500).json({ message: 'Error al obtener proyectos' });
  }
});

// Get project by ID
router.get('/:id', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const result = await query(
      `SELECT p.*, d.name as department_name, u.username as owner_name
       FROM projects p
       LEFT JOIN departments d ON d.id = p.department_id
       LEFT JOIN users u ON u.id = p.owner_id
       WHERE p.id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Proyecto no encontrado' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Get project error:', error);
    res.status(500).json({ message: 'Error al obtener proyecto' });
  }
});

// Create project
router.post('/', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { name, description, color, department_id, service_id, status, start_date, due_date } = req.body;

    if (!name) {
      return res.status(400).json({ message: 'El nombre es requerido' });
    }

    const result = await query(
      `INSERT INTO projects (name, description, color, department_id, service_id, owner_id, status, start_date, due_date)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *`,
      [name, description, color || '#6366f1', department_id, service_id || null, req.user!.id, status || 'pending', start_date, due_date]
    );

    // Log activity
    await query(
      `INSERT INTO activities (user_id, activity_type, title, project_id)
       VALUES ($1, 'project_created', $2, $3)`,
      [req.user!.id, `Creó el proyecto: ${name}`, result.rows[0].id]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Create project error:', error);
    res.status(500).json({ message: 'Error al crear proyecto' });
  }
});

// Update project
router.patch('/:id', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { name, description, color, department_id, service_id, status, start_date, due_date } = req.body;

    const updates: string[] = [];
    const values: unknown[] = [];
    let paramIndex = 1;

    if (name !== undefined) {
      updates.push(`name = $${paramIndex++}`);
      values.push(name);
    }
    if (description !== undefined) {
      updates.push(`description = $${paramIndex++}`);
      values.push(description);
    }
    if (color !== undefined) {
      updates.push(`color = $${paramIndex++}`);
      values.push(color);
    }
    if (department_id !== undefined) {
      updates.push(`department_id = $${paramIndex++}`);
      values.push(department_id);
    }
    if (service_id !== undefined) {
      updates.push(`service_id = $${paramIndex++}`);
      values.push(service_id);
    }
    if (status !== undefined) {
      updates.push(`status = $${paramIndex++}`);
      values.push(status);
    }
    if (start_date !== undefined) {
      updates.push(`start_date = $${paramIndex++}`);
      values.push(start_date);
    }
    if (due_date !== undefined) {
      updates.push(`due_date = $${paramIndex++}`);
      values.push(due_date);
    }

    if (updates.length === 0) {
      return res.status(400).json({ message: 'No hay campos para actualizar' });
    }

    values.push(id);
    const result = await query(
      `UPDATE projects SET ${updates.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
      values
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Proyecto no encontrado' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Update project error:', error);
    res.status(500).json({ message: 'Error al actualizar proyecto' });
  }
});

// Delete project
router.delete('/:id', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const result = await query('DELETE FROM projects WHERE id = $1 RETURNING id', [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Proyecto no encontrado' });
    }

    res.json({ message: 'Proyecto eliminado' });
  } catch (error) {
    console.error('Delete project error:', error);
    res.status(500).json({ message: 'Error al eliminar proyecto' });
  }
});

export default router;
