import React, { useState, useEffect } from "react";

/**
 * Master-only: change free posts, token costs, char limits without redeploying.
 */
export default function LimitControls({ actor }) {
  const [form, setForm] = useState({
    freeTierLimit: "20",
    dailyLimit: "5",
    tokensPerPost: "5",
    tokensPerLove: "2",
    tokensPerMessage: "1",
    freeMaxLength: "115",
    paidMaxLength: "512",
    maxCommentLength: "2000",
    reportsToHide: "5",
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");

  const load = async () => {
    if (!actor) return;
    setLoading(true);
    try {
      const limits = await actor.getLimits();
      setForm({
        freeTierLimit: String(Number(limits.freeTierLimit)),
        dailyLimit: String(Number(limits.dailyLimit)),
        tokensPerPost: String(Number(limits.tokensPerPost)),
        tokensPerLove: String(Number(limits.tokensPerLove)),
        tokensPerMessage: String(Number(limits.tokensPerMessage)),
        freeMaxLength: String(Number(limits.freeMaxLength)),
        paidMaxLength: String(Number(limits.paidMaxLength)),
        maxCommentLength: String(Number(limits.maxCommentLength)),
        reportsToHide: String(Number(limits.reportsToHide)),
      });
    } catch (e) {
      console.error(e);
      setErr("Could not load limits.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [actor]);

  const setField = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!actor) return;

    setSaving(true);
    setMsg("");
    setErr("");

    try {
      const result = await actor.adminSetLimits(
        Number(form.freeTierLimit) || 0,
        Number(form.dailyLimit) || 0,
        Number(form.tokensPerPost) || 0,
        Number(form.tokensPerLove) || 0,
        Number(form.tokensPerMessage) || 0,
        Number(form.freeMaxLength) || 1,
        Number(form.paidMaxLength) || 1,
        Number(form.maxCommentLength) || 1,
        Number(form.reportsToHide) || 1
      );
      setMsg(typeof result === "string" ? result : "Limits updated.");
      await load();
    } catch (e) {
      console.error(e);
      setErr("Failed to save limits.");
    } finally {
      setSaving(false);
    }
  };

  const fields = [
    { key: "freeTierLimit", label: "Free posts per month" },
    { key: "dailyLimit", label: "Posts per day (all users)" },
    { key: "tokensPerPost", label: "Tokens per post (paid)" },
    { key: "tokensPerLove", label: "Tokens per love" },
    { key: "tokensPerMessage", label: "Tokens per message" },
    { key: "freeMaxLength", label: "Free tier max characters" },
    { key: "paidMaxLength", label: "Paid tier max characters" },
    { key: "maxCommentLength", label: "Max comment characters" },
    { key: "reportsToHide", label: "Reports needed to auto-hide" },
  ];

  return (
    <div style={{ marginBottom: "1.5rem" }}>
      <label style={{ display: "block", marginBottom: "0.35rem", fontWeight: 500, color: "#a1a1aa", fontSize: "0.9rem" }}>
        Live limits
      </label>
      <p style={{ margin: "0 0 0.75rem 0", fontSize: "0.8rem", color: "#71717a" }}>
        Change these anytime. No redeploy needed. Takes effect on the next action.
      </p>

      {loading ? (
        <p style={{ color: "#71717a", fontSize: "0.9rem" }}>Loading…</p>
      ) : (
        <form onSubmit={handleSave}>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))",
              gap: "0.65rem",
              marginBottom: "0.85rem",
            }}
          >
            {fields.map((f) => (
              <div key={f.key}>
                <label style={{ display: "block", fontSize: "0.75rem", color: "#71717a", marginBottom: "0.25rem" }}>
                  {f.label}
                </label>
                <input
                  type="number"
                  min="0"
                  value={form[f.key]}
                  onChange={(e) => setField(f.key, e.target.value)}
                  style={{
                    width: "100%",
                    padding: "0.45rem 0.55rem",
                    background: "#09090b",
                    color: "#e4e4e7",
                    border: "1px solid #3f3f46",
                    borderRadius: "8px",
                    fontSize: "0.9rem",
                  }}
                />
              </div>
            ))}
          </div>

          <button
            type="submit"
            disabled={saving}
            style={{
              padding: "0.55rem 1.1rem",
              background: saving ? "#3f3f46" : "#2563eb",
              color: "white",
              border: "none",
              borderRadius: "8px",
              cursor: saving ? "default" : "pointer",
              fontWeight: 500,
            }}
          >
            {saving ? "Saving…" : "Save limits"}
          </button>
        </form>
      )}

      {msg && <p style={{ color: "#4ade80", fontSize: "0.85rem", marginTop: "0.6rem" }}>{msg}</p>}
      {err && <p style={{ color: "#f87171", fontSize: "0.85rem", marginTop: "0.6rem" }}>{err}</p>}
    </div>
  );
}
