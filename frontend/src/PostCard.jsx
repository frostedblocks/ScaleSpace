import React, { useState } from "react";
import ReportButton from "./ReportButton";
import Comments from "./Comments";
import FollowButton from "./FollowButton";
import Username from "./Username";
import TimeAgo from "./TimeAgo";

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
        border: "1px solid #27272a",
        borderRadius: "12px",
        padding: "1rem 1.1rem",
        marginBottom: "1rem",
        background: "#18181b",
      }}
    >
      {/* Author + time + Follow */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "0.6rem",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <span style={{ fontSize: "0.95rem", color: "#fafafa" }}>
            <Username actor={actor} principal={post.author} />
          </span>
          <TimeAgo timestamp={post.timestamp} />
        </div>

        <FollowButton
          actor={actor}
          targetPrincipal={post.author}
          currentUserPrincipal={currentUserPrincipal}
        />
      </div>

      {/* Content */}
      <p style={{ margin: "0 0 0.75rem 0", whiteSpace: "pre-wrap", color: "#e4e4e7", lineHeight: 1.5 }}>
        {post.content}
      </p>

      {/* Image */}
      {post.imageURL && post.imageURL.length > 0 && (
        <img
          src={post.imageURL[0]}
          alt="post"
          style={{
            maxWidth: "100%",
            maxHeight: "400px",
            borderRadius: "10px",
            marginBottom: "0.75rem",
            display: "block",
          }}
          onError={(e) => {
            e.target.style.display = "none";
          }}
        />
      )}

      {/* Actions */}
      <div style={{ display: "flex", gap: "0.6rem", alignItems: "center", flexWrap: "wrap" }}>
        <button onClick={handleLike} disabled={loading} style={actionBtn}>
          👍 {likes}
        </button>

        <button onClick={handleLove} disabled={loading} title="Costs 2 tokens" style={actionBtn}>
          ❤️ {loves}
        </button>

        <button onClick={() => setShowComments(!showComments)} style={actionBtn}>
          💬 {showComments ? "Hide" : "Comments"}
        </button>

        <ReportButton actor={actor} postId={post.id} />
      </div>

      {showComments && <Comments actor={actor} postId={post.id} />}
    </div>
  );
}

const actionBtn = {
  background: "#27272a",
  color: "#e4e4e7",
  border: "1px solid #3f3f46",
  borderRadius: "6px",
  padding: "0.3rem 0.7rem",
  fontSize: "0.85rem",
  cursor: "pointer",
};
