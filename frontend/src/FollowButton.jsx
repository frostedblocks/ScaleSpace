import React, { useState, useEffect } from "react";

/**
 * Follow / Unfollow button for another user.
 */
export default function FollowButton({ actor, targetPrincipal, currentUserPrincipal }) {
  const [isFollowing, setIsFollowing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [checked, setChecked] = useState(false);

  // Don't show the button if it's the current user
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
        padding: "2px 10px",
        borderRadius: "12px",
        border: isFollowing ? "1px solid #ccc" : "1px solid #2563eb",
        background: isFollowing ? "#f3f4f6" : "#eff6ff",
        color: isFollowing ? "#666" : "#2563eb",
        cursor: isFollowing ? "default" : "pointer",
      }}
    >
      {loading ? "…" : isFollowing ? "Following" : "Follow"}
    </button>
  );
}
