import React, { useState, useEffect } from "react";
import ModerationQueue from "./ModerationQueue";

export default function Profile({ actor, identity }) {
  const [username, setUsername] = useState("");
  const [bio, setBio] = useState("");
  const [avatarURL, setAvatarURL] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const [isMaster, setIsMaster] = useState(false);
  const [cloaked, setCloaked] = useState(false);
  const [ownerPrincipal, setOwnerPrincipal] = useState(null);
  const [claiming, setClaiming] = useState(false);

  const [grantTo, setGrantTo] = useState("");
  const [grantAmount, setGrantAmount] = useState("100");
  const [hidePostId, setHidePostId] = useState("");
  const [adminBusy, setAdminBusy] = useState(false);
  const [adminMsg, setAdminMsg] = useState("");
  const [adminErr, setAdminErr] = useState("");

  const principal = identity ? identity.getPrincipal() : null;

  const load = async () => {
    if (!actor || !principal) return;

    setLoading(true);
    setError("");
    try {
      const [profileResult, ownerFlag, owner, cloakFlag] = await Promise.all([
        actor.getProfile(principal),
        actor.isOwner(principal),
        actor.getOwner(),
        actor.isCloaked(),
      ]);

      if (profileResult && profileResult.length > 0) {
        const profile = profileResult[0];
        setUsername(profile.username || "");
        setBio(profile.bio || "");
        setAvatarURL(profile.avatarURL || "");
      }

      setIsMaster(!!ownerFlag);
      setOwnerPrincipal(owner);
      setCloaked(!!cloakFlag);
    } catch (err) {
      console.error(err);
      setError("Could not load profile.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
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

  const handleClaimMaster = async () => {
    if (!actor) return;
    setClaiming(true);
    setMessage("");
    setError("");

    try {
      const result = await actor.claimMasterProfile();
      setMessage(typeof result === "string" ? result : "Claimed.");
      await load();
    } catch (err) {
      console.error(err);
      setError("Could not claim master profile.");
    } finally {
      setClaiming(false);
    }
  };

  const handleToggleCloak = async () => {
    if (!actor) return;
    setAdminBusy(true);
    setAdminMsg("");
    setAdminErr("");

    try {
      const next = !cloaked;
      const ok = await actor.setCloak(next);
      if (ok) {
        setCloaked(next);
        setAdminMsg(
          next
            ? "Cloaked. Your Founder badge is hidden from everyone else."
            : "Uncloaked. Founder badge is visible again."
        );
      } else {
        setAdminErr("Could not change cloak setting.");
      }
    } catch (err) {
      console.error(err);
      setAdminErr("Cloak toggle failed.");
    } finally {
      setAdminBusy(false);
    }
  };

  const handleGrantTokens = async (e) => {
    e.preventDefault();
    if (!actor || !grantTo.trim()) return;

    setAdminBusy(true);
    setAdminMsg("");
    setAdminErr("");

    try {
      const { Principal } = await import("@dfinity/principal");
      const to = Principal.fromText(grantTo.trim());
      const amount = Number(grantAmount) || 0;
      const ok = await actor.adminGrantTokens(to, amount);

      if (ok) {
        setAdminMsg(`Granted ${amount} tokens.`);
        setGrantTo("");
      } else {
        setAdminErr("Grant failed. Are you the owner?");
      }
    } catch (err) {
      console.error(err);
      setAdminErr("Invalid principal or request failed.");
    } finally {
      setAdminBusy(false);
    }
  };

  const handleHidePost = async (e) => {
    e.preventDefault();
    if (!actor || hidePostId === "") return;

    setAdminBusy(true);
    setAdminMsg("");
    setAdminErr("");

    try {
      const id = Number(hidePostId);
      const ok = await actor.adminHidePost(id);

      if (ok) {
        setAdminMsg(`Post #${id} is now hidden.`);
        setHidePostId("");
      } else {
        setAdminErr("Hide failed. Check the post ID or ownership.");
      }
    } catch (err) {
      console.error(err);
      setAdminErr("Could not hide post.");
    } finally {
      setAdminBusy(false);
    }
  };

  const ownerIsAnonymous =
    !ownerPrincipal ||
    ownerPrincipal.toString() === "aaaaa-aa" ||
    (typeof ownerPrincipal.isAnonymous === "function" && ownerPrincipal.isAnonymous());

  if (loading) {
    return <p style={{ color: "#71717a" }}>Loading profile…</p>;
  }

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", marginBottom: "0.5rem", flexWrap: "wrap" }}>
        <h2 style={{ margin: 0, color: "#fafafa" }}>
          {isMaster ? "Master Profile" : "Your Profile"}
        </h2>
        {isMaster && !cloaked && (
          <span
            style={{
              fontSize: "0.7rem",
              fontWeight: 700,
              letterSpacing: "0.04em",
              color: "#0f0f11",
              background: "#fbbf24",
              padding: "0.15rem 0.5rem",
              borderRadius: "4px",
              textTransform: "uppercase",
            }}
          >
            Founder
          </span>
        )}
        {isMaster && cloaked && (
          <span
            style={{
              fontSize: "0.7rem",
              fontWeight: 600,
              letterSpacing: "0.04em",
              color: "#a1a1aa",
              background: "#27272a",
              border: "1px solid #3f3f46",
              padding: "0.15rem 0.5rem",
              borderRadius: "4px",
              textTransform: "uppercase",
            }}
          >
            Cloaked
          </span>
        )}
      </div>

      {principal && (
        <p style={{ fontSize: "0.8rem", color: "#71717a", marginBottom: "1.25rem", wordBreak: "break-all" }}>
          {principal.toText()}
        </p>
      )}

      {ownerIsAnonymous && !isMaster && (
        <div
          style={{
            background: "#18181b",
            border: "1px solid #fbbf24",
            borderRadius: "10px",
            padding: "1rem",
            marginBottom: "1.5rem",
          }}
        >
          <p style={{ margin: "0 0 0.75rem 0", color: "#fde68a", fontSize: "0.95rem" }}>
            No master profile yet. Claim it with this Internet Identity to become the Founder.
          </p>
          <button
            onClick={handleClaimMaster}
            disabled={claiming}
            style={{
              padding: "0.55rem 1.1rem",
              background: claiming ? "#3f3f46" : "#fbbf24",
              color: "#0f0f11",
              border: "none",
              borderRadius: "8px",
              fontWeight: 600,
              cursor: claiming ? "default" : "pointer",
            }}
          >
            {claiming ? "Claiming…" : "Claim Master Profile"}
          </button>
        </div>
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
            placeholder="https://… (optional)"
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
                border: isMaster && !cloaked ? "2px solid #fbbf24" : "2px solid #3f3f46",
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

      {isMaster && (
        <div
          style={{
            marginTop: "2.5rem",
            padding: "1.25rem",
            background: "#18181b",
            border: "1px solid #422006",
            borderRadius: "12px",
          }}
        >
          <h3 style={{ margin: "0 0 0.35rem 0", color: "#fbbf24", fontSize: "1.05rem" }}>
            Master controls
          </h3>
          <p style={{ margin: "0 0 1.25rem 0", color: "#a1a1aa", fontSize: "0.85rem" }}>
            Only you can see and use these tools.
          </p>

          <div
            style={{
              marginBottom: "1.5rem",
              padding: "0.9rem 1rem",
              background: "#09090b",
              borderRadius: "8px",
              border: "1px solid #27272a",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "1rem", flexWrap: "wrap" }}>
              <div>
                <div style={{ color: "#e4e4e7", fontWeight: 500 }}>Cloak master profile</div>
                <div style={{ color: "#71717a", fontSize: "0.85rem", marginTop: "0.25rem" }}>
                  {cloaked
                    ? "You look like a normal user in public. Admin powers still work."
                    : "Founder badge is visible on your posts and profile."}
                </div>
              </div>
              <button
                type="button"
                onClick={handleToggleCloak}
                disabled={adminBusy}
                style={{
                  padding: "0.5rem 1rem",
                  background: cloaked ? "#27272a" : "#422006",
                  color: cloaked ? "#e4e4e7" : "#fbbf24",
                  border: cloaked ? "1px solid #3f3f46" : "1px solid #fbbf24",
                  borderRadius: "8px",
                  cursor: adminBusy ? "default" : "pointer",
                  fontWeight: 600,
                  whiteSpace: "nowrap",
                }}
              >
                {adminBusy ? "…" : cloaked ? "Uncloak" : "Cloak"}
              </button>
            </div>
          </div>

          {/* Moderation queue */}
          <ModerationQueue actor={actor} />

          <form onSubmit={handleGrantTokens} style={{ marginBottom: "1.5rem" }}>
            <label style={labelStyle}>Grant tokens to a user</label>
            <input
              type="text"
              value={grantTo}
              onChange={(e) => setGrantTo(e.target.value)}
              placeholder="Their Principal ID"
              style={{ ...inputStyle, marginBottom: "0.5rem" }}
            />
            <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
              <input
                type="number"
                min="1"
                value={grantAmount}
                onChange={(e) => setGrantAmount(e.target.value)}
                style={{ ...inputStyle, width: "120px", flex: "0 0 auto" }}
              />
              <button type="submit" disabled={adminBusy || !grantTo.trim()} style={adminBtn}>
                {adminBusy ? "Working…" : "Grant tokens"}
              </button>
            </div>
          </form>

          <form onSubmit={handleHidePost}>
            <label style={labelStyle}>Hide a post by ID (manual)</label>
            <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
              <input
                type="number"
                min="0"
                value={hidePostId}
                onChange={(e) => setHidePostId(e.target.value)}
                placeholder="Post ID"
                style={{ ...inputStyle, width: "140px", flex: "0 0 auto" }}
              />
              <button type="submit" disabled={adminBusy || hidePostId === ""} style={dangerBtn}>
                {adminBusy ? "Working…" : "Hide post"}
              </button>
            </div>
          </form>

          {adminMsg && <p style={{ color: "#4ade80", marginTop: "1rem" }}>{adminMsg}</p>}
          {adminErr && <p style={{ color: "#f87171", marginTop: "1rem" }}>{adminErr}</p>}

          <div
            style={{
              marginTop: "1.5rem",
              paddingTop: "1rem",
              borderTop: "1px solid #27272a",
              fontSize: "0.8rem",
              color: "#71717a",
            }}
          >
            <p style={{ margin: "0 0 0.35rem 0" }}>As Founder you also get:</p>
            <ul style={{ margin: 0, paddingLeft: "1.1rem" }}>
              <li>No daily post limit</li>
              <li>No token cost to post</li>
              <li>512 character posts</li>
              <li>Optional public Founder badge (cloak to hide it)</li>
              <li>Moderation queue for reported posts</li>
            </ul>
          </div>
        </div>
      )}
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
  background: "#09090b",
  color: "#e4e4e7",
  border: "1px solid #3f3f46",
  borderRadius: "8px",
  fontSize: "0.95rem",
};

const adminBtn = {
  padding: "0.55rem 1rem",
  background: "#2563eb",
  color: "white",
  border: "none",
  borderRadius: "8px",
  cursor: "pointer",
};

const dangerBtn = {
  padding: "0.55rem 1rem",
  background: "#7f1d1d",
  color: "#fecaca",
  border: "1px solid #991b1b",
  borderRadius: "8px",
  cursor: "pointer",
};
