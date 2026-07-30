import React, { useState, useEffect } from "react";

/**
 * Master-only site statistics dashboard.
 */
export default function SiteStats({ actor }) {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = async () => {
    if (!actor) return;
    setLoading(true);
    setError("");
    try {
      const result = await actor.getSiteStats();
      // Motoko optional/record may arrive as object
      setStats(result || null);
    } catch (err) {
      console.error(err);
      setError("Could not load stats.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [actor]);

  const items = stats
    ? [
        { label: "Total posts", value: Number(stats.totalPosts) },
        { label: "Visible posts", value: Number(stats.visiblePosts) },
        { label: "Hidden posts", value: Number(stats.hiddenPosts) },
        { label: "Comments", value: Number(stats.totalComments) },
        { label: "Profiles", value: Number(stats.totalProfiles) },
        { label: "Accounts with balances", value: Number(stats.totalBalances) },
        { label: "Posts with reports", value: Number(stats.reportedPosts) },
        { label: "Total report flags", value: Number(stats.totalReportFlags) },
        { label: "Banned users", value: Number(stats.bannedUsers) },
        { label: "Tokens in circulation", value: Number(stats.tokensInCirculation) },
      ]
    : [];

  return (
    <div style={{ marginBottom: "1.5rem" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.6rem" }}>
        <label style={{ fontWeight: 500, color: "#a1a1aa", fontSize: "0.9rem" }}>
          Site stats
        </label>
        <button
          type="button"
          onClick={load}
          style={{
            fontSize: "0.8rem",
            padding: "0.25rem 0.6rem",
            background: "#27272a",
            color: "#a1a1aa",
            border: "1px solid #3f3f46",
            borderRadius: "6px",
            cursor: "pointer",
          }}
        >
          Refresh
        </button>
      </div>

      {loading && <p style={{ color: "#71717a", fontSize: "0.9rem" }}>Loading…</p>}
      {error && <p style={{ color: "#f87171", fontSize: "0.85rem" }}>{error}</p>}

      {!loading && stats && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))",
            gap: "0.5rem",
          }}
        >
          {items.map((item) => (
            <div
              key={item.label}
              style={{
                background: "#09090b",
                border: "1px solid #27272a",
                borderRadius: "8px",
                padding: "0.65rem 0.75rem",
              }}
            >
              <div style={{ fontSize: "1.25rem", fontWeight: 600, color: "#fafafa" }}>
                {item.value.toLocaleString()}
              </div>
              <div style={{ fontSize: "0.75rem", color: "#71717a", marginTop: "0.15rem" }}>
                {item.label}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
