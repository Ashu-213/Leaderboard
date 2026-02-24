import mongoose from 'mongoose';

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      // Optimize for high concurrency
      maxPoolSize: 50, // Maintain up to 50 socket connections
      serverSelectionTimeoutMS: 5000, // Keep trying to send operations for 5 seconds
      socketTimeoutMS: 45000, // Close sockets after 45 seconds of inactivity
      bufferMaxEntries: 0, // Disable mongoose buffering
      bufferCommands: false, // Disable mongoose buffering of commands
    });

    console.log(`✓ MongoDB Connected: ${conn.connection.host}`);
    console.log(`📊 Connection Pool Size: ${conn.connection.config?.maxPoolSize || 'default'}`);
  } catch (error) {
    console.error(`✗ MongoDB Connection Error: ${error.message}`);
    process.exit(1);
  }
};

export default connectDB;
