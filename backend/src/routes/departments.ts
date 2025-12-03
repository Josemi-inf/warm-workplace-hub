import { Router, Response } from 'express';
import { query } from '../config/database';
import { authenticateToken, requireRole, AuthRequest } from '../middleware/auth';

const router = Router();

// Get all departments
router.get('/', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const result = await query('SELECT * FROM departments ORDER BY name');
    res.json(result.rows);
  } catch (error) {
    console.error('Get departments error:', error);
    res.status(500).json({ message: 'Error al obtener departamentos' });
  }
});

// Get department by ID
router.get('/:id', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const result = await query('SELECT * FROM departments WHERE id = $1', [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Departamento no encontrado' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Get department error:', error);
    res.status(500).json({ message: 'Error al obtener departamento' });
  }
});

// Create department (admin only)
router.post('/', authenticateToken, requireRole('admin'), async (req: AuthRequest, res: Response) => {
  try {
    const { name, description, color } = req.body;

    if (!name) {
      return res.status(400).json({ message: 'El nombre es requerido' });
    }

    const result = await query(
      `INSERT INTO departments (name, description, color)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [name, description, color || '#6366f1']
    );

    res.status(201).json(result.rows[0]);
  } catch (error: any) {
    if (error.code === '23505') {
      return res.status(409).json({ message: 'Ya existe un departamento con ese nombre' });
    }
    console.error('Create department error:', error);
    res.status(500).json({ message: 'Error al crear departamento' });
  }
});

// Update department (admin only)
router.patch('/:id', authenticateToken, requireRole('admin'), async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { name, description, color } = req.body;

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

    if (updates.length === 0) {
      return res.status(400).json({ message: 'No hay campos para actualizar' });
    }

    values.push(id);
    const result = await query(
      `UPDATE departments SET ${updates.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
      values
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Departamento no encontrado' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Update department error:', error);
    res.status(500).json({ message: 'Error al actualizar departamento' });
  }
});

// Delete department (admin only)
router.delete('/:id', authenticateToken, requireRole('admin'), async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const result = await query('DELETE FROM departments WHERE id = $1 RETURNING id', [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Departamento no encontrado' });
    }

    res.json({ message: 'Departamento eliminado' });
  } catch (error) {
    console.error('Delete department error:', error);
    res.status(500).json({ message: 'Error al eliminar departamento' });
  }
});

export default router;
