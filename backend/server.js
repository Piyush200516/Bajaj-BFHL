import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';
import { MongoMemoryServer } from 'mongodb-memory-server';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import ticketRoutes from './routes/tickets.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;
let mongoServer;

const allowedOrigins = (process.env.CLIENT_ORIGIN || process.env.CLIENT_URL || '')
  .split(',')
  .map(origin => origin.trim())
  .filter(Boolean);

app.use(cors({
  origin(origin, callback) {
    if (!origin || allowedOrigins.length === 0 || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    return callback(new Error('Not allowed by CORS'));
  }
}));
app.use(express.json());

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'deskflow-api' });
});

app.use('/tickets', ticketRoutes);

app.use((req, res) => {
  res.status(404).json({ error: `Route not found: ${req.method} ${req.path}` });
});

app.use((error, _req, res, _next) => {
  console.error('Express Error Handler:', error);
  if (error.message === 'Not allowed by CORS') {
    return res.status(400).json({ error: 'CORS origin is not allowed' });
  }
  res.status(500).json({ error: 'Server error', message: error.message });
});

export const connectDB = async () => {
  try {
    let uri = process.env.MONGO_URI;
    if (!uri) {
      console.log('No MONGO_URI provided. Starting in-memory MongoDB server...');
      mongoServer = await MongoMemoryServer.create();
      uri = mongoServer.getUri();
    }

    await mongoose.connect(uri);
    console.log('MongoDB connected');
  } catch (error) {
    console.error(`MongoDB connection error: ${error.message}`);
    process.exit(1);
  }
};

export const closeDB = async () => {
  await mongoose.connection.close();
  if (mongoServer) {
    await mongoServer.stop();
    mongoServer = null;
  }
};

export default app;

const isEntryPoint = process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (process.env.NODE_ENV !== 'test' && isEntryPoint) {
  connectDB().then(() => {
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  });
}
