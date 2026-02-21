// server/routes/productRoutes.js
import express from "express";
import Product from "../models/project.js";
import {authenticateToken} from "../middleware/auth.js";
import upload, {uploadToCloudinary, cloudinary} from "../utils/cloudinary.js";
const router = express.Router();

// Public routes
// Get all products
router.get("/", async (req, res) => {
    try {
        const {
            category,
            featured,
            page = 1,
            limit = 10,
            search
        } = req.query;
        let query = {};

        if (category) {
            query.category = category;
        }

        if (featured === 'true') {
            query.featured = true;
        }

        if (search) {
            query.$or = [
                {
                    name: {
                        $regex: search,
                        $options: 'i'
                    }
                }, {
                    description: {
                        $regex: search,
                        $options: 'i'
                    }
                }
            ];
        }

        const skip = (page - 1) * limit;
        const products = await Product.find(query).sort({createdAt: -1}).skip(skip).limit(parseInt(limit));

        const total = await Product.countDocuments(query);

        res.json({
            products,
            pagination: {
                current: parseInt(page),
                pages: Math.ceil(total / limit),
                total
            }
        });
    } catch (error) {
        res.status(500).json({error: error.message});
    }
});

// Get single product
router.get("/:id", async (req, res) => {
    try {
        const product = await Product.findById(req.params.id);
        if (! product) {
            return res.status(404).json({error: "Product not found"});
        }
        res.json(product);
    } catch (error) {
        res.status(500).json({error: error.message});
    }
});

// Get categories
router.get("/categories/list", async (req, res) => {
    try {
        const categories = await Product.distinct("category");
        res.json(categories);
    } catch (error) {
        res.status(500).json({error: error.message});
    }
});

// Admin routes (protected)
// Create product
router.post("/", authenticateToken, async (req, res) => {
    try {
        const product = new Product(req.body);
        await product.save();
        res.status(201).json({success: true, message: "Product created successfully", product});
    } catch (error) {
        res.status(400).json({error: error.message});
    }
});

// Update product
router.put("/:id", authenticateToken, async (req, res) => {
    try {
        const product = await Product.findByIdAndUpdate(req.params.id, req.body, {
            new: true,
            runValidators: true
        });

        if (! product) {
            return res.status(404).json({error: "Product not found"});
        }

        res.json({success: true, message: "Product updated successfully", product});
    } catch (error) {
        res.status(400).json({error: error.message});
    }
});

// Update product stock (reduce by quantity sold)
router.put("/:id/stock", authenticateToken, async (req, res) => {
    try {
        const {quantitySold} = req.body;

        if (!quantitySold || quantitySold <= 0) {
            return res.status(400).json({error: "Valid quantity sold is required"});
        }

        const product = await Product.findById(req.params.id);
        if (! product) {
            return res.status(404).json({error: "Product not found"});
        }

        if (product.stock < quantitySold) {
            return res.status(400).json({
                    error: `Insufficient stock. Available: ${
                    product.stock
                }, Requested: ${quantitySold}`
            });
        }

        product.stock -= quantitySold;
        await product.save();

        res.json({
            success: true,
            message: "Product stock updated successfully",
            product: {
                id: product._id,
                name: product.name,
                stock: product.stock
            }
        });
    } catch (error) {
        res.status(400).json({error: error.message});
    }
});

// Delete product
router.delete("/:id", authenticateToken, async (req, res) => {
    try {
        const product = await Product.findByIdAndDelete(req.params.id);

        if (! product) {
            return res.status(404).json({error: "Product not found"});
        }

        res.json({success: true, message: "Product deleted successfully"});
    } catch (error) {
        res.status(500).json({error: error.message});
    }
});

// Bulk delete products
router.delete("/", authenticateToken, async (req, res) => {
    try {
        const {productIds} = req.body;

        if (!Array.isArray(productIds) || productIds.length === 0) {
            return res.status(400).json({error: "Product IDs array is required"});
        }

        const result = await Product.deleteMany({
            _id: {
                $in: productIds
            }
        });

        res.json({
                success: true, message: `${
                result.deletedCount
            } products deleted successfully`
        });
    } catch (error) {
        res.status(500).json({error: error.message});
    }
});

// Upload product images
router.post("/upload-images", authenticateToken, upload.array('images', 5), uploadToCloudinary, async (req, res) => {
    try {
        if (!req.files || req.files.length === 0) {
            return res.status(400).json({error: 'No files uploaded'});
        }

        // Cloudinary returns secure_url in the file object
        const imageUrls = req.files.map(file => file.path || file.secure_url);

        res.json({success: true, message: 'Images uploaded successfully', imageUrls});
    } catch (error) {
        console.error('Error uploading images:', error);
        res.status(500).json({error: error.message});
    }
});

// Upload single product image
router.post("/upload-image", authenticateToken, upload.single('image'), uploadToCloudinary, async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({error: 'No file uploaded'});
        }

        // Cloudinary returns secure_url in the file object
        const imageUrl = req.file.path || req.file.secure_url;

        res.json({success: true, message: 'Image uploaded successfully', imageUrl});
    } catch (error) {
        console.error('Error uploading image:', error);
        res.status(500).json({error: error.message});
    }
});

// Test Cloudinary configuration endpoint (for debugging)
router.get("/test-cloudinary", authenticateToken, async (req, res) => {
    try {
        const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
        const apiKey = process.env.CLOUDINARY_API_KEY;
        const apiSecret = process.env.CLOUDINARY_API_SECRET;

        const config = {
            cloud_name: cloudName ? '✓ Set' : '✗ Missing',
            api_key: apiKey ? '✓ Set' : '✗ Missing',
            api_secret: apiSecret ? '✓ Set' : '✗ Missing'
        };

        // Try to ping Cloudinary
        let pingResult = null;
        if (cloudName && apiKey && apiSecret) {
            try {
                const result = await cloudinary.api.ping();
                pingResult = {
                    success: true,
                    message: 'Cloudinary connection successful',
                    result
                };
            } catch (pingError) {
                pingResult = {
                    success: false,
                    error: pingError.message
                };
            }
        }

        res.json({
            configuration: config,
            ping: pingResult,
            message: pingResult ?. success ? 'Cloudinary is configured and working!' : 'Cloudinary configuration issue detected'
        });
    } catch (error) {
        res.status(500).json({error: error.message});
    }
});

export default router;
