import React, { useState, useEffect } from "react";
import ReportButton from "./ReportButton";
import Comments from "./Comments";
import FollowButton from "./FollowButton";
import Username from "./Username";
import TimeAgo from "./TimeAgo";

export default function PostCard({
  post,
  actor,
  currentUserPrincipal,
  onUserClick,
  onDeleted,
  onUpdated,
}) {
  // Motoko Nat arrives as BigInt — keep counters as numbers for React
  const [likes, setLikes] = useState(() => Number(post.likes ?? 0));
  const [loves, setLoves] = useState(() => Number(post.loves ?? 0));
  const [content, setContent] = useState(post.content || "");
  const [liked, setLiked] = useState(false);
  const [loved, setLoved] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [actionError, setActionError] = useState("");
  const [actionMsg, setActionMsg] = useState("");
  const [editing, setEditing] = useState(false);
  const [editDraft, setEditDraft] = useState(post.content || "");
  const [gone, setGone] = useState(false);

  const isAuthor =
    currentUserPrincipal &&
    post.author &&
    currentUserPrincipal.toString() === post.author.toString();

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!actor || !currentUserPrincipal) return;
      try {
        const [alreadyLiked, alreadyLoved] = await Promise.all([
          actor.hasLiked(post.id, currentUserPrincipal),
          actor.hasLoved(post.id, currentUserPrincipal),
        ]);
        if (!cancelled) {
          setLiked(!!alreadyLiked);
          setLoved(!!alreadyLoved);
        }
      } catch (err) {
        console.error(err);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [actor, post.id, currentUserPrincipal]);

  const handleLike = async () => {
    if (!actor || loading || liked) return;
    setLoading(true);
    setActionError("");
    try {
      const success = await actor.likePost(post.id);
      if (success) {
        setLiked(true);
        setLikes((prev) => Number(prev) + 1);
      } else {
        setActionError("Already liked, or like failed.");
        setLiked(true);
      }
    } catch (err) {
      console.error(err);
      setActionError(err?.message || "Like failed");
    } finally {
      setLoading(false);
    }
  };

  const handleLove = async () => {
    if (!actor || loading || loved) return;
    setLoading(true);
    setActionError("");
    try {
      const success = await actor.lovePost(post.id);
      if (success) {
        setLoved(true);
        setLoves((prev) => Number(prev) + 1);
      } else {
        setActionError("Already loved, or not enough tokens.");
      }
    } catch (err) {
      console.error(err);
      setActionError(err?.message || "Love failed");
    } finally {
      setLoading(false);
    }
  };

  const handleSaveEdit = async () => {
    if (!actor || loading) return;
    const next = editDraft.trim();
    if (!next) {
      setActionError("Content cannot be empty.");
      return;
    }
    setLoading(true);
    setActionError("");
    setActionMsg("");
    try {
      // Keep existing image if any: optional is [] | [Text] from Candid
      const imageArg =
        post.imageURL && post.imageURL.length > 0 ? [post.imageURL[0]] : [];
      const result = await actor.editPost(post.id, next, imageArg);
      const text = typeof result === "string" ? result : "Updated";
      if (/updated/i.test(text)) {
        setContent(next);
        setEditing(false);
        setActionMsg(text);
        if (onUpdated) onUpdated({ ...post, content: next });
      } else {
        setActionError(text);
      }
    } catch (err) {
      console.error(err);
      setActionError(err?.message || "Edit failed");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!actor || loading) return;
    if (!window.confirm("Delete this post permanently?")) return;
    setLoading(true);
    setActionError("");
    try {
      const result = await actor.deletePost(post.id);
      const text = typeof result === "string" ? result : "";
      if (/deleted/i.test(text)) {
        setGone(true);
        if (onDeleted) onDeleted(post.id);
      } else {
        setActionError(text || "Delete failed");
      }
    } catch (err) {
      console.error(err);
      setActionError(err?.message || "Delete failed");
    } finally {
      setLoading(false);
    }
  };

  if (gone) return null;

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
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "0.6rem",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <Username
            actor={actor}
            principal={post.author}
            onClick={onUserClick}
          />
          <TimeAgo timestamp={post.timestamp} />
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
          {isAuthor && !editing && (
            <>
              <button
                type="button"
                onClick={() => {
                  setEditDraft(content);
                  setEditing(true);
                  setActionError("");
                  setActionMsg("");
                }}
                disabled={loading}
                style={subtleBtn}
              >
                Edit
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={loading}
                style={{ ...subtleBtn, color: "#fca5a5", borderColor: "#7f1d1d" }}
              >
                Delete
              </button>
            </>
          )}
          <FollowButton
            actor={actor}
            targetPrincipal={post.author}
            currentUserPrincipal={currentUserPrincipal}
          />
        </div>
      </div>

      {editing ? (
        <div style={{ marginBottom: "0.75rem" }}>
          <textarea
            value={editDraft}
            onChange={(e) => setEditDraft(e.target.value)}
            rows={4}
            maxLength={512}
            style={{
              width: "100%",
              boxSizing: "border-box",
              background: "#09090b",
              color: "#e4e4e7",
              border: "1px solid #3f3f46",
              borderRadius: "8px",
              padding: "0.6rem 0.75rem",
              resize: "vertical",
              fontFamily: "inherit",
              fontSize: "0.95rem",
              lineHeight: 1.5,
            }}
          />
          <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.5rem" }}>
            <button
              type="button"
              onClick={handleSaveEdit}
              disabled={loading}
              style={{ ...actionBtn, background: "#2563eb", borderColor: "#2563eb" }}
            >
              {loading ? "Saving…" : "Save"}
            </button>
            <button
              type="button"
              onClick={() => {
                setEditing(false);
                setEditDraft(content);
                setActionError("");
              }}
              disabled={loading}
              style={actionBtn}
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <p style={{ margin: "0 0 0.75rem 0", whiteSpace: "pre-wrap", color: "#e4e4e7", lineHeight: 1.5 }}>
          {content}
        </p>
      )}

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

      <div style={{ display: "flex", gap: "0.6rem", alignItems: "center", flexWrap: "wrap" }}>
        <button
          onClick={handleLike}
          disabled={loading || liked}
          title={liked ? "You already liked this" : "Like"}
          style={{
            ...actionBtn,
            ...(liked ? activeLikeStyle : {}),
            cursor: liked || loading ? "default" : "pointer",
            opacity: liked ? 0.85 : 1,
          }}
        >
          👍 {likes}
        </button>

        <button
          onClick={handleLove}
          disabled={loading || loved}
          title={loved ? "You already loved this" : "Costs 2 tokens"}
          style={{
            ...actionBtn,
            ...(loved ? activeLoveStyle : {}),
            cursor: loved || loading ? "default" : "pointer",
            opacity: loved ? 0.85 : 1,
          }}
        >
          ❤️ {loves}
        </button>

        <button onClick={() => setShowComments(!showComments)} style={actionBtn}>
          💬 {showComments ? "Hide" : "Comments"}
        </button>

        <ReportButton actor={actor} postId={post.id} />
      </div>

      {actionMsg && (
        <p style={{ color: "#4ade80", fontSize: "0.8rem", margin: "0.5rem 0 0 0" }}>{actionMsg}</p>
      )}
      {actionError && (
        <p style={{ color: "#f87171", fontSize: "0.8rem", margin: "0.5rem 0 0 0" }}>{actionError}</p>
      )}

      {showComments && (
        <Comments
          actor={actor}
          postId={post.id}
          currentUserPrincipal={currentUserPrincipal}
        />
      )}
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

const subtleBtn = {
  background: "transparent",
  color: "#a1a1aa",
  border: "1px solid #3f3f46",
  borderRadius: "6px",
  padding: "0.2rem 0.55rem",
  fontSize: "0.75rem",
  cursor: "pointer",
};

const activeLikeStyle = {
  background: "#1e3a5f",
  border: "1px solid #3b82f6",
  color: "#93c5fd",
};

const activeLoveStyle = {
  background: "#3f1d2e",
  border: "1px solid #f472b6",
  color: "#fbcfe8",
};
