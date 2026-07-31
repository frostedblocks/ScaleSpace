import React, { useState, useEffect } from "react";
import PostCard from "./PostCard";
import FollowButton from "./FollowButton";

/**
 * Public profile page for any user.
 * Shows avatar, username, bio, follow button, and their posts.
 */
export default function UserProfileView({
  actor,
  principal,           // the profile being viewed
  currentUserPrincipal,
  onBack,
}) {
  const [profile, setProfile] = useState(null);
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!actor || !principal) return;

    const load = async () => {
      setLoading(true);
      try {
        const [profileResult, postsResult] = await Promise.all([
          actor.getProfile(principal),
          actor.getPostsByAuthor(principal, 30),
        ]);

        if (profileResult && profileResult.length > 0) {
          setProfile(profileResult[0]);
        } else {
          setProfile(null);
        }

        setPosts(postsResult || []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [actor, principal]);

  if (loading) {
    return <p style={{ color: "#71717a" }}>Loading profile…</p>;
  }

  const username = profile?.username || null;
  const bio = profile?.bio || "";
  const avatarURL = profile?.avatarURL || null;

  return (
    <div>
      <button
        onClick={onBack}
        style={{
          background: "none",
          border: "none",
          color: "#93c5fd",
          cursor: "pointer",
          marginBottom: "1.25rem",
          padding: 0,
          fontSize: "0.9rem",
        }}
      >
        ← Back to feed
      </button>

      {/* Profile header */}
      <div
        style={{
          display: "flex",
          gap: "1rem",
          alignItems: "flex-start",
          marginBottom: "1.5rem",
          padding: "1.25rem",
          background: "#18181b",
          borderRadius: "12px",
          border: "1px solid #27272a",
        }}
      >
        {/* Avatar */}
        {avatarURL ? (
          <img
            src={avatarURL}
            alt=""
            style={{
              width: 72,
              height: 72,
              borderRadius: "50%",
              objectFit: "cover",
              border: "2px solid #3f3f46",
              flexShrink: 0,
            }}
            onError={(e) => {
              e.target.style.display = "none";
            }}
          />
        ) : (
          <div
            style={{
              width: 72,
              height: 72,
              borderRadius: "50%",
              background: "#27272a",
              border: "2px solid #3f3f46",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "1.5rem",
              color: "#71717a",
              flexShrink: 0,
            }}
          >
            {username ? username[0].toUpperCase() : "?"}
          </div>
        )}

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "0.75rem", flexWrap: "wrap" }}>
            <h2 style={{ margin: 0, color: "#fafafa", fontSize: "1.25rem" }}>
              {username || principal.toString().slice(0, 12) + "…"}
            </h2>

            <FollowButton
              actor={actor}
              targetPrincipal={principal}
              currentUserPrincipal={currentUserPrincipal}
            />
          </div>

          {bio && (
            <p style={{ margin: "0.5rem 0 0 0", color: "#a1a1aa", lineHeight: 1.45 }}>
              {bio}
            </p>
          )}

          <p style={{ margin: "0.6rem 0 0 0", fontSize: "0.75rem", color: "#52525b", wordBreak: "break-all" }}>
            {principal.toString()}
          </p>
        </div>
      </div>

      {/* Their posts */}
      <h3 style={{ color: "#a1a1aa", fontSize: "0.95rem", marginBottom: "1rem" }}>
        Posts ({posts.length})
      </h3>

      {posts.length === 0 ? (
        <p style={{ color: "#52525b" }}>No posts yet.</p>
      ) : (
        posts.map((post) => (
          <PostCard
            key={post.id.toString()}
            post={post}
            actor={actor}
            currentUserPrincipal={currentUserPrincipal}
            onDeleted={(id) =>
              setPosts((prev) => prev.filter((p) => p.id.toString() !== id.toString()))
            }
            onUpdated={(updated) =>
              setPosts((prev) =>
                prev.map((p) =>
                  p.id.toString() === updated.id.toString() ? { ...p, content: updated.content } : p
                )
              )
            }
          />
        ))
      )}
    </div>
  );
}
