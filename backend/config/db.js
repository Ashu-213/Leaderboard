import mongoose from 'mongoose';

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI, {
      // Optimize for high concurrency - using supported options only
      maxPoolSize: 50, // Maintain up to 50 socket connections
      serverSelectionTimeoutMS: 5000, // Keep trying to send operations for 5 seconds
      socketTimeoutMS: 45000, // Close sockets after 45 seconds of inactivity
      // Removed bufferMaxEntries and bufferCommands as they're deprecated in Mongoose 8.x
    });

    console.log(`✓ MongoDB Connected: ${conn.connection.host}`);
    console.log(`📊 Connection Pool Size: ${conn.connection.options?.maxPoolSize || 'default'}`);
  } catch (error) {
    console.error(`✗ MongoDB Connection Error: ${error.message}`);
    process.exit(1);
  }
};

export default connectDB;
