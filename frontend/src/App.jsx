import React, { useState, useEffect } from "react";
import { AuthClient } from "@dfinity/auth-client";
import { Ed25519KeyIdentity } from "@dfinity/identity";
import { createIceActor, createMessagingActor } from "./actors";
import PostForm from "./PostForm";
import Feed from "./Feed";
import Subscribe from "./Subscribe";
import Profile from "./Profile";
import TokenBalance from "./TokenBalance";
import UserProfileView from "./UserProfileView";
import Messaging from "./Messaging";

const LOCAL_ID_KEY = "ice-local-ed25519-identity";
const isLocalNetwork = () => (import.meta.env.DFX_NETWORK || "local") !== "ic";

function loadOrCreateLocalIdentity() {
  const stored = localStorage.getItem(LOCAL_ID_KEY);
  if (stored) {
    try {
      return Ed25519KeyIdentity.fromJSON(stored);
    } catch {
      localStorage.removeItem(LOCAL_ID_KEY);
    }
  }
  const identity = Ed25519KeyIdentity.generate();
  localStorage.setItem(LOCAL_ID_KEY, JSON.stringify(identity.toJSON()));
  return identity;
}

export default function App() {
  const [authClient, setAuthClient] = useState(null);
  const [identity, setIdentity] = useState(null);
  const [actor, setActor] = useState(null);
  const [messagingActor, setMessagingActor] = useState(null);
  const [view, setView] = useState("feed");
  const [viewingPrincipal, setViewingPrincipal] = useState(null);
  const [bootError, setBootError] = useState("");
  const [booting, setBooting] = useState(true);

  const connectActors = async (id) => {
    setBootError("");
    try {
      const [main, msg] = await Promise.all([
        createIceActor(id),
        createMessagingActor(id),
      ]);
      setActor(main);
      setMessagingActor(msg);
    } catch (err) {
      console.error(err);
      setBootError(err.message || "Could not connect to canisters.");
      setActor(null);
      setMessagingActor(null);
    }
  };

  useEffect(() => {
    (async () => {
      // Local: restore browser key identity (no Internet Identity needed)
      if (isLocalNetwork()) {
        const stored = localStorage.getItem(LOCAL_ID_KEY);
        if (stored) {
          try {
            const id = Ed25519KeyIdentity.fromJSON(stored);
            setIdentity(id);
            await connectActors(id);
          } catch {
            localStorage.removeItem(LOCAL_ID_KEY);
          }
        }
        setBooting(false);
        return;
      }

      // Mainnet: Internet Identity via AuthClient
      const client = await AuthClient.create();
      setAuthClient(client);
      if (await client.isAuthenticated()) {
        const id = client.getIdentity();
        setIdentity(id);
        await connectActors(id);
      }
      setBooting(false);
    })();
  }, []);

  const loginLocal = async () => {
    const id = loadOrCreateLocalIdentity();
    setIdentity(id);
    await connectActors(id);
  };

  const login = async () => {
    if (isLocalNetwork()) {
      await loginLocal();
      return;
    }

    if (!authClient) return;

    await authClient.login({
      identityProvider: "https://identity.ic0.app",
      onSuccess: async () => {
        const id = authClient.getIdentity();
        setIdentity(id);
        await connectActors(id);
      },
    });
  };

  const logout = async () => {
    if (isLocalNetwork()) {
      // Keep the same principal across sessions for local testing unless user clears storage.
      // To get a brand-new local identity, remove LOCAL_ID_KEY.
    } else if (authClient) {
      await authClient.logout();
    }
    setIdentity(null);
    setActor(null);
    setMessagingActor(null);
    setView("feed");
    setViewingPrincipal(null);
  };

  const resetLocalIdentity = async () => {
    localStorage.removeItem(LOCAL_ID_KEY);
    setIdentity(null);
    setActor(null);
    setMessagingActor(null);
    setView("feed");
  };

  const openUserProfile = (principal) => {
    setViewingPrincipal(principal);
    setView("user");
  };

  const goFeed = () => {
    setView("feed");
    setViewingPrincipal(null);
  };

  if (booting) {
    return (
      <div style={{ minHeight: "100vh", background: "#0f0f11", color: "#a1a1aa", padding: "3rem", textAlign: "center" }}>
        Starting I.C.E.…
      </div>
    );
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#0f0f11",
        color: "#e4e4e7",
        fontFamily: "system-ui, -apple-system, sans-serif",
        padding: "0 1rem",
      }}
    >
      <div style={{ maxWidth: "640px", margin: "0 auto", paddingTop: "1.5rem", paddingBottom: "3rem" }}>
        <header
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "1.75rem",
            flexWrap: "wrap",
            gap: "0.75rem",
          }}
        >
          <h1
            style={{ margin: 0, cursor: "pointer", fontSize: "1.5rem", fontWeight: 700, color: "#fafafa" }}
            onClick={goFeed}
          >
            I.C.E.
          </h1>

          {identity && (
            <div style={{ display: "flex", gap: "0.5rem", alignItems: "center", flexWrap: "wrap" }}>
              <TokenBalance actor={actor} principal={identity.getPrincipal()} />

              <button onClick={() => setView("messages")} style={btnStyle}>
                Messages
              </button>
              <button onClick={() => setView("profile")} style={btnStyle}>
                Profile
              </button>
              <button
                onClick={() => setView(view === "subscribe" ? "feed" : "subscribe")}
                style={btnStyle}
              >
                {view === "subscribe" ? "Back" : "Get Tokens"}
              </button>
              <button onClick={logout} style={btnStyle}>
                Logout
              </button>
              {isLocalNetwork() && (
                <button onClick={resetLocalIdentity} style={btnStyle} title="Create a new local test identity">
                  New local ID
                </button>
              )}
            </div>
          )}
        </header>

        {bootError && (
          <div
            style={{
              background: "#450a0a",
              border: "1px solid #7f1d1d",
              color: "#fecaca",
              padding: "0.9rem 1rem",
              borderRadius: "8px",
              marginBottom: "1.25rem",
              fontSize: "0.9rem",
              lineHeight: 1.5,
            }}
          >
            <strong>Canister connection</strong>
            <div style={{ marginTop: "0.35rem" }}>{bootError}</div>
            <div style={{ marginTop: "0.5rem", color: "#fca5a5", fontSize: "0.8rem" }}>
              From the project root on Ubuntu: <code>dfx start --background && dfx deploy</code> then restart the frontend.
            </div>
          </div>
        )}

        {!identity ? (
          <div style={{ textAlign: "center", marginTop: "4rem" }}>
            <p style={{ color: "#a1a1aa", marginBottom: "1.5rem" }}>
              A quieter place for real conversation.
            </p>
            <button
              onClick={login}
              style={{
                padding: "0.7rem 1.6rem",
                fontSize: "1rem",
                background: "#2563eb",
                color: "white",
                border: "none",
                borderRadius: "8px",
                cursor: "pointer",
              }}
            >
              {isLocalNetwork() ? "Continue (local test login)" : "Login with Internet Identity"}
            </button>
            {isLocalNetwork() && (
              <p style={{ color: "#71717a", fontSize: "0.85rem", marginTop: "1rem", maxWidth: "28rem", marginLeft: "auto", marginRight: "auto" }}>
                Local mode uses a browser key (no Internet Identity popup). Safe for testing only.
              </p>
            )}
          </div>
        ) : view === "subscribe" ? (
          <Subscribe actor={actor} />
        ) : view === "profile" ? (
          <Profile actor={actor} identity={identity} />
        ) : view === "messages" ? (
          <Messaging
            mainActor={actor}
            messagingActor={messagingActor}
            identity={identity}
            onBack={goFeed}
          />
        ) : view === "user" && viewingPrincipal ? (
          <UserProfileView
            actor={actor}
            principal={viewingPrincipal}
            currentUserPrincipal={identity.getPrincipal()}
            onBack={goFeed}
          />
        ) : (
          <>
            <PostForm
              actor={actor}
              principal={identity.getPrincipal()}
              onPostCreated={() => {
                /* feed reloads on its own interval / refresh */
              }}
            />

            <hr style={{ margin: "2rem 0", border: "none", borderTop: "1px solid #27272a" }} />

            <Feed
              actor={actor}
              currentUserPrincipal={identity.getPrincipal()}
              onUserClick={openUserProfile}
            />
          </>
        )}
      </div>
    </div>
  );
}

const btnStyle = {
  fontSize: "0.85rem",
  padding: "0.35rem 0.7rem",
  background: "#18181b",
  color: "#e4e4e7",
  border: "1px solid #3f3f46",
  borderRadius: "6px",
  cursor: "pointer",
};
