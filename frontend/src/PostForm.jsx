import React, { useState } from "react";

/**
 * PostForm – supports two ways to add one image:
 * 1. Paste any public image URL (user’s own storage)
 * 2. Upload a file to Cloudflare R2
 *
 * Only one image is allowed per post.
 */
export default function PostForm({ actor, onPostCreated }) {
  const [content, setContent] = useState("");
  const [mode, setMode] = useState("none"); // "none" | "url" | "upload"
  const [imageURL, setImageURL] = useState("");
  const [imageFile, setImageFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // ---------- URL mode ----------
  const handleURLChange = (e) => {
    const url = e.target.value.trim();
    setImageURL(url);
    setPreview(url || null);
    setError("");
  };

  // ---------- Upload mode ----------
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

  /**
   * Placeholder for real Cloudflare R2 upload.
   * Replace this with signed-URL or AWS SDK logic.
   */
  async function uploadToR2(file) {
    console.warn("Using placeholder R2 upload. Replace with real logic.");
    return `https://your-r2-bucket.example.com/${Date.now()}-${file.name}`;
  }

  // Basic check that a pasted URL looks like an image
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

      // Call Motoko backend: makePost(content, imageURL)
      const result = await actor.makePost(
        content,
        finalImageURL ? [finalImageURL] : []
      );

      if (result.length === 0) {
        setError("Could not create post. Check token balance or daily limit.");
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

  return (
    <form onSubmit={handleSubmit} style={{ marginBottom: "2rem" }}>
      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder="What's on your mind?"
        rows={4}
        maxLength={10000}
        style={{ width: "100%", padding: "0.75rem" }}
      />

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
            {/* Option 1: Paste URL */}
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

            {/* Option 2: Upload to R2 */}
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
