import React, { useState, useEffect } from "react";

/**
 * PostForm – free tier = 115 chars, paid tiers = 512 chars
 */
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

  // Load whether the user is still on free tier
  useEffect(() => {
    if (!actor || !principal) return;

    const loadStats = async () => {
      try {
        const result = await actor.getUserStats(principal);
        if (result && result.length > 0) {
          setIsFreeTier(result[0].isFreeTier);
        }
      } catch (err) {
        // default to free tier
      }
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
    console.warn("Using placeholder R2 upload. Replace with real logic.");
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
  const counterColor = remaining < 20 ? "#c00" : remaining < 50 ? "#b45309" : "#888";

  return (
    <form onSubmit={handleSubmit} style={{ marginBottom: "2rem" }}>
      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder={isFreeTier ? "What's on your mind? (115 chars free)" : "What's on your mind?"}
        rows={3}
        maxLength={maxLength}
        style={{ width: "100%", padding: "0.75rem" }}
      />

      <div style={{ textAlign: "right", fontSize: "0.8rem", color: counterColor, marginTop: "0.25rem" }}>
        {content.length} / {maxLength}
        {isFreeTier && <span style={{ marginLeft: "0.5rem", color: "#666" }}>(Free tier)</span>}
      </div>

      {/* Image section */}
      <div style={{ marginTop: "1rem", border: "1px solid #ddd", padding: "1rem", borderRadius: "8px" }}>
        <p style={{ margin: "0 0 0.5rem 0", fontWeight: 500 }}>Image (optional – one only)</p>

        {preview ? (
          <div>
            <img
              src={preview}
              alt="preview"
              style={{ maxWidth: "220px", maxHeight: "220px", borderRadius: "8px", display: "block" }}
              onError={() => setError("Could not load this image. Check the URL.")}
            />
            <button type="button" onClick={clearImage} style={{ marginTop: "0.5rem" }}>
              Remove image
            </button>
          </div>
        ) : (
          <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap" }}>
            <div style={{ flex: 1, minWidth: "200px" }}>
              <label style={{ display: "block", marginBottom: "0.25rem" }}>
                Paste your own image URL
              </label>
              <input
                type="url"
                placeholder="https://..."
                value={imageURL}
                onChange={handleURLChange}
                onFocus={() => setMode("url")}
                style={{ width: "100%", padding: "0.4rem" }}
              />
              <small style={{ color: "#666" }}>
                Works with IPFS, Arweave, Cloudflare, Imgur, etc.
              </small>
            </div>

            <div style={{ alignSelf: "center", color: "#999" }}>or</div>

            <div style={{ flex: 1, minWidth: "180px" }}>
              <label style={{ display: "block", marginBottom: "0.25rem" }}>
                Upload to ScaleSpace storage
              </label>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => {
                  setMode("upload");
                  handleFileChange(e);
                }}
              />
              <small style={{ color: "#666" }}>
                Stored on Cloudflare R2 (more reliable)
              </small>
            </div>
          </div>
        )}
      </div>

      {error && <p style={{ color: "crimson", marginTop: "0.75rem" }}>{error}</p>}

      <button type="submit" disabled={loading} style={{ marginTop: "1rem" }}>
        {loading ? "Posting…" : "Post"}
      </button>
    </form>
  );
}
