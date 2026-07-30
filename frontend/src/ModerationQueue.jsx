import React, { useState, useEffect } from "react";

/**
 * Master-only list of reported posts, sorted by report count.
 * Hide from here without needing to remember post IDs.
 */
export default function ModerationQueue({ actor }) {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState(null);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");

  const load = async () => {
    if (!actor) return;
    setLoading(true);
    setError("");
    try {
      const result = await actor.getReportedPosts();
      setPosts(result || []);
    } catch (err) {
      console.error(err);
      setError("Could not load reported posts.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [actor]);

  const handleHide = async (postId) => {
    if (!actor) return;
    setBusyId(postId.toString());
    setInfo("");
    setError("");
    try {
      const ok = await actor.adminHidePost(postId);
      if (ok) {
        setInfo(`Post #${postId} hidden.`);
        await load();
      } else {
        setError("Hide failed.");
      }
    } catch (err) {
      console.error(err);
      setError("Hide failed.");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div style={{ marginBottom: "1.5rem" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.6rem" }}>
        <label style={{ fontWeight: 500, color: "#a1a1aa", fontSize: "0.9rem" }}>
          Moderation queue
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

      <p style={{ margin: "0 0 0.75rem 0", fontSize: "0.8rem", color: "#71717a" }}>
        Posts with at least one report. Sorted by most reports first.
      </p>

      {loading && <p style={{ color: "#71717a", fontSize: "0.9rem" }}>Loading…</p>}

      {!loading && posts.length === 0 && (
        <p style={{ color: "#52525b", fontSize: "0.9rem" }}>No reported posts right now.</p>
      )}

      {posts.map((p) => {
        const id = p.id;
        const preview =
          p.content.length > 120 ? p.content.slice(0, 120) + "…" : p.content;
        const busy = busyId === id.toString();

        return (
          <div
            key={id.toString()}
            style={{
              marginBottom: "0.65rem",
              padding: "0.75rem 0.85rem",
              background: "#09090b",
              border: "1px solid #27272a",
              borderRadius: "8px",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-start",
                gap: "0.75rem",
                flexWrap: "wrap",
              }}
            >
              <div style={{ flex: 1, minWidth: "180px" }}>
                <div style={{ fontSize: "0.8rem", color: "#a1a1aa", marginBottom: "0.3rem" }}>
                  <strong style={{ color: "#e4e4e7" }}>#{id.toString()}</strong>
                  {" · "}
                  <span style={{ color: "#f87171" }}>{Number(p.reportCount)} report{Number(p.reportCount) === 1 ? "" : "s"}</span>
                  {p.isHidden && (
                    <span style={{ marginLeft: "0.4rem", color: "#71717a" }}>(already hidden)</span>
                  )}
                </div>
                <div style={{ color: "#e4e4e7", fontSize: "0.9rem", whiteSpace: "pre-wrap" }}>
                  {preview || "(empty)"}
                </div>
                <div style={{ fontSize: "0.75rem", color: "#52525b", marginTop: "0.35rem", wordBreak: "break-all" }}>
                  {p.author.toString().slice(0, 20)}…
                </div>
              </div>

              {!p.isHidden && (
                <button
                  type="button"
                  onClick={() => handleHide(id)}
                  disabled={busy}
                  style={{
                    padding: "0.4rem 0.75rem",
                    background: "#7f1d1d",
                    color: "#fecaca",
                    border: "1px solid #991b1b",
                    borderRadius: "6px",
                    cursor: busy ? "default" : "pointer",
                    fontSize: "0.85rem",
                    whiteSpace: "nowrap",
                  }}
                >
                  {busy ? "…" : "Hide"}
                </button>
              )}
            </div>
          </div>
        );
      })}

      {info && <p style={{ color: "#4ade80", fontSize: "0.85rem" }}>{info}</p>}
      {error && <p style={{ color: "#f87171", fontSize: "0.85rem" }}>{error}</p>}
    </div>
  );
}
