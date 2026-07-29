# ScaleSpace Frontend

## Image handling (hybrid)

Users can add **one image** to a post in two ways:

1. **Paste their own public image URL**  
   (IPFS, Arweave, personal Cloudflare R2, Google Drive public link, Imgur, etc.)

2. **Upload a file** to ScaleSpace’s Cloudflare R2 bucket (more reliable)

The backend only stores the final URL string — it never stores the image data itself.

### Cloudflare R2 setup (for the upload option)
1. Create an R2 bucket.
2. Make it publicly readable (or use a custom domain).
3. Create an API token with Object Read & Write.
4. Add these to a `.env` file (never commit secrets):

```
VITE_R2_ACCOUNT_ID=...
VITE_R2_ACCESS_KEY_ID=...
VITE_R2_SECRET_ACCESS_KEY=...
VITE_R2_BUCKET=scalespace-images
VITE_R2_PUBLIC_URL=https://pub-xxxxx.r2.dev
```

Then replace the placeholder `uploadToR2` function in `src/PostForm.jsx` with real upload logic (signed URL is recommended).

You can later switch the upload destination to Arweave without changing the backend.
