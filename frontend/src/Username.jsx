import React, { useState, useEffect } from "react";

/**
 * Displays a user's username if they have set one,
 * otherwise falls back to a short principal.
 */
export default function Username({ actor, principal }) {
  const [name, setName] = useState(null);

  useEffect(() => {
    if (!actor || !principal) return;

    const load = async () => {
      try {
        const result = await actor.getProfile(principal);
        if (result && result.length > 0 && result[0].username) {
          setName(result[0].username);
        }
      } catch (err) {
        // silent fail – just show principal
      }
    };

    load();
  }, [actor, principal]);

  if (name) {
    return <span style={{ fontWeight: 500 }}>{name}</span>;
  }

  // Fallback
  return (
    <span style={{ color: "#666" }}>
      {principal.toString().slice(0, 10)}…
    </span>
  );
}
