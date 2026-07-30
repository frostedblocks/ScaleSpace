import React, { useState, useEffect } from "react";

export default function PostForm({ actor, onPostCreated, principal }) {
  const [content, setContent] = useState("");
  const [mode, setMode] = useState("none");
  const [imageURL, setImageURL] = useState("");
  const [imageFile, setImageFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [isFreeTier, setIsFreeTier] = useState(true);

  const FREE_MAX = 115;
  const PAID_MAX = 512;
  const maxLength = isFreeTier ? FREE_MAX : PAID_MAX;

  useEffect(() => {
    if (!actor || !principal) return;

    const loadStats = async () => {
      try {
        const result = await actor.getUserStats(principal);
        if (result && result.length > 0) {
          setIsFreeTier(result[0].isFreeTier);
        }
      } catch (err) {}
    };

    loadStats();
  }, [actor, principal]);

  const handleURLChange = (e) => {
    const url = e.target.value.trim();
    setImageURL(url);
    setPreview(url || null);
    setError("");
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      setError("Image must be smaller than 5 MB.");
      return;
    }

    setImageFile(file);
    setPreview(URL.createObjectURL(file));
    setError("");
  };

  const clearImage = () => {
    setMode("none");
    setImageURL("");
    setImageFile(null);
    setPreview(null);
    setError("");
  };

  async function uploadToR2(file) {
    console.warn("Using placeholder R2 upload.");
    return `https://your-r2-bucket.example.com/${Date.now()}-${file.name}`;
  }

  function isProbablyImageURL(url) {
    if (!url) return false;
    try {
      const u = new URL(url);
      return /\.(jpg|jpeg|png|gif|webp|avif|svg)(\?.*)?$/i.test(u.pathname) ||
             u.hostname.includes("imgur") ||
             u.hostname.includes("cloudflare") ||
             u.hostname.includes("ipfs") ||
             u.hostname.includes("arweave");
    } catch {
      return false;
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!content.trim() && !preview) {
      setError("Write something or add an image.");
      return;
    }

    if (content.length > maxLength) {
      setError(`Post is too long. Limit is ${maxLength} characters.`);
      return;
    }

    setLoading(true);
    setError("");

    try {
      let finalImageURL = null;

      if (mode === "url") {
        if (!isProbablyImageURL(imageURL)) {
          setError("That does not look like a valid image URL.");
          setLoading(false);
          return;
        }
        finalImageURL = imageURL;
      } else if (mode === "upload" && imageFile) {
        finalImageURL = await uploadToR2(imageFile);
      }

      const result = await actor.makePost(
        content,
        finalImageURL ? [finalImageURL] : []
      );

      if (result.length === 0) {
        setError("Could not create post. Check token balance, daily limit, or character limit.");
      } else {
        setContent("");
        clearImage();
        if (onPostCreated) onPostCreated(result[0]);
      }
    } catch (err) {
      console.error(err);
      setError("Something went wrong while posting.");
    } finally {
      setLoading(false);
    }
  };

  const remaining = maxLength - content.length;
  const counterColor = remaining < 20 ? "#f87171" : remaining < 50 ? "#fbbf24" : "#71717a";

  return (
    <form onSubmit={handleSubmit} style={{ marginBottom: "1.5rem" }}>
      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder={isFreeTier ? "What's on your mind? (115 chars free)" : "What's on your mind?"}
        rows={3}
        maxLength={maxLength}
        style={{
          width: "100%",
          padding: "0.75rem",
          background: "#18181b",
          color: "#e4e4e7",
          border: "1px solid #3f3f46",
          borderRadius: "10px",
          resize: "vertical",
        }}
      />

      <div style={{ textAlign: "right", fontSize: "0.8rem", color: counterColor, marginTop: "0.3rem" }}>
        {content.length} / {maxLength}
        {isFreeTier && <span style={{ marginLeft: "0.5rem", color: "#71717a" }}>(Free tier)</span>}
      </div>

      <div
        style={{
          marginTop: "1rem",
          border: "1px solid #27272a",
          padding: "1rem",
          borderRadius: "10px",
          background: "#18181b",
        }}
      >
        <p style={{ margin: "0 0 0.5rem 0", fontWeight: 500, color: "#a1a1aa" }}>
          Image (optional – one only)
        </p>

        {preview ? (
          <div>
            <img
              src={preview}
              alt="preview"
              style={{ maxWidth: "220px", maxHeight: "220px", borderRadius: "8px", display: "block" }}
              onError={() => setError("Could not load this image.")}
            />
            <button type="button" onClick={clearImage} style={{ marginTop: "0.5rem", ...darkBtn }}>
              Remove image
            </button>
          </div>
        ) : (
          <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap" }}>
            <div style={{ flex: 1, minWidth: "180px" }}>
              <label style={{ display: "block", marginBottom: "0.25rem", fontSize: "0.85rem", color: "#a1a1aa" }}>
                Paste image URL
              </label>
              <input
                type="url"
                placeholder="https://..."
                value={imageURL}
                onChange={handleURLChange}
                onFocus={() => setMode("url")}
                style={inputStyle}
              />
            </div>

            <div style={{ alignSelf: "center", color: "#52525b" }}>or</div>

            <div style={{ flex: 1, minWidth: "160px" }}>
              <label style={{ display: "block", marginBottom: "0.25rem", fontSize: "0.85rem", color: "#a1a1aa" }}>
                Upload to storage
              </label>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => {
                  setMode("upload");
                  handleFileChange(e);
                }}
                style={{ color: "#a1a1aa" }}
              />
            </div>
          </div>
        )}
      </div>

      {error && <p style={{ color: "#f87171", marginTop: "0.75rem" }}>{error}</p>}

      <button
        type="submit"
        disabled={loading}
        style={{
          marginTop: "1rem",
          padding: "0.6rem 1.4rem",
          background: loading ? "#3f3f46" : "#2563eb",
          color: "white",
          border: "none",
          borderRadius: "8px",
          cursor: loading ? "default" : "pointer",
          fontSize: "0.95rem",
        }}
      >
        {loading ? "Posting…" : "Post"}
      </button>
    </form>
  );
}

const inputStyle = {
  width: "100%",
  padding: "0.4rem 0.6rem",
  background: "#09090b",
  color: "#e4e4e7",
  border: "1px solid #3f3f46",
  borderRadius: "6px",
};

const darkBtn = {
  background: "#27272a",
  color: "#e4e4e7",
  border: "1px solid #3f3f46",
  borderRadius: "6px",
  padding: "0.3rem 0.7rem",
  cursor: "pointer",
};
