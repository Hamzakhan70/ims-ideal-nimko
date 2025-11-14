# Cloudinary Setup Guide

## Why Cloudinary?

Cloudinary provides:
- **Free Tier**: 25 GB storage + 25 GB bandwidth/month (perfect for e-commerce)
- **Built-in CDN**: Fast image delivery worldwide
- **Auto-optimization**: Automatic image compression and format conversion (WebP)
- **Persistent Storage**: Images survive server restarts/deployments
- **Image Transformations**: Automatic resizing and optimization

## Setup Steps

### 1. Create Cloudinary Account

1. Go to [https://cloudinary.com/users/register/free](https://cloudinary.com/users/register/free)
2. Sign up for a free account (no credit card required)
3. Verify your email

### 2. Get Your Cloudinary Credentials

1. Log in to [Cloudinary Console](https://console.cloudinary.com/)
2. Go to **Dashboard**
3. Copy these values:
   - **Cloud Name** (e.g., `dxyz123abc`)
   - **API Key** (e.g., `123456789012345`)
   - **API Secret** (e.g., `abcdefghijklmnopqrstuvwxyz123456`)

### 3. Add Environment Variables

#### For Local Development:

1. Create/update `.env` file in the `api/` directory:
```env
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
```

#### For Railway (Production):

1. Go to your Railway project dashboard
2. Navigate to **Variables** tab
3. Add these environment variables:
   - `CLOUDINARY_CLOUD_NAME` = your cloud name
   - `CLOUDINARY_API_KEY` = your API key
   - `CLOUDINARY_API_SECRET` = your API secret

### 4. Install Dependencies

Run this command in the `api/` directory:
```bash
npm install
```

This will install the `cloudinary` package.

### 5. Test the Setup

1. Start your backend server:
```bash
cd api
npm run dev
```

2. Try uploading a product image through the admin panel
3. Check that the image URL returned is a Cloudinary URL (starts with `https://res.cloudinary.com/`)

## How It Works

1. **Upload Flow**:
   - User selects image in admin panel
   - Frontend sends image to `/api/products/upload-images`
   - Backend receives image via Multer (memory storage)
   - Image is uploaded to Cloudinary
   - Cloudinary returns a secure URL (e.g., `https://res.cloudinary.com/your-cloud/image/upload/v123/ideal-nimko/products/image.jpg`)
   - URL is saved to MongoDB

2. **Image Display**:
   - Products with Cloudinary URLs display directly (no base URL needed)
   - Old products with relative URLs (`/uploads/...`) still work (backward compatible)
   - Cloudinary CDN serves images fast worldwide

3. **Image Optimization**:
   - Images are automatically resized to max 800x800px
   - Quality is optimized automatically
   - Format is converted to WebP when supported by browser

## Benefits

✅ **No more lost images** - Images survive server restarts  
✅ **Faster loading** - CDN delivers images from edge locations  
✅ **Smaller file sizes** - Automatic compression saves bandwidth  
✅ **Mobile-friendly** - Optimized images load faster on mobile  
✅ **Free tier** - 25 GB is plenty for thousands of product images  

## Migration from Local Storage

Existing products with local URLs (`/uploads/...`) will continue to work, but:
- They won't benefit from CDN
- They may break after server restarts (if files are lost)

**To migrate existing products:**
1. Re-upload images for old products through the admin panel
2. Or write a migration script to upload existing images to Cloudinary

## Troubleshooting

### Images not uploading?
- Check that environment variables are set correctly
- Verify Cloudinary credentials in console
- Check server logs for error messages

### Images not displaying?
- Verify the image URL in database (should start with `https://res.cloudinary.com/`)
- Check browser console for CORS errors
- Ensure Cloudinary account is active

### Getting "Invalid API Key" error?
- Double-check your API key and secret in environment variables
- Make sure there are no extra spaces or quotes
- Verify credentials in Cloudinary console

## Support

- Cloudinary Documentation: [https://cloudinary.com/documentation](https://cloudinary.com/documentation)
- Cloudinary Support: [https://support.cloudinary.com](https://support.cloudinary.com)

