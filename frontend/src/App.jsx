import React, { useState, useEffect } from "react";
import { AuthClient } from "@dfinity/auth-client";
import PostForm from "./PostForm";
import Feed from "./Feed";
import Subscribe from "./Subscribe";
import Profile from "./Profile";
import TokenBalance from "./TokenBalance";
import UserProfileView from "./UserProfileView";
import Messaging from "./Messaging";

export default function App() {
  const [authClient, setAuthClient] = useState(null);
  const [identity, setIdentity] = useState(null);
  const [actor, setActor] = useState(null); // main ScaleSpace canister
  const [messagingActor, setMessagingActor] = useState(null); // messaging canister
  const [view, setView] = useState("feed"); // "feed" | "subscribe" | "profile" | "user" | "messages"
  const [viewingPrincipal, setViewingPrincipal] = useState(null);

  useEffect(() => {
    AuthClient.create().then(async (client) => {
      setAuthClient(client);
      if (await client.isAuthenticated()) {
        const id = client.getIdentity();
        setIdentity(id);
        // TODO: create real actors with canister IDs
        // setActor(createActor(mainCanisterId, { agentOptions: { identity: id } }));
        // setMessagingActor(createMessagingActor(messagingCanisterId, { agentOptions: { identity: id } }));
      }
    });
  }, []);

  const login = async () => {
    await authClient.login({
      identityProvider: "https://identity.ic0.app",
      onSuccess: async () => {
        const id = authClient.getIdentity();
        setIdentity(id);
      },
    });
  };

  const logout = async () => {
    await authClient.logout();
    setIdentity(null);
    setActor(null);
    setMessagingActor(null);
    setView("feed");
    setViewingPrincipal(null);
  };

  const openUserProfile = (principal) => {
    setViewingPrincipal(principal);
    setView("user");
  };

  const goFeed = () => {
    setView("feed");
    setViewingPrincipal(null);
  };

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
            ScaleSpace
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
            </div>
          )}
        </header>

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
              Login with Internet Identity
            </button>
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
              onPostCreated={() => window.location.reload()}
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
