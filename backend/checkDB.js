import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const checkDatabase = async () => {
  try {
    console.log('🔍 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    
    console.log('✅ Connected successfully!');
    console.log(`📊 Current database: ${mongoose.connection.name}`);
    
    // List all collections in current database
    const collections = await mongoose.connection.db.listCollections().toArray();
    console.log(`\n📁 Collections in "${mongoose.connection.name}" database:`);
    
    if (collections.length === 0) {
      console.log('   No collections yet (database is empty)');
    } else {
      for (const collection of collections) {
        const count = await mongoose.connection.db.collection(collection.name).countDocuments();
        console.log(`   - ${collection.name}: ${count} documents`);
      }
    }
    
    // Check if there's data in the 'test' database
    console.log('\n🔍 Checking "test" database...');
    const testDB = mongoose.connection.useDb('test');
    const testCollections = await testDB.db.listCollections().toArray();
    
    if (testCollections.length === 0) {
      console.log('   No collections in "test" database');
    } else {
      console.log(`   Found ${testCollections.length} collection(s) in "test" database:`);
      for (const collection of testCollections) {
        const count = await testDB.db.collection(collection.name).countDocuments();
        console.log(`   - ${collection.name}: ${count} documents`);
      }
    }
    
    await mongoose.connection.close();
    console.log('\n✅ Connection closed');
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
};

checkDatabase();
