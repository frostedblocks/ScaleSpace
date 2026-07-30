import React, { useState, useEffect } from "react";

/**
 * Token purchase UI.
 * When payments are disabled: free test subscribe (dev).
 * When payments are enabled: request a paid tier, then master confirms after ICP arrives.
 */
export default function Subscribe({ actor, onSuccess }) {
  const [offers, setOffers] = useState([]);
  const [paymentsEnabled, setPaymentsEnabled] = useState(false);
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [canisterId, setCanisterId] = useState("");

  const load = async () => {
    if (!actor) return;
    try {
      const [list, enabled] = await Promise.all([
        actor.getSubscriptionOffers(),
        actor.isPaymentsEnabled(),
      ]);
      setOffers(list || []);
      setPaymentsEnabled(!!enabled);
      // Canister principal is useful for payment instructions once deployed
      if (typeof actor.canisterId === "string") {
        setCanisterId(actor.canisterId);
      }
    } catch (err) {
      console.error(err);
      // Fallback display if backend not upgraded yet
      setOffers([
        { tokens: 200, priceE8s: 10_000_000, label: "Starter" },
        { tokens: 400, priceE8s: 18_000_000, label: "Regular" },
        { tokens: 600, priceE8s: 25_000_000, label: "Power" },
      ]);
    }
  };

  useEffect(() => {
    load();
  }, [actor]);

  const e8sToIcp = (e8s) => (Number(e8s) / 100_000_000).toFixed(2);

  const handleSubscribe = async () => {
    if (!selected || !actor) return;

    setLoading(true);
    setError("");
    setMessage("");

    try {
      if (!paymentsEnabled) {
        // Dev / testing path — free tokens
        await actor.subscribe(selected.tokens);
        setMessage(`Added ${selected.tokens} tokens (test mode — no ICP charged).`);
        if (onSuccess) onSuccess();
      } else {
        // Production path — create pending request; master confirms after ICP received
        const result = await actor.requestPaidSubscription(selected.tokens);
        setMessage(
          typeof result === "string"
            ? result
            : `Request recorded. Send ${e8sToIcp(selected.priceE8s)} ICP, then wait for confirmation.`
        );
      }
    } catch (err) {
      console.error(err);
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h2 style={{ marginTop: 0, color: "#fafafa" }}>Get Tokens</h2>
      <p style={{ color: "#a1a1aa", marginBottom: "1.5rem", lineHeight: 1.5 }}>
        Free users get a limited number of short posts each month.
        <br />
        After that, posts, loves, and messages spend tokens.
      </p>

      <div
        style={{
          marginBottom: "1.25rem",
          padding: "0.75rem 0.9rem",
          background: paymentsEnabled ? "#052e16" : "#1c1917",
          border: paymentsEnabled ? "1px solid #166534" : "1px solid #44403c",
          borderRadius: "8px",
          fontSize: "0.85rem",
          color: paymentsEnabled ? "#86efac" : "#a8a29e",
        }}
      >
        {paymentsEnabled
          ? "Payments are live. Pick a plan, send the ICP amount, and your tokens are granted after confirmation."
          : "Test mode: tokens are free right now. Real ICP pricing is shown for when payments go live."}
      </div>

      <div style={{ display: "flex", gap: "0.85rem", flexWrap: "wrap", marginBottom: "1.75rem" }}>
        {(offers.length
          ? offers
          : [
              { tokens: 200, priceE8s: 10_000_000, label: "Starter" },
              { tokens: 400, priceE8s: 18_000_000, label: "Regular" },
              { tokens: 600, priceE8s: 25_000_000, label: "Power" },
            ]
        ).map((tier) => {
          const tokens = Number(tier.tokens);
          const priceE8s = Number(tier.priceE8s);
          const isSelected = selected && Number(selected.tokens) === tokens;
          return (
            <button
              key={tokens}
              onClick={() => setSelected({ tokens, priceE8s, label: tier.label })}
              style={{
                flex: "1 1 140px",
                padding: "1.1rem",
                borderRadius: "12px",
                border: isSelected ? "2px solid #2563eb" : "1px solid #3f3f46",
                background: isSelected ? "#1e3a5f" : "#18181b",
                cursor: "pointer",
                textAlign: "left",
                color: "#e4e4e7",
              }}
            >
              <div style={{ fontWeight: 600, fontSize: "1.05rem", color: "#fafafa" }}>
                {tier.label || `${tokens} tokens`}
              </div>
              <div style={{ fontSize: "1.35rem", margin: "0.35rem 0", color: "#60a5fa" }}>
                {tokens} tokens
              </div>
              <div style={{ fontSize: "0.95rem", color: "#fbbf24" }}>
                {e8sToIcp(priceE8s)} ICP
              </div>
            </button>
          );
        })}
      </div>

      {paymentsEnabled && selected && (
        <div
          style={{
            marginBottom: "1.25rem",
            padding: "0.9rem 1rem",
            background: "#09090b",
            border: "1px solid #27272a",
            borderRadius: "8px",
            fontSize: "0.85rem",
            color: "#a1a1aa",
            lineHeight: 1.55,
          }}
        >
          <strong style={{ color: "#e4e4e7" }}>How to pay</strong>
          <ol style={{ margin: "0.5rem 0 0 1.1rem", padding: 0 }}>
            <li>
              Send <strong style={{ color: "#fbbf24" }}>{e8sToIcp(selected.priceE8s)} ICP</strong> to
              the ScaleSpace canister account (shown after deploy).
            </li>
            <li>Click the button below to register your purchase request.</li>
            <li>Tokens are added after the payment is confirmed.</li>
          </ol>
          {canisterId && (
            <p style={{ margin: "0.6rem 0 0 0", wordBreak: "break-all", color: "#71717a" }}>
              Canister: {canisterId}
            </p>
          )}
        </div>
      )}

      <button
        onClick={handleSubscribe}
        disabled={!selected || loading}
        style={{
          padding: "0.7rem 1.5rem",
          fontSize: "1rem",
          background: selected && !loading ? "#2563eb" : "#3f3f46",
          color: "white",
          border: "none",
          borderRadius: "8px",
          cursor: selected && !loading ? "pointer" : "default",
        }}
      >
        {loading
          ? "Processing…"
          : !selected
          ? "Select a plan"
          : paymentsEnabled
          ? `Request ${selected.tokens} tokens (${e8sToIcp(selected.priceE8s)} ICP)`
          : `Get ${selected.tokens} tokens (test)`}
      </button>

      {message && <p style={{ color: "#4ade80", marginTop: "1rem" }}>{message}</p>}
      {error && <p style={{ color: "#f87171", marginTop: "1rem" }}>{error}</p>}

      <p style={{ fontSize: "0.8rem", color: "#52525b", marginTop: "1.75rem", lineHeight: 1.5 }}>
        ICP that users pay sits with the project. You convert part of it to cycles so the site
        keeps running. Token burns throttle usage so free users do not drain the canister alone.
      </p>
    </div>
  );
}
