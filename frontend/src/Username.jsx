import React, { useState, useEffect } from "react";

/**
 * Displays a user's avatar + username.
 * Falls back to a short principal if no profile is set.
 */
export default function Username({ actor, principal, size = 28 }) {
  const [profile, setProfile] = useState(null);

  useEffect(() => {
    if (!actor || !principal) return;

    const load = async () => {
      try {
        const result = await actor.getProfile(principal);
        if (result && result.length > 0) {
          setProfile(result[0]);
        }
      } catch (err) {
        // silent fail
      }
    };

    load();
  }, [actor, principal]);

  const name = profile?.username || null;
  const avatarURL = profile?.avatarURL || null;

  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: "0.45rem" }}>
      {/* Avatar */}
      {avatarURL ? (
        <img
          src={avatarURL}
          alt=""
          style={{
            width: size,
            height: size,
            borderRadius: "50%",
            objectFit: "cover",
            border: "1px solid #3f3f46",
            background: "#27272a",
          }}
          onError={(e) => {
            e.target.style.display = "none";
          }}
        />
      ) : (
        <div
          style={{
            width: size,
            height: size,
            borderRadius: "50%",
            background: "#27272a",
            border: "1px solid #3f3f46",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: size * 0.4,
            color: "#71717a",
            flexShrink: 0,
          }}
        >
          {name ? name[0].toUpperCase() : "?"}
        </div>
      )}

      {/* Name */}
      {name ? (
        <span style={{ fontWeight: 500, color: "#fafafa" }}>{name}</span>
      ) : (
        <span style={{ color: "#a1a1aa" }}>
          {principal.toString().slice(0, 10)}…
        </span>
      )}
    </span>
  );
}
