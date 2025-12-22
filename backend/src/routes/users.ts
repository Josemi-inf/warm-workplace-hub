import { Router, Response } from 'express';
import bcrypt from 'bcryptjs';
import { query } from '../config/database';
import { authenticateToken, requireAdmin, AuthRequest } from '../middleware/auth';
import { addUserToGlobalChat } from './chats';

const router = Router();

// Get all users (active only)
router.get('/', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { department_id } = req.query;

    let sql = `
      SELECT id, email, username, avatar_url, status, role, department_id, is_active, last_login_at, created_at
      FROM users WHERE is_active = true
    `;
    const params: unknown[] = [];

    if (department_id) {
      sql += ' AND department_id = $1';
      params.push(department_id);
    }

    sql += ' ORDER BY username';

    const result = await query(sql, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ message: 'Error al obtener usuarios' });
  }
});

// Get all users including inactive (Admin only) - MUST be before /:id routes
router.get('/all', authenticateToken, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const result = await query(`
      SELECT id, email, username, avatar_url, status, role, department_id, is_active, last_login_at, created_at
      FROM users
      ORDER BY created_at DESC
    `);

    res.json(result.rows);
  } catch (error) {
    console.error('Get all users error:', error);
    res.status(500).json({ message: 'Error al obtener usuarios' });
  }
});

// Get user statistics (calculated) - with role-based filtering
router.get('/statistics', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const currentUser = req.user!;

    // Build query based on role
    let userFilter = '';
    const params: unknown[] = [];

    if (currentUser.role === 'admin') {
      // Admin can see all users
      userFilter = 'WHERE u.is_active = true';
    } else if (currentUser.role === 'manager') {
      // Manager can only see users in their department
      userFilter = 'WHERE u.is_active = true AND u.department_id = $1';
      params.push(currentUser.department_id);
    } else {
      // Member can only see their own stats
      userFilter = 'WHERE u.is_active = true AND u.id = $1';
      params.push(currentUser.id);
    }

    // First get users with basic info based on role
    const usersResult = await query(`
      SELECT
        u.id as user_id,
        u.username,
        u.email,
        u.role,
        d.name as department_name
      FROM users u
      LEFT JOIN departments d ON d.id = u.department_id
      ${userFilter}
      ORDER BY u.username
    `, params);

    // Get subtasks completed per user (check if table exists)
    let subtasksMap: Record<string, number> = {};
    try {
      const subtasksResult = await query(`
        SELECT sa.user_id, COUNT(*)::integer as count
        FROM subtask_assignees sa
        JOIN subtasks s ON s.id = sa.subtask_id
        WHERE s.status = 'completed'
        GROUP BY sa.user_id
      `);
      subtasksResult.rows.forEach((row: { user_id: string; count: number }) => {
        subtasksMap[row.user_id] = row.count;
      });
    } catch {
      // Table might not exist or be empty
    }

    // Get tasks created that are completed
    let tasksMap: Record<string, number> = {};
    try {
      const tasksResult = await query(`
        SELECT created_by, COUNT(*)::integer as count
        FROM tasks
        WHERE status = 'completed'
        GROUP BY created_by
      `);
      tasksResult.rows.forEach((row: { created_by: string; count: number }) => {
        tasksMap[row.created_by] = row.count;
      });
    } catch {
      // Table might not exist or be empty
    }

    // Get time logged
    let timeMap: Record<string, number> = {};
    try {
      const timeResult = await query(`
        SELECT user_id,
          SUM(EXTRACT(EPOCH FROM (COALESCE(ended_at, NOW()) - started_at)) / 3600) as total_hours
        FROM time_entries
        GROUP BY user_id
      `);
      timeResult.rows.forEach((row: { user_id: string; total_hours: number }) => {
        timeMap[row.user_id] = parseFloat(row.total_hours?.toString() || '0');
      });
    } catch {
      // Table might not exist or be empty
    }

    // Combine all data
    const statistics = usersResult.rows.map((user: { user_id: string; username: string; email: string; role: string; department_name: string }) => ({
      user_id: user.user_id,
      username: user.username,
      email: user.email,
      role: user.role,
      department_name: user.department_name,
      subtasks_completed: subtasksMap[user.user_id] || 0,
      tasks_created_completed: tasksMap[user.user_id] || 0,
      total_time_hours: timeMap[user.user_id] || 0
    }));

    res.json(statistics);
  } catch (error) {
    console.error('Get statistics error:', error);
    res.status(500).json({ message: 'Error al obtener estadísticas' });
  }
});

// Get user by ID
router.get('/:id', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const result = await query(
      `SELECT id, email, username, avatar_url, status, role, department_id, is_active, last_login_at, created_at
       FROM users WHERE id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ message: 'Error al obtener usuario' });
  }
});

// Get user stats
router.get('/:id/stats', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const result = await query('SELECT * FROM user_stats WHERE user_id = $1', [id]);

    if (result.rows.length === 0) {
      // Return default stats if not found
      return res.json({
        user_id: id,
        total_tasks_completed: 0,
        total_subtasks_completed: 0,
        total_time_logged_minutes: 0,
        current_streak_days: 0,
        longest_streak_days: 0,
        tasks_this_week: 0,
        tasks_this_month: 0,
      });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Get user stats error:', error);
    res.status(500).json({ message: 'Error al obtener estadísticas del usuario' });
  }
});

// Get user time entries
router.get('/:id/time-entries', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const result = await query(
      `SELECT te.*, s.title as subtask_title, t.title as task_title
       FROM time_entries te
       JOIN subtasks s ON s.id = te.subtask_id
       JOIN tasks t ON t.id = s.task_id
       WHERE te.user_id = $1
       ORDER BY te.started_at DESC
       LIMIT 100`,
      [id]
    );

    res.json(result.rows);
  } catch (error) {
    console.error('Get time entries error:', error);
    res.status(500).json({ message: 'Error al obtener registros de tiempo' });
  }
});

// Get user activities
router.get('/:id/activities', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const result = await query(
      `SELECT * FROM activities WHERE user_id = $1 ORDER BY created_at DESC LIMIT 50`,
      [id]
    );

    res.json(result.rows);
  } catch (error) {
    console.error('Get activities error:', error);
    res.status(500).json({ message: 'Error al obtener actividades' });
  }
});

// Update user
router.patch('/:id', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { username, avatar_url, status, role, department_id, email } = req.body;

    // Only admin can update other users' roles or other users' data
    if (req.user!.role !== 'admin' && req.user!.id !== id) {
      return res.status(403).json({ message: 'No tienes permisos para editar este usuario' });
    }

    const updates: string[] = [];
    const values: unknown[] = [];
    let paramIndex = 1;

    if (username !== undefined) {
      updates.push(`username = $${paramIndex++}`);
      values.push(username);
    }
    if (email !== undefined && req.user!.role === 'admin') {
      // Check if email is already taken by another user
      const emailCheck = await query('SELECT id FROM users WHERE email = $1 AND id != $2', [email, id]);
      if (emailCheck.rows.length > 0) {
        return res.status(409).json({ message: 'El email ya está en uso por otro usuario' });
      }
      updates.push(`email = $${paramIndex++}`);
      values.push(email);
    }
    if (avatar_url !== undefined) {
      updates.push(`avatar_url = $${paramIndex++}`);
      values.push(avatar_url);
    }
    if (status !== undefined) {
      updates.push(`status = $${paramIndex++}`);
      values.push(status);
    }
    if (role !== undefined && req.user!.role === 'admin') {
      updates.push(`role = $${paramIndex++}`);
      values.push(role);
    }
    if (department_id !== undefined) {
      updates.push(`department_id = $${paramIndex++}`);
      values.push(department_id);
    }

    if (updates.length === 0) {
      return res.status(400).json({ message: 'No hay campos para actualizar' });
    }

    values.push(id);
    const result = await query(
      `UPDATE users SET ${updates.join(', ')} WHERE id = $${paramIndex}
       RETURNING id, email, username, avatar_url, status, role, department_id, is_active, created_at, updated_at`,
      values
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({ message: 'Error al actualizar usuario' });
  }
});

// =============================================
// ADMIN ONLY ENDPOINTS
// =============================================

// Create user (Admin only)
router.post('/', authenticateToken, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { email, password, username, role, department_id } = req.body;

    if (!email || !password || !username) {
      return res.status(400).json({ message: 'Email, password y username son requeridos' });
    }

    // Check if user exists
    const existingUser = await query('SELECT id FROM users WHERE email = $1', [email]);
    if (existingUser.rows.length > 0) {
      return res.status(409).json({ message: 'El email ya está registrado' });
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    // Create user
    const result = await query(
      `INSERT INTO users (email, password_hash, username, role, department_id)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, email, username, avatar_url, status, role, department_id, is_active, created_at`,
      [email, passwordHash, username, role || 'member', department_id || null]
    );

    const user = result.rows[0];

    // Log activity
    await query(
      `INSERT INTO activities (user_id, activity_type, title)
       VALUES ($1, 'user_registered', 'Usuario creado por administrador')`,
      [user.id]
    );

    // Add user to global chat
    await addUserToGlobalChat(user.id);

    res.status(201).json(user);
  } catch (error) {
    console.error('Create user error:', error);
    res.status(500).json({ message: 'Error al crear usuario' });
  }
});

// Change user password (Admin only)
router.patch('/:id/password', authenticateToken, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { password } = req.body;

    if (!password) {
      return res.status(400).json({ message: 'La nueva contraseña es requerida' });
    }

    if (password.length < 6) {
      return res.status(400).json({ message: 'La contraseña debe tener al menos 6 caracteres' });
    }

    // Hash new password
    const passwordHash = await bcrypt.hash(password, 10);

    // Update password
    const result = await query(
      `UPDATE users SET password_hash = $1 WHERE id = $2
       RETURNING id, email, username`,
      [passwordHash, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }

    // Invalidate all existing sessions for this user
    await query('DELETE FROM user_sessions WHERE user_id = $1', [id]);

    res.json({ message: 'Contraseña actualizada correctamente', user: result.rows[0] });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({ message: 'Error al cambiar la contraseña' });
  }
});

// Deactivate/Activate user (Admin only)
router.patch('/:id/status', authenticateToken, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { is_active } = req.body;

    if (typeof is_active !== 'boolean') {
      return res.status(400).json({ message: 'is_active debe ser un booleano' });
    }

    // Prevent admin from deactivating themselves
    if (id === req.user!.id && !is_active) {
      return res.status(400).json({ message: 'No puedes desactivar tu propia cuenta' });
    }

    const result = await query(
      `UPDATE users SET is_active = $1 WHERE id = $2
       RETURNING id, email, username, is_active`,
      [is_active, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }

    // If deactivating, remove all sessions
    if (!is_active) {
      await query('DELETE FROM user_sessions WHERE user_id = $1', [id]);
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Toggle user status error:', error);
    res.status(500).json({ message: 'Error al cambiar el estado del usuario' });
  }
});

// Delete user (Admin only)
router.delete('/:id', authenticateToken, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    // Prevent admin from deleting themselves
    if (id === req.user!.id) {
      return res.status(400).json({ message: 'No puedes eliminar tu propia cuenta' });
    }

    const result = await query('DELETE FROM users WHERE id = $1 RETURNING id, email, username', [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }

    res.json({ message: 'Usuario eliminado correctamente', user: result.rows[0] });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({ message: 'Error al eliminar usuario' });
  }
});

export default router;
