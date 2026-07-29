# ScaleSpace

Decentralized interest-based community platform on the Internet Computer Protocol (ICP).

## Features (current)

### Backend (Motoko)
- Free tier: 20 posts per month
- Daily rate limit: 5 posts per day
- Paid tiers: 200 / 400 / 600 tokens
- 5 tokens per post (after free tier)
- Love button: costs 2 tokens (1 burns, 1 tips the post creator)
- Like button: free
- Comments
- User profiles (username, bio, avatar URL)
- Follow system
- Simple keyword search index
- Posts can include **one optional image** (URL stored on-chain, file stored off-chain)

### Frontend
- React + Vite skeleton
- Internet Identity login ready
- PostForm component with single-image upload support
- Image upload target: **Cloudflare R2** (easy to switch to Arweave later)

## Project structure
```
backend/
  main.mo          ← full Motoko canister
frontend/
  src/
    App.jsx
    PostForm.jsx   ← handles text + one image
  package.json
  README.md        ← Cloudflare R2 setup instructions
```

## Next steps
1. Wire the real canister ID and actor creation in `App.jsx`
2. Replace the placeholder `uploadToR2` function with real Cloudflare R2 upload logic
3. Add a feed that shows posts + images
4. Deploy backend with `dfx` / `icp-cli`
