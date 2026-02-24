import mongoose from 'mongoose';

const teamSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Team name is required'],
      trim: true,
      unique: true,
    },
    madLudo: {
      type: Number,
      default: 0,
      min: 0,
    },
    treasureHunt: {
      type: Number,
      default: 0,
      min: 0,
    },
    spaceRoulette: {
      type: Number,
      default: 0,
      min: 0,
    },
    cosmicJump: {
      type: Number,
      default: 0,
      min: 0,
    },
    spaceColosseum: {
      type: Number,
      default: 0,
      min: 0,
    },
    total: {
      type: Number,
      default: 0,
    },
    version: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

// Index on total for faster sorting
teamSchema.index({ total: -1 });

// Index on version for optimistic locking
teamSchema.index({ _id: 1, version: 1 });

// Pre-save hook to calculate total ONLY when explicitly saving (not for updates)
teamSchema.pre('save', function (next) {
  // Only calculate total if this is a new document or if individual fields were modified
  if (this.isNew || this.isModified(['madLudo', 'treasureHunt', 'spaceRoulette', 'cosmicJump', 'spaceColosseum'])) {
    this.total = this.madLudo + this.treasureHunt + this.spaceRoulette + this.cosmicJump + this.spaceColosseum;
  }
  next();
});

// Static method for atomic score updates
teamSchema.statics.atomicUpdateScore = async function(teamId, field, newValue, currentVersion) {
  const validFields = ['madLudo', 'treasureHunt', 'spaceRoulette', 'cosmicJump', 'spaceColosseum'];
  
  if (!validFields.includes(field)) {
    throw new Error('Invalid field for update');
  }

  if (isNaN(newValue) || newValue < 0) {
    throw new Error('Invalid score value');
  }

  // Get current team data for calculating the difference
  const currentTeam = await this.findById(teamId);
  if (!currentTeam) {
    throw new Error('Team not found');
  }

  // Calculate the difference for atomic update
  const oldValue = currentTeam[field];
  const difference = newValue - oldValue;

  // Perform atomic update with optimistic locking
  const result = await this.findOneAndUpdate(
    { 
      _id: teamId,
      version: currentTeam.version // Optimistic locking
    },
    {
      $set: { [field]: newValue },
      $inc: { 
        total: difference,
        version: 1
      }
    },
    { 
      new: true,
      runValidators: true
    }
  );

  if (!result) {
    // Document was modified by another operation, retry needed
    throw new Error('CONFLICT: Score was updated by another user. Please refresh and try again.');
  }

  return result;
};

const Team = mongoose.model('Team', teamSchema);

export default Team;
