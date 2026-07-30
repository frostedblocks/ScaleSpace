import React, { useState, useEffect } from "react";
import Username from "./Username";

/**
 * Comments section for a single post.
 */
export default function Comments({ actor, postId }) {
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

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

  return (
    <div style={{ marginTop: "1rem", borderTop: "1px solid #eee", paddingTop: "0.75rem" }}>
      <h4 style={{ margin: "0 0 0.75rem 0", fontSize: "0.95rem" }}>Comments</h4>

      {loading ? (
        <p style={{ fontSize: "0.85rem", color: "#666" }}>Loading comments…</p>
      ) : comments.length === 0 ? (
        <p style={{ fontSize: "0.85rem", color: "#888" }}>No comments yet.</p>
      ) : (
        <div style={{ marginBottom: "1rem" }}>
          {comments.map((c) => (
            <div
              key={c.id.toString()}
              style={{
                marginBottom: "0.6rem",
                padding: "0.5rem 0.7rem",
                background: "#f9f9f9",
                borderRadius: "6px",
                fontSize: "0.9rem",
              }}
            >
              <div style={{ fontSize: "0.8rem", marginBottom: "0.25rem" }}>
                <Username actor={actor} principal={c.author} />
              </div>
              <div style={{ whiteSpace: "pre-wrap" }}>{c.content}</div>
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
          maxLength={2000}
          style={{ width: "100%", padding: "0.5rem", fontSize: "0.9rem" }}
        />
        <button
          type="submit"
          disabled={submitting || !newComment.trim()}
          style={{ marginTop: "0.4rem" }}
        >
          {submitting ? "Posting…" : "Add Comment"}
        </button>
      </form>

      {error && <p style={{ color: "crimson", fontSize: "0.85rem" }}>{error}</p>}
    </div>
  );
}
