import './config/runtimeConfig.js';
import express from 'express';
import cors from 'cors';
import productRoutes from './routes/productRoutes.js';
import orderRoutes from './routes/orderRoutes.js';
import adminRoutes from './routes/adminRoutes.js';
import userRoutes from './routes/userRoutes.js';
import distributionRoutes from './routes/distributionRoutes.js';
import salesRoutes from './routes/salesRoutes.js';
import shopkeeperOrderRoutes from './routes/shopkeeperOrderRoutes.js';
import shopkeeperRoutes from './routes/shopkeeperRoutes.js';
import assignmentRoutes from './routes/assignmentRoutes.js';
import categoryRoutes from './routes/categoryRoutes.js';
import recoveryRoutes from './routes/recoveryRoutes.js';
import receiptRoutes from './routes/receiptRoutes.js';
import analyticsRoutes from './routes/analyticsRoutes.js';
import notificationRoutes from './routes/notificationRoutes.js';
import cityRoutes from './routes/cityRoutes.js';
import { DEFAULT_CORS_ORIGINS, DEFAULT_PORT } from './config/constants.js';
import { APP_ENV, getEnv } from './config/runtimeConfig.js';
import connectDB from './utils/db.js';
import logger from './utils/logger.js';

const app = express();

const corsOriginsEnv = [getEnv('CORS_ORIGINS', ''), getEnv('CORS_ORIGIN', '')]
  .join(',')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

const allowedOrigins = [...new Set([...DEFAULT_CORS_ORIGINS, ...corsOriginsEnv])];

const corsOptions = {
  origin(origin, callback) {
    // Allow requests without an origin header (server-to-server, curl, mobile apps).
    if (!origin || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    return callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  exposedHeaders: ['Authorization']
};

app.use(cors(corsOptions));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use('/uploads', express.static('uploads'));

app.use('/api/products', productRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/users', userRoutes);
app.use('/api/distribution', distributionRoutes);
app.use('/api/sales', salesRoutes);
app.use('/api/shopkeeper-orders', shopkeeperOrderRoutes);
app.use('/api/shopkeepers', shopkeeperRoutes);
app.use('/api/assignments', assignmentRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/recoveries', recoveryRoutes);
app.use('/api/receipts', receiptRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/cities', cityRoutes);

app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

app.use((err, req, res, next) => {
  logger.error('Unhandled application error', err);
  res.status(500).json({ error: 'Something went wrong!' });
});

app.use('*', (req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

connectDB();

const PORT = Number(getEnv('PORT', DEFAULT_PORT));
app.listen(PORT, () => {
  logger.info(`Server running on port ${PORT} (${APP_ENV})`);
});
