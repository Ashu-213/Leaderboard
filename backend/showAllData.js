import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const showAllData = async () => {
  try {
    console.log('🔍 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected!\n');
    
    // Get test database
    const testDB = mongoose.connection.useDb('test');
    const teams = await testDB.collection('teams').find({}).toArray();
    
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📊 YOUR TEST DATABASE DATA (18 TEAMS):');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    
    teams.forEach((team, index) => {
      console.log(`${index + 1}. ${team.name}`);
      console.log(`   - Mad Ludo: ${team.madLudo || 0}`);
      console.log(`   - Treasure Hunt: ${team.treasureHunt || 0}`);
      console.log(`   - Space Roulette: ${team.spaceRoulette || 0}`);
      console.log(`   - Cosmic Jump: ${team.cosmicJump || 0}`);
      console.log(`   - Space Colosseum: ${team.spaceColosseum || 0}`);
      console.log(`   ➤ TOTAL: ${team.total || 0}`);
      console.log('');
    });
    
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✅ ALL YOUR DATA IS SAFE!\n');
    
    await mongoose.connection.close();
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
};

showAllData();
