-- =============================================
-- WARM WORKPLACE HUB - PostgreSQL Schema
-- Base de datos completa para Easypanel/PostgreSQL
-- =============================================

-- =============================================
-- 0. EXTENSIONES
-- =============================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =============================================
-- 1. ENUMS
-- =============================================

-- Estado de usuarios
DO $$ BEGIN
  CREATE TYPE user_status AS ENUM ('online', 'offline', 'away', 'busy');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Rol de usuario
DO $$ BEGIN
  CREATE TYPE user_role AS ENUM ('admin', 'manager', 'member');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Estado de tareas y subtareas
DO $$ BEGIN
  CREATE TYPE task_status AS ENUM ('pending', 'in_progress', 'completed', 'cancelled');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Prioridad de tareas
DO $$ BEGIN
  CREATE TYPE task_priority AS ENUM ('low', 'medium', 'high', 'urgent');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Tipo de canal
DO $$ BEGIN
  CREATE TYPE channel_type AS ENUM ('voice', 'text');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Tipo de actividad para el feed
DO $$ BEGIN
  CREATE TYPE activity_type AS ENUM (
    'task_created',
    'task_completed',
    'task_assigned',
    'subtask_created',
    'subtask_completed',
    'subtask_started',
    'time_logged',
    'comment_added',
    'project_created',
    'member_joined',
    'user_registered',
    'user_login'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- =============================================
-- 2. DEPARTAMENTOS
-- =============================================

CREATE TABLE IF NOT EXISTS departments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(100) NOT NULL UNIQUE,
  description TEXT,
  color VARCHAR(7) DEFAULT '#6366f1',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- =============================================
-- 3. USUARIOS (Autenticación incluida)
-- =============================================

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  username VARCHAR(100) NOT NULL,
  avatar_url TEXT,
  status user_status DEFAULT 'offline',
  role user_role DEFAULT 'member',
  department_id UUID REFERENCES departments(id) ON DELETE SET NULL,
  is_active BOOLEAN DEFAULT true,
  email_verified BOOLEAN DEFAULT false,
  last_login_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- =============================================
-- 4. SESIONES DE USUARIO
-- =============================================

CREATE TABLE IF NOT EXISTS user_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token VARCHAR(500) NOT NULL UNIQUE,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  ip_address VARCHAR(45),
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- =============================================
-- 5. CANALES
-- =============================================

CREATE TABLE IF NOT EXISTS channels (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(100) NOT NULL,
  type channel_type NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- =============================================
-- 6. MENSAJES
-- =============================================

CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  channel_id UUID NOT NULL REFERENCES channels(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- =============================================
-- 7. PARTICIPANTES DE VOZ
-- =============================================

CREATE TABLE IF NOT EXISTS voice_participants (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  channel_id UUID NOT NULL REFERENCES channels(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  joined_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  UNIQUE(channel_id, user_id)
);

-- =============================================
-- 8. PROYECTOS
-- =============================================

CREATE TABLE IF NOT EXISTS projects (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(200) NOT NULL,
  description TEXT,
  color VARCHAR(7) DEFAULT '#8b5cf6',
  department_id UUID REFERENCES departments(id) ON DELETE SET NULL,
  owner_id UUID REFERENCES users(id) ON DELETE SET NULL,
  status task_status NOT NULL DEFAULT 'pending',
  start_date DATE,
  due_date DATE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- =============================================
-- 9. TAREAS
-- =============================================

CREATE TABLE IF NOT EXISTS tasks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title VARCHAR(300) NOT NULL,
  description TEXT,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  status task_status NOT NULL DEFAULT 'pending',
  priority task_priority NOT NULL DEFAULT 'medium',
  created_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  due_date TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  estimated_hours DECIMAL(10,2),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- =============================================
-- 10. SUBTAREAS
-- =============================================

CREATE TABLE IF NOT EXISTS subtasks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  title VARCHAR(300) NOT NULL,
  description TEXT,
  status task_status NOT NULL DEFAULT 'pending',
  priority task_priority NOT NULL DEFAULT 'medium',
  due_date TIMESTAMP WITH TIME ZONE,
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  estimated_hours DECIMAL(10,2),
  order_index INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- =============================================
-- 11. ASIGNACIONES DE TAREAS
-- =============================================

CREATE TABLE IF NOT EXISTS task_assignees (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  assigned_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  assigned_by UUID REFERENCES users(id) ON DELETE SET NULL,
  UNIQUE(task_id, user_id)
);

-- =============================================
-- 12. ASIGNACIONES DE SUBTAREAS
-- =============================================

CREATE TABLE IF NOT EXISTS subtask_assignees (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  subtask_id UUID NOT NULL REFERENCES subtasks(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  assigned_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  assigned_by UUID REFERENCES users(id) ON DELETE SET NULL,
  UNIQUE(subtask_id, user_id)
);

-- =============================================
-- 13. REGISTRO DE TIEMPO
-- =============================================

CREATE TABLE IF NOT EXISTS time_entries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  subtask_id UUID NOT NULL REFERENCES subtasks(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  started_at TIMESTAMP WITH TIME ZONE NOT NULL,
  ended_at TIMESTAMP WITH TIME ZONE,
  duration_minutes INTEGER,
  description TEXT,
  is_manual BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- =============================================
-- 14. ACTIVIDADES (Feed)
-- =============================================

CREATE TABLE IF NOT EXISTS activities (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  activity_type activity_type NOT NULL,
  title VARCHAR(300) NOT NULL,
  description TEXT,
  task_id UUID REFERENCES tasks(id) ON DELETE CASCADE,
  subtask_id UUID REFERENCES subtasks(id) ON DELETE CASCADE,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- =============================================
-- 15. COMENTARIOS
-- =============================================

CREATE TABLE IF NOT EXISTS task_comments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  task_id UUID REFERENCES tasks(id) ON DELETE CASCADE,
  subtask_id UUID REFERENCES subtasks(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  CONSTRAINT comment_has_parent CHECK (task_id IS NOT NULL OR subtask_id IS NOT NULL)
);

-- =============================================
-- 16. ESTADÍSTICAS DE USUARIO
-- =============================================

CREATE TABLE IF NOT EXISTS user_stats (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE UNIQUE,
  total_tasks_completed INTEGER DEFAULT 0,
  total_subtasks_completed INTEGER DEFAULT 0,
  total_time_logged_minutes INTEGER DEFAULT 0,
  current_streak_days INTEGER DEFAULT 0,
  longest_streak_days INTEGER DEFAULT 0,
  tasks_this_week INTEGER DEFAULT 0,
  tasks_this_month INTEGER DEFAULT 0,
  avg_completion_time_minutes DECIMAL(10,2),
  last_activity_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- =============================================
-- ÍNDICES
-- =============================================

-- Usuarios
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_department_id ON users(department_id);
CREATE INDEX IF NOT EXISTS idx_users_status ON users(status);

-- Sesiones
CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON user_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_token ON user_sessions(token);
CREATE INDEX IF NOT EXISTS idx_user_sessions_expires_at ON user_sessions(expires_at);

-- Mensajes
CREATE INDEX IF NOT EXISTS idx_messages_channel_id ON messages(channel_id);
CREATE INDEX IF NOT EXISTS idx_messages_user_id ON messages(user_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at DESC);

-- Proyectos
CREATE INDEX IF NOT EXISTS idx_projects_department_id ON projects(department_id);
CREATE INDEX IF NOT EXISTS idx_projects_owner_id ON projects(owner_id);
CREATE INDEX IF NOT EXISTS idx_projects_status ON projects(status);

-- Tareas
CREATE INDEX IF NOT EXISTS idx_tasks_project_id ON tasks(project_id);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_created_by ON tasks(created_by);
CREATE INDEX IF NOT EXISTS idx_tasks_due_date ON tasks(due_date);
CREATE INDEX IF NOT EXISTS idx_tasks_priority ON tasks(priority);

-- Subtareas
CREATE INDEX IF NOT EXISTS idx_subtasks_task_id ON subtasks(task_id);
CREATE INDEX IF NOT EXISTS idx_subtasks_status ON subtasks(status);

-- Asignaciones
CREATE INDEX IF NOT EXISTS idx_task_assignees_user_id ON task_assignees(user_id);
CREATE INDEX IF NOT EXISTS idx_task_assignees_task_id ON task_assignees(task_id);
CREATE INDEX IF NOT EXISTS idx_subtask_assignees_user_id ON subtask_assignees(user_id);
CREATE INDEX IF NOT EXISTS idx_subtask_assignees_subtask_id ON subtask_assignees(subtask_id);

-- Time entries
CREATE INDEX IF NOT EXISTS idx_time_entries_subtask_id ON time_entries(subtask_id);
CREATE INDEX IF NOT EXISTS idx_time_entries_user_id ON time_entries(user_id);
CREATE INDEX IF NOT EXISTS idx_time_entries_started_at ON time_entries(started_at);

-- Actividades
CREATE INDEX IF NOT EXISTS idx_activities_user_id ON activities(user_id);
CREATE INDEX IF NOT EXISTS idx_activities_created_at ON activities(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activities_type ON activities(activity_type);

-- Comentarios
CREATE INDEX IF NOT EXISTS idx_task_comments_task_id ON task_comments(task_id);
CREATE INDEX IF NOT EXISTS idx_task_comments_subtask_id ON task_comments(subtask_id);
CREATE INDEX IF NOT EXISTS idx_task_comments_user_id ON task_comments(user_id);

-- =============================================
-- FUNCIONES
-- =============================================

-- Función para actualizar updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Función para calcular duración de time_entry
CREATE OR REPLACE FUNCTION calculate_time_entry_duration()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.ended_at IS NOT NULL AND (OLD.ended_at IS NULL OR OLD.ended_at != NEW.ended_at) THEN
    NEW.duration_minutes = EXTRACT(EPOCH FROM (NEW.ended_at - NEW.started_at)) / 60;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Función para crear user_stats automáticamente
CREATE OR REPLACE FUNCTION create_user_stats()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO user_stats (user_id)
  VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Función para registrar actividad de subtarea
CREATE OR REPLACE FUNCTION log_subtask_activity()
RETURNS TRIGGER AS $$
DECLARE
  assignee_id UUID;
BEGIN
  -- Obtener un asignado de la subtarea
  SELECT user_id INTO assignee_id
  FROM subtask_assignees
  WHERE subtask_id = NEW.id
  LIMIT 1;

  -- Si no hay asignado, usar el creador de la tarea
  IF assignee_id IS NULL THEN
    SELECT created_by INTO assignee_id
    FROM tasks
    WHERE id = NEW.task_id;
  END IF;

  -- Registrar cuando se completa
  IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
    NEW.completed_at = NOW();

    IF assignee_id IS NOT NULL THEN
      INSERT INTO activities (user_id, activity_type, title, subtask_id, task_id)
      VALUES (assignee_id, 'subtask_completed', 'Completó la subtarea: ' || NEW.title, NEW.id, NEW.task_id);
    END IF;
  END IF;

  -- Registrar cuando se inicia
  IF NEW.status = 'in_progress' AND OLD.status = 'pending' THEN
    NEW.started_at = NOW();

    IF assignee_id IS NOT NULL THEN
      INSERT INTO activities (user_id, activity_type, title, subtask_id, task_id)
      VALUES (assignee_id, 'subtask_started', 'Inició la subtarea: ' || NEW.title, NEW.id, NEW.task_id);
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Función para registrar actividad de tarea
CREATE OR REPLACE FUNCTION log_task_activity()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
    NEW.completed_at = NOW();

    INSERT INTO activities (user_id, activity_type, title, task_id)
    VALUES (NEW.created_by, 'task_completed', 'Completó la tarea: ' || NEW.title, NEW.id);
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Función para hashear password
CREATE OR REPLACE FUNCTION hash_password(password TEXT)
RETURNS TEXT AS $$
BEGIN
  RETURN crypt(password, gen_salt('bf', 10));
END;
$$ LANGUAGE plpgsql;

-- Función para verificar password
CREATE OR REPLACE FUNCTION verify_password(password TEXT, password_hash TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN password_hash = crypt(password, password_hash);
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- TRIGGERS
-- =============================================

-- Triggers para updated_at
DROP TRIGGER IF EXISTS update_users_updated_at ON users;
CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_departments_updated_at ON departments;
CREATE TRIGGER update_departments_updated_at
  BEFORE UPDATE ON departments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_projects_updated_at ON projects;
CREATE TRIGGER update_projects_updated_at
  BEFORE UPDATE ON projects
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_tasks_updated_at ON tasks;
CREATE TRIGGER update_tasks_updated_at
  BEFORE UPDATE ON tasks
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_subtasks_updated_at ON subtasks;
CREATE TRIGGER update_subtasks_updated_at
  BEFORE UPDATE ON subtasks
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_time_entries_updated_at ON time_entries;
CREATE TRIGGER update_time_entries_updated_at
  BEFORE UPDATE ON time_entries
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_task_comments_updated_at ON task_comments;
CREATE TRIGGER update_task_comments_updated_at
  BEFORE UPDATE ON task_comments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_user_stats_updated_at ON user_stats;
CREATE TRIGGER update_user_stats_updated_at
  BEFORE UPDATE ON user_stats
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Trigger para calcular duración
DROP TRIGGER IF EXISTS calculate_time_entry_duration_trigger ON time_entries;
CREATE TRIGGER calculate_time_entry_duration_trigger
  BEFORE UPDATE ON time_entries
  FOR EACH ROW EXECUTE FUNCTION calculate_time_entry_duration();

-- Trigger para crear stats de usuario
DROP TRIGGER IF EXISTS create_user_stats_trigger ON users;
CREATE TRIGGER create_user_stats_trigger
  AFTER INSERT ON users
  FOR EACH ROW EXECUTE FUNCTION create_user_stats();

-- Trigger para actividad de subtarea
DROP TRIGGER IF EXISTS log_subtask_activity_trigger ON subtasks;
CREATE TRIGGER log_subtask_activity_trigger
  BEFORE UPDATE ON subtasks
  FOR EACH ROW EXECUTE FUNCTION log_subtask_activity();

-- Trigger para actividad de tarea
DROP TRIGGER IF EXISTS log_task_activity_trigger ON tasks;
CREATE TRIGGER log_task_activity_trigger
  BEFORE UPDATE ON tasks
  FOR EACH ROW EXECUTE FUNCTION log_task_activity();

-- =============================================
-- VISTAS
-- =============================================

-- Vista: Resumen de tiempo por tarea
CREATE OR REPLACE VIEW task_time_summary AS
SELECT
  t.id AS task_id,
  t.title AS task_title,
  t.status,
  t.priority,
  COALESCE(SUM(te.duration_minutes), 0) AS total_minutes,
  ROUND(COALESCE(SUM(te.duration_minutes), 0) / 60.0, 2) AS total_hours,
  COUNT(DISTINCT s.id) AS subtask_count,
  COUNT(DISTINCT CASE WHEN s.status = 'completed' THEN s.id END) AS completed_subtasks
FROM tasks t
LEFT JOIN subtasks s ON s.task_id = t.id
LEFT JOIN time_entries te ON te.subtask_id = s.id
GROUP BY t.id, t.title, t.status, t.priority;

-- Vista: Estadísticas de usuario
CREATE OR REPLACE VIEW user_statistics AS
SELECT
  u.id AS user_id,
  u.username,
  u.email,
  u.avatar_url,
  u.role,
  d.name AS department_name,
  d.color AS department_color,
  COUNT(DISTINCT CASE WHEN s.status = 'completed' THEN s.id END) AS subtasks_completed,
  COUNT(DISTINCT CASE WHEN t.status = 'completed' AND t.created_by = u.id THEN t.id END) AS tasks_created_completed,
  COALESCE(SUM(te.duration_minutes), 0) AS total_time_minutes,
  ROUND(COALESCE(SUM(te.duration_minutes), 0) / 60.0, 2) AS total_time_hours,
  COUNT(DISTINCT te.id) AS time_entries_count
FROM users u
LEFT JOIN departments d ON d.id = u.department_id
LEFT JOIN subtask_assignees sa ON sa.user_id = u.id
LEFT JOIN subtasks s ON s.id = sa.subtask_id
LEFT JOIN tasks t ON t.id = s.task_id
LEFT JOIN time_entries te ON te.user_id = u.id
GROUP BY u.id, u.username, u.email, u.avatar_url, u.role, d.name, d.color;

-- Vista: Tareas con asignados
CREATE OR REPLACE VIEW tasks_with_assignees AS
SELECT
  t.*,
  p.name AS project_name,
  p.color AS project_color,
  creator.username AS creator_name,
  creator.avatar_url AS creator_avatar,
  COALESCE(
    json_agg(
      DISTINCT jsonb_build_object(
        'id', assignee.id,
        'username', assignee.username,
        'avatar_url', assignee.avatar_url
      )
    ) FILTER (WHERE assignee.id IS NOT NULL),
    '[]'
  ) AS assignees
FROM tasks t
LEFT JOIN projects p ON p.id = t.project_id
LEFT JOIN users creator ON creator.id = t.created_by
LEFT JOIN task_assignees ta ON ta.task_id = t.id
LEFT JOIN users assignee ON assignee.id = ta.user_id
GROUP BY t.id, p.name, p.color, creator.username, creator.avatar_url;

-- Vista: Subtareas con asignados
CREATE OR REPLACE VIEW subtasks_with_assignees AS
SELECT
  s.*,
  t.title AS task_title,
  COALESCE(
    json_agg(
      DISTINCT jsonb_build_object(
        'id', assignee.id,
        'username', assignee.username,
        'avatar_url', assignee.avatar_url
      )
    ) FILTER (WHERE assignee.id IS NOT NULL),
    '[]'
  ) AS assignees,
  COALESCE(SUM(te.duration_minutes), 0) AS total_time_minutes
FROM subtasks s
LEFT JOIN tasks t ON t.id = s.task_id
LEFT JOIN subtask_assignees sa ON sa.subtask_id = s.id
LEFT JOIN users assignee ON assignee.id = sa.user_id
LEFT JOIN time_entries te ON te.subtask_id = s.id
GROUP BY s.id, t.title;

-- =============================================
-- DATOS INICIALES
-- =============================================

-- Departamentos
INSERT INTO departments (name, description, color) VALUES
  ('Desarrollo', 'Equipo de desarrollo de software', '#3b82f6'),
  ('Diseño', 'Equipo de diseño UI/UX', '#ec4899'),
  ('Marketing', 'Equipo de marketing y comunicación', '#f59e0b'),
  ('Recursos Humanos', 'Gestión de personal', '#10b981'),
  ('Administración', 'Administración general', '#6366f1')
ON CONFLICT (name) DO NOTHING;

-- Canales por defecto
INSERT INTO channels (name, type, description) VALUES
  ('general', 'text', 'Canal general para conversaciones'),
  ('anuncios', 'text', 'Anuncios importantes del equipo'),
  ('random', 'text', 'Conversaciones casuales'),
  ('sala-principal', 'voice', 'Sala de voz principal'),
  ('reuniones', 'voice', 'Sala para reuniones de equipo')
ON CONFLICT DO NOTHING;

-- Usuario admin por defecto (password: admin123)
INSERT INTO users (email, password_hash, username, role)
VALUES (
  'admin@workplace.com',
  crypt('admin123', gen_salt('bf', 10)),
  'Admin',
  'admin'
)
ON CONFLICT (email) DO NOTHING;

-- =============================================
-- 18. CHATS PRIVADOS
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

-- Indices para chats
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
-- FIN DEL SCHEMA
-- =============================================
