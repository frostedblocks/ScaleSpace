import React, { useState, useEffect } from "react";
import PostCard from "./PostCard";

/**
 * Basic feed that loads recent posts and displays them with PostCard.
 */
export default function Feed({ actor, currentUserPrincipal }) {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadPosts = async () => {
    if (!actor) return;

    setLoading(true);
    setError("");

    try {
      const result = await actor.getRecentPosts(30);
      setPosts(result);
    } catch (err) {
      console.error(err);
      setError("Could not load posts.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPosts();
  }, [actor]);

  if (loading) {
    return <p>Loading posts…</p>;
  }

  if (error) {
    return (
      <div>
        <p style={{ color: "crimson" }}>{error}</p>
        <button onClick={loadPosts}>Try again</button>
      </div>
    );
  }

  if (posts.length === 0) {
    return <p>No posts yet. Be the first to post something!</p>;
  }

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
        <h2 style={{ margin: 0 }}>Recent Posts</h2>
        <button onClick={loadPosts}>Refresh</button>
      </div>

      {posts.map((post) => (
        <PostCard
          key={post.id.toString()}
          post={post}
          actor={actor}
          currentUserPrincipal={currentUserPrincipal}
        />
      ))}
    </div>
  );
}
