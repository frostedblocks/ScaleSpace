import React, { useState, useEffect } from "react";

/**
 * Profile page – view and edit username, bio, and avatar URL.
 */
export default function Profile({ actor, identity }) {
  const [username, setUsername] = useState("");
  const [bio, setBio] = useState("");
  const [avatarURL, setAvatarURL] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const principal = identity ? identity.getPrincipal() : null;

  useEffect(() => {
    if (!actor || !principal) return;

    const loadProfile = async () => {
      setLoading(true);
      setError("");
      try {
        const result = await actor.getProfile(principal);
        if (result && result.length > 0) {
          const profile = result[0];
          setUsername(profile.username || "");
          setBio(profile.bio || "");
          setAvatarURL(profile.avatarURL || "");
        }
      } catch (err) {
        console.error(err);
        setError("Could not load profile.");
      } finally {
        setLoading(false);
      }
    };

    loadProfile();
  }, [actor, principal]);

  const handleSave = async (e) => {
    e.preventDefault();
    if (!actor) return;

    setSaving(true);
    setMessage("");
    setError("");

    try {
      await actor.setProfile(username.trim(), bio.trim(), avatarURL.trim());
      setMessage("Profile saved!");
    } catch (err) {
      console.error(err);
      setError("Failed to save profile.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <p>Loading profile…</p>;
  }

  return (
    <div>
      <h2 style={{ marginTop: 0 }}>Your Profile</h2>

      {principal && (
        <p style={{ fontSize: "0.8rem", color: "#666", marginBottom: "1.25rem" }}>
          Principal: {principal.toText()}
        </p>
      )}

      <form onSubmit={handleSave}>
        <div style={{ marginBottom: "1rem" }}>
          <label style={{ display: "block", marginBottom: "0.3rem", fontWeight: 500 }}>
            Username
          </label>
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="Choose a username"
            maxLength={50}
            style={{ width: "100%", padding: "0.5rem" }}
          />
        </div>

        <div style={{ marginBottom: "1rem" }}>
          <label style={{ display: "block", marginBottom: "0.3rem", fontWeight: 500 }}>
            Bio
          </label>
          <textarea
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            placeholder="A short bio…"
            rows={3}
            maxLength={300}
            style={{ width: "100%", padding: "0.5rem" }}
          />
        </div>

        <div style={{ marginBottom: "1.25rem" }}>
          <label style={{ display: "block", marginBottom: "0.3rem", fontWeight: 500 }}>
            Avatar URL
          </label>
          <input
            type="url"
            value={avatarURL}
            onChange={(e) => setAvatarURL(e.target.value)}
            placeholder="https://… (Cloudflare R2, IPFS, Arweave, etc.)"
            style={{ width: "100%", padding: "0.5rem" }}
          />
          {avatarURL && (
            <img
              src={avatarURL}
              alt="avatar preview"
              style={{
                marginTop: "0.6rem",
                width: "80px",
                height: "80px",
                objectFit: "cover",
                borderRadius: "50%",
                border: "1px solid #ddd",
              }}
              onError={(e) => {
                e.target.style.display = "none";
              }}
            />
          )}
        </div>

        <button type="submit" disabled={saving}>
          {saving ? "Saving…" : "Save Profile"}
        </button>
      </form>

      {message && <p style={{ color: "green", marginTop: "1rem" }}>{message}</p>}
      {error && <p style={{ color: "crimson", marginTop: "1rem" }}>{error}</p>}
    </div>
  );
}
