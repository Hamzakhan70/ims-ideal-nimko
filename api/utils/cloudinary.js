import {v2 as cloudinary} from 'cloudinary';
import multer from 'multer';

// Track if Cloudinary has been configured
let isConfigured = false;

// Lazy configuration function - called when needed, not at module load
const ensureCloudinaryConfigured = () => {
    if (isConfigured) {
        return true;
    }

    const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
    const apiKey = process.env.CLOUDINARY_API_KEY;
    const apiSecret = process.env.CLOUDINARY_API_SECRET;

    if (! cloudName || ! apiKey || ! apiSecret) {
        console.error('❌ Cloudinary configuration missing!');
        console.error('Required environment variables:');
        console.error('  - CLOUDINARY_CLOUD_NAME:', cloudName ? '✓' : '✗ Missing');
        console.error('  - CLOUDINARY_API_KEY:', apiKey ? '✓' : '✗ Missing');
        console.error('  - CLOUDINARY_API_SECRET:', apiSecret ? '✓' : '✗ Missing');
        console.error('\nPlease add these to your .env file or environment variables.');
        return false;
    }

    // Configure Cloudinary with correct property names (snake_case)
    cloudinary.config({
        cloud_name: cloudName, api_key: apiKey, // Note: snake_case, not camelCase
        api_secret: apiSecret // Note: snake_case, not camelCase
    });

    isConfigured = true;
    return true;
};

// File filter
const fileFilter = (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
        cb(null, true);
    } else {
        cb(new Error('Only image files are allowed!'), false);
    }
};

// Create multer upload instance with memory storage
const upload = multer({
    storage: multer.memoryStorage(),
    fileFilter: fileFilter,
    limits: {
        fileSize: 50 * 1024 * 1024 // 50MB limit
    }
});

// Middleware to upload to Cloudinary after Multer processes the file
export const uploadToCloudinary = async (req, res, next) => {
    if (!req.files && !req.file) {
        return next();
    }

    // Ensure Cloudinary is configured before attempting upload
    if (! ensureCloudinaryConfigured()) {
        console.error('Cloudinary not configured - missing environment variables');
        return res.status(500).json({error: 'Cloudinary not configured. Please set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET in your .env file.'});
    }

    try {
        const files = req.files || [req.file];
        const uploadPromises = files.map(file => {
            return new Promise((resolve, reject) => {
                if (!file.buffer) {
                    return reject(new Error('File buffer is missing'));
                }

                const uploadOptions = {
                    folder: 'ideal-nimko/products',
                    allowed_formats: [
                        'jpg', 'jpeg', 'png', 'webp'
                    ],
                    transformation: [
                        {
                            width: 800,
                            height: 800,
                            crop: 'limit'
                        }, {
                            quality: 'auto'
                        }, {
                            fetch_format: 'auto'
                        }
                    ]
                };

                const uploadStream = cloudinary.uploader.upload_stream(uploadOptions, (error, result) => {
                    if (error) {
                        console.error('Cloudinary upload stream error:', error);
                        reject(error);
                    } else {
                        resolve({
                            path: result.secure_url,
                            secure_url: result.secure_url,
                            public_id: result.public_id,
                            format: result.format,
                            bytes: result.bytes
                        });
                    }
                });

                uploadStream.end(file.buffer);
            });
        });

        const uploadedFiles = await Promise.all(uploadPromises);

        if (req.files) {
            req.files = uploadedFiles;
        } else {
            req.file = uploadedFiles[0];
        }

        next();
    } catch (error) {
        console.error('Cloudinary upload error:', error);
        console.error('Error details:', {
            message: error.message,
            http_code: error.http_code,
            name: error.name
        });

        let errorMessage = 'Failed to upload image to Cloudinary';
        if (error.message) {
            errorMessage += `: ${
                error.message
            }`;
        }
        if (error.http_code === 401) {
            errorMessage = 'Invalid Cloudinary API credentials. Please check your CLOUDINARY_API_KEY and CLOUDINARY_API_SECRET.';
        }

        res.status(500).json({error: errorMessage});
    }
};

// Helper function to delete image from Cloudinary
export const deleteImage = async (imageUrl) => { // Ensure Cloudinary is configured
    if (! ensureCloudinaryConfigured()) {
        throw new Error('Cloudinary not configured');
    }

    try { // Extract public_id from Cloudinary URL
        const urlParts = imageUrl.split('/upload/');
        if (urlParts.length < 2) {
            return;
        }

        const pathAfterUpload = urlParts[1];
        // Remove version prefix (v1234567890/) and file extension
        const publicId = pathAfterUpload.replace(/^v\d+\//, '').replace(/\.[^.]*$/, '');

        const result = await cloudinary.uploader.destroy(publicId);
        return result;
    } catch (error) {
        console.error('Error deleting image from Cloudinary:', error);
        throw error;
    }
};

export default upload;
export {
    cloudinary
};
