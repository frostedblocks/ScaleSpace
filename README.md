# ScaleSpace

Decentralized interest-based community platform on the Internet Computer Protocol (ICP).

## Current Features

### Backend (Motoko)
- Free tier: 20 posts per month
- Daily rate limit: 5 posts per day
- Paid tiers: 200 / 400 / 600 tokens
- 5 tokens per post (after free tier)
- Love button: 2 tokens (1 burns, 1 tips the creator)
- Like button: free
- Comments
- User profiles (username, bio, avatar URL)
- Follow system
- Keyword search
- Report system (post is hidden after 5 unique reports)
- Posts support one optional image (URL only – stored off-chain)

### Frontend
- Internet Identity login
- Post form with hybrid image support (paste URL **or** upload to Cloudflare R2)
- Feed that shows recent posts
- Post cards with Like, Love, and Report buttons

## Project Structure
```
backend/
  main.mo
frontend/
  src/
    App.jsx          ← main app (login + form + feed)
    PostForm.jsx     ← create post + image
    Feed.jsx         ← loads and displays posts
    PostCard.jsx     ← single post with actions
    ReportButton.jsx ← report a post
  package.json
  README.md
```

## Next Steps
1. Create the real actor connection (canister ID + agent)
2. Replace the placeholder R2 upload with real Cloudflare credentials
3. Deploy the backend canister
4. Add comments UI and profile pages
