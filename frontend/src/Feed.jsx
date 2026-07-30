import React, { useState, useEffect } from "react";
import PostCard from "./PostCard";
import SearchBar from "./SearchBar";

/**
 * Feed that loads recent posts or search results.
 */
export default function Feed({ actor, currentUserPrincipal }) {
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

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
        <h2 style={{ margin: 0 }}>
          {isSearch ? `Results for “${searchQuery}”` : "Recent Posts"}
        </h2>
        <button onClick={loadRecent}>Refresh</button>
      </div>

      {loading && <p>Loading…</p>}

      {error && (
        <div>
          <p style={{ color: "crimson" }}>{error}</p>
          <button onClick={loadRecent}>Try again</button>
        </div>
      )}

      {!loading && !error && posts.length === 0 && (
        <p>
          {isSearch
            ? "No posts matched your search."
            : "No posts yet. Be the first to post something!"}
        </p>
      )}

      {!loading &&
        !error &&
        posts.map((post) => (
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
