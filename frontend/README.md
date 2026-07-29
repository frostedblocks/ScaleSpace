# ScaleSpace Frontend

## Image Upload (Cloudflare R2)

Images are uploaded **off-chain** to Cloudflare R2 to keep cycle costs low.

### How it works
1. User selects one image in the post form.
2. Frontend uploads the file to your Cloudflare R2 bucket.
3. Frontend receives the public URL of the image.
4. Frontend calls the ICP backend `makePost(content, imageURL)` with that URL.

### Setup Cloudflare R2
1. Go to Cloudflare Dashboard → R2.
2. Create a bucket (example name: `scalespace-images`).
3. Make the bucket public or set up a custom domain / public access.
4. Create an API token with Object Read & Write permissions.
5. Put these values in a `.env` file (never commit secrets):

```
VITE_R2_ACCOUNT_ID=your_account_id
VITE_R2_ACCESS_KEY_ID=your_access_key
VITE_R2_SECRET_ACCESS_KEY=your_secret
VITE_R2_BUCKET=scalespace-images
VITE_R2_PUBLIC_URL=https://your-public-r2-url.com
```

Later you can switch the upload destination to Arweave without changing the backend (the backend only stores the final URL).

## Running locally
```bash
npm install
npm run dev
```
