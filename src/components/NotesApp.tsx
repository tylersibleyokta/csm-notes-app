"use client";

import { useState } from "react";

type ActionItem = { text: string; pushed: boolean };
type Note = {
  id: string;
  accountName: string | null;
  summary: string;
  actionItems: ActionItem[];
  createdAt: string;
};

export function NotesApp({
  googleConnected,
  initialNotes,
  googleError,
  justConnected,
}: {
  googleConnected: boolean;
  initialNotes: Note[];
  googleError?: string;
  justConnected?: boolean;
}) {
  const [accountName, setAccountName] = useState("");
  const [rawNotes, setRawNotes] = useState("");
  const [cleaning, setCleaning] = useState(false);
  const [pushing, setPushing] = useState(false);
  const [current, setCurrent] = useState<Note | null>(null);
  const [checked, setChecked] = useState<Record<number, boolean>>({});
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<Note[]>(initialNotes);

  async function handleCleanup() {
    setError(null);
    setCleaning(true);
    try {
      const res = await fetch("/api/cleanup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rawNotes, accountName: accountName || undefined }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Cleanup failed.");
      const note: Note = {
        id: data.id,
        accountName: accountName || null,
        summary: data.summary,
        actionItems: data.actionItems,
        createdAt: data.createdAt,
      };
      setCurrent(note);
      setChecked(Object.fromEntries(note.actionItems.map((_, i) => [i, true])));
      setHistory((h) => [note, ...h]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Cleanup failed.");
    } finally {
      setCleaning(false);
    }
  }

  async function handlePush() {
    if (!current) return;
    setError(null);
    setPushing(true);
    try {
      const items = current.actionItems.filter((_, i) => checked[i]).map((item) => item.text);
      const res = await fetch("/api/tasks/push", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ noteId: current.id, items }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Push failed.");
      const updated = { ...current, actionItems: data.actionItems };
      setCurrent(updated);
      setHistory((h) => h.map((n) => (n.id === updated.id ? updated : n)));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Push failed.");
    } finally {
      setPushing(false);
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      {justConnected && <Banner tone="success">Google Tasks connected.</Banner>}
      {googleError && <Banner tone="error">Google Tasks connection failed: {googleError}</Banner>}
      {error && <Banner tone="error">{error}</Banner>}

      <section>
        {googleConnected ? (
          <p style={{ color: "#2a7", margin: 0 }}>Google Tasks connected.</p>
        ) : (
          <a href="/api/google/connect">
            <button type="button">Connect Google Tasks</button>
          </a>
        )}
      </section>

      <section style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <input
          placeholder="Customer / Account (optional)"
          value={accountName}
          onChange={(e) => setAccountName(e.target.value)}
          style={{ padding: 8 }}
        />
        <textarea
          placeholder="Type your meeting notes here..."
          value={rawNotes}
          onChange={(e) => setRawNotes(e.target.value)}
          rows={10}
          style={{ padding: 8, fontFamily: "inherit" }}
        />
        <button type="button" onClick={handleCleanup} disabled={cleaning || !rawNotes.trim()} style={{ padding: 10 }}>
          {cleaning ? "Cleaning up..." : "Clean up with AI"}
        </button>
      </section>

      {current && (
        <section style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div>
            <h3>Summary</h3>
            <p style={{ whiteSpace: "pre-wrap" }}>{current.summary}</p>
          </div>
          <div>
            <h3>Next Steps</h3>
            <ul style={{ listStyle: "none", padding: 0 }}>
              {current.actionItems.map((item, i) => (
                <li key={i}>
                  <label style={{ display: "flex", gap: 8, alignItems: "baseline" }}>
                    <input
                      type="checkbox"
                      checked={!!checked[i]}
                      disabled={item.pushed}
                      onChange={(e) => setChecked((c) => ({ ...c, [i]: e.target.checked }))}
                    />
                    <span style={{ textDecoration: item.pushed ? "line-through" : "none" }}>{item.text}</span>
                    {item.pushed && <span style={{ color: "#2a7", fontSize: 12 }}>pushed</span>}
                  </label>
                </li>
              ))}
            </ul>
            <button
              type="button"
              onClick={handlePush}
              disabled={pushing || !googleConnected || Object.values(checked).every((v) => !v)}
              style={{ padding: 10 }}
            >
              {pushing ? "Sending..." : "Send to Google Tasks"}
            </button>
            {!googleConnected && <p style={{ color: "#666", fontSize: 13 }}>Connect Google Tasks above first.</p>}
          </div>
        </section>
      )}

      <section>
        <h3>History</h3>
        {history.length === 0 ? (
          <p style={{ color: "#666" }}>No notes yet.</p>
        ) : (
          <ul style={{ listStyle: "none", padding: 0, display: "flex", flexDirection: "column", gap: 12 }}>
            {history.map((note) => (
              <li key={note.id} style={{ borderTop: "1px solid #ddd", paddingTop: 8 }}>
                <div style={{ fontSize: 12, color: "#666" }}>
                  {note.accountName ? `${note.accountName} — ` : ""}
                  {new Date(note.createdAt).toLocaleString()}
                </div>
                <div>{note.summary}</div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function Banner({ tone, children }: { tone: "success" | "error"; children: React.ReactNode }) {
  return (
    <div
      style={{
        padding: 10,
        borderRadius: 4,
        background: tone === "success" ? "#e6f7ee" : "#fdecea",
        color: tone === "success" ? "#1a6b3f" : "#a12b1f",
      }}
    >
      {children}
    </div>
  );
}
