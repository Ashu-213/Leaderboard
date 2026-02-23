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
  },
  {
    timestamps: true,
  }
);

// Index on total for faster sorting
teamSchema.index({ total: -1 });

// Pre-save hook to calculate total
teamSchema.pre('save', function (next) {
  this.total = this.madLudo + this.treasureHunt + this.spaceRoulette + this.cosmicJump + this.spaceColosseum;
  next();
});

const Team = mongoose.model('Team', teamSchema);

export default Team;
