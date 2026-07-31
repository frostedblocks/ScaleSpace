import React, { useState, useEffect } from "react";
import Username from "./Username";

export default function Comments({ actor, postId, currentUserPrincipal }) {
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [editDraft, setEditDraft] = useState("");
  const [busyId, setBusyId] = useState(null);

  const MAX_LENGTH = 2000;

  const loadComments = async () => {
    if (!actor) return;
    setLoading(true);
    setError("");
    try {
      const result = await actor.getComments(postId);
      setComments(result);
    } catch (err) {
      console.error(err);
      setError("Could not load comments.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadComments();
  }, [actor, postId]);

  const isMine = (c) =>
    currentUserPrincipal &&
    c.author &&
    currentUserPrincipal.toString() === c.author.toString();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!newComment.trim() || !actor) return;

    setSubmitting(true);
    setError("");

    try {
      const result = await actor.addComment(postId, newComment.trim());
      if (result && result.length > 0) {
        setNewComment("");
        await loadComments();
      } else {
        setError("Could not add comment.");
      }
    } catch (err) {
      console.error(err);
      setError("Something went wrong.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleSaveEdit = async (commentId) => {
    if (!actor || !editDraft.trim()) return;
    setBusyId(commentId.toString());
    setError("");
    try {
      const result = await actor.editComment(commentId, editDraft.trim());
      const text = typeof result === "string" ? result : "";
      if (/updated/i.test(text)) {
        setEditingId(null);
        setEditDraft("");
        await loadComments();
      } else {
        setError(text || "Edit failed");
      }
    } catch (err) {
      console.error(err);
      setError(err?.message || "Edit failed");
    } finally {
      setBusyId(null);
    }
  };

  const handleDelete = async (commentId) => {
    if (!actor) return;
    if (!window.confirm("Delete this comment?")) return;
    setBusyId(commentId.toString());
    setError("");
    try {
      const result = await actor.deleteComment(commentId);
      const text = typeof result === "string" ? result : "";
      if (/deleted/i.test(text)) {
        setComments((prev) => prev.filter((c) => c.id.toString() !== commentId.toString()));
        if (editingId && editingId.toString() === commentId.toString()) {
          setEditingId(null);
          setEditDraft("");
        }
      } else {
        setError(text || "Delete failed");
      }
    } catch (err) {
      console.error(err);
      setError(err?.message || "Delete failed");
    } finally {
      setBusyId(null);
    }
  };

  const remaining = MAX_LENGTH - newComment.length;
  const counterColor = remaining < 50 ? "#f87171" : remaining < 200 ? "#fbbf24" : "#71717a";

  return (
    <div style={{ marginTop: "1rem", borderTop: "1px solid #27272a", paddingTop: "0.85rem" }}>
      <h4 style={{ margin: "0 0 0.75rem 0", fontSize: "0.9rem", color: "#a1a1aa" }}>Comments</h4>

      {loading ? (
        <p style={{ fontSize: "0.85rem", color: "#71717a" }}>Loading comments…</p>
      ) : comments.length === 0 ? (
        <p style={{ fontSize: "0.85rem", color: "#52525b" }}>No comments yet.</p>
      ) : (
        <div style={{ marginBottom: "1rem" }}>
          {comments.map((c) => {
            const mine = isMine(c);
            const isEditing = editingId !== null && editingId.toString() === c.id.toString();
            const busy = busyId === c.id.toString();

            return (
              <div
                key={c.id.toString()}
                style={{
                  marginBottom: "0.55rem",
                  padding: "0.55rem 0.7rem",
                  background: "#09090b",
                  borderRadius: "8px",
                  fontSize: "0.9rem",
                  border: "1px solid #27272a",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    gap: "0.5rem",
                    marginBottom: "0.25rem",
                  }}
                >
                  <div style={{ fontSize: "0.8rem", color: "#a1a1aa" }}>
                    <Username actor={actor} principal={c.author} />
                  </div>
                  {mine && !isEditing && (
                    <div style={{ display: "flex", gap: "0.35rem" }}>
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => {
                          setEditingId(c.id);
                          setEditDraft(c.content || "");
                          setError("");
                        }}
                        style={subtleBtn}
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => handleDelete(c.id)}
                        style={{ ...subtleBtn, color: "#fca5a5", borderColor: "#7f1d1d" }}
                      >
                        Delete
                      </button>
                    </div>
                  )}
                </div>

                {isEditing ? (
                  <div>
                    <textarea
                      value={editDraft}
                      onChange={(e) => setEditDraft(e.target.value)}
                      rows={2}
                      maxLength={MAX_LENGTH}
                      style={{
                        width: "100%",
                        boxSizing: "border-box",
                        padding: "0.45rem",
                        fontSize: "0.9rem",
                        background: "#18181b",
                        color: "#e4e4e7",
                        border: "1px solid #3f3f46",
                        borderRadius: "6px",
                        fontFamily: "inherit",
                      }}
                    />
                    <div style={{ display: "flex", gap: "0.4rem", marginTop: "0.4rem" }}>
                      <button
                        type="button"
                        disabled={busy || !editDraft.trim()}
                        onClick={() => handleSaveEdit(c.id)}
                        style={{ ...subtleBtn, background: "#2563eb", borderColor: "#2563eb", color: "#fff" }}
                      >
                        {busy ? "Saving…" : "Save"}
                      </button>
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => {
                          setEditingId(null);
                          setEditDraft("");
                        }}
                        style={subtleBtn}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div style={{ whiteSpace: "pre-wrap", color: "#e4e4e7" }}>{c.content}</div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <textarea
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          placeholder="Write a comment…"
          rows={2}
          maxLength={MAX_LENGTH}
          style={{
            width: "100%",
            padding: "0.5rem",
            fontSize: "0.9rem",
            background: "#09090b",
            color: "#e4e4e7",
            border: "1px solid #3f3f46",
            borderRadius: "8px",
          }}
        />

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "0.4rem" }}>
          <span style={{ fontSize: "0.8rem", color: counterColor }}>
            {newComment.length} / {MAX_LENGTH}
          </span>
          <button
            type="submit"
            disabled={submitting || !newComment.trim()}
            style={{
              background: "#27272a",
              color: "#e4e4e7",
              border: "1px solid #3f3f46",
              borderRadius: "6px",
              padding: "0.3rem 0.8rem",
              cursor: "pointer",
            }}
          >
            {submitting ? "Posting…" : "Add Comment"}
          </button>
        </div>
      </form>

      {error && <p style={{ color: "#f87171", fontSize: "0.85rem" }}>{error}</p>}
    </div>
  );
}

const subtleBtn = {
  background: "transparent",
  color: "#a1a1aa",
  border: "1px solid #3f3f46",
  borderRadius: "6px",
  padding: "0.15rem 0.45rem",
  fontSize: "0.7rem",
  cursor: "pointer",
};
