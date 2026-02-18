// server/server.js
import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import dotenv from "dotenv";
import {fileURLToPath} from 'url';
import {dirname, join} from 'path';
import productRoutes from "./routes/productRoutes.js";
import orderRoutes from "./routes/orderRoutes.js";
import adminRoutes from "./routes/adminRoutes.js";
import userRoutes from "./routes/userRoutes.js";
import distributionRoutes from "./routes/distributionRoutes.js";
import salesRoutes from "./routes/salesRoutes.js";
import shopkeeperOrderRoutes from "./routes/shopkeeperOrderRoutes.js";
import shopkeeperRoutes from "./routes/shopkeeperRoutes.js";
import assignmentRoutes from "./routes/assignmentRoutes.js";
import categoryRoutes from "./routes/categoryRoutes.js";
import recoveryRoutes from "./routes/recoveryRoutes.js";
import receiptRoutes from "./routes/receiptRoutes.js";
import analyticsRoutes from "./routes/analyticsRoutes.js";
import notificationRoutes from "./routes/notificationRoutes.js";
import cityRoutes from "./routes/cityRoutes.js";

// Load environment variables first
// Use explicit path to ensure .env is loaded from the api directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({
    path: join(__dirname, '.env')
});

// Verify critical environment variables are loaded
console.log('Environment check:');
console.log('  - CLOUDINARY_CLOUD_NAME:', process.env.CLOUDINARY_CLOUD_NAME ? '✓ Loaded' : '✗ Missing');
console.log('  - CLOUDINARY_API_KEY:', process.env.CLOUDINARY_API_KEY ? '✓ Loaded' : '✗ Missing');
console.log('  - CLOUDINARY_API_SECRET:', process.env.CLOUDINARY_API_SECRET ? '✓ Loaded' : '✗ Missing');

const app = express();

// Middleware
const corsOptions = {
    origin: function (origin, callback) { // Allow requests with no origin (like mobile apps or curl requests)
        if (! origin) 
            return callback(null, true);
        
        const allowedOrigins = [
            process.env.CORS_ORIGIN || "http://localhost:5173",
            "https://ideal-nimko.netlify.app", // Your Netlify URL
            "https://68f2494dc675e44367bd2ced--ideal-nimko.netlify.app", // Your Netlify preview URL
            "http://localhost:3000",
            "http://localhost:5173",
            "https://ideal-nimko-web.vercel.app" // <-- Added Vercel custom domain
        ];
        if (allowedOrigins.indexOf(origin) !== -1) {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true,
    methods: [
        'GET',
        'POST',
        'PUT',
        'DELETE',
        'OPTIONS',
        'PATCH'
    ],
    allowedHeaders: [
        'Content-Type', 'Authorization', 'X-Requested-With'
    ],
    exposedHeaders: ['Authorization']
};

app.use(cors(corsOptions));
app.use(express.json({limit: '50mb'}));
app.use(express.urlencoded({extended: true, limit: '50mb'}));

// Serve static files from uploads directory
app.use('/uploads', express.static('uploads'));

// Routes
app.use("/api/products", productRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/users", userRoutes);
app.use("/api/distribution", distributionRoutes);
app.use("/api/sales", salesRoutes);
app.use("/api/shopkeeper-orders", shopkeeperOrderRoutes);
app.use("/api/shopkeepers", shopkeeperRoutes);
app.use("/api/assignments", assignmentRoutes);
app.use("/api/categories", categoryRoutes);
app.use("/api/recoveries", recoveryRoutes);
app.use("/api/receipts", receiptRoutes);
app.use("/api/analytics", analyticsRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/cities", cityRoutes);

// Health check endpoint
app.get("/api/health", (req, res) => {
    res.json({status: "OK", timestamp: new Date().toISOString()});
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({error: 'Something went wrong!'});
});

// 404 handler
app.use('*', (req, res) => {
    res.status(404).json({error: 'Route not found'});
});

mongoose.connect(process.env.MONGO_URI ).then(() => console.log("MongoDB connected")).catch(err => console.error(err));

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
