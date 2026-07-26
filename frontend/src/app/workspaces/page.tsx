"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/contexts/auth-context";
import { workspaces as wsApi, members as membersApi, type Workspace } from "@/lib/api";

export default function WorkspacesPage() {
  const router = useRouter();
  const { user, isLoading: authLoading, logout } = useAuth();
  const [workspaceList, setWorkspaceList] = useState<Workspace[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!authLoading && !user) router.push("/login");
  }, [authLoading, user, router]);

  useEffect(() => {
    if (user) loadWorkspaces();
  }, [user]);

  async function loadWorkspaces() {
    try {
      setLoading(true);
      const res = await wsApi.list();
      // Filter to only user's own workspaces (client-side scoping)
      const mine = (res.items || []).filter((w) => w.owner === user?.id);
      setWorkspaceList(mine);
    } catch {
      setError("Failed to load workspaces.");
    } finally {
      setLoading(false);
    }
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!newName.trim() || !user) return;
    setCreating(true);
    setError("");
    try {
      const ws = await wsApi.create(newName.trim(), user.id);
      // Auto-add creator as owner member (workaround for broken hooks)
      await membersApi.create(ws.id, user.id, "owner");
      setNewName("");
      await loadWorkspaces();
    } catch {
      setError("Failed to create workspace.");
    } finally {
      setCreating(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this workspace and all its contents?")) return;
    try {
      await wsApi.delete(id);
      await loadWorkspaces();
    } catch {
      setError("Failed to delete workspace.");
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
      {/* Header */}
      <header className="flex items-center justify-between px-8 py-4 border-b border-[var(--border)]">
        <Link href="/" className="flex items-center gap-2 no-underline text-[var(--text-primary)]">
          <div className="w-7 h-7 rounded-lg bg-[var(--accent)] flex items-center justify-center text-white font-bold text-xs">T</div>
          <span className="font-semibold">TaskNest</span>
        </Link>
        <div className="flex items-center gap-4">
          <span className="text-sm text-[var(--text-secondary)]">{user.email}</span>
          <button onClick={logout} className="btn-ghost text-sm py-1.5 px-3">
            Sign Out
          </button>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-10">
        <h1 className="text-3xl font-bold mb-2">Your Workspaces</h1>
        <p className="text-[var(--text-secondary)] mb-8">
          Organize your projects into separate workspaces.
        </p>

        {error && (
          <div className="bg-[var(--danger)]/10 border border-[var(--danger)]/30 text-[var(--danger)] text-sm p-3 rounded-lg mb-6">
            {error}
          </div>
        )}

        {/* Create form */}
        <form onSubmit={handleCreate} className="flex gap-3 mb-8">
          <input
            className="input-field flex-1"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="New workspace name..."
            required
          />
          <button type="submit" className="btn-primary whitespace-nowrap" disabled={creating}>
            {creating ? "Creating..." : "+ Create"}
          </button>
        </form>

        {/* List */}
        {loading ? (
          <div className="flex justify-center py-12"><div className="spinner" /></div>
        ) : workspaceList.length === 0 ? (
          <div className="text-center py-16 text-[var(--text-muted)]">
            <div className="text-4xl mb-3">📂</div>
            <p>No workspaces yet. Create your first one above!</p>
          </div>
        ) : (
          <div className="space-y-3">
            {workspaceList.map((ws) => (
              <div key={ws.id} className="glass-card p-5 flex items-center justify-between group">
                <Link
                  href={`/workspaces/${ws.id}/boards`}
                  className="flex-1 no-underline text-[var(--text-primary)]"
                >
                  <h3 className="font-semibold text-lg">{ws.name}</h3>
                  <p className="text-xs text-[var(--text-muted)] mt-1">
                    Created {new Date(ws.created).toLocaleDateString()}
                  </p>
                </Link>
                <button
                  onClick={() => handleDelete(ws.id)}
                  className="btn-danger opacity-0 group-hover:opacity-100 transition-opacity text-xs"
                >
                  Delete
                </button>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
