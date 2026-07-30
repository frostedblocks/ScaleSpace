import React, { useState } from "react";

export default function Subscribe({ actor, onSuccess }) {
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const tiers = [
    { amount: 200, label: "Starter", description: "Good for light posting" },
    { amount: 400, label: "Regular", description: "Best for most people" },
    { amount: 600, label: "Power", description: "For heavy users" },
  ];

  const handleSubscribe = async () => {
    if (!selected || !actor) return;

    setLoading(true);
    setError("");
    setMessage("");

    try {
      await actor.subscribe(selected);
      setMessage(`Successfully added ${selected} tokens!`);
      if (onSuccess) onSuccess();
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
        Free users get 20 posts per month (115 characters each).<br />
        After that, each post costs 5 tokens and can be up to 512 characters.
      </p>

      <div style={{ display: "flex", gap: "0.85rem", flexWrap: "wrap", marginBottom: "1.75rem" }}>
        {tiers.map((tier) => {
          const isSelected = selected === tier.amount;
          return (
            <button
              key={tier.amount}
              onClick={() => setSelected(tier.amount)}
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
                {tier.label}
              </div>
              <div style={{ fontSize: "1.35rem", margin: "0.35rem 0", color: "#60a5fa" }}>
                {tier.amount} tokens
              </div>
              <div style={{ fontSize: "0.85rem", color: "#a1a1aa" }}>{tier.description}</div>
            </button>
          );
        })}
      </div>

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
        {loading ? "Processing…" : selected ? `Get ${selected} Tokens` : "Select a plan"}
      </button>

      {message && <p style={{ color: "#4ade80", marginTop: "1rem" }}>{message}</p>}
      {error && <p style={{ color: "#f87171", marginTop: "1rem" }}>{error}</p>}

      <p style={{ fontSize: "0.8rem", color: "#52525b", marginTop: "1.75rem" }}>
        Note: Right now this just adds tokens for testing. Real payments can be added later.
      </p>
    </div>
  );
}
