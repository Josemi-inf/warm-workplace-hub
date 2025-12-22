import { Router, Response } from 'express';
import { query } from '../config/database';
import { authenticateToken, AuthRequest } from '../middleware/auth';

const router = Router();

// Get all active services
router.get('/', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const result = await query(`
      SELECT
        s.id,
        s.name,
        s.description,
        s.color,
        s.icon,
        s.created_by,
        s.is_active,
        s.order_index,
        s.created_at,
        s.updated_at,
        u.username AS creator_name,
        COALESCE(
          (SELECT COUNT(*) FROM projects WHERE service_id = s.id)::integer,
          0
        ) AS project_count
      FROM services s
      LEFT JOIN users u ON u.id = s.created_by
      WHERE s.is_active = true
      ORDER BY s.order_index, s.name
    `);

    res.json(result.rows);
  } catch (error) {
    console.error('Get services error:', error);
    res.status(500).json({ message: 'Error al obtener servicios' });
  }
});

// Get service by ID with its projects
router.get('/:id', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const serviceResult = await query(`
      SELECT
        s.id,
        s.name,
        s.description,
        s.color,
        s.icon,
        s.created_by,
        s.is_active,
        s.order_index,
        s.created_at,
        s.updated_at,
        u.username AS creator_name
      FROM services s
      LEFT JOIN users u ON u.id = s.created_by
      WHERE s.id = $1
    `, [id]);

    if (serviceResult.rows.length === 0) {
      return res.status(404).json({ message: 'Servicio no encontrado' });
    }

    const service = serviceResult.rows[0];

    // Get projects for this service
    const projectsResult = await query(`
      SELECT
        p.id,
        p.name,
        p.description,
        p.color,
        p.status,
        p.start_date,
        p.due_date,
        p.created_at,
        COALESCE(
          (SELECT COUNT(*) FROM tasks WHERE project_id = p.id)::integer,
          0
        ) AS task_count,
        COALESCE(
          (SELECT COUNT(*) FROM tasks WHERE project_id = p.id AND status = 'completed')::integer,
          0
        ) AS completed_tasks
      FROM projects p
      WHERE p.service_id = $1
      ORDER BY p.name
    `, [id]);

    res.json({
      ...service,
      projects: projectsResult.rows
    });
  } catch (error) {
    console.error('Get service error:', error);
    res.status(500).json({ message: 'Error al obtener servicio' });
  }
});

// Get projects for a service
router.get('/:id/projects', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const result = await query(`
      SELECT
        p.id,
        p.name,
        p.description,
        p.color,
        p.status,
        p.start_date,
        p.due_date,
        p.department_id,
        p.owner_id,
        p.service_id,
        p.created_at,
        p.updated_at,
        u.username AS owner_name,
        d.name AS department_name,
        COALESCE(
          (SELECT COUNT(*) FROM tasks WHERE project_id = p.id)::integer,
          0
        ) AS task_count,
        COALESCE(
          (SELECT COUNT(*) FROM tasks WHERE project_id = p.id AND status = 'completed')::integer,
          0
        ) AS completed_tasks
      FROM projects p
      LEFT JOIN users u ON u.id = p.owner_id
      LEFT JOIN departments d ON d.id = p.department_id
      WHERE p.service_id = $1
      ORDER BY p.name
    `, [id]);

    res.json(result.rows);
  } catch (error) {
    console.error('Get service projects error:', error);
    res.status(500).json({ message: 'Error al obtener proyectos del servicio' });
  }
});

// Create a new service (admin/manager only)
router.post('/', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const userRole = req.user!.role;

    // Only admin and manager can create services
    if (userRole !== 'admin' && userRole !== 'manager') {
      return res.status(403).json({ message: 'No tienes permisos para crear servicios' });
    }

    const { name, description, color, icon } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ message: 'El nombre del servicio es requerido' });
    }

    // Get next order_index
    const orderResult = await query(`
      SELECT COALESCE(MAX(order_index), 0) + 1 AS next_order FROM services
    `);
    const nextOrder = orderResult.rows[0].next_order;

    const result = await query(`
      INSERT INTO services (name, description, color, icon, created_by, order_index)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `, [
      name.trim(),
      description?.trim() || null,
      color || '#6366f1',
      icon || 'folder',
      userId,
      nextOrder
    ]);

    // Log activity
    await query(`
      INSERT INTO activities (user_id, activity_type, title, description)
      VALUES ($1, 'service_created', $2, $3)
    `, [userId, `Servicio "${name}" creado`, `Nuevo servicio de categoria de negocio`]);

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Create service error:', error);
    res.status(500).json({ message: 'Error al crear servicio' });
  }
});

// Update a service
router.patch('/:id', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const userRole = req.user!.role;

    // Only admin and manager can update services
    if (userRole !== 'admin' && userRole !== 'manager') {
      return res.status(403).json({ message: 'No tienes permisos para editar servicios' });
    }

    const { name, description, color, icon, is_active, order_index } = req.body;

    const updates: string[] = [];
    const values: unknown[] = [];
    let paramIndex = 1;

    if (name !== undefined) {
      updates.push(`name = $${paramIndex++}`);
      values.push(name.trim());
    }
    if (description !== undefined) {
      updates.push(`description = $${paramIndex++}`);
      values.push(description?.trim() || null);
    }
    if (color !== undefined) {
      updates.push(`color = $${paramIndex++}`);
      values.push(color);
    }
    if (icon !== undefined) {
      updates.push(`icon = $${paramIndex++}`);
      values.push(icon);
    }
    if (is_active !== undefined) {
      updates.push(`is_active = $${paramIndex++}`);
      values.push(is_active);
    }
    if (order_index !== undefined) {
      updates.push(`order_index = $${paramIndex++}`);
      values.push(order_index);
    }

    if (updates.length === 0) {
      return res.status(400).json({ message: 'No hay campos para actualizar' });
    }

    values.push(id);
    const result = await query(`
      UPDATE services SET ${updates.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING *
    `, values);

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Servicio no encontrado' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Update service error:', error);
    res.status(500).json({ message: 'Error al actualizar servicio' });
  }
});

// Delete (deactivate) a service
router.delete('/:id', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const userRole = req.user!.role;

    // Only admin can delete services
    if (userRole !== 'admin') {
      return res.status(403).json({ message: 'Solo los administradores pueden eliminar servicios' });
    }

    // Check if service has projects
    const projectsResult = await query(`
      SELECT COUNT(*) AS count FROM projects WHERE service_id = $1
    `, [id]);

    if (parseInt(projectsResult.rows[0].count) > 0) {
      // Soft delete - just deactivate
      await query(`
        UPDATE services SET is_active = false WHERE id = $1
      `, [id]);

      return res.json({
        message: 'Servicio desactivado (tiene proyectos asociados)',
        deactivated: true
      });
    }

    // Hard delete if no projects
    const result = await query(`
      DELETE FROM services WHERE id = $1 RETURNING id, name
    `, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Servicio no encontrado' });
    }

    res.json({
      message: 'Servicio eliminado correctamente',
      deleted: true,
      service: result.rows[0]
    });
  } catch (error) {
    console.error('Delete service error:', error);
    res.status(500).json({ message: 'Error al eliminar servicio' });
  }
});

export default router;
