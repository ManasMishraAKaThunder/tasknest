"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/contexts/auth-context";
import { boards as boardsApi, workspaces as wsApi, type Board, type Workspace } from "@/lib/api";

export default function BoardsPage() {
  const router = useRouter();
  const params = useParams();
  const workspaceId = params.id as string;
  const { user, isLoading: authLoading } = useAuth();
  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [boardList, setBoardList] = useState<Board[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!authLoading && !user) router.push("/login");
  }, [authLoading, user, router]);

  useEffect(() => {
    if (user && workspaceId) {
      loadData();
    }
  }, [user, workspaceId]);

  async function loadData() {
    try {
      setLoading(true);
      const [boardsRes, allWs] = await Promise.all([
        boardsApi.list(workspaceId),
        wsApi.list(),
      ]);
      const ws = (allWs.items || []).find((w) => w.id === workspaceId);
      setWorkspace(ws || null);
      setBoardList(boardsRes.items || []);
    } catch {
      setError("Failed to load boards.");
    } finally {
      setLoading(false);
    }
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!newName.trim()) return;
    setCreating(true);
    setError("");
    try {
      await boardsApi.create(newName.trim(), workspaceId);
      setNewName("");
      await loadData();
    } catch {
      setError("Failed to create board.");
    } finally {
      setCreating(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this board?")) return;
    try {
      await boardsApi.delete(id);
      await loadData();
    } catch {
      setError("Failed to delete board.");
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
    <div className="min-h-screen">
      <header className="flex items-center justify-between px-8 py-4 border-b border-[var(--border)]">
        <div className="flex items-center gap-3">
          <Link href="/workspaces" className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] no-underline text-sm">
            ← Workspaces
          </Link>
          <span className="text-[var(--text-muted)]">/</span>
          <span className="font-semibold">{workspace?.name || "..."}</span>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-10">
        <h1 className="text-3xl font-bold mb-2">Boards</h1>
        <p className="text-[var(--text-secondary)] mb-8">
          Each board contains lists and tasks for a specific project.
        </p>

        {error && (
          <div className="bg-[var(--danger)]/10 border border-[var(--danger)]/30 text-[var(--danger)] text-sm p-3 rounded-lg mb-6">
            {error}
          </div>
        )}

        <form onSubmit={handleCreate} className="flex gap-3 mb-8">
          <input
            className="input-field flex-1"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="New board name..."
            required
          />
          <button type="submit" className="btn-primary whitespace-nowrap" disabled={creating}>
            {creating ? "Creating..." : "+ Create Board"}
          </button>
        </form>

        {loading ? (
          <div className="flex justify-center py-12"><div className="spinner" /></div>
        ) : boardList.length === 0 ? (
          <div className="text-center py-16 text-[var(--text-muted)]">
            <div className="text-4xl mb-3">📋</div>
            <p>No boards yet. Create your first one!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {boardList.map((board) => (
              <div key={board.id} className="glass-card p-5 group relative">
                <Link
                  href={`/boards/${board.id}`}
                  className="no-underline text-[var(--text-primary)] block"
                >
                  <h3 className="font-semibold text-lg mb-1">{board.name}</h3>
                  <p className="text-xs text-[var(--text-muted)]">
                    {new Date(board.created).toLocaleDateString()}
                  </p>
                </Link>
                <button
                  onClick={() => handleDelete(board.id)}
                  className="btn-danger absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity text-xs py-1 px-2"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
