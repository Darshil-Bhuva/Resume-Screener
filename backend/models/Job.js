
//models/jobSchema.js
const mongoose = require('mongoose');

const jobSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    required: true
  },
  requirements: {
    type: [String],
    required: true
  },
  skills: {
    type: [String],
    required: true
  },
  experience: {
    min: {
      type: Number,
      default: 0
    },
    max: {
      type: Number,
      default: 10
    }
  },
  location: {
    type: String,
    required: true
  },
  salaryRange: {
    min: Number,
    max: Number
  },
  status: {
    type: String,
    enum: ['active', 'inactive'],
    default: 'active'
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  publicLink: {
    type: String,
    unique: true,
    sparse: true
  },
  isPublic: {
    type: Boolean,
    default: false
  },
  applicationCount: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

jobSchema.pre('save', function(next) {
  if (this.isPublic && !this.publicLink) {
    this.publicLink = `job-${this._id}-${Date.now()}`;
  }
  next();
});

module.exports = mongoose.model('Job', jobSchema);