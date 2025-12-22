// =============================================
// WARM WORKPLACE HUB - API Client
// Cliente para conectar con el backend PostgreSQL
// =============================================

import type {
  ApiResponse,
  PaginatedResponse,
  AuthResponse,
  SafeUser,
  Department,
  Project,
  Task,
  Subtask,
  TimeEntry,
  Activity,
  Channel,
  Message,
  TaskComment,
  UserStats,
  TaskWithAssignees,
  SubtaskWithAssignees,
  UserStatistics,
  TaskTimeSummary,
  TaskInsert,
  SubtaskInsert,
  TimeEntryInsert,
  MessageInsert,
  TaskUpdate,
  SubtaskUpdate,
  TimeEntryUpdate,
  ProjectInsert,
  ProjectUpdate,
} from '@/types/database';

// =============================================
// CONFIGURACIÓN
// =============================================

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

// Token de autenticación
let authToken: string | null = localStorage.getItem('auth_token');

// =============================================
// HELPER FUNCTIONS
// =============================================

function getHeaders(): HeadersInit {
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };

  if (authToken) {
    headers['Authorization'] = `Bearer ${authToken}`;
  }

  return headers;
}

async function handleResponse<T>(response: Response): Promise<ApiResponse<T>> {
  if (!response.ok) {
    if (response.status === 401) {
      // Token expirado o inválido
      authToken = null;
      localStorage.removeItem('auth_token');
      localStorage.removeItem('user');
      window.location.href = '/auth';
    }

    const error = await response.json().catch(() => ({ message: 'Error de conexión' }));
    return {
      success: false,
      error: error.message || `Error ${response.status}`,
    };
  }

  const data = await response.json();
  return {
    success: true,
    data,
  };
}

async function apiGet<T>(endpoint: string): Promise<ApiResponse<T>> {
  try {
    const response = await fetch(`${API_URL}${endpoint}`, {
      method: 'GET',
      headers: getHeaders(),
    });
    return handleResponse<T>(response);
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error de conexión',
    };
  }
}

async function apiPost<T>(endpoint: string, body: unknown): Promise<ApiResponse<T>> {
  try {
    const response = await fetch(`${API_URL}${endpoint}`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(body),
    });
    return handleResponse<T>(response);
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error de conexión',
    };
  }
}

async function apiPut<T>(endpoint: string, body: unknown): Promise<ApiResponse<T>> {
  try {
    const response = await fetch(`${API_URL}${endpoint}`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(body),
    });
    return handleResponse<T>(response);
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error de conexión',
    };
  }
}

async function apiPatch<T>(endpoint: string, body: unknown): Promise<ApiResponse<T>> {
  try {
    const response = await fetch(`${API_URL}${endpoint}`, {
      method: 'PATCH',
      headers: getHeaders(),
      body: JSON.stringify(body),
    });
    return handleResponse<T>(response);
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error de conexión',
    };
  }
}

async function apiDelete<T>(endpoint: string): Promise<ApiResponse<T>> {
  try {
    const response = await fetch(`${API_URL}${endpoint}`, {
      method: 'DELETE',
      headers: getHeaders(),
    });
    return handleResponse<T>(response);
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error de conexión',
    };
  }
}

// =============================================
// AUTH API
// =============================================

export const auth = {
  async login(email: string, password: string): Promise<ApiResponse<AuthResponse>> {
    const result = await apiPost<AuthResponse>('/auth/login', { email, password });

    if (result.success && result.data) {
      authToken = result.data.token;
      localStorage.setItem('auth_token', result.data.token);
      localStorage.setItem('user', JSON.stringify(result.data.user));
    }

    return result;
  },

  async register(email: string, password: string, username: string): Promise<ApiResponse<AuthResponse>> {
    const result = await apiPost<AuthResponse>('/auth/register', { email, password, username });

    if (result.success && result.data) {
      authToken = result.data.token;
      localStorage.setItem('auth_token', result.data.token);
      localStorage.setItem('user', JSON.stringify(result.data.user));
    }

    return result;
  },

  async logout(): Promise<void> {
    await apiPost('/auth/logout', {});
    authToken = null;
    localStorage.removeItem('auth_token');
    localStorage.removeItem('user');
  },

  async getSession(): Promise<ApiResponse<SafeUser>> {
    return apiGet<SafeUser>('/auth/session');
  },

  async updateProfile(data: Partial<SafeUser>): Promise<ApiResponse<SafeUser>> {
    return apiPatch<SafeUser>('/auth/profile', data);
  },

  getStoredUser(): SafeUser | null {
    const user = localStorage.getItem('user');
    return user ? JSON.parse(user) : null;
  },

  isAuthenticated(): boolean {
    return !!authToken;
  },

  setToken(token: string): void {
    authToken = token;
    localStorage.setItem('auth_token', token);
  },
};

// =============================================
// USERS API
// =============================================

export const users = {
  async getAll(): Promise<ApiResponse<SafeUser[]>> {
    return apiGet<SafeUser[]>('/users');
  },

  async getAllIncludingInactive(): Promise<ApiResponse<SafeUser[]>> {
    return apiGet<SafeUser[]>('/users/all');
  },

  async getById(id: string): Promise<ApiResponse<SafeUser>> {
    return apiGet<SafeUser>(`/users/${id}`);
  },

  async getByDepartment(departmentId: string): Promise<ApiResponse<SafeUser[]>> {
    return apiGet<SafeUser[]>(`/users?department_id=${departmentId}`);
  },

  async create(data: {
    email: string;
    password: string;
    username: string;
    role?: 'admin' | 'manager' | 'member';
    department_id?: string | null;
  }): Promise<ApiResponse<SafeUser>> {
    return apiPost<SafeUser>('/users', data);
  },

  async update(id: string, data: Partial<SafeUser & { email?: string }>): Promise<ApiResponse<SafeUser>> {
    return apiPatch<SafeUser>(`/users/${id}`, data);
  },

  async changePassword(id: string, password: string): Promise<ApiResponse<{ message: string; user: SafeUser }>> {
    return apiPatch<{ message: string; user: SafeUser }>(`/users/${id}/password`, { password });
  },

  async toggleActive(id: string, is_active: boolean): Promise<ApiResponse<SafeUser>> {
    return apiPatch<SafeUser>(`/users/${id}/status`, { is_active });
  },

  async delete(id: string): Promise<ApiResponse<{ message: string; user: SafeUser }>> {
    return apiDelete<{ message: string; user: SafeUser }>(`/users/${id}`);
  },

  async getStats(userId: string): Promise<ApiResponse<UserStats>> {
    return apiGet<UserStats>(`/users/${userId}/stats`);
  },

  async getStatistics(): Promise<ApiResponse<UserStatistics[]>> {
    return apiGet<UserStatistics[]>('/users/statistics');
  },
};

// =============================================
// DEPARTMENTS API
// =============================================

export const departments = {
  async getAll(): Promise<ApiResponse<Department[]>> {
    return apiGet<Department[]>('/departments');
  },

  async getById(id: string): Promise<ApiResponse<Department>> {
    return apiGet<Department>(`/departments/${id}`);
  },

  async create(data: Omit<Department, 'id' | 'created_at' | 'updated_at'>): Promise<ApiResponse<Department>> {
    return apiPost<Department>('/departments', data);
  },

  async update(id: string, data: Partial<Department>): Promise<ApiResponse<Department>> {
    return apiPatch<Department>(`/departments/${id}`, data);
  },

  async delete(id: string): Promise<ApiResponse<void>> {
    return apiDelete<void>(`/departments/${id}`);
  },
};

// =============================================
// PROJECTS API
// =============================================

export const projects = {
  async getAll(): Promise<ApiResponse<Project[]>> {
    return apiGet<Project[]>('/projects');
  },

  async getById(id: string): Promise<ApiResponse<Project>> {
    return apiGet<Project>(`/projects/${id}`);
  },

  async create(data: ProjectInsert): Promise<ApiResponse<Project>> {
    return apiPost<Project>('/projects', data);
  },

  async update(id: string, data: ProjectUpdate): Promise<ApiResponse<Project>> {
    return apiPatch<Project>(`/projects/${id}`, data);
  },

  async delete(id: string): Promise<ApiResponse<void>> {
    return apiDelete<void>(`/projects/${id}`);
  },
};

// =============================================
// TASKS API
// =============================================

export const tasks = {
  async getAll(params?: { status?: string; project_id?: string }): Promise<ApiResponse<TaskWithAssignees[]>> {
    const query = params ? '?' + new URLSearchParams(params as Record<string, string>).toString() : '';
    return apiGet<TaskWithAssignees[]>(`/tasks${query}`);
  },

  async getAssignableUsers(): Promise<ApiResponse<SafeUser[]>> {
    return apiGet<SafeUser[]>('/tasks/assignable-users');
  },

  async getById(id: string): Promise<ApiResponse<TaskWithAssignees>> {
    return apiGet<TaskWithAssignees>(`/tasks/${id}`);
  },

  async create(data: TaskInsert & { assignee_ids?: string[] }): Promise<ApiResponse<TaskWithAssignees>> {
    return apiPost<TaskWithAssignees>('/tasks', data);
  },

  async update(id: string, data: TaskUpdate): Promise<ApiResponse<Task>> {
    return apiPatch<Task>(`/tasks/${id}`, data);
  },

  async delete(id: string): Promise<ApiResponse<void>> {
    return apiDelete<void>(`/tasks/${id}`);
  },

  async assignUser(taskId: string, userId: string): Promise<ApiResponse<void>> {
    return apiPost<void>(`/tasks/${taskId}/assignees`, { user_id: userId });
  },

  async removeAssignee(taskId: string, userId: string): Promise<ApiResponse<void>> {
    return apiDelete<void>(`/tasks/${taskId}/assignees/${userId}`);
  },

  async getTimeSummary(): Promise<ApiResponse<TaskTimeSummary[]>> {
    return apiGet<TaskTimeSummary[]>('/tasks/time-summary');
  },
};

// =============================================
// SUBTASKS API
// =============================================

export const subtasks = {
  async getByTask(taskId: string): Promise<ApiResponse<SubtaskWithAssignees[]>> {
    return apiGet<SubtaskWithAssignees[]>(`/tasks/${taskId}/subtasks`);
  },

  async getById(id: string): Promise<ApiResponse<SubtaskWithAssignees>> {
    return apiGet<SubtaskWithAssignees>(`/subtasks/${id}`);
  },

  async create(data: SubtaskInsert): Promise<ApiResponse<Subtask>> {
    return apiPost<Subtask>('/subtasks', data);
  },

  async update(id: string, data: SubtaskUpdate): Promise<ApiResponse<Subtask>> {
    return apiPatch<Subtask>(`/subtasks/${id}`, data);
  },

  async delete(id: string): Promise<ApiResponse<void>> {
    return apiDelete<void>(`/subtasks/${id}`);
  },

  async assignUser(subtaskId: string, userId: string): Promise<ApiResponse<void>> {
    return apiPost<void>(`/subtasks/${subtaskId}/assignees`, { user_id: userId });
  },

  async removeAssignee(subtaskId: string, userId: string): Promise<ApiResponse<void>> {
    return apiDelete<void>(`/subtasks/${subtaskId}/assignees/${userId}`);
  },

  async start(id: string): Promise<ApiResponse<Subtask>> {
    return apiPost<Subtask>(`/subtasks/${id}/start`, {});
  },

  async complete(id: string): Promise<ApiResponse<Subtask>> {
    return apiPost<Subtask>(`/subtasks/${id}/complete`, {});
  },
};

// =============================================
// TIME ENTRIES API
// =============================================

export const timeEntries = {
  async getBySubtask(subtaskId: string): Promise<ApiResponse<TimeEntry[]>> {
    return apiGet<TimeEntry[]>(`/subtasks/${subtaskId}/time-entries`);
  },

  async getByUser(userId: string): Promise<ApiResponse<TimeEntry[]>> {
    return apiGet<TimeEntry[]>(`/users/${userId}/time-entries`);
  },

  async create(data: TimeEntryInsert): Promise<ApiResponse<TimeEntry>> {
    return apiPost<TimeEntry>('/time-entries', data);
  },

  async update(id: string, data: TimeEntryUpdate): Promise<ApiResponse<TimeEntry>> {
    return apiPatch<TimeEntry>(`/time-entries/${id}`, data);
  },

  async delete(id: string): Promise<ApiResponse<void>> {
    return apiDelete<void>(`/time-entries/${id}`);
  },

  async startTimer(subtaskId: string): Promise<ApiResponse<TimeEntry>> {
    return apiPost<TimeEntry>('/time-entries/start', { subtask_id: subtaskId });
  },

  async stopTimer(id: string): Promise<ApiResponse<TimeEntry>> {
    return apiPost<TimeEntry>(`/time-entries/${id}/stop`, {});
  },
};

// =============================================
// ACTIVITIES API
// =============================================

export const activities = {
  async getAll(params?: { limit?: number }): Promise<ApiResponse<Activity[]>> {
    const query = params ? '?' + new URLSearchParams(params as unknown as Record<string, string>).toString() : '';
    return apiGet<Activity[]>(`/activities${query}`);
  },

  async getByUser(userId: string): Promise<ApiResponse<Activity[]>> {
    return apiGet<Activity[]>(`/users/${userId}/activities`);
  },
};

// =============================================
// CHANNELS API
// =============================================

export const channels = {
  async getAll(): Promise<ApiResponse<Channel[]>> {
    return apiGet<Channel[]>('/channels');
  },

  async getById(id: string): Promise<ApiResponse<Channel>> {
    return apiGet<Channel>(`/channels/${id}`);
  },

  async create(data: Omit<Channel, 'id' | 'created_at'>): Promise<ApiResponse<Channel>> {
    return apiPost<Channel>('/channels', data);
  },

  async delete(id: string): Promise<ApiResponse<void>> {
    return apiDelete<void>(`/channels/${id}`);
  },
};

// =============================================
// MESSAGES API
// =============================================

export const messages = {
  async getByChannel(channelId: string, params?: { limit?: number; before?: string }): Promise<ApiResponse<Message[]>> {
    const query = params ? '?' + new URLSearchParams(params as unknown as Record<string, string>).toString() : '';
    return apiGet<Message[]>(`/channels/${channelId}/messages${query}`);
  },

  async send(data: MessageInsert): Promise<ApiResponse<Message>> {
    return apiPost<Message>('/messages', data);
  },

  async delete(id: string): Promise<ApiResponse<void>> {
    return apiDelete<void>(`/messages/${id}`);
  },
};

// =============================================
// COMMENTS API
// =============================================

export const comments = {
  async getByTask(taskId: string): Promise<ApiResponse<TaskComment[]>> {
    return apiGet<TaskComment[]>(`/tasks/${taskId}/comments`);
  },

  async getBySubtask(subtaskId: string): Promise<ApiResponse<TaskComment[]>> {
    return apiGet<TaskComment[]>(`/subtasks/${subtaskId}/comments`);
  },

  async create(data: { task_id?: string; subtask_id?: string; content: string }): Promise<ApiResponse<TaskComment>> {
    return apiPost<TaskComment>('/comments', data);
  },

  async update(id: string, content: string): Promise<ApiResponse<TaskComment>> {
    return apiPatch<TaskComment>(`/comments/${id}`, { content });
  },

  async delete(id: string): Promise<ApiResponse<void>> {
    return apiDelete<void>(`/comments/${id}`);
  },
};

// =============================================
// CHATS API
// =============================================

interface ChatParticipant {
  id: string;
  username: string;
  avatar_url: string | null;
  status: string;
}

interface ChatMessage {
  id: string;
  content: string;
  user_id: string;
  username: string;
  avatar_url: string | null;
  created_at: string;
}

interface Chat {
  id: string;
  name: string | null;
  is_group: boolean;
  created_by: string;
  created_at: string;
  updated_at: string;
  participants: ChatParticipant[];
  last_message: ChatMessage | null;
  unread_count: number;
}

export const chats = {
  async getAll(): Promise<ApiResponse<Chat[]>> {
    return apiGet<Chat[]>('/chats');
  },

  async create(data: {
    participant_ids: string[];
    name?: string;
    is_group?: boolean;
  }): Promise<ApiResponse<Chat & { existing?: boolean }>> {
    return apiPost<Chat & { existing?: boolean }>('/chats', data);
  },

  async getMessages(chatId: string, params?: { limit?: number; before?: string }): Promise<ApiResponse<ChatMessage[]>> {
    const query = params ? '?' + new URLSearchParams(params as unknown as Record<string, string>).toString() : '';
    return apiGet<ChatMessage[]>(`/chats/${chatId}/messages${query}`);
  },

  async sendMessage(chatId: string, content: string): Promise<ApiResponse<ChatMessage>> {
    return apiPost<ChatMessage>(`/chats/${chatId}/messages`, { content });
  },

  async delete(chatId: string): Promise<ApiResponse<void>> {
    return apiDelete<void>(`/chats/${chatId}`);
  },
};

// =============================================
// EXPORT DEFAULT
// =============================================

const api = {
  auth,
  users,
  departments,
  projects,
  tasks,
  subtasks,
  timeEntries,
  activities,
  channels,
  messages,
  comments,
  chats,
};

export default api;
