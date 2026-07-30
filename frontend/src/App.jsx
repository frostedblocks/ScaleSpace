import React, { useState, useEffect } from "react";
import { AuthClient } from "@dfinity/auth-client";
import PostForm from "./PostForm";
import Feed from "./Feed";
import Subscribe from "./Subscribe";
import Profile from "./Profile";
import TokenBalance from "./TokenBalance";

export default function App() {
  const [authClient, setAuthClient] = useState(null);
  const [identity, setIdentity] = useState(null);
  const [actor, setActor] = useState(null);
  const [view, setView] = useState("feed"); // "feed" | "subscribe" | "profile"

  useEffect(() => {
    AuthClient.create().then(async (client) => {
      setAuthClient(client);
      if (await client.isAuthenticated()) {
        const id = client.getIdentity();
        setIdentity(id);
        // TODO: create the real actor here with your canister ID
        // setActor(createActor(canisterId, { agentOptions: { identity: id } }));
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
    setView("feed");
  };

  return (
    <div style={{ maxWidth: "640px", margin: "2rem auto", fontFamily: "system-ui", padding: "0 1rem" }}>
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem", flexWrap: "wrap", gap: "0.75rem" }}>
        <h1 style={{ margin: 0, cursor: "pointer" }} onClick={() => setView("feed")}>
          ScaleSpace
        </h1>

        {identity && (
          <div style={{ display: "flex", gap: "0.6rem", alignItems: "center", flexWrap: "wrap" }}>
            <TokenBalance actor={actor} principal={identity.getPrincipal()} />

            <button onClick={() => setView("profile")} style={{ fontSize: "0.85rem" }}>
              Profile
            </button>
            <button
              onClick={() => setView(view === "subscribe" ? "feed" : "subscribe")}
              style={{ fontSize: "0.85rem" }}
            >
              {view === "subscribe" ? "Back" : "Get Tokens"}
            </button>
            <button onClick={logout} style={{ fontSize: "0.85rem" }}>
              Logout
            </button>
          </div>
        )}
      </header>

      {!identity ? (
        <div style={{ textAlign: "center", marginTop: "3rem" }}>
          <p>A quieter place for real conversation.</p>
          <button onClick={login} style={{ padding: "0.6rem 1.4rem", fontSize: "1rem" }}>
            Login with Internet Identity
          </button>
        </div>
      ) : view === "subscribe" ? (
        <Subscribe actor={actor} />
      ) : view === "profile" ? (
        <Profile actor={actor} identity={identity} />
      ) : (
        <>
          <PostForm
            actor={actor}
            onPostCreated={() => window.location.reload()}
          />

          <hr style={{ margin: "2rem 0", border: "none", borderTop: "1px solid #eee" }} />

          <Feed
            actor={actor}
            currentUserPrincipal={identity.getPrincipal()}
          />
        </>
      )}
    </div>
  );
}
