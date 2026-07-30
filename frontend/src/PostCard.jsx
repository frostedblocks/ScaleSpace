import React, { useState } from "react";
import ReportButton from "./ReportButton";
import Comments from "./Comments";
import FollowButton from "./FollowButton";
import Username from "./Username";

/**
 * PostCard used in the feed.
 */
export default function PostCard({ post, actor, currentUserPrincipal }) {
  const [likes, setLikes] = useState(post.likes);
  const [loves, setLoves] = useState(post.loves);
  const [loading, setLoading] = useState(false);
  const [showComments, setShowComments] = useState(false);

  const handleLike = async () => {
    if (!actor || loading) return;
    setLoading(true);
    try {
      const success = await actor.likePost(post.id);
      if (success) setLikes((prev) => prev + 1);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleLove = async () => {
    if (!actor || loading) return;
    setLoading(true);
    try {
      const success = await actor.lovePost(post.id);
      if (success) setLoves((prev) => prev + 1);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        border: "1px solid #e0e0e0",
        borderRadius: "10px",
        padding: "1rem",
        marginBottom: "1.25rem",
        background: "#fff",
      }}
    >
      {/* Author + Follow button */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "0.5rem",
        }}
      >
        <div style={{ fontSize: "0.95rem" }}>
          <Username actor={actor} principal={post.author} />
        </div>

        <FollowButton
          actor={actor}
          targetPrincipal={post.author}
          currentUserPrincipal={currentUserPrincipal}
        />
      </div>

      {/* Content */}
      <p style={{ margin: "0 0 0.75rem 0", whiteSpace: "pre-wrap" }}>{post.content}</p>

      {/* Image */}
      {post.imageURL && post.imageURL.length > 0 && (
        <img
          src={post.imageURL[0]}
          alt="post"
          style={{
            maxWidth: "100%",
            maxHeight: "400px",
            borderRadius: "8px",
            marginBottom: "0.75rem",
            display: "block",
          }}
          onError={(e) => {
            e.target.style.display = "none";
          }}
        />
      )}

      {/* Actions */}
      <div style={{ display: "flex", gap: "0.75rem", alignItems: "center", flexWrap: "wrap" }}>
        <button onClick={handleLike} disabled={loading}>
          👍 Like ({likes})
        </button>

        <button onClick={handleLove} disabled={loading} title="Costs 2 tokens (1 tips the author)">
          ❤️ Love ({loves})
        </button>

        <button onClick={() => setShowComments(!showComments)}>
          💬 {showComments ? "Hide Comments" : "Comments"}
        </button>

        <ReportButton actor={actor} postId={post.id} />
      </div>

      {showComments && <Comments actor={actor} postId={post.id} />}
    </div>
  );
}
