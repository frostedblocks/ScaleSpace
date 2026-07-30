# ScaleSpace

Decentralized social platform on the **Internet Computer**.

## Test on Ubuntu (local ICP replica)

### 1. Install tools (once)

```bash
# Node.js 20+
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# DFX (Internet Computer SDK)
sh -ci "$(curl -fsSL https://internetcomputer.org/install.sh)"
# then restart the terminal, or:
source "$HOME/.local/share/dfx/env"
```

### 2. Clone and enter the project

```bash
git clone https://github.com/frostedblocks/ScaleSpace.git
cd ScaleSpace
```

### 3. Start local replica + deploy canisters

```bash
dfx start --background
dfx deploy scalespace
dfx deploy messaging
# or simply:
dfx deploy
```

This builds Motoko, installs canisters, and generates JS declarations under `frontend/src/declarations/`.

### 4. Run the frontend

```bash
cd frontend
npm install
npm run dev
```

Open the URL Vite prints (usually `http://localhost:3000`).

Login with **Internet Identity** → claim master profile on the Profile page.

### 5. Useful commands

```bash
# Canister IDs
dfx canister id scalespace
dfx canister id messaging

# Rebuild after Motoko changes
dfx deploy scalespace

# Stop local network
dfx stop
```

## Deploy to mainnet (IC)

```bash
# Needs cycles on your identity
dfx identity use <your-identity>
dfx deploy scalespace --network ic
dfx deploy messaging --network ic
cd frontend && npm run build
dfx deploy assets --network ic
```

Set `DFX_NETWORK=ic` when building the frontend for mainnet.

## Project layout

```
backend/main.mo      → scalespace canister (posts, tokens, master tools)
messaging/main.mo    → messaging canister
frontend/            → React + Vite UI
dfx.json             → canister config
```

## Notes

- **Payments** start in test mode (free token subscribe). Enable live ICP pricing from Master controls when ready.
- Image upload is deferred; avatar/image fields accept URLs only for now.
- Master profile: first logged-in user can **Claim Master Profile** on the Profile page.
