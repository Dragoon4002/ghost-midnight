import mongoose from 'mongoose';
import { config } from './config.js';
import { logger } from './logger.js';

export async function connectDb(): Promise<void> {
  mongoose.set('strictQuery', true);
  await mongoose.connect(config.mongodbUri);
  logger.info('MongoDB connected');
}

export async function disconnectDb(): Promise<void> {
  await mongoose.disconnect();
  logger.info('MongoDB disconnected');
}
