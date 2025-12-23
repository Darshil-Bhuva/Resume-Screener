const mongoose = require('mongoose');

const candidateSchema = new mongoose.Schema({
  applicantEmail: {
    type: String,
    required: true,
    trim: true,
    lowercase: true
  },
  applicantPhone: {
    type: String,
    trim: true
  },
  jobId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Job',
    required: true
  },
  resumeFile: {
    originalName: String,
    fileName: String,
    filePath: String,
    fileSize: Number,
    mimeType: String
  },
  skills: [{
    type: String,
    trim: true
  }],
  score: {
    type: Number,
    min: 0,
    max: 100
  },
  status: {
    type: String,
    enum: ['new', 'screened', 'shortlisted', 'rejected', 'interview'],
    default: 'new'
  },
  screeningResults: {
    matchPercentage: Number,
    matchedSkills: [String],
    missingSkills: [String],
    experienceMatch: Boolean,
    educationMatch: Boolean,
    screeningNotes: String
  },
  lastContacted: {
    type: Date
  },
  notes: [{
    content: String,
    addedBy: String,
    addedAt: {
      type: Date,
      default: Date.now
    }
  }]
}, {
  timestamps: true
});

// Index for better query performance
candidateSchema.index({ jobId: 1, status: 1 });
candidateSchema.index({ applicantEmail: 1 });
candidateSchema.index({ createdAt: -1 });

// Static method to get pipeline statistics
candidateSchema.statics.getPipelineStats = async function(jobId = null) {
  const matchStage = jobId ? { jobId: mongoose.Types.ObjectId(jobId) } : {};
  
  const stats = await this.aggregate([
    { $match: matchStage },
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 }
      }
    }
  ]);

  // Convert array to object
  const statsObj = {
    total: 0,
    new: 0,
    screened: 0,
    shortlisted: 0,
    rejected: 0,
    interview: 0
  };

  stats.forEach(stat => {
    statsObj[stat._id] = stat.count;
    statsObj.total += stat.count;
  });

  // Calculate conversion rates
  const conversionRates = {
    screened: statsObj.total > 0 ? Math.round((statsObj.screened / statsObj.total) * 100) : 0,
    shortlisted: statsObj.screened > 0 ? Math.round((statsObj.shortlisted / statsObj.screened) * 100) : 0,
    interview: statsObj.shortlisted > 0 ? Math.round((statsObj.interview / statsObj.shortlisted) * 100) : 0
  };

  return {
    ...statsObj,
    conversionRates
  };
};

module.exports = mongoose.model('Candidate', candidateSchema);