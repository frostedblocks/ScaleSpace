import React, { useState, useEffect } from "react";

/**
 * Avatar + username. Shows a Founder badge for the master profile.
 */
export default function Username({ actor, principal, size = 28, onClick }) {
  const [profile, setProfile] = useState(null);
  const [isMaster, setIsMaster] = useState(false);

  useEffect(() => {
    if (!actor || !principal) return;

    const load = async () => {
      try {
        const [profileResult, ownerFlag] = await Promise.all([
          actor.getProfile(principal),
          actor.isOwner(principal),
        ]);
        if (profileResult && profileResult.length > 0) {
          setProfile(profileResult[0]);
        }
        setIsMaster(!!ownerFlag);
      } catch (err) {
        // silent fail
      }
    };

    load();
  }, [actor, principal]);

  const name = profile?.username || null;
  const avatarURL = profile?.avatarURL || null;

  const handleClick = (e) => {
    if (onClick) {
      e.stopPropagation();
      onClick(principal);
    }
  };

  return (
    <span
      onClick={handleClick}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "0.45rem",
        cursor: onClick ? "pointer" : "default",
      }}
      title={onClick ? "View profile" : undefined}
    >
      {avatarURL ? (
        <img
          src={avatarURL}
          alt=""
          style={{
            width: size,
            height: size,
            borderRadius: "50%",
            objectFit: "cover",
            border: isMaster ? "2px solid #fbbf24" : "1px solid #3f3f46",
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
            background: isMaster ? "#422006" : "#27272a",
            border: isMaster ? "2px solid #fbbf24" : "1px solid #3f3f46",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: size * 0.4,
            color: isMaster ? "#fbbf24" : "#71717a",
            flexShrink: 0,
          }}
        >
          {name ? name[0].toUpperCase() : "?"}
        </div>
      )}

      {name ? (
        <span style={{ fontWeight: 500, color: isMaster ? "#fde68a" : "#fafafa" }}>
          {name}
        </span>
      ) : (
        <span style={{ color: "#a1a1aa" }}>
          {principal.toString().slice(0, 10)}…
        </span>
      )}

      {isMaster && (
        <span
          style={{
            fontSize: "0.65rem",
            fontWeight: 600,
            letterSpacing: "0.03em",
            color: "#0f0f11",
            background: "#fbbf24",
            padding: "0.1rem 0.4rem",
            borderRadius: "4px",
            textTransform: "uppercase",
          }}
        >
          Founder
        </span>
      )}
    </span>
  );
}
