import React, { useState, useEffect } from "react";
import Username from "./Username";

export default function Comments({ actor, postId }) {
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

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
          {comments.map((c) => (
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
              <div style={{ fontSize: "0.8rem", marginBottom: "0.2rem", color: "#a1a1aa" }}>
                <Username actor={actor} principal={c.author} />
              </div>
              <div style={{ whiteSpace: "pre-wrap", color: "#e4e4e7" }}>{c.content}</div>
            </div>
          ))}
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
