import { config } from '#src/config/app.config';
import mongoose from 'mongoose';

const connectDB = async () => {
  try {
    await mongoose.connect(config.MONGO_URI);
    console.log('Database connected successfully');
  } catch (error) {
    console.log('Error connecting to the database:', error);
    process.exit(1);
  }
};

export default connectDB;
