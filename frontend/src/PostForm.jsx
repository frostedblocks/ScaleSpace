import React, { useState, useEffect } from "react";

/**
 * PostForm – text only for launch.
 * Image support will be added in a future update.
 * Free tier: 115 chars | Paid tiers: 512 chars
 */
export default function PostForm({ actor, onPostCreated, principal }) {
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [isFreeTier, setIsFreeTier] = useState(true);

  const FREE_MAX = 115;
  const PAID_MAX = 512;
  const maxLength = isFreeTier ? FREE_MAX : PAID_MAX;

  useEffect(() => {
    if (!actor || !principal) return;

    const loadStats = async () => {
      try {
        const result = await actor.getUserStats(principal);
        if (result && result.length > 0) {
          setIsFreeTier(result[0].isFreeTier);
        }
      } catch (err) {
        // default to free tier
      }
    };

    loadStats();
  }, [actor, principal]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!content.trim()) {
      setError("Write something first.");
      return;
    }

    if (content.length > maxLength) {
      setError(`Post is too long. Limit is ${maxLength} characters.`);
      return;
    }

    if (!actor) {
      setError("Not connected to the network yet.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      // No image for launch – pass empty optional
      const result = await actor.makePost(content.trim(), []);

      if (result.length === 0) {
        setError("Could not create post. Check token balance, daily limit, or character limit.");
      } else {
        setContent("");
        if (onPostCreated) onPostCreated(result[0]);
      }
    } catch (err) {
      console.error(err);
      setError("Something went wrong while posting.");
    } finally {
      setLoading(false);
    }
  };

  const remaining = maxLength - content.length;
  const counterColor = remaining < 20 ? "#f87171" : remaining < 50 ? "#fbbf24" : "#71717a";

  return (
    <form onSubmit={handleSubmit} style={{ marginBottom: "1.5rem" }}>
      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder={
          isFreeTier
            ? "What's on your mind? (115 characters on free tier)"
            : "What's on your mind?"
        }
        rows={3}
        maxLength={maxLength}
        style={{
          width: "100%",
          padding: "0.75rem",
          background: "#18181b",
          color: "#e4e4e7",
          border: "1px solid #3f3f46",
          borderRadius: "10px",
          resize: "vertical",
        }}
      />

      <div
        style={{
          textAlign: "right",
          fontSize: "0.8rem",
          color: counterColor,
          marginTop: "0.3rem",
        }}
      >
        {content.length} / {maxLength}
        {isFreeTier && (
          <span style={{ marginLeft: "0.5rem", color: "#71717a" }}>(Free tier)</span>
        )}
      </div>

      {error && (
        <p style={{ color: "#f87171", marginTop: "0.75rem" }}>{error}</p>
      )}

      <button
        type="submit"
        disabled={loading || !content.trim()}
        style={{
          marginTop: "1rem",
          padding: "0.6rem 1.4rem",
          background: loading || !content.trim() ? "#3f3f46" : "#2563eb",
          color: "white",
          border: "none",
          borderRadius: "8px",
          cursor: loading || !content.trim() ? "default" : "pointer",
          fontSize: "0.95rem",
        }}
      >
        {loading ? "Posting…" : "Post"}
      </button>
    </form>
  );
}
