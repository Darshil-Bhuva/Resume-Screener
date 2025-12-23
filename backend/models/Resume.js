//models/Resume.js
const mongoose = require('mongoose');

const resumeFileSchema = {
  filename: { type: String, required: true },
  originalName: { type: String, required: true },
  path: { type: String, required: true },
  size: { type: Number },
  mimetype: { type: String, default: 'application/pdf' }
};

const noteSchema = new mongoose.Schema({
  content: { type: String, required: true },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

const screeningResultsSchema = new mongoose.Schema({
  skillsMatch: { type: Number, default: 0 },
  experienceMatch: { type: Number, default: 0 },
  educationMatch: { type: Number, default: 0 },
  overallScore: { type: Number, default: 0 },
  matchedKeywords: [{ type: String }],
  missingKeywords: [{ type: String }],
  foundExperience: { type: Number, default: 0 }
});

// NEW: Communication history schema
const communicationSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['email', 'note', 'call', 'interview', 'status_update'],
    required: true
  },
  subject: String,
  message: String,
  sentBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  sentAt: {
    type: Date,
    default: Date.now
  },
  status: {
    type: String,
    enum: ['sent', 'delivered', 'failed', 'opened', 'clicked'],
    default: 'sent'
  },
  messageId: String,
  metadata: {
    templateUsed: String,
    emailService: String,
    recipientEmail: String,
    jobTitle: String,
    previousStatus: String,
    newStatus: String
  },
  attachments: [{
    filename: String,
    originalName: String,
    path: String,
    size: Number
  }]
});

// NEW: Interview scheduling schema
const interviewSchema = new mongoose.Schema({
  scheduledAt: {
    type: Date,
    required: true
  },
  duration: {
    type: Number, // in minutes
    default: 60
  },
  type: {
    type: String,
    enum: ['phone', 'video', 'in_person', 'technical'],
    default: 'video'
  },
  interviewer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  meetingLink: String,
  location: String,
  status: {
    type: String,
    enum: ['scheduled', 'completed', 'cancelled', 'rescheduled', 'no_show'],
    default: 'scheduled'
  },
  feedback: {
    rating: { type: Number, min: 1, max: 5 },
    notes: String,
    strengths: [String],
    areas_for_improvement: [String],
    recommended: { type: Boolean, default: false }
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, {
  timestamps: true
});

// NEW: Candidate rating and feedback schema
const ratingSchema = new mongoose.Schema({
  overall: { type: Number, min: 1, max: 5, required: true },
  technicalSkills: { type: Number, min: 1, max: 5 },
  communication: { type: Number, min: 1, max: 5 },
  culturalFit: { type: Number, min: 1, max: 5 },
  experience: { type: Number, min: 1, max: 5 },
  potential: { type: Number, min: 1, max: 5 },
  comments: String,
  ratedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  strengths: [String],
  weaknesses: [String],
  recommendation: {
    type: String,
    enum: ['strong_hire', 'hire', 'no_hire', 'strong_no_hire'],
    required: true
  }
}, {
  timestamps: true
});

const resumeSchema = new mongoose.Schema({
  jobId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Job',
    required: true
  },
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
  applicantName: {
    type: String,
    trim: true
  },
  resumeFile: resumeFileSchema,
  extractedText: String,
  skills: [String],
  experience: { type: Number, default: 0 },
  education: String,
  educationDetails: [{
    degree: String,
    institution: String,
    year: Number,
    fieldOfStudy: String,
    gpa: Number
  }],
  certifications: [String],
  languages: [{
    language: String,
    proficiency: {
      type: String,
      enum: ['basic', 'intermediate', 'fluent', 'native']
    }
  }],
  score: {
    type: Number,
    default: 0,
    min: 0,
    max: 100
  },
  status: {
    type: String,
    enum: ['new', 'screened', 'rejected', 'shortlisted', 'interview', 'offer', 'hired'],
    default: 'new'
  },
  statusHistory: [{
    status: {
      type: String,
      enum: ['new', 'screened', 'rejected', 'shortlisted', 'interview', 'offer', 'hired'],
      required: true
    },
    changedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    changedAt: {
      type: Date,
      default: Date.now
    },
    reason: String
  }],
  screeningResults: screeningResultsSchema,
  notes: [noteSchema],
  
  // NEW FIELDS FOR CANDIDATE MANAGEMENT
  communications: [communicationSchema],
  interviews: [interviewSchema],
  ratings: [ratingSchema],
  
  // Candidate source tracking
  source: {
    type: String,
    enum: ['career_page', 'linkedin', 'indeed', 'referral', 'agency', 'campus', 'other'],
    default: 'career_page'
  },
  referralSource: String,
  
  // Flags and tags
  tags: [String],
  isActive: {
    type: Boolean,
    default: true
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium'
  },
  
  // Privacy and compliance
  gdprConsent: {
    type: Boolean,
    default: false
  },
  dataRetentionDate: Date,
  
  dataSource: {
    type: String,
    enum: ['auto', 'manual'],
    default: 'auto'
  },
  
  // Analytics and tracking
  viewCount: {
    type: Number,
    default: 0
  },
  lastViewedAt: Date,
  lastViewedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

// Index for better query performance
resumeSchema.index({ jobId: 1, createdAt: -1 });
resumeSchema.index({ applicantEmail: 1 });
resumeSchema.index({ status: 1 });
resumeSchema.index({ score: -1 });
resumeSchema.index({ 'skills': 'text', 'extractedText': 'text' });
resumeSchema.index({ createdAt: -1 });
resumeSchema.index({ 'communications.sentAt': -1 });

// Middleware to track status changes
resumeSchema.pre('save', function(next) {
  if (this.isModified('status') && this.statusHistory) {
    this.statusHistory.push({
      status: this.status,
      changedAt: new Date()
    });
  }
  next();
});

// Static method to get candidate pipeline statistics
resumeSchema.statics.getPipelineStats = function(jobIds) {
  return this.aggregate([
    { $match: { jobId: { $in: jobIds } } },
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 },
        avgScore: { $avg: '$score' }
      }
    }
  ]);
};

// Instance method to add communication
resumeSchema.methods.addCommunication = function(communicationData) {
  this.communications.push(communicationData);
  return this.save();
};

// Instance method to schedule interview
resumeSchema.methods.scheduleInterview = function(interviewData) {
  this.interviews.push(interviewData);
  this.status = 'interview';
  return this.save();
};

// Instance method to add rating
resumeSchema.methods.addRating = function(ratingData) {
  this.ratings.push(ratingData);
  
  // Update overall score if multiple ratings exist
  if (this.ratings.length > 0) {
    const avgRating = this.ratings.reduce((sum, rating) => sum + rating.overall, 0) / this.ratings.length;
    this.score = Math.round(avgRating * 20); // Convert 1-5 scale to 0-100
  }
  
  return this.save();
};

// Virtual for full applicant name
resumeSchema.virtual('fullName').get(function() {
  return this.applicantName || this.applicantEmail.split('@')[0];
});

// Virtual for last communication
resumeSchema.virtual('lastCommunication').get(function() {
  if (this.communications.length === 0) return null;
  return this.communications[this.communications.length - 1];
});

// Virtual for next interview
resumeSchema.virtual('nextInterview').get(function() {
  const upcoming = this.interviews.filter(i => i.scheduledAt > new Date() && i.status === 'scheduled');
  if (upcoming.length === 0) return null;
  return upcoming.sort((a, b) => a.scheduledAt - b.scheduledAt)[0];
});

// Virtual for average rating
resumeSchema.virtual('averageRating').get(function() {
  if (this.ratings.length === 0) return 0;
  return this.ratings.reduce((sum, rating) => sum + rating.overall, 0) / this.ratings.length;
});

// Method to get communication history
resumeSchema.methods.getCommunicationHistory = function(type = null) {
  let communications = this.communications;
  if (type) {
    communications = communications.filter(comm => comm.type === type);
  }
  return communications.sort((a, b) => b.sentAt - a.sentAt);
};

// Method to get interview history
resumeSchema.methods.getInterviewHistory = function() {
  return this.interviews.sort((a, b) => b.scheduledAt - a.scheduledAt);
};

// Static method for search
resumeSchema.statics.searchCandidates = function(query, jobIds = []) {
  const searchConditions = {
    $or: [
      { applicantEmail: { $regex: query, $options: 'i' } },
      { applicantPhone: { $regex: query, $options: 'i' } },
      { applicantName: { $regex: query, $options: 'i' } },
      { skills: { $in: [new RegExp(query, 'i')] } },
      { education: { $regex: query, $options: 'i' } },
      { extractedText: { $regex: query, $options: 'i' } }
    ]
  };

  if (jobIds.length > 0) {
    searchConditions.jobId = { $in: jobIds };
  }

  return this.find(searchConditions)
    .populate('jobId')
    .sort({ createdAt: -1 })
    .limit(50);
};

// Static method for advanced filtering
resumeSchema.statics.advancedFilter = function(filters = {}) {
  let query = {};
  
  if (filters.jobId) {
    query.jobId = filters.jobId;
  }
  
  if (filters.status) {
    if (filters.status === 'active') {
      query.status = { $in: ['new', 'screened', 'shortlisted', 'interview'] };
    } else {
      query.status = filters.status;
    }
  }
  
  if (filters.scoreMin || filters.scoreMax) {
    query.score = {};
    if (filters.scoreMin) query.score.$gte = parseInt(filters.scoreMin);
    if (filters.scoreMax) query.score.$lte = parseInt(filters.scoreMax);
  }
  
  if (filters.skills) {
    const skillsArray = filters.skills.split(',').map(skill => skill.trim());
    query.skills = { $in: skillsArray.map(skill => new RegExp(skill, 'i')) };
  }
  
  if (filters.dateFrom || filters.dateTo) {
    query.createdAt = {};
    if (filters.dateFrom) query.createdAt.$gte = new Date(filters.dateFrom);
    if (filters.dateTo) query.createdAt.$lte = new Date(filters.dateTo + 'T23:59:59.999Z');
  }
  
  if (filters.tags && filters.tags.length > 0) {
    query.tags = { $in: filters.tags };
  }
  
  return this.find(query)
    .populate('jobId')
    .populate('communications.sentBy')
    .populate('interviews.interviewer')
    .populate('ratings.ratedBy')
    .sort({ createdAt: -1 });
};

// Export the model
module.exports = mongoose.model('Resume', resumeSchema);