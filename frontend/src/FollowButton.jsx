import React, { useState, useEffect } from "react";

export default function FollowButton({ actor, targetPrincipal, currentUserPrincipal }) {
  const [isFollowing, setIsFollowing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [checked, setChecked] = useState(false);

  if (!targetPrincipal || !currentUserPrincipal) return null;
  if (targetPrincipal.toString() === currentUserPrincipal.toString()) return null;

  useEffect(() => {
    if (!actor || !currentUserPrincipal) return;

    const checkFollowing = async () => {
      try {
        const list = await actor.getFollowing(currentUserPrincipal);
        const following = list.some(
          (p) => p.toString() === targetPrincipal.toString()
        );
        setIsFollowing(following);
      } catch (err) {
        console.error(err);
      } finally {
        setChecked(true);
      }
    };

    checkFollowing();
  }, [actor, currentUserPrincipal, targetPrincipal]);

  const handleFollow = async () => {
    if (!actor || loading) return;
    setLoading(true);

    try {
      await actor.follow(targetPrincipal);
      setIsFollowing(true);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (!checked) return null;

  return (
    <button
      onClick={handleFollow}
      disabled={loading || isFollowing}
      style={{
        fontSize: "0.8rem",
        padding: "0.2rem 0.75rem",
        borderRadius: "12px",
        border: isFollowing ? "1px solid #3f3f46" : "1px solid #2563eb",
        background: isFollowing ? "#18181b" : "#1e3a5f",
        color: isFollowing ? "#71717a" : "#93c5fd",
        cursor: isFollowing ? "default" : "pointer",
      }}
    >
      {loading ? "…" : isFollowing ? "Following" : "Follow"}
    </button>
  );
}
