import React, { useState, useEffect } from "react";
import Username from "./Username";
import TimeAgo from "./TimeAgo";

const TOKENS_PER_MESSAGE = 1;
const MAX_MESSAGE_LENGTH = 1000;

/**
 * Private messaging UI.
 * - Uses messagingActor for DMs
 * - Uses mainActor.spendTokens(1) before each send
 */
export default function Messaging({
  mainActor,
  messagingActor,
  identity,
  onBack,
}) {
  const [conversations, setConversations] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [selectedConv, setSelectedConv] = useState(null);
  const [text, setText] = useState("");
  const [otherPrincipalText, setOtherPrincipalText] = useState("");
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");

  const myPrincipal = identity ? identity.getPrincipal() : null;

  const loadConversations = async () => {
    if (!messagingActor) return;
    setLoading(true);
    setError("");
    try {
      const list = await messagingActor.getMyConversations();
      setConversations(list || []);
    } catch (err) {
      console.error(err);
      setError("Could not load conversations.");
    } finally {
      setLoading(false);
    }
  };

  const loadMessages = async (conversationId) => {
    if (!messagingActor) return;
    try {
      const list = await messagingActor.getMessages(conversationId);
      setMessages(list || []);
      const conv = await messagingActor.getConversation(conversationId);
      if (conv && conv.length > 0) {
        setSelectedConv(conv[0]);
      } else if (conv && conv.id !== undefined) {
        setSelectedConv(conv);
      }
    } catch (err) {
      console.error(err);
      setError("Could not load messages.");
    }
  };

  useEffect(() => {
    loadConversations();
  }, [messagingActor]);

  useEffect(() => {
    if (selectedId !== null) {
      loadMessages(selectedId);
    }
  }, [selectedId, messagingActor]);

  const otherParticipant = (conv) => {
    if (!conv || !myPrincipal) return null;
    const parts = conv.participants || [];
    for (const p of parts) {
      if (p.toString() !== myPrincipal.toString()) return p;
    }
    return null;
  };

  const startConversation = async () => {
    if (!messagingActor || !otherPrincipalText.trim()) return;
    setError("");
    setInfo("");
    setSending(true);

    try {
      // Principal.fromText is available when using @dfinity/principal in real build.
      // For now we expect the messaging actor to accept Principal; frontend will pass via agent libs later.
      const { Principal } = await import("@dfinity/principal");
      const other = Principal.fromText(otherPrincipalText.trim());

      const result = await messagingActor.getOrCreateConversation(other);
      const id = Array.isArray(result) ? result[0] : result;

      if (id === null || id === undefined) {
        setError("Could not start conversation.");
      } else {
        setOtherPrincipalText("");
        await loadConversations();
        setSelectedId(typeof id === "object" && id !== null && "id" in id ? id : Number(id));
        setInfo("Conversation ready.");
      }
    } catch (err) {
      console.error(err);
      setError("Invalid principal or messaging not connected yet.");
    } finally {
      setSending(false);
    }
  };

  const sendMessage = async (e) => {
    e.preventDefault();
    if (!text.trim() || selectedId === null) return;
    if (!mainActor || !messagingActor) {
      setError("Not connected to canisters yet.");
      return;
    }

    setSending(true);
    setError("");
    setInfo("");

    try {
      // 1) Charge 1 token on main ScaleSpace canister
      const paid = await mainActor.spendTokens(TOKENS_PER_MESSAGE);
      if (!paid) {
        setError("Not enough tokens. Each message costs 1 token.");
        setSending(false);
        return;
      }

      // 2) Send on messaging canister
      const result = await messagingActor.sendMessage(selectedId, text.trim());
      const msgId = Array.isArray(result) ? result[0] : result;

      if (msgId === null || msgId === undefined) {
        setError("Message failed (daily limit or not allowed). Token was still spent.");
      } else {
        setText("");
        await loadMessages(selectedId);
        await loadConversations();
        setInfo("Message sent (1 token used).");
      }
    } catch (err) {
      console.error(err);
      setError("Failed to send message.");
    } finally {
      setSending(false);
    }
  };

  const remaining = MAX_MESSAGE_LENGTH - text.length;

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.25rem" }}>
        <h2 style={{ margin: 0, color: "#fafafa" }}>Messages</h2>
        {onBack && (
          <button onClick={onBack} style={secondaryBtn}>
            Back
          </button>
        )}
      </div>

      <p style={{ color: "#a1a1aa", fontSize: "0.9rem", marginTop: 0 }}>
        Each message costs <strong style={{ color: "#e4e4e7" }}>{TOKENS_PER_MESSAGE} token</strong>.
        Max 50 messages per day. Conversations keep the last 100 messages.
      </p>

      {/* Start DM */}
      <div
        style={{
          background: "#18181b",
          border: "1px solid #27272a",
          borderRadius: "10px",
          padding: "1rem",
          marginBottom: "1.25rem",
        }}
      >
        <label style={{ display: "block", color: "#a1a1aa", fontSize: "0.85rem", marginBottom: "0.35rem" }}>
          Start a conversation (paste their Principal ID)
        </label>
        <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
          <input
            type="text"
            value={otherPrincipalText}
            onChange={(e) => setOtherPrincipalText(e.target.value)}
            placeholder="aaaaa-aa…"
            style={inputStyle}
          />
          <button onClick={startConversation} disabled={sending || !otherPrincipalText.trim()} style={primaryBtn}>
            Open DM
          </button>
        </div>
      </div>

      {error && <p style={{ color: "#f87171" }}>{error}</p>}
      {info && <p style={{ color: "#4ade80" }}>{info}</p>}

      <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap" }}>
        {/* Conversation list */}
        <div style={{ flex: "1 1 180px", minWidth: "160px" }}>
          <h3 style={{ color: "#a1a1aa", fontSize: "0.9rem" }}>Inbox</h3>
          {loading && <p style={{ color: "#71717a" }}>Loading…</p>}
          {!loading && conversations.length === 0 && (
            <p style={{ color: "#52525b", fontSize: "0.9rem" }}>No conversations yet.</p>
          )}
          {conversations.map((c) => {
            const other = otherParticipant(c);
            const active = selectedId !== null && Number(c.id) === Number(selectedId);
            return (
              <button
                key={c.id.toString()}
                onClick={() => setSelectedId(Number(c.id))}
                style={{
                  display: "block",
                  width: "100%",
                  textAlign: "left",
                  marginBottom: "0.4rem",
                  padding: "0.6rem 0.75rem",
                  background: active ? "#1e3a5f" : "#18181b",
                  border: active ? "1px solid #2563eb" : "1px solid #27272a",
                  borderRadius: "8px",
                  color: "#e4e4e7",
                  cursor: "pointer",
                }}
              >
                {other ? (
                  <Username actor={mainActor} principal={other} size={22} />
                ) : (
                  <span>Conversation #{c.id.toString()}</span>
                )}
                <div style={{ fontSize: "0.75rem", color: "#71717a", marginTop: "0.25rem" }}>
                  <TimeAgo timestamp={c.lastMessageAt} />
                </div>
              </button>
            );
          })}
        </div>

        {/* Thread */}
        <div style={{ flex: "2 1 280px" }}>
          {selectedId === null ? (
            <p style={{ color: "#52525b" }}>Select a conversation or start a new one.</p>
          ) : (
            <>
              <div
                style={{
                  background: "#18181b",
                  border: "1px solid #27272a",
                  borderRadius: "10px",
                  padding: "1rem",
                  minHeight: "220px",
                  marginBottom: "0.75rem",
                  maxHeight: "360px",
                  overflowY: "auto",
                }}
              >
                {messages.length === 0 && (
                  <p style={{ color: "#52525b" }}>No messages yet. Say hello.</p>
                )}
                {messages.map((m) => {
                  const mine =
                    myPrincipal && m.from.toString() === myPrincipal.toString();
                  return (
                    <div
                      key={m.id.toString()}
                      style={{
                        marginBottom: "0.75rem",
                        textAlign: mine ? "right" : "left",
                      }}
                    >
                      <div
                        style={{
                          display: "inline-block",
                          maxWidth: "85%",
                          padding: "0.55rem 0.75rem",
                          borderRadius: "10px",
                          background: mine ? "#1e3a5f" : "#09090b",
                          border: "1px solid #27272a",
                          textAlign: "left",
                        }}
                      >
                        <div style={{ fontSize: "0.75rem", color: "#a1a1aa", marginBottom: "0.2rem" }}>
                          <Username actor={mainActor} principal={m.from} size={18} />{" "}
                          <TimeAgo timestamp={m.timestamp} />
                        </div>
                        <div style={{ color: "#e4e4e7", whiteSpace: "pre-wrap" }}>{m.content}</div>
                      </div>
                    </div>
                  );
                })}
              </div>

              <form onSubmit={sendMessage}>
                <textarea
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  placeholder="Write a message… (1 token)"
                  rows={2}
                  maxLength={MAX_MESSAGE_LENGTH}
                  style={{
                    width: "100%",
                    padding: "0.6rem",
                    background: "#09090b",
                    color: "#e4e4e7",
                    border: "1px solid #3f3f46",
                    borderRadius: "8px",
                    resize: "vertical",
                  }}
                />
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginTop: "0.4rem",
                  }}
                >
                  <span style={{ fontSize: "0.8rem", color: remaining < 50 ? "#f87171" : "#71717a" }}>
                    {text.length} / {MAX_MESSAGE_LENGTH} · {TOKENS_PER_MESSAGE} token
                  </span>
                  <button
                    type="submit"
                    disabled={sending || !text.trim()}
                    style={primaryBtn}
                  >
                    {sending ? "Sending…" : "Send"}
                  </button>
                </div>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

const inputStyle = {
  flex: 1,
  minWidth: "180px",
  padding: "0.5rem 0.7rem",
  background: "#09090b",
  color: "#e4e4e7",
  border: "1px solid #3f3f46",
  borderRadius: "8px",
};

const primaryBtn = {
  padding: "0.5rem 1rem",
  background: "#2563eb",
  color: "white",
  border: "none",
  borderRadius: "8px",
  cursor: "pointer",
};

const secondaryBtn = {
  fontSize: "0.85rem",
  padding: "0.35rem 0.7rem",
  background: "#18181b",
  color: "#e4e4e7",
  border: "1px solid #3f3f46",
  borderRadius: "6px",
  cursor: "pointer",
};
