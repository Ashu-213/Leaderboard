import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const migrateData = async () => {
  try {
    console.log('🔍 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected successfully!');
    
    // Access both databases
    const testDB = mongoose.connection.useDb('test');
    const leaderboardDB = mongoose.connection.useDb('leaderboard');
    
    // Get teams from test database
    const testTeams = await testDB.collection('teams').find({}).toArray();
    console.log(`\n📊 Found ${testTeams.length} teams in "test" database`);
    
    if (testTeams.length === 0) {
      console.log('❌ No teams to migrate!');
      await mongoose.connection.close();
      return;
    }
    
    // Show teams being migrated
    console.log('\n📋 Teams to migrate:');
    testTeams.forEach(team => {
      console.log(`   - ${team.name} (Total: ${team.total})`);
    });
    
    // Clear existing data in leaderboard database
    const existingCount = await leaderboardDB.collection('teams').countDocuments();
    if (existingCount > 0) {
      console.log(`\n🗑️  Clearing ${existingCount} existing team(s) in "leaderboard" database...`);
      await leaderboardDB.collection('teams').deleteMany({});
    }
    
    // Insert teams into leaderboard database
    console.log('\n⬆️  Migrating teams to "leaderboard" database...');
    await leaderboardDB.collection('teams').insertMany(testTeams);
    console.log('✅ Migration complete!');
    
    // Verify
    const newCount = await leaderboardDB.collection('teams').countDocuments();
    console.log(`\n✅ Verified: ${newCount} teams now in "leaderboard" database`);
    
    console.log('\n💡 You can now delete the "test" database from MongoDB Atlas if you want.');
    
    await mongoose.connection.close();
    console.log('\n✅ Connection closed');
  } catch (error) {
    console.error('❌ Migration Error:', error.message);
    process.exit(1);
  }
};

migrateData();
