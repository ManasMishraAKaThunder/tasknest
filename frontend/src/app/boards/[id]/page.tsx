"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/contexts/auth-context";
import {
  boards as boardsApi,
  lists as listsApi,
  tasks as tasksApi,
  type Board,
  type List,
  type Task,
} from "@/lib/api";

interface ListWithTasks extends List {
  tasks: Task[];
}

export default function BoardPage() {
  const router = useRouter();
  const params = useParams();
  const boardId = params.id as string;
  const { user, isLoading: authLoading } = useAuth();

  const [board, setBoard] = useState<Board | null>(null);
  const [columns, setColumns] = useState<ListWithTasks[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // New list form
  const [newListName, setNewListName] = useState("");
  const [addingList, setAddingList] = useState(false);

  // New task form (per-list)
  const [activeTaskForm, setActiveTaskForm] = useState<string | null>(null);
  const [newTaskTitle, setNewTaskTitle] = useState("");

  // Task detail modal
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [editDescription, setEditDescription] = useState("");
  const [moveToList, setMoveToList] = useState("");

  useEffect(() => {
    if (!authLoading && !user) router.push("/login");
  }, [authLoading, user, router]);

  const loadBoard = useCallback(async () => {
    if (!boardId) return;
    try {
      setLoading(true);
      const [boardData, listsData, allTasks] = await Promise.all([
        boardsApi.get(boardId),
        listsApi.list(boardId),
        tasksApi.listByBoard(boardId),
      ]);

      setBoard(boardData);

      const listItems = listsData.items || [];
      const taskItems = allTasks.items || [];

      // Group tasks by list
      const cols: ListWithTasks[] = listItems.map((l) => ({
        ...l,
        tasks: taskItems.filter((t) => t.list === l.id),
      }));

      setColumns(cols);
    } catch {
      setError("Failed to load board.");
    } finally {
      setLoading(false);
    }
  }, [boardId]);

  useEffect(() => {
    if (user && boardId) loadBoard();
  }, [user, boardId, loadBoard]);

  async function handleAddList(e: React.FormEvent) {
    e.preventDefault();
    if (!newListName.trim()) return;
    setAddingList(true);
    try {
      await listsApi.create(newListName.trim(), boardId, columns.length);
      setNewListName("");
      await loadBoard();
    } catch {
      setError("Failed to create list.");
    } finally {
      setAddingList(false);
    }
  }

  async function handleAddTask(listId: string) {
    if (!newTaskTitle.trim()) return;
    try {
      await tasksApi.create({ title: newTaskTitle.trim(), list: listId });
      setNewTaskTitle("");
      setActiveTaskForm(null);
      await loadBoard();
    } catch {
      setError("Failed to create task.");
    }
  }

  async function handleDeleteTask(taskId: string) {
    try {
      await tasksApi.delete(taskId);
      setSelectedTask(null);
      await loadBoard();
    } catch {
      setError("Failed to delete task.");
    }
  }

  async function handleDeleteList(listId: string) {
    if (!confirm("Delete this list and all its tasks?")) return;
    try {
      // Delete tasks in the list first (manual cascade)
      const col = columns.find((c) => c.id === listId);
      if (col) {
        for (const t of col.tasks) {
          await tasksApi.delete(t.id);
        }
      }
      await listsApi.delete(listId);
      await loadBoard();
    } catch {
      setError("Failed to delete list.");
    }
  }

  async function handleSaveDescription() {
    if (!selectedTask) return;
    try {
      await tasksApi.update(selectedTask.id, { description: editDescription });
      await loadBoard();
      setSelectedTask({ ...selectedTask, description: editDescription });
    } catch {
      setError("Failed to save description.");
    }
  }

  async function handleMoveTask() {
    if (!selectedTask || !moveToList) return;
    try {
      await tasksApi.update(selectedTask.id, { list: moveToList });
      setSelectedTask(null);
      await loadBoard();
    } catch {
      setError("Failed to move task.");
    }
  }

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    if (!selectedTask || !e.target.files?.[0]) return;
    try {
      const updated = await tasksApi.uploadAttachment(selectedTask.id, e.target.files[0]);
      setSelectedTask(updated);
      await loadBoard();
    } catch {
      setError("Failed to upload file.");
    }
  }

  if (authLoading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="spinner" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-3 border-b border-[var(--border)] shrink-0">
        <div className="flex items-center gap-3">
          <Link
            href={board ? `/workspaces/${board.workspace}/boards` : "/workspaces"}
            className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] no-underline text-sm"
          >
            ← Back
          </Link>
          <span className="text-[var(--text-muted)]">/</span>
          <h1 className="font-semibold text-lg">{board?.name || "..."}</h1>
        </div>
      </header>

      {error && (
        <div className="mx-6 mt-3 bg-[var(--danger)]/10 border border-[var(--danger)]/30 text-[var(--danger)] text-sm p-3 rounded-lg">
          {error}
          <button onClick={() => setError("")} className="ml-3 underline text-xs">dismiss</button>
        </div>
      )}

      {loading ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="spinner" />
        </div>
      ) : (
        /* Kanban columns */
        <div className="flex-1 overflow-x-auto">
          <div className="flex gap-4 p-6 min-h-0 h-[calc(100vh-60px)]">
            {columns.map((col) => (
              <div
                key={col.id}
                className="w-72 shrink-0 flex flex-col bg-[var(--bg-secondary)] rounded-xl border border-[var(--border)]"
              >
                {/* Column header */}
                <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border)]">
                  <h3 className="font-semibold text-sm flex items-center gap-2">
                    {col.name}
                    <span className="text-xs text-[var(--text-muted)] bg-[var(--bg-card)] px-1.5 py-0.5 rounded-full">
                      {col.tasks.length}
                    </span>
                  </h3>
                  <button
                    onClick={() => handleDeleteList(col.id)}
                    className="text-[var(--text-muted)] hover:text-[var(--danger)] text-xs transition-colors"
                    title="Delete list"
                  >
                    ✕
                  </button>
                </div>

                {/* Tasks */}
                <div className="flex-1 overflow-y-auto p-2 space-y-2">
                  {col.tasks.map((task) => (
                    <button
                      key={task.id}
                      onClick={() => {
                        setSelectedTask(task);
                        setEditDescription(task.description || "");
                        setMoveToList(task.list);
                      }}
                      className="w-full text-left p-3 rounded-lg bg-[var(--bg-card)] border border-[var(--border)] hover:border-[var(--accent)] transition-all cursor-pointer group"
                    >
                      <p className="text-sm font-medium">{task.title}</p>
                      <div className="flex items-center gap-2 mt-2">
                        {task.attachment && (
                          <span className="text-[10px] text-[var(--text-muted)] bg-[var(--bg-secondary)] px-1.5 py-0.5 rounded">
                            📎
                          </span>
                        )}
                        {task.dueDate && (
                          <span className="text-[10px] text-[var(--text-muted)] bg-[var(--bg-secondary)] px-1.5 py-0.5 rounded">
                            📅 {new Date(task.dueDate).toLocaleDateString()}
                          </span>
                        )}
                        {task.description && (
                          <span className="text-[10px] text-[var(--text-muted)] bg-[var(--bg-secondary)] px-1.5 py-0.5 rounded">
                            📝
                          </span>
                        )}
                      </div>
                    </button>
                  ))}

                  {/* Add task */}
                  {activeTaskForm === col.id ? (
                    <div className="p-2">
                      <input
                        className="input-field text-sm mb-2"
                        value={newTaskTitle}
                        onChange={(e) => setNewTaskTitle(e.target.value)}
                        placeholder="Task title..."
                        autoFocus
                        onKeyDown={(e) => {
                          if (e.key === "Enter") handleAddTask(col.id);
                          if (e.key === "Escape") setActiveTaskForm(null);
                        }}
                      />
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleAddTask(col.id)}
                          className="btn-primary text-xs py-1.5 px-3"
                        >
                          Add
                        </button>
                        <button
                          onClick={() => setActiveTaskForm(null)}
                          className="btn-ghost text-xs py-1.5 px-3"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={() => {
                        setActiveTaskForm(col.id);
                        setNewTaskTitle("");
                      }}
                      className="w-full text-left text-sm text-[var(--text-muted)] hover:text-[var(--text-primary)] p-2 rounded-lg hover:bg-[var(--bg-card)] transition-colors"
                    >
                      + Add a task
                    </button>
                  )}
                </div>
              </div>
            ))}

            {/* Add list column */}
            <div className="w-72 shrink-0">
              <form
                onSubmit={handleAddList}
                className="bg-[var(--bg-secondary)]/50 rounded-xl border border-dashed border-[var(--border)] p-4"
              >
                <input
                  className="input-field text-sm mb-2"
                  value={newListName}
                  onChange={(e) => setNewListName(e.target.value)}
                  placeholder="New list name..."
                />
                <button
                  type="submit"
                  className="btn-primary w-full text-sm"
                  disabled={addingList}
                >
                  {addingList ? "Adding..." : "+ Add List"}
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Task Detail Modal */}
      {selectedTask && (
        <div
          className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) setSelectedTask(null);
          }}
        >
          <div className="bg-[var(--bg-secondary)] border border-[var(--border)] rounded-xl w-full max-w-lg max-h-[80vh] overflow-y-auto">
            <div className="p-6">
              {/* Title */}
              <div className="flex items-start justify-between mb-4">
                <h2 className="text-xl font-bold">{selectedTask.title}</h2>
                <button
                  onClick={() => setSelectedTask(null)}
                  className="text-[var(--text-muted)] hover:text-[var(--text-primary)] text-lg"
                >
                  ✕
                </button>
              </div>

              {/* Description */}
              <div className="mb-5">
                <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">
                  Description
                </label>
                <textarea
                  className="input-field text-sm min-h-[80px] resize-y"
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  placeholder="Add a description..."
                />
                <button
                  onClick={handleSaveDescription}
                  className="btn-primary text-xs mt-2 py-1.5 px-3"
                >
                  Save Description
                </button>
              </div>

              {/* Move to list */}
              <div className="mb-5">
                <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">
                  Move to List
                </label>
                <div className="flex gap-2">
                  <select
                    className="input-field text-sm flex-1"
                    value={moveToList}
                    onChange={(e) => setMoveToList(e.target.value)}
                  >
                    {columns.map((col) => (
                      <option key={col.id} value={col.id}>
                        {col.name}
                      </option>
                    ))}
                  </select>
                  <button
                    onClick={handleMoveTask}
                    className="btn-primary text-xs py-1.5 px-3"
                    disabled={moveToList === selectedTask.list}
                  >
                    Move
                  </button>
                </div>
              </div>

              {/* File attachment */}
              <div className="mb-5">
                <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">
                  Attachment
                </label>
                {selectedTask.attachment ? (
                  <div className="flex items-center gap-2">
                    <a
                      href={tasksApi.getAttachmentUrl(selectedTask) || "#"}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-[var(--accent)] hover:underline"
                    >
                      📎 {selectedTask.attachment}
                    </a>
                  </div>
                ) : (
                  <p className="text-xs text-[var(--text-muted)] mb-1">No attachment</p>
                )}
                <input
                  type="file"
                  onChange={handleFileUpload}
                  className="text-sm text-[var(--text-secondary)] mt-1 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-medium file:bg-[var(--accent-subtle)] file:text-[var(--accent)] hover:file:bg-[var(--accent)]/20"
                />
              </div>

              {/* Meta info */}
              <div className="text-xs text-[var(--text-muted)] mb-5">
                Created: {new Date(selectedTask.created).toLocaleString()}
              </div>

              {/* Delete */}
              <button
                onClick={() => handleDeleteTask(selectedTask.id)}
                className="btn-danger w-full text-sm"
              >
                Delete Task
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
