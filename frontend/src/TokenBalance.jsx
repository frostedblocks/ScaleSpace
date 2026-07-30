import React, { useState, useEffect } from "react";

/**
 * Shows the user's current token balance and free posts remaining.
 */
export default function TokenBalance({ actor, principal }) {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!actor || !principal) return;

    const load = async () => {
      setLoading(true);
      try {
        const result = await actor.getUserStats(principal);
        if (result && result.length > 0) {
          setStats(result[0]);
        } else {
          // New user – treat as free tier with 0 tokens
          setStats({
            tokens: 0,
            postsThisMonth: 0,
            postsToday: 0,
            isFreeTier: true,
          });
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [actor, principal]);

  if (loading) {
    return <span style={{ fontSize: "0.85rem", color: "#888" }}>Loading…</span>;
  }

  if (!stats) return null;

  const freeLeft = Math.max(0, 20 - Number(stats.postsThisMonth));

  return (
    <div
      style={{
        fontSize: "0.85rem",
        color: "#444",
        background: "#f3f4f6",
        padding: "0.35rem 0.75rem",
        borderRadius: "20px",
        display: "inline-flex",
        gap: "0.75rem",
        alignItems: "center",
      }}
    >
      <span>
        <strong>{Number(stats.tokens)}</strong> tokens
      </span>
      <span style={{ color: "#999" }}>|</span>
      <span>
        <strong>{freeLeft}</strong> free posts left
      </span>
    </div>
  );
}
