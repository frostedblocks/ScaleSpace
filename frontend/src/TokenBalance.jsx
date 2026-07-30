import React, { useState, useEffect } from "react";

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
    return <span style={{ fontSize: "0.85rem", color: "#71717a" }}>…</span>;
  }

  if (!stats) return null;

  const freeLeft = Math.max(0, 20 - Number(stats.postsThisMonth));

  return (
    <div
      style={{
        fontSize: "0.8rem",
        color: "#a1a1aa",
        background: "#18181b",
        padding: "0.3rem 0.7rem",
        borderRadius: "20px",
        border: "1px solid #27272a",
        display: "inline-flex",
        gap: "0.6rem",
        alignItems: "center",
      }}
    >
      <span>
        <strong style={{ color: "#e4e4e7" }}>{Number(stats.tokens)}</strong> tokens
      </span>
      <span style={{ color: "#3f3f46" }}>|</span>
      <span>
        <strong style={{ color: "#e4e4e7" }}>{freeLeft}</strong> free left
      </span>
    </div>
  );
}
