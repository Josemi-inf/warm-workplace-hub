import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { query } from '../config/database';

export interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
    username: string;
    role: string;
  };
}

export const authenticateToken = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    res.status(401).json({ message: 'Token de acceso requerido' });
    return;
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as {
      userId: string;
      email: string;
    };

    // Verify user exists and session is valid
    const result = await query(
      `SELECT u.id, u.email, u.username, u.role
       FROM users u
       INNER JOIN user_sessions s ON s.user_id = u.id
       WHERE u.id = $1 AND s.token = $2 AND s.expires_at > NOW() AND u.is_active = true`,
      [decoded.userId, token]
    );

    if (result.rows.length === 0) {
      res.status(401).json({ message: 'Sesión inválida o expirada' });
      return;
    }

    req.user = result.rows[0];
    next();
  } catch (error) {
    res.status(403).json({ message: 'Token inválido' });
  }
};

export const requireRole = (...roles: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ message: 'No autenticado' });
      return;
    }

    if (!roles.includes(req.user.role)) {
      res.status(403).json({ message: 'No tienes permisos para esta acción' });
      return;
    }

    next();
  };
};
