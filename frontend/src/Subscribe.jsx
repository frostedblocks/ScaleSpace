import React, { useState } from "react";

/**
 * Subscribe / Buy Tokens screen
 * Lets the user choose one of the three paid tiers: 200, 400, or 600 tokens.
 */
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
      // Call the backend subscribe function
      await actor.subscribe(selected);
      setMessage(`Successfully added ${selected} tokens to your account!`);
      if (onSuccess) onSuccess();
    } catch (err) {
      console.error(err);
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ marginBottom: "2rem" }}>
      <h2 style={{ marginTop: 0 }}>Get Tokens</h2>
      <p style={{ color: "#555", marginBottom: "1.25rem" }}>
        Free users get 20 posts per month. After that, each post costs 5 tokens.
      </p>

      <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap", marginBottom: "1.5rem" }}>
        {tiers.map((tier) => (
          <button
            key={tier.amount}
            onClick={() => setSelected(tier.amount)}
            style={{
              flex: "1 1 140px",
              padding: "1rem",
              borderRadius: "10px",
              border: selected === tier.amount ? "2px solid #2563eb" : "1px solid #ddd",
              background: selected === tier.amount ? "#eff6ff" : "#fff",
              cursor: "pointer",
              textAlign: "left",
            }}
          >
            <div style={{ fontWeight: 600, fontSize: "1.1rem" }}>{tier.label}</div>
            <div style={{ fontSize: "1.4rem", margin: "0.3rem 0" }}>{tier.amount} tokens</div>
            <div style={{ fontSize: "0.85rem", color: "#666" }}>{tier.description}</div>
          </button>
        ))}
      </div>

      <button
        onClick={handleSubscribe}
        disabled={!selected || loading}
        style={{
          padding: "0.7rem 1.5rem",
          fontSize: "1rem",
          background: selected ? "#2563eb" : "#ccc",
          color: "white",
          border: "none",
          borderRadius: "6px",
          cursor: selected ? "pointer" : "default",
        }}
      >
        {loading ? "Processing…" : selected ? `Get ${selected} Tokens` : "Select a plan"}
      </button>

      {message && <p style={{ color: "green", marginTop: "1rem" }}>{message}</p>}
      {error && <p style={{ color: "crimson", marginTop: "1rem" }}>{error}</p>}

      <p style={{ fontSize: "0.8rem", color: "#888", marginTop: "1.5rem" }}>
        Note: In a real version this would charge ICP or a credit card.
        Right now it just adds the tokens for testing.
      </p>
    </div>
  );
}
