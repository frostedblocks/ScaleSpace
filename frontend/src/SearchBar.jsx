import React, { useState } from "react";

/**
 * Simple search bar that calls the backend searchPosts function.
 */
export default function SearchBar({ onSearch, onClear }) {
  const [query, setQuery] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();
    const trimmed = query.trim();
    if (trimmed) {
      onSearch(trimmed);
    }
  };

  const handleClear = () => {
    setQuery("");
    if (onClear) onClear();
  };

  return (
    <form
      onSubmit={handleSubmit}
      style={{
        display: "flex",
        gap: "0.5rem",
        marginBottom: "1.25rem",
      }}
    >
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search posts…"
        style={{
          flex: 1,
          padding: "0.55rem 0.75rem",
          borderRadius: "8px",
          border: "1px solid #ddd",
          fontSize: "0.95rem",
        }}
      />
      <button type="submit" style={{ padding: "0.55rem 1rem" }}>
        Search
      </button>
      {query && (
        <button type="button" onClick={handleClear} style={{ padding: "0.55rem 0.8rem" }}>
          Clear
        </button>
      )}
    </form>
  );
}
