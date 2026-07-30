import { HttpAgent } from "@dfinity/agent";

/**
 * Build authenticated actors after dfx deploy.
 * Requires:
 *   1. dfx deploy (generates declarations + canister IDs)
 *   2. Vite picks up IDs from .dfx or .env.local
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

  // Local replica needs the root key
  const network = import.meta.env.DFX_NETWORK || import.meta.env.VITE_DFX_NETWORK || "local";
  if (network !== "ic") {
    await agent.fetchRootKey();
  }

  return agent;
}

export async function createScaleSpaceActor(identity) {
  const canisterId = import.meta.env.VITE_CANISTER_ID_SCALESPACE;
  if (!canisterId) {
    throw new Error(
      "Missing VITE_CANISTER_ID_SCALESPACE. Run: dfx deploy  (from project root)"
    );
  }

  let createActor;
  try {
    const mod = await import("./declarations/scalespace/index.js");
    createActor = mod.createActor;
  } catch (e) {
    throw new Error(
      "Declarations not found. From project root run: dfx generate scalespace"
    );
  }

  const agent = await makeAgent(identity);
  return createActor(canisterId, { agent });
}

export async function createMessagingActor(identity) {
  const canisterId = import.meta.env.VITE_CANISTER_ID_MESSAGING;
  if (!canisterId) {
    throw new Error(
      "Missing VITE_CANISTER_ID_MESSAGING. Run: dfx deploy  (from project root)"
    );
  }

  let createActor;
  try {
    const mod = await import("./declarations/messaging/index.js");
    createActor = mod.createActor;
  } catch (e) {
    throw new Error(
      "Declarations not found. From project root run: dfx generate messaging"
    );
  }

  const agent = await makeAgent(identity);
  return createActor(canisterId, { agent });
}
