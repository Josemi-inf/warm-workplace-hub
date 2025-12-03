// =============================================
// WARM WORKPLACE HUB - Database Types
// Tipos TypeScript para PostgreSQL
// =============================================

// =============================================
// ENUMS
// =============================================

export type UserStatus = 'online' | 'offline' | 'away' | 'busy';
export type UserRole = 'admin' | 'manager' | 'member';
export type TaskStatus = 'pending' | 'in_progress' | 'completed' | 'cancelled';
export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent';
export type ChannelType = 'voice' | 'text';
export type ActivityType =
  | 'task_created'
  | 'task_completed'
  | 'task_assigned'
  | 'subtask_created'
  | 'subtask_completed'
  | 'subtask_started'
  | 'time_logged'
  | 'comment_added'
  | 'project_created'
  | 'member_joined'
  | 'user_registered'
  | 'user_login';

// =============================================
// TABLES
// =============================================

export interface Department {
  id: string;
  name: string;
  description: string | null;
  color: string;
  created_at: string;
  updated_at: string;
}

export interface User {
  id: string;
  email: string;
  password_hash?: string; // No se envía al frontend
  username: string;
  avatar_url: string | null;
  status: UserStatus;
  role: UserRole;
  department_id: string | null;
  is_active: boolean;
  email_verified: boolean;
  last_login_at: string | null;
  created_at: string;
  updated_at: string;
}

// Usuario sin password para el frontend
export type SafeUser = Omit<User, 'password_hash'>;

export interface UserSession {
  id: string;
  user_id: string;
  token: string;
  expires_at: string;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
}

export interface Channel {
  id: string;
  name: string;
  type: ChannelType;
  description: string | null;
  created_at: string;
}

export interface Message {
  id: string;
  channel_id: string;
  user_id: string;
  content: string;
  created_at: string;
}

export interface VoiceParticipant {
  id: string;
  channel_id: string;
  user_id: string;
  joined_at: string;
}

export interface Project {
  id: string;
  name: string;
  description: string | null;
  color: string;
  department_id: string | null;
  owner_id: string | null;
  status: TaskStatus;
  start_date: string | null;
  due_date: string | null;
  created_at: string;
  updated_at: string;
}

export interface Task {
  id: string;
  title: string;
  description: string | null;
  project_id: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  created_by: string;
  due_date: string | null;
  completed_at: string | null;
  estimated_hours: number | null;
  created_at: string;
  updated_at: string;
}

export interface Subtask {
  id: string;
  task_id: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  due_date: string | null;
  started_at: string | null;
  completed_at: string | null;
  estimated_hours: number | null;
  order_index: number;
  created_at: string;
  updated_at: string;
}

export interface TaskAssignee {
  id: string;
  task_id: string;
  user_id: string;
  assigned_at: string;
  assigned_by: string | null;
}

export interface SubtaskAssignee {
  id: string;
  subtask_id: string;
  user_id: string;
  assigned_at: string;
  assigned_by: string | null;
}

export interface TimeEntry {
  id: string;
  subtask_id: string;
  user_id: string;
  started_at: string;
  ended_at: string | null;
  duration_minutes: number | null;
  description: string | null;
  is_manual: boolean;
  created_at: string;
  updated_at: string;
}

export interface Activity {
  id: string;
  user_id: string;
  activity_type: ActivityType;
  title: string;
  description: string | null;
  task_id: string | null;
  subtask_id: string | null;
  project_id: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface TaskComment {
  id: string;
  task_id: string | null;
  subtask_id: string | null;
  user_id: string;
  content: string;
  created_at: string;
  updated_at: string;
}

export interface UserStats {
  id: string;
  user_id: string;
  total_tasks_completed: number;
  total_subtasks_completed: number;
  total_time_logged_minutes: number;
  current_streak_days: number;
  longest_streak_days: number;
  tasks_this_week: number;
  tasks_this_month: number;
  avg_completion_time_minutes: number | null;
  last_activity_at: string | null;
  updated_at: string;
}

// =============================================
// VIEWS
// =============================================

export interface TaskTimeSummary {
  task_id: string;
  task_title: string;
  status: TaskStatus;
  priority: TaskPriority;
  total_minutes: number;
  total_hours: number;
  subtask_count: number;
  completed_subtasks: number;
}

export interface UserStatistics {
  user_id: string;
  username: string;
  email: string;
  avatar_url: string | null;
  role: UserRole;
  department_name: string | null;
  department_color: string | null;
  subtasks_completed: number;
  tasks_created_completed: number;
  total_time_minutes: number;
  total_time_hours: number;
  time_entries_count: number;
}

export interface TaskWithAssignees extends Task {
  project_name: string | null;
  project_color: string | null;
  creator_name: string;
  creator_avatar: string | null;
  assignees: Array<{
    id: string;
    username: string;
    avatar_url: string | null;
  }>;
}

export interface SubtaskWithAssignees extends Subtask {
  task_title: string;
  assignees: Array<{
    id: string;
    username: string;
    avatar_url: string | null;
  }>;
  total_time_minutes: number;
}

// =============================================
// INSERT TYPES
// =============================================

export type DepartmentInsert = Omit<Department, 'id' | 'created_at' | 'updated_at'> & {
  id?: string;
  created_at?: string;
  updated_at?: string;
};

export type UserInsert = Omit<User, 'id' | 'created_at' | 'updated_at' | 'last_login_at'> & {
  id?: string;
  password: string; // Plain password, will be hashed
  created_at?: string;
  updated_at?: string;
};

export type ProjectInsert = Omit<Project, 'id' | 'created_at' | 'updated_at'> & {
  id?: string;
  created_at?: string;
  updated_at?: string;
};

export type TaskInsert = Omit<Task, 'id' | 'created_at' | 'updated_at' | 'completed_at'> & {
  id?: string;
  created_at?: string;
  updated_at?: string;
};

export type SubtaskInsert = Omit<Subtask, 'id' | 'created_at' | 'updated_at' | 'started_at' | 'completed_at'> & {
  id?: string;
  created_at?: string;
  updated_at?: string;
};

export type TimeEntryInsert = Omit<TimeEntry, 'id' | 'created_at' | 'updated_at' | 'duration_minutes'> & {
  id?: string;
  created_at?: string;
  updated_at?: string;
};

export type MessageInsert = Omit<Message, 'id' | 'created_at'> & {
  id?: string;
  created_at?: string;
};

export type ActivityInsert = Omit<Activity, 'id' | 'created_at'> & {
  id?: string;
  created_at?: string;
};

export type TaskCommentInsert = Omit<TaskComment, 'id' | 'created_at' | 'updated_at'> & {
  id?: string;
  created_at?: string;
  updated_at?: string;
};

// =============================================
// UPDATE TYPES
// =============================================

export type DepartmentUpdate = Partial<Omit<Department, 'id' | 'created_at'>>;
export type UserUpdate = Partial<Omit<User, 'id' | 'created_at' | 'password_hash'>> & { password?: string };
export type ProjectUpdate = Partial<Omit<Project, 'id' | 'created_at'>>;
export type TaskUpdate = Partial<Omit<Task, 'id' | 'created_at' | 'created_by'>>;
export type SubtaskUpdate = Partial<Omit<Subtask, 'id' | 'created_at' | 'task_id'>>;
export type TimeEntryUpdate = Partial<Omit<TimeEntry, 'id' | 'created_at' | 'subtask_id' | 'user_id'>>;
export type TaskCommentUpdate = Partial<Omit<TaskComment, 'id' | 'created_at' | 'user_id'>>;

// =============================================
// API RESPONSE TYPES
// =============================================

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface AuthResponse {
  user: SafeUser;
  token: string;
  expiresAt: string;
}

// =============================================
// CONSTANTS
// =============================================

export const USER_STATUS_OPTIONS: UserStatus[] = ['online', 'offline', 'away', 'busy'];
export const USER_ROLE_OPTIONS: UserRole[] = ['admin', 'manager', 'member'];
export const TASK_STATUS_OPTIONS: TaskStatus[] = ['pending', 'in_progress', 'completed', 'cancelled'];
export const TASK_PRIORITY_OPTIONS: TaskPriority[] = ['low', 'medium', 'high', 'urgent'];
export const CHANNEL_TYPE_OPTIONS: ChannelType[] = ['voice', 'text'];

export const TASK_STATUS_LABELS: Record<TaskStatus, string> = {
  pending: 'Pendiente',
  in_progress: 'En progreso',
  completed: 'Completada',
  cancelled: 'Cancelada',
};

export const TASK_PRIORITY_LABELS: Record<TaskPriority, string> = {
  low: 'Baja',
  medium: 'Media',
  high: 'Alta',
  urgent: 'Urgente',
};

export const USER_STATUS_LABELS: Record<UserStatus, string> = {
  online: 'En línea',
  offline: 'Desconectado',
  away: 'Ausente',
  busy: 'Ocupado',
};

export const USER_ROLE_LABELS: Record<UserRole, string> = {
  admin: 'Administrador',
  manager: 'Manager',
  member: 'Miembro',
};
