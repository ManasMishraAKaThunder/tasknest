const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8090";

// ---------- helpers ----------

async function request<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const token =
    typeof window !== "undefined" ? localStorage.getItem("token") : null;

  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string>),
  };

  if (token) headers["Authorization"] = `Bearer ${token}`;

  // Don't set Content-Type for FormData (browser sets multipart boundary)
  if (!(options.body instanceof FormData)) {
    headers["Content-Type"] = "application/json";
  }

  const res = await fetch(`${API_URL}${path}`, { ...options, headers });

  if (res.status === 401) {
    if (typeof window !== "undefined") {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      window.location.href = "/login";
    }
    throw new Error("Unauthorized");
  }

  if (res.status === 204) return {} as T;

  const data = await res.json();
  if (!res.ok) throw new ApiError(res.status, data);
  return data as T;
}

export class ApiError extends Error {
  status: number;
  data: unknown;
  constructor(status: number, data: unknown) {
    super(
      typeof data === "object" && data && "message" in data
        ? (data as { message: string }).message
        : `API error ${status}`
    );
    this.status = status;
    this.data = data;
  }
}

// ---------- types ----------

export interface User {
  id: string;
  email: string;
  displayName?: string;
  created: string;
  updated: string;
}

export interface AuthResponse {
  token: string;
  record: User;
}

export interface Workspace {
  id: string;
  name: string;
  owner: string;
  created: string;
  updated: string;
}

export interface WorkspaceMember {
  id: string;
  workspace: string;
  user: string;
  memberRole: string;
  created: string;
  updated: string;
}

export interface Board {
  id: string;
  name: string;
  workspace: string;
  created: string;
  updated: string;
}

export interface List {
  id: string;
  name: string;
  board: string;
  order: number;
  created: string;
  updated: string;
}

export interface Task {
  id: string;
  title: string;
  description?: string;
  list: string;
  attachment?: string;
  dueDate?: string;
  created: string;
  updated: string;
}

export interface PaginatedResponse<T> {
  page: number;
  perPage: number;
  totalPages: number;
  totalItems: number;
  items: T[];
}

// ---------- auth ----------

export const auth = {
  register(email: string, password: string) {
    return request<AuthResponse>("/api/collections/users/records", {
      method: "POST",
      body: JSON.stringify({ email, password, passwordConfirm: password }),
    });
  },

  login(email: string, password: string) {
    return request<AuthResponse>(
      "/api/collections/users/auth-with-password",
      {
        method: "POST",
        body: JSON.stringify({ identity: email, password }),
      }
    );
  },

  refresh() {
    return request<AuthResponse>("/api/collections/users/auth-refresh", {
      method: "POST",
    });
  },
};

// ---------- workspaces ----------

export const workspaces = {
  list() {
    return request<PaginatedResponse<Workspace>>(
      "/api/collections/workspaces/records?sort=-created"
    );
  },

  create(name: string, ownerId: string) {
    return request<Workspace>("/api/collections/workspaces/records", {
      method: "POST",
      body: JSON.stringify({ name, owner: ownerId }),
    });
  },

  delete(id: string) {
    return request<void>(`/api/collections/workspaces/records/${id}`, {
      method: "DELETE",
    });
  },
};

// ---------- workspace members ----------

export const members = {
  list(workspaceId?: string) {
    const filter = workspaceId ? `?filter=workspace="${workspaceId}"` : "";
    return request<PaginatedResponse<WorkspaceMember>>(
      `/api/collections/workspace_members/records${filter}`
    );
  },

  create(workspaceId: string, userId: string, memberRole: string = "owner") {
    return request<WorkspaceMember>(
      "/api/collections/workspace_members/records",
      {
        method: "POST",
        body: JSON.stringify({
          workspace: workspaceId,
          user: userId,
          memberRole,
        }),
      }
    );
  },
};

// ---------- boards ----------

export const boards = {
  list(workspaceId: string) {
    return request<PaginatedResponse<Board>>(
      `/api/collections/boards/records?filter=workspace="${workspaceId}"&sort=-created`
    );
  },

  get(id: string) {
    return request<Board>(`/api/collections/boards/records/${id}`);
  },

  create(name: string, workspaceId: string) {
    return request<Board>("/api/collections/boards/records", {
      method: "POST",
      body: JSON.stringify({ name, workspace: workspaceId }),
    });
  },

  delete(id: string) {
    return request<void>(`/api/collections/boards/records/${id}`, {
      method: "DELETE",
    });
  },
};

// ---------- lists ----------

export const lists = {
  list(boardId: string) {
    return request<PaginatedResponse<List>>(
      `/api/collections/lists/records?filter=board="${boardId}"&sort=order`
    );
  },

  create(name: string, boardId: string, order: number = 0) {
    return request<List>("/api/collections/lists/records", {
      method: "POST",
      body: JSON.stringify({ name, board: boardId, order }),
    });
  },

  delete(id: string) {
    return request<void>(`/api/collections/lists/records/${id}`, {
      method: "DELETE",
    });
  },
};

// ---------- tasks ----------

export const tasks = {
  list(listId: string) {
    return request<PaginatedResponse<Task>>(
      `/api/collections/tasks/records?filter=list="${listId}"&sort=-created`
    );
  },

  listByBoard(boardId: string) {
    // Get all tasks for all lists in a board — filter by list's board
    return request<PaginatedResponse<Task>>(
      `/api/collections/tasks/records?sort=-created&perPage=200`
    );
  },

  create(data: { title: string; list: string; description?: string; dueDate?: string }) {
    return request<Task>("/api/collections/tasks/records", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  update(id: string, data: Partial<Task>) {
    return request<Task>(`/api/collections/tasks/records/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    });
  },

  delete(id: string) {
    return request<void>(`/api/collections/tasks/records/${id}`, {
      method: "DELETE",
    });
  },

  uploadAttachment(id: string, file: File) {
    const formData = new FormData();
    formData.append("attachment", file);
    return request<Task>(`/api/collections/tasks/records/${id}`, {
      method: "PATCH",
      body: formData,
    });
  },

  getAttachmentUrl(task: Task) {
    if (!task.attachment) return null;
    return `${API_URL}/api/files/tasks/${task.id}/${task.attachment}`;
  },
};
