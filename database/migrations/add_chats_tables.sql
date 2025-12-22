-- =============================================
-- MIGRACION: Agregar tablas de chats privados
-- Ejecutar en la base de datos de produccion
-- =============================================

-- Tabla de conversaciones/chats
CREATE TABLE IF NOT EXISTS chats (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(100),
  is_group BOOLEAN DEFAULT false,
  created_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Tabla de participantes del chat
CREATE TABLE IF NOT EXISTS chat_participants (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  chat_id UUID NOT NULL REFERENCES chats(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  joined_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  last_read_at TIMESTAMP WITH TIME ZONE,
  UNIQUE(chat_id, user_id)
);

-- Tabla de mensajes de chat
CREATE TABLE IF NOT EXISTS chat_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  chat_id UUID NOT NULL REFERENCES chats(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Indices para mejorar rendimiento
CREATE INDEX IF NOT EXISTS idx_chat_participants_chat_id ON chat_participants(chat_id);
CREATE INDEX IF NOT EXISTS idx_chat_participants_user_id ON chat_participants(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_chat_id ON chat_messages(chat_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_created_at ON chat_messages(created_at DESC);

-- Trigger para actualizar updated_at en chats
DROP TRIGGER IF EXISTS update_chats_updated_at ON chats;
CREATE TRIGGER update_chats_updated_at
  BEFORE UPDATE ON chats
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =============================================
-- INICIALIZACION: Chat Global Inficon Global
-- =============================================

-- Crear el chat global si no existe
DO $$
DECLARE
  admin_id UUID;
  global_chat_id UUID;
BEGIN
  -- Verificar si ya existe el chat global
  SELECT id INTO global_chat_id FROM chats WHERE name = 'Inficon Global' AND is_group = true;

  IF global_chat_id IS NULL THEN
    -- Obtener el primer admin activo
    SELECT id INTO admin_id FROM users WHERE role = 'admin' AND is_active = true LIMIT 1;

    IF admin_id IS NOT NULL THEN
      -- Crear el chat global
      INSERT INTO chats (name, is_group, created_by)
      VALUES ('Inficon Global', true, admin_id)
      RETURNING id INTO global_chat_id;

      -- Agregar todos los usuarios activos como participantes
      INSERT INTO chat_participants (chat_id, user_id)
      SELECT global_chat_id, id FROM users WHERE is_active = true
      ON CONFLICT (chat_id, user_id) DO NOTHING;

      RAISE NOTICE 'Chat global Inficon Global creado con ID: %', global_chat_id;
    ELSE
      RAISE NOTICE 'No se encontro un admin activo para crear el chat global';
    END IF;
  ELSE
    RAISE NOTICE 'El chat global Inficon Global ya existe con ID: %', global_chat_id;
  END IF;
END $$;

-- Verificar que las tablas se crearon
SELECT 'Tablas de chat creadas correctamente' AS status;
