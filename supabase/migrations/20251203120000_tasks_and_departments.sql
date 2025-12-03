-- =============================================
-- WARM WORKPLACE HUB - Backend Schema
-- Tareas, Subtareas, Departamentos, Tiempo y Estadísticas
-- =============================================

-- =============================================
-- 1. ENUMS
-- =============================================

-- Estado de tareas y subtareas
CREATE TYPE task_status AS ENUM ('pending', 'in_progress', 'completed', 'cancelled');

-- Prioridad de tareas
CREATE TYPE task_priority AS ENUM ('low', 'medium', 'high', 'urgent');

-- Tipo de actividad para el feed
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
  'member_joined'
);

-- =============================================
-- 2. DEPARTAMENTOS
-- =============================================

CREATE TABLE public.departments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  color TEXT DEFAULT '#6366f1', -- Color para identificar visualmente
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- =============================================
-- 3. ACTUALIZAR PROFILES (agregar departamento)
-- =============================================

ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS department_id UUID REFERENCES public.departments(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'member' CHECK (role IN ('admin', 'manager', 'member')),
ADD COLUMN IF NOT EXISTS email TEXT;

-- =============================================
-- 4. PROYECTOS
-- =============================================

CREATE TABLE public.projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  color TEXT DEFAULT '#8b5cf6',
  department_id UUID REFERENCES public.departments(id) ON DELETE SET NULL,
  owner_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  status task_status NOT NULL DEFAULT 'pending',
  start_date DATE,
  due_date DATE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- =============================================
-- 5. TAREAS
-- =============================================

CREATE TABLE public.tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
  status task_status NOT NULL DEFAULT 'pending',
  priority task_priority NOT NULL DEFAULT 'medium',
  created_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  due_date TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  estimated_hours DECIMAL(10,2),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- =============================================
-- 6. SUBTAREAS
-- =============================================

CREATE TABLE public.subtasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  status task_status NOT NULL DEFAULT 'pending',
  priority task_priority NOT NULL DEFAULT 'medium',
  due_date TIMESTAMP WITH TIME ZONE,
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  estimated_hours DECIMAL(10,2),
  order_index INTEGER NOT NULL DEFAULT 0, -- Para ordenar subtareas
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- =============================================
-- 7. ASIGNACIONES DE TAREAS (muchos a muchos)
-- =============================================

CREATE TABLE public.task_assignees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  assigned_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  assigned_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  UNIQUE(task_id, user_id)
);

-- =============================================
-- 8. ASIGNACIONES DE SUBTAREAS (muchos a muchos)
-- =============================================

CREATE TABLE public.subtask_assignees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subtask_id UUID NOT NULL REFERENCES public.subtasks(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  assigned_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  assigned_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  UNIQUE(subtask_id, user_id)
);

-- =============================================
-- 9. REGISTRO DE TIEMPO (Time Entries)
-- =============================================

CREATE TABLE public.time_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subtask_id UUID NOT NULL REFERENCES public.subtasks(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  started_at TIMESTAMP WITH TIME ZONE NOT NULL,
  ended_at TIMESTAMP WITH TIME ZONE,
  duration_minutes INTEGER, -- Calculado automáticamente o manual
  description TEXT, -- Descripción del trabajo realizado
  is_manual BOOLEAN DEFAULT false, -- Si fue ingresado manualmente
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- =============================================
-- 10. ACTIVIDADES (Feed)
-- =============================================

CREATE TABLE public.activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  activity_type activity_type NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  -- Referencias polimórficas (solo una será NOT NULL según el tipo)
  task_id UUID REFERENCES public.tasks(id) ON DELETE CASCADE,
  subtask_id UUID REFERENCES public.subtasks(id) ON DELETE CASCADE,
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
  metadata JSONB DEFAULT '{}', -- Datos adicionales flexibles
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- =============================================
-- 11. COMENTARIOS EN TAREAS/SUBTAREAS
-- =============================================

CREATE TABLE public.task_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID REFERENCES public.tasks(id) ON DELETE CASCADE,
  subtask_id UUID REFERENCES public.subtasks(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  -- Al menos uno debe estar presente
  CONSTRAINT comment_has_parent CHECK (task_id IS NOT NULL OR subtask_id IS NOT NULL)
);

-- =============================================
-- 12. ESTADÍSTICAS DE USUARIO (Cache para performance)
-- =============================================

CREATE TABLE public.user_stats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE UNIQUE,
  total_tasks_completed INTEGER DEFAULT 0,
  total_subtasks_completed INTEGER DEFAULT 0,
  total_time_logged_minutes INTEGER DEFAULT 0,
  current_streak_days INTEGER DEFAULT 0,
  longest_streak_days INTEGER DEFAULT 0,
  tasks_this_week INTEGER DEFAULT 0,
  tasks_this_month INTEGER DEFAULT 0,
  avg_completion_time_minutes DECIMAL(10,2),
  last_activity_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- =============================================
-- ÍNDICES PARA PERFORMANCE
-- =============================================

-- Índices para tareas
CREATE INDEX idx_tasks_project_id ON public.tasks(project_id);
CREATE INDEX idx_tasks_status ON public.tasks(status);
CREATE INDEX idx_tasks_created_by ON public.tasks(created_by);
CREATE INDEX idx_tasks_due_date ON public.tasks(due_date);

-- Índices para subtareas
CREATE INDEX idx_subtasks_task_id ON public.subtasks(task_id);
CREATE INDEX idx_subtasks_status ON public.subtasks(status);

-- Índices para asignaciones
CREATE INDEX idx_task_assignees_user_id ON public.task_assignees(user_id);
CREATE INDEX idx_task_assignees_task_id ON public.task_assignees(task_id);
CREATE INDEX idx_subtask_assignees_user_id ON public.subtask_assignees(user_id);
CREATE INDEX idx_subtask_assignees_subtask_id ON public.subtask_assignees(subtask_id);

-- Índices para time entries
CREATE INDEX idx_time_entries_subtask_id ON public.time_entries(subtask_id);
CREATE INDEX idx_time_entries_user_id ON public.time_entries(user_id);
CREATE INDEX idx_time_entries_started_at ON public.time_entries(started_at);

-- Índices para actividades
CREATE INDEX idx_activities_user_id ON public.activities(user_id);
CREATE INDEX idx_activities_created_at ON public.activities(created_at DESC);
CREATE INDEX idx_activities_type ON public.activities(activity_type);

-- Índices para profiles
CREATE INDEX idx_profiles_department_id ON public.profiles(department_id);

-- Índices para proyectos
CREATE INDEX idx_projects_department_id ON public.projects(department_id);
CREATE INDEX idx_projects_owner_id ON public.projects(owner_id);

-- =============================================
-- ROW LEVEL SECURITY (RLS)
-- =============================================

-- Habilitar RLS en todas las tablas
ALTER TABLE public.departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subtasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_assignees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subtask_assignees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.time_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_stats ENABLE ROW LEVEL SECURITY;

-- POLICIES: Departments (todos pueden ver, solo admins modifican)
CREATE POLICY "Departments viewable by authenticated users"
ON public.departments FOR SELECT TO authenticated USING (true);

CREATE POLICY "Departments manageable by admins"
ON public.departments FOR ALL TO authenticated
USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);

-- POLICIES: Projects
CREATE POLICY "Projects viewable by authenticated users"
ON public.projects FOR SELECT TO authenticated USING (true);

CREATE POLICY "Projects insertable by authenticated users"
ON public.projects FOR INSERT TO authenticated
WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Projects updatable by owner or admin"
ON public.projects FOR UPDATE TO authenticated
USING (
  owner_id = auth.uid() OR
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'manager'))
);

CREATE POLICY "Projects deletable by owner or admin"
ON public.projects FOR DELETE TO authenticated
USING (
  owner_id = auth.uid() OR
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);

-- POLICIES: Tasks
CREATE POLICY "Tasks viewable by authenticated users"
ON public.tasks FOR SELECT TO authenticated USING (true);

CREATE POLICY "Tasks insertable by authenticated users"
ON public.tasks FOR INSERT TO authenticated
WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Tasks updatable by creator, assignee or admin"
ON public.tasks FOR UPDATE TO authenticated
USING (
  created_by = auth.uid() OR
  EXISTS (SELECT 1 FROM public.task_assignees WHERE task_id = tasks.id AND user_id = auth.uid()) OR
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'manager'))
);

CREATE POLICY "Tasks deletable by creator or admin"
ON public.tasks FOR DELETE TO authenticated
USING (
  created_by = auth.uid() OR
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);

-- POLICIES: Subtasks
CREATE POLICY "Subtasks viewable by authenticated users"
ON public.subtasks FOR SELECT TO authenticated USING (true);

CREATE POLICY "Subtasks insertable by task participants"
ON public.subtasks FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.tasks t
    WHERE t.id = task_id AND (
      t.created_by = auth.uid() OR
      EXISTS (SELECT 1 FROM public.task_assignees ta WHERE ta.task_id = t.id AND ta.user_id = auth.uid())
    )
  )
);

CREATE POLICY "Subtasks updatable by assignees"
ON public.subtasks FOR UPDATE TO authenticated
USING (
  EXISTS (SELECT 1 FROM public.subtask_assignees WHERE subtask_id = subtasks.id AND user_id = auth.uid()) OR
  EXISTS (SELECT 1 FROM public.tasks t WHERE t.id = task_id AND t.created_by = auth.uid()) OR
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'manager'))
);

CREATE POLICY "Subtasks deletable by task creator or admin"
ON public.subtasks FOR DELETE TO authenticated
USING (
  EXISTS (SELECT 1 FROM public.tasks t WHERE t.id = task_id AND t.created_by = auth.uid()) OR
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);

-- POLICIES: Task Assignees
CREATE POLICY "Task assignees viewable by authenticated users"
ON public.task_assignees FOR SELECT TO authenticated USING (true);

CREATE POLICY "Task assignees manageable by task creator or admin"
ON public.task_assignees FOR ALL TO authenticated
USING (
  EXISTS (SELECT 1 FROM public.tasks t WHERE t.id = task_id AND t.created_by = auth.uid()) OR
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'manager'))
);

-- POLICIES: Subtask Assignees
CREATE POLICY "Subtask assignees viewable by authenticated users"
ON public.subtask_assignees FOR SELECT TO authenticated USING (true);

CREATE POLICY "Subtask assignees manageable by task creator or admin"
ON public.subtask_assignees FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.subtasks s
    JOIN public.tasks t ON t.id = s.task_id
    WHERE s.id = subtask_id AND t.created_by = auth.uid()
  ) OR
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'manager'))
);

-- POLICIES: Time Entries
CREATE POLICY "Time entries viewable by authenticated users"
ON public.time_entries FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users can insert their own time entries"
ON public.time_entries FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own time entries"
ON public.time_entries FOR UPDATE TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own time entries"
ON public.time_entries FOR DELETE TO authenticated
USING (user_id = auth.uid());

-- POLICIES: Activities
CREATE POLICY "Activities viewable by authenticated users"
ON public.activities FOR SELECT TO authenticated USING (true);

CREATE POLICY "Activities insertable by authenticated users"
ON public.activities FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

-- POLICIES: Task Comments
CREATE POLICY "Comments viewable by authenticated users"
ON public.task_comments FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users can insert their own comments"
ON public.task_comments FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own comments"
ON public.task_comments FOR UPDATE TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own comments"
ON public.task_comments FOR DELETE TO authenticated
USING (user_id = auth.uid());

-- POLICIES: User Stats
CREATE POLICY "User stats viewable by authenticated users"
ON public.user_stats FOR SELECT TO authenticated USING (true);

CREATE POLICY "System can manage user stats"
ON public.user_stats FOR ALL TO authenticated
USING (user_id = auth.uid());

-- =============================================
-- FUNCIONES Y TRIGGERS
-- =============================================

-- Función para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers para updated_at
CREATE TRIGGER update_departments_updated_at
  BEFORE UPDATE ON public.departments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_projects_updated_at
  BEFORE UPDATE ON public.projects
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_tasks_updated_at
  BEFORE UPDATE ON public.tasks
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_subtasks_updated_at
  BEFORE UPDATE ON public.subtasks
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_time_entries_updated_at
  BEFORE UPDATE ON public.time_entries
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_task_comments_updated_at
  BEFORE UPDATE ON public.task_comments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_stats_updated_at
  BEFORE UPDATE ON public.user_stats
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Función para calcular duración de time_entry al cerrar
CREATE OR REPLACE FUNCTION calculate_time_entry_duration()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.ended_at IS NOT NULL AND OLD.ended_at IS NULL THEN
    NEW.duration_minutes = EXTRACT(EPOCH FROM (NEW.ended_at - NEW.started_at)) / 60;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER calculate_time_entry_duration_trigger
  BEFORE UPDATE ON public.time_entries
  FOR EACH ROW EXECUTE FUNCTION calculate_time_entry_duration();

-- Función para crear actividad cuando se completa una subtarea
CREATE OR REPLACE FUNCTION log_subtask_completion()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
    NEW.completed_at = now();

    INSERT INTO public.activities (user_id, activity_type, title, subtask_id, task_id)
    SELECT
      sa.user_id,
      'subtask_completed',
      'Completó la subtarea: ' || NEW.title,
      NEW.id,
      NEW.task_id
    FROM public.subtask_assignees sa
    WHERE sa.subtask_id = NEW.id
    LIMIT 1;
  END IF;

  IF NEW.status = 'in_progress' AND OLD.status = 'pending' THEN
    NEW.started_at = now();

    INSERT INTO public.activities (user_id, activity_type, title, subtask_id, task_id)
    SELECT
      sa.user_id,
      'subtask_started',
      'Inició la subtarea: ' || NEW.title,
      NEW.id,
      NEW.task_id
    FROM public.subtask_assignees sa
    WHERE sa.subtask_id = NEW.id
    LIMIT 1;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER log_subtask_status_change
  BEFORE UPDATE ON public.subtasks
  FOR EACH ROW EXECUTE FUNCTION log_subtask_completion();

-- Función para crear actividad cuando se completa una tarea
CREATE OR REPLACE FUNCTION log_task_completion()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
    NEW.completed_at = now();

    INSERT INTO public.activities (user_id, activity_type, title, task_id)
    VALUES (
      NEW.created_by,
      'task_completed',
      'Completó la tarea: ' || NEW.title,
      NEW.id
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER log_task_status_change
  BEFORE UPDATE ON public.tasks
  FOR EACH ROW EXECUTE FUNCTION log_task_completion();

-- Función para crear user_stats cuando se crea un profile
CREATE OR REPLACE FUNCTION create_user_stats()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_stats (user_id)
  VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER create_user_stats_on_profile
  AFTER INSERT ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION create_user_stats();

-- =============================================
-- VISTAS ÚTILES
-- =============================================

-- Vista para obtener tiempo total por tarea
CREATE OR REPLACE VIEW public.task_time_summary AS
SELECT
  t.id AS task_id,
  t.title AS task_title,
  COALESCE(SUM(te.duration_minutes), 0) AS total_minutes,
  ROUND(COALESCE(SUM(te.duration_minutes), 0) / 60.0, 2) AS total_hours,
  COUNT(DISTINCT s.id) AS subtask_count,
  COUNT(DISTINCT CASE WHEN s.status = 'completed' THEN s.id END) AS completed_subtasks
FROM public.tasks t
LEFT JOIN public.subtasks s ON s.task_id = t.id
LEFT JOIN public.time_entries te ON te.subtask_id = s.id
GROUP BY t.id, t.title;

-- Vista para estadísticas de usuario
CREATE OR REPLACE VIEW public.user_statistics AS
SELECT
  p.id AS user_id,
  p.username,
  p.avatar_url,
  d.name AS department_name,
  COUNT(DISTINCT CASE WHEN s.status = 'completed' THEN s.id END) AS subtasks_completed,
  COUNT(DISTINCT CASE WHEN t.status = 'completed' AND t.created_by = p.id THEN t.id END) AS tasks_created_completed,
  COALESCE(SUM(te.duration_minutes), 0) AS total_time_minutes,
  ROUND(COALESCE(SUM(te.duration_minutes), 0) / 60.0, 2) AS total_time_hours,
  COUNT(DISTINCT te.id) AS time_entries_count
FROM public.profiles p
LEFT JOIN public.departments d ON d.id = p.department_id
LEFT JOIN public.subtask_assignees sa ON sa.user_id = p.id
LEFT JOIN public.subtasks s ON s.id = sa.subtask_id
LEFT JOIN public.tasks t ON t.id = s.task_id
LEFT JOIN public.time_entries te ON te.user_id = p.id
GROUP BY p.id, p.username, p.avatar_url, d.name;

-- =============================================
-- DATOS INICIALES
-- =============================================

-- Departamentos de ejemplo
INSERT INTO public.departments (name, description, color) VALUES
  ('Desarrollo', 'Equipo de desarrollo de software', '#3b82f6'),
  ('Diseño', 'Equipo de diseño UI/UX', '#ec4899'),
  ('Marketing', 'Equipo de marketing y comunicación', '#f59e0b'),
  ('Recursos Humanos', 'Gestión de personal', '#10b981'),
  ('Administración', 'Administración general', '#6366f1');

-- =============================================
-- HABILITAR REALTIME
-- =============================================

ALTER PUBLICATION supabase_realtime ADD TABLE public.tasks;
ALTER PUBLICATION supabase_realtime ADD TABLE public.subtasks;
ALTER PUBLICATION supabase_realtime ADD TABLE public.activities;
ALTER PUBLICATION supabase_realtime ADD TABLE public.time_entries;
