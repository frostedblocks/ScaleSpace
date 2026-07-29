import React, { useState, useEffect } from "react";
import { AuthClient } from "@dfinity/auth-client";
import PostForm from "./PostForm";

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
        // TODO: create actor with the identity and canister ID
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
        // TODO: create actor here too
      },
    });
  };

  return (
    <div style={{ maxWidth: "600px", margin: "2rem auto", fontFamily: "system-ui" }}>
      <h1>ScaleSpace</h1>

      {!identity ? (
        <button onClick={login}>Login with Internet Identity</button>
      ) : (
        <>
          <p>Logged in as {identity.getPrincipal().toText()}</p>
          {/* Pass the real actor once you wire the canister */}
          <PostForm actor={actor} onPostCreated={() => window.location.reload()} />
        </>
      )}
    </div>
  );
}
