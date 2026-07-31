import React, { useState, useEffect } from "react";
import PostCard from "./PostCard";
import SearchBar from "./SearchBar";

export default function Feed({ actor, currentUserPrincipal, onUserClick }) {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [isSearch, setIsSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const loadRecent = async () => {
    if (!actor) return;

    setLoading(true);
    setError("");
    setIsSearch(false);
    setSearchQuery("");

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

  const handleSearch = async (query) => {
    if (!actor) return;

    setLoading(true);
    setError("");
    setIsSearch(true);
    setSearchQuery(query);

    try {
      const result = await actor.searchPosts(query);
      setPosts(result);
    } catch (err) {
      console.error(err);
      setError("Search failed.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRecent();
  }, [actor]);

  return (
    <div>
      <SearchBar onSearch={handleSearch} onClear={loadRecent} />

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "1rem",
        }}
      >
        <h2 style={{ margin: 0, fontSize: "1.15rem", color: "#fafafa" }}>
          {isSearch ? `Results for “${searchQuery}”` : "Recent Posts"}
        </h2>
        <button
          onClick={loadRecent}
          style={{
            background: "#18181b",
            color: "#a1a1aa",
            border: "1px solid #3f3f46",
            borderRadius: "6px",
            padding: "0.3rem 0.7rem",
            fontSize: "0.85rem",
            cursor: "pointer",
          }}
        >
          Refresh
        </button>
      </div>

      {loading && <p style={{ color: "#71717a" }}>Loading…</p>}

      {error && (
        <div>
          <p style={{ color: "#f87171" }}>{error}</p>
          <button onClick={loadRecent} style={{ color: "#93c5fd", background: "none", border: "none", cursor: "pointer" }}>
            Try again
          </button>
        </div>
      )}

      {!loading && !error && posts.length === 0 && (
        <div
          style={{
            textAlign: "center",
            padding: "2.5rem 1rem",
            color: "#52525b",
            border: "1px dashed #27272a",
            borderRadius: "12px",
          }}
        >
          {isSearch ? (
            <p>No posts matched your search.</p>
          ) : (
            <>
              <p style={{ fontSize: "1.1rem", marginBottom: "0.4rem" }}>No posts yet</p>
              <p style={{ fontSize: "0.9rem" }}>Be the first to say something.</p>
            </>
          )}
        </div>
      )}

      {!loading &&
        !error &&
        posts.map((post) => (
          <PostCard
            key={post.id.toString()}
            post={post}
            actor={actor}
            currentUserPrincipal={currentUserPrincipal}
            onUserClick={onUserClick}
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
        ))}
    </div>
  );
}
