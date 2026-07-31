# I.C.E.

Decentralized social platform on the **Internet Computer**.

*(Repo folder may still be named ScaleSpace — product name is **I.C.E.**)*

## Test on Ubuntu (local ICP replica)

### 1. Install tools (once)

```bash
# Node.js 20+
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# DFX (Internet Computer SDK)
sh -ci "$(curl -fsSL https://internetcomputer.org/install.sh)"
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
dfx canister id scalespace
dfx canister id messaging
dfx deploy scalespace
dfx stop
```

## Deploy to mainnet (IC)

```bash
dfx identity use <your-identity>
dfx deploy scalespace --network ic
dfx deploy messaging --network ic
cd frontend && npm run build
dfx deploy assets --network ic
```

## Project layout

```
backend/main.mo      → main social canister
messaging/main.mo    → messaging canister
frontend/            → React + Vite UI (branded I.C.E.)
dfx.json             → canister config
```
