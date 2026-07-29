import React, { useState } from "react";

/**
 * PostForm – allows text + one optional image.
 * Image is uploaded to Cloudflare R2 first, then the public URL
 * is sent to the ICP backend together with the text.
 */
export default function PostForm({ actor, onPostCreated }) {
  const [content, setContent] = useState("");
  const [imageFile, setImageFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Only one image allowed
    if (imageFile) {
      setError("Only one image per post is allowed.");
      return;
    }

    // Basic size check (5 MB)
    if (file.size > 5 * 1024 * 1024) {
      setError("Image must be smaller than 5 MB.");
      return;
    }

    setImageFile(file);
    setPreview(URL.createObjectURL(file));
    setError("");
  };

  const removeImage = () => {
    setImageFile(null);
    setPreview(null);
  };

  /**
   * Upload image to Cloudflare R2.
   * Replace this function with your real R2 upload logic
   * (signed URL or AWS SDK v3).
   */
  async function uploadToR2(file) {
    // -------------------------------------------------------
    // PLACEHOLDER – replace with real Cloudflare R2 upload
    // -------------------------------------------------------
    // Example using a signed URL approach (recommended):
    // 1. Call your own small backend or Cloudflare Worker
    //    to get a pre-signed PUT URL.
    // 2. PUT the file to that URL.
    // 3. Return the final public URL.
    //
    // For now we just simulate a successful upload:
    console.warn("Using placeholder R2 upload. Replace with real logic.");
    const fakeUrl = `https://your-r2-bucket.example.com/${Date.now()}-${file.name}`;
    return fakeUrl;
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!content.trim() && !imageFile) {
      setError("Write something or add an image.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      let imageURL = null;

      if (imageFile) {
        imageURL = await uploadToR2(imageFile);
      }

      // Call the Motoko backend
      // makePost(content, imageURL) returns ?Nat (postId)
      const result = await actor.makePost(content, imageURL ? [imageURL] : []);

      if (result.length === 0) {
        setError("Could not create post. Check your token balance or daily limit.");
      } else {
        setContent("");
        removeImage();
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

      <div style={{ marginTop: "0.5rem" }}>
        {preview ? (
          <div>
            <img
              src={preview}
              alt="preview"
              style={{ maxWidth: "200px", maxHeight: "200px", borderRadius: "8px" }}
            />
            <button type="button" onClick={removeImage} style={{ marginLeft: "0.5rem" }}>
              Remove image
            </button>
          </div>
        ) : (
          <label>
            Add one image (optional):
            <input
              type="file"
              accept="image/*"
              onChange={handleImageChange}
              style={{ display: "block", marginTop: "0.25rem" }}
            />
          </label>
        )}
      </div>

      {error && <p style={{ color: "red" }}>{error}</p>}

      <button type="submit" disabled={loading} style={{ marginTop: "1rem" }}>
        {loading ? "Posting…" : "Post"}
      </button>
    </form>
  );
}
