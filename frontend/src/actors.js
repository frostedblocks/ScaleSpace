import { Actor, HttpAgent } from "@dfinity/agent";
import { idlFactory as iceIdl } from "./declarations/ice/ice.did.js";
import { idlFactory as messagingIdl } from "./declarations/messaging/messaging.did.js";

/**
 * Build authenticated actors after dfx deploy.
 * Uses .did.js IDL files directly (avoids dfx index.js process.env breakage in Vite).
 */

function getHost() {
  const network = import.meta.env.DFX_NETWORK || import.meta.env.VITE_DFX_NETWORK || "local";
  if (network === "ic") {
    return "https://icp-api.io";
  }
  return "http://127.0.0.1:4943";
}

async function makeAgent(identity) {
  const host = getHost();
  const agent = await HttpAgent.create({
    host,
    identity,
  });

  const network = import.meta.env.DFX_NETWORK || import.meta.env.VITE_DFX_NETWORK || "local";
  if (network !== "ic") {
    await agent.fetchRootKey();
  }

  return agent;
}

export async function createIceActor(identity) {
  const canisterId = import.meta.env.VITE_CANISTER_ID_ICE;
  if (!canisterId) {
    throw new Error(
      "Missing VITE_CANISTER_ID_ICE. Run: dfx deploy ice"
    );
  }
  const agent = await makeAgent(identity);
  return Actor.createActor(iceIdl, { agent, canisterId });
}

export async function createMessagingActor(identity) {
  const canisterId = import.meta.env.VITE_CANISTER_ID_MESSAGING;
  if (!canisterId) {
    throw new Error(
      "Missing VITE_CANISTER_ID_MESSAGING. Run: dfx deploy messaging"
    );
  }
  const agent = await makeAgent(identity);
  return Actor.createActor(messagingIdl, { agent, canisterId });
}
