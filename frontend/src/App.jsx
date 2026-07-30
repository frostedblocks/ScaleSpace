import React, { useState, useEffect } from "react";
import { AuthClient } from "@dfinity/auth-client";
import PostForm from "./PostForm";
import Feed from "./Feed";

export default function App() {
  const [authClient, setAuthClient] = useState(null);
  const [identity, setIdentity] = useState(null);
  const [actor, setActor] = useState(null);

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
        // TODO: create the real actor here too
      },
    });
  };

  const logout = async () => {
    await authClient.logout();
    setIdentity(null);
    setActor(null);
  };

  return (
    <div style={{ maxWidth: "640px", margin: "2rem auto", fontFamily: "system-ui", padding: "0 1rem" }}>
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
        <h1 style={{ margin: 0 }}>ScaleSpace</h1>
        {identity && (
          <button onClick={logout} style={{ fontSize: "0.85rem" }}>
            Logout
          </button>
        )}
      </header>

      {!identity ? (
        <div style={{ textAlign: "center", marginTop: "3rem" }}>
          <p>A quieter place for real conversation.</p>
          <button onClick={login} style={{ padding: "0.6rem 1.4rem", fontSize: "1rem" }}>
            Login with Internet Identity
          </button>
        </div>
      ) : (
        <>
          <p style={{ fontSize: "0.85rem", color: "#666" }}>
            Logged in as {identity.getPrincipal().toText().slice(0, 12)}…
          </p>

          {/* Post form */}
          <PostForm
            actor={actor}
            onPostCreated={() => {
              // simple way to refresh the feed after posting
              window.location.reload();
            }}
          />

          <hr style={{ margin: "2rem 0", border: "none", borderTop: "1px solid #eee" }} />

          {/* Feed */}
          <Feed actor={actor} />
        </>
      )}
    </div>
  );
}
