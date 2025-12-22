import { Router, Response } from 'express';
import { query } from '../config/database';
import { authenticateToken, AuthRequest } from '../middleware/auth';

const router = Router();

// Get all chats for current user
router.get('/', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;

    const result = await query(`
      SELECT
        c.id,
        c.name,
        c.is_group,
        c.created_by,
        c.created_at,
        c.updated_at,
        (
          SELECT json_agg(
            json_build_object(
              'id', u.id,
              'username', u.username,
              'avatar_url', u.avatar_url,
              'status', u.status
            )
          )
          FROM chat_participants cp2
          JOIN users u ON u.id = cp2.user_id
          WHERE cp2.chat_id = c.id
        ) as participants,
        (
          SELECT json_build_object(
            'id', cm.id,
            'content', cm.content,
            'user_id', cm.user_id,
            'username', u.username,
            'created_at', cm.created_at
          )
          FROM chat_messages cm
          JOIN users u ON u.id = cm.user_id
          WHERE cm.chat_id = c.id
          ORDER BY cm.created_at DESC
          LIMIT 1
        ) as last_message,
        (
          SELECT COUNT(*)::integer
          FROM chat_messages cm
          WHERE cm.chat_id = c.id
            AND cm.created_at > COALESCE(cp.last_read_at, '1970-01-01')
            AND cm.user_id != $1
        ) as unread_count
      FROM chats c
      JOIN chat_participants cp ON cp.chat_id = c.id AND cp.user_id = $1
      ORDER BY c.updated_at DESC
    `, [userId]);

    res.json(result.rows);
  } catch (error) {
    console.error('Get chats error:', error);
    res.status(500).json({ message: 'Error al obtener chats' });
  }
});

// Create a new chat
router.post('/', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { participant_ids, name, is_group } = req.body;

    if (!participant_ids || !Array.isArray(participant_ids) || participant_ids.length === 0) {
      return res.status(400).json({ message: 'Debes seleccionar al menos un participante' });
    }

    // For 1-on-1 chats, check if chat already exists
    if (!is_group && participant_ids.length === 1) {
      const existingChat = await query(`
        SELECT c.id
        FROM chats c
        WHERE c.is_group = false
          AND EXISTS (SELECT 1 FROM chat_participants WHERE chat_id = c.id AND user_id = $1)
          AND EXISTS (SELECT 1 FROM chat_participants WHERE chat_id = c.id AND user_id = $2)
          AND (SELECT COUNT(*) FROM chat_participants WHERE chat_id = c.id) = 2
      `, [userId, participant_ids[0]]);

      if (existingChat.rows.length > 0) {
        return res.json({ id: existingChat.rows[0].id, existing: true });
      }
    }

    // Create chat
    const chatResult = await query(`
      INSERT INTO chats (name, is_group, created_by)
      VALUES ($1, $2, $3)
      RETURNING *
    `, [name || null, is_group || false, userId]);

    const chat = chatResult.rows[0];

    // Add creator as participant
    await query(`
      INSERT INTO chat_participants (chat_id, user_id)
      VALUES ($1, $2)
    `, [chat.id, userId]);

    // Add other participants
    for (const participantId of participant_ids) {
      if (participantId !== userId) {
        await query(`
          INSERT INTO chat_participants (chat_id, user_id)
          VALUES ($1, $2)
          ON CONFLICT (chat_id, user_id) DO NOTHING
        `, [chat.id, participantId]);
      }
    }

    // Get full chat data
    const fullChat = await query(`
      SELECT
        c.*,
        (
          SELECT json_agg(
            json_build_object(
              'id', u.id,
              'username', u.username,
              'avatar_url', u.avatar_url,
              'status', u.status
            )
          )
          FROM chat_participants cp
          JOIN users u ON u.id = cp.user_id
          WHERE cp.chat_id = c.id
        ) as participants
      FROM chats c
      WHERE c.id = $1
    `, [chat.id]);

    res.status(201).json(fullChat.rows[0]);
  } catch (error) {
    console.error('Create chat error:', error);
    res.status(500).json({ message: 'Error al crear chat' });
  }
});

// Get messages for a chat
router.get('/:chatId/messages', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { chatId } = req.params;
    const { limit = 50, before } = req.query;

    // Verify user is participant
    const participant = await query(`
      SELECT 1 FROM chat_participants WHERE chat_id = $1 AND user_id = $2
    `, [chatId, userId]);

    if (participant.rows.length === 0) {
      return res.status(403).json({ message: 'No tienes acceso a este chat' });
    }

    let sql = `
      SELECT
        cm.id,
        cm.content,
        cm.user_id,
        cm.created_at,
        u.username,
        u.avatar_url
      FROM chat_messages cm
      JOIN users u ON u.id = cm.user_id
      WHERE cm.chat_id = $1
    `;
    const params: unknown[] = [chatId];

    if (before) {
      sql += ` AND cm.created_at < $2`;
      params.push(before);
    }

    sql += ` ORDER BY cm.created_at DESC LIMIT $${params.length + 1}`;
    params.push(limit);

    const result = await query(sql, params);

    // Mark as read
    await query(`
      UPDATE chat_participants
      SET last_read_at = NOW()
      WHERE chat_id = $1 AND user_id = $2
    `, [chatId, userId]);

    res.json(result.rows.reverse());
  } catch (error) {
    console.error('Get messages error:', error);
    res.status(500).json({ message: 'Error al obtener mensajes' });
  }
});

// Send a message
router.post('/:chatId/messages', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { chatId } = req.params;
    const { content } = req.body;

    if (!content || !content.trim()) {
      return res.status(400).json({ message: 'El mensaje no puede estar vacio' });
    }

    // Verify user is participant
    const participant = await query(`
      SELECT 1 FROM chat_participants WHERE chat_id = $1 AND user_id = $2
    `, [chatId, userId]);

    if (participant.rows.length === 0) {
      return res.status(403).json({ message: 'No tienes acceso a este chat' });
    }

    // Insert message
    const result = await query(`
      INSERT INTO chat_messages (chat_id, user_id, content)
      VALUES ($1, $2, $3)
      RETURNING *
    `, [chatId, userId, content.trim()]);

    // Update chat updated_at
    await query(`
      UPDATE chats SET updated_at = NOW() WHERE id = $1
    `, [chatId]);

    // Update last_read_at for sender
    await query(`
      UPDATE chat_participants
      SET last_read_at = NOW()
      WHERE chat_id = $1 AND user_id = $2
    `, [chatId, userId]);

    // Get full message with user info
    const message = await query(`
      SELECT
        cm.id,
        cm.content,
        cm.user_id,
        cm.created_at,
        u.username,
        u.avatar_url
      FROM chat_messages cm
      JOIN users u ON u.id = cm.user_id
      WHERE cm.id = $1
    `, [result.rows[0].id]);

    res.status(201).json(message.rows[0]);
  } catch (error) {
    console.error('Send message error:', error);
    res.status(500).json({ message: 'Error al enviar mensaje' });
  }
});

// Delete a chat (creator or admin can delete, but not global chat)
router.delete('/:chatId', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const userRole = req.user!.role;
    const { chatId } = req.params;

    // Get chat info
    const chat = await query(`
      SELECT * FROM chats WHERE id = $1
    `, [chatId]);

    if (chat.rows.length === 0) {
      return res.status(404).json({ message: 'Chat no encontrado' });
    }

    // Prevent deletion of global chat
    if (chat.rows[0].name === 'Inficon Global' && chat.rows[0].is_group) {
      return res.status(403).json({ message: 'No se puede eliminar el chat global' });
    }

    // Only creator or admin can delete
    const isCreator = chat.rows[0].created_by === userId;
    const isAdmin = userRole === 'admin';

    if (!isCreator && !isAdmin) {
      return res.status(403).json({ message: 'Solo el creador o un administrador puede eliminar el chat' });
    }

    await query('DELETE FROM chats WHERE id = $1', [chatId]);

    res.json({ message: 'Chat eliminado' });
  } catch (error) {
    console.error('Delete chat error:', error);
    res.status(500).json({ message: 'Error al eliminar chat' });
  }
});

// Get or create global chat
router.post('/global/init', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    // Check if global chat exists
    const existingChat = await query(`
      SELECT id FROM chats WHERE name = 'Inficon Global' AND is_group = true
    `);

    if (existingChat.rows.length > 0) {
      return res.json({ id: existingChat.rows[0].id, existing: true });
    }

    // Create global chat (use system or first admin as creator)
    const adminResult = await query(`
      SELECT id FROM users WHERE role = 'admin' AND is_active = true LIMIT 1
    `);

    const creatorId = adminResult.rows.length > 0 ? adminResult.rows[0].id : req.user!.id;

    const chatResult = await query(`
      INSERT INTO chats (name, is_group, created_by)
      VALUES ('Inficon Global', true, $1)
      RETURNING *
    `, [creatorId]);

    const chat = chatResult.rows[0];

    // Add all active users as participants
    await query(`
      INSERT INTO chat_participants (chat_id, user_id)
      SELECT $1, id FROM users WHERE is_active = true
      ON CONFLICT (chat_id, user_id) DO NOTHING
    `, [chat.id]);

    res.status(201).json({ id: chat.id, created: true });
  } catch (error) {
    console.error('Init global chat error:', error);
    res.status(500).json({ message: 'Error al inicializar chat global' });
  }
});

// Add user to global chat (called when user is created)
export async function addUserToGlobalChat(userId: string): Promise<void> {
  try {
    const globalChat = await query(`
      SELECT id FROM chats WHERE name = 'Inficon Global' AND is_group = true
    `);

    if (globalChat.rows.length > 0) {
      await query(`
        INSERT INTO chat_participants (chat_id, user_id)
        VALUES ($1, $2)
        ON CONFLICT (chat_id, user_id) DO NOTHING
      `, [globalChat.rows[0].id, userId]);
    }
  } catch (error) {
    console.error('Add user to global chat error:', error);
  }
}

export default router;
