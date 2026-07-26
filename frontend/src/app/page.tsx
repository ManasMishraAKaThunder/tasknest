"use client";

import Link from "next/link";
import { useAuth } from "@/contexts/auth-context";

export default function LandingPage() {
  const { user } = useAuth();

  return (
    <div className="min-h-screen flex flex-col">
      {/* Nav */}
      <nav className="flex items-center justify-between px-8 py-5 border-b border-[var(--border)]">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-[var(--accent)] flex items-center justify-center text-white font-bold text-sm">
            T
          </div>
          <span className="font-semibold text-lg">TaskNest</span>
        </div>
        <div className="flex items-center gap-3">
          {user ? (
            <Link href="/workspaces" className="btn-primary inline-block no-underline">
              Go to Dashboard
            </Link>
          ) : (
            <>
              <Link href="/login" className="btn-ghost inline-block no-underline">
                Sign In
              </Link>
              <Link href="/register" className="btn-primary inline-block no-underline">
                Get Started
              </Link>
            </>
          )}
        </div>
      </nav>

      {/* Hero */}
      <main className="flex-1 flex flex-col items-center justify-center px-6 text-center">
        <div className="max-w-2xl mx-auto">
          <div className="inline-block mb-6 px-4 py-1.5 rounded-full text-xs font-medium bg-[var(--accent-subtle)] text-[var(--accent)] border border-[var(--accent)]/30">
            Built with Solarch — backend-as-a-service for Node.js
          </div>

          <h1 className="text-5xl font-bold mb-6 leading-tight">
            Organize your work.
            <br />
            <span className="bg-gradient-to-r from-[var(--accent)] to-purple-400 bg-clip-text text-transparent">
              Ship faster.
            </span>
          </h1>

          <p className="text-lg text-[var(--text-secondary)] mb-10 max-w-lg mx-auto leading-relaxed">
            TaskNest is a clean, minimal task board for teams. Create workspaces,
            boards, and organize tasks across lists — all powered by a single
            npm package.
          </p>

          <div className="flex items-center justify-center gap-4">
            <Link href="/register" className="btn-primary text-base px-8 py-3 inline-block no-underline">
              Start for Free →
            </Link>
            <a
              href="https://github.com"
              target="_blank"
              rel="noopener noreferrer"
              className="btn-ghost text-base px-8 py-3 inline-block no-underline"
            >
              View Source
            </a>
          </div>

          {/* Feature cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-20">
            {[
              { icon: "🏗️", title: "Workspaces", desc: "Group your projects into isolated workspaces." },
              { icon: "📋", title: "Kanban Boards", desc: "Visualize work across lists and columns." },
              { icon: "📎", title: "File Attachments", desc: "Attach files directly to any task." },
            ].map((f) => (
              <div
                key={f.title}
                className="glass-card p-6 text-left"
              >
                <div className="text-2xl mb-3">{f.icon}</div>
                <h3 className="font-semibold mb-1">{f.title}</h3>
                <p className="text-sm text-[var(--text-secondary)]">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="text-center py-6 text-sm text-[var(--text-muted)] border-t border-[var(--border)]">
        TaskNest — A Solarch test project · {new Date().getFullYear()}
      </footer>
    </div>
  );
}
