import React, { useState, useEffect } from "react";

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
    return <p style={{ color: "#71717a" }}>Loading profile…</p>;
  }

  return (
    <div>
      <h2 style={{ marginTop: 0, color: "#fafafa" }}>Your Profile</h2>

      {principal && (
        <p style={{ fontSize: "0.8rem", color: "#71717a", marginBottom: "1.5rem", wordBreak: "break-all" }}>
          {principal.toText()}
        </p>
      )}

      <form onSubmit={handleSave}>
        <div style={{ marginBottom: "1.1rem" }}>
          <label style={labelStyle}>Username</label>
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="Choose a username"
            maxLength={50}
            style={inputStyle}
          />
        </div>

        <div style={{ marginBottom: "1.1rem" }}>
          <label style={labelStyle}>Bio</label>
          <textarea
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            placeholder="A short bio…"
            rows={3}
            maxLength={300}
            style={{ ...inputStyle, resize: "vertical" }}
          />
        </div>

        <div style={{ marginBottom: "1.5rem" }}>
          <label style={labelStyle}>Avatar URL</label>
          <input
            type="url"
            value={avatarURL}
            onChange={(e) => setAvatarURL(e.target.value)}
            placeholder="https://… (IPFS, Arweave, Cloudflare, etc.)"
            style={inputStyle}
          />
          {avatarURL && (
            <img
              src={avatarURL}
              alt="avatar preview"
              style={{
                marginTop: "0.75rem",
                width: "72px",
                height: "72px",
                objectFit: "cover",
                borderRadius: "50%",
                border: "2px solid #3f3f46",
              }}
              onError={(e) => {
                e.target.style.display = "none";
              }}
            />
          )}
        </div>

        <button
          type="submit"
          disabled={saving}
          style={{
            padding: "0.6rem 1.4rem",
            background: saving ? "#3f3f46" : "#2563eb",
            color: "white",
            border: "none",
            borderRadius: "8px",
            cursor: saving ? "default" : "pointer",
            fontSize: "0.95rem",
          }}
        >
          {saving ? "Saving…" : "Save Profile"}
        </button>
      </form>

      {message && <p style={{ color: "#4ade80", marginTop: "1rem" }}>{message}</p>}
      {error && <p style={{ color: "#f87171", marginTop: "1rem" }}>{error}</p>}
    </div>
  );
}

const labelStyle = {
  display: "block",
  marginBottom: "0.35rem",
  fontWeight: 500,
  color: "#a1a1aa",
  fontSize: "0.9rem",
};

const inputStyle = {
  width: "100%",
  padding: "0.55rem 0.7rem",
  background: "#18181b",
  color: "#e4e4e7",
  border: "1px solid #3f3f46",
  borderRadius: "8px",
  fontSize: "0.95rem",
};
