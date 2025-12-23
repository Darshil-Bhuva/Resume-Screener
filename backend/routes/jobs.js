//routes/jobs.js
const express = require('express');
const Job = require('../models/Job');
const auth = require('../middleware/auth');
const { body, validationResult } = require('express-validator');

const router = express.Router();

// Get all jobs for logged in user
router.get('/', auth, async (req, res) => {
  try {
    const jobs = await Job.find({ createdBy: req.user._id }).sort({ createdAt: -1 });
    res.json(jobs);
  } catch (error) {
    console.error('Get jobs error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get single job
router.get('/:id', auth, async (req, res) => {
  try {
    const job = await Job.findOne({ 
      _id: req.params.id, 
      createdBy: req.user._id 
    });
    
    if (!job) {
      return res.status(404).json({ message: 'Job not found' });
    }
    
    res.json(job);
  } catch (error) {
    console.error('Get job error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Create job
router.post('/', [
  auth,
  body('title').trim().notEmpty().withMessage('Title is required'),
  body('description').trim().notEmpty().withMessage('Description is required'),
  body('requirements').isArray({ min: 1 }).withMessage('At least one requirement is needed'),
  body('skills').isArray({ min: 1 }).withMessage('At least one skill is needed'),
  body('location').trim().notEmpty().withMessage('Location is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const job = new Job({
      ...req.body,
      createdBy: req.user._id
    });

    await job.save();
    res.status(201).json(job);
  } catch (error) {
    console.error('Create job error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update job - ADD THIS NEW ROUTE
router.put('/:id', [
    auth,
    body('title').trim().notEmpty().withMessage('Title is required'),
    body('description').trim().notEmpty().withMessage('Description is required'),
    body('requirements').isArray({ min: 1 }).withMessage('At least one requirement is needed'),
    body('skills').isArray({ min: 1 }).withMessage('At least one skill is needed'),
    body('location').trim().notEmpty().withMessage('Location is required')
  ], async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }
  
      const job = await Job.findOneAndUpdate(
        { _id: req.params.id, createdBy: req.user._id },
        req.body,
        { new: true, runValidators: true }
      );
      
      if (!job) {
        return res.status(404).json({ message: 'Job not found' });
      }
      
      res.json(job);
    } catch (error) {
      console.error('Update job error:', error);
      res.status(500).json({ message: 'Server error' });
    }
  });


  // Make job public and get application link
router.post('/:id/make-public', auth, async (req, res) => {
  try {
    const job = await Job.findOneAndUpdate(
      { _id: req.params.id, createdBy: req.user._id },
      { 
        isPublic: true,
        publicLink: `job-${req.params.id}-${Date.now()}`
      },
      { new: true }
    );
    
    if (!job) {
      return res.status(404).json({ message: 'Job not found' });
    }
    
    res.json({
      success: true,
      publicLink: job.publicLink,
      applicationUrl: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/apply/${job.publicLink}`
    });
  } catch (error) {
    console.error('Make job public error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get public link for job
router.get('/:id/public-link', auth, async (req, res) => {
  try {
    const job = await Job.findOne({ 
      _id: req.params.id, 
      createdBy: req.user._id 
    });
    
    if (!job) {
      return res.status(404).json({ message: 'Job not found' });
    }
    
    // If job is not public, make it public first
    if (!job.isPublic || !job.publicLink) {
      const updatedJob = await Job.findByIdAndUpdate(
        job._id,
        { 
          isPublic: true,
          publicLink: `job-${job._id}-${Date.now()}`
        },
        { new: true }
      );
      
      res.json({
        success: true,
        publicLink: updatedJob.publicLink,
        applicationUrl: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/apply/${updatedJob.publicLink}`,
        wasNew: true
      });
    } else {
      res.json({
        success: true,
        publicLink: job.publicLink,
        applicationUrl: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/apply/${job.publicLink}`,
        wasNew: false
      });
    }
  } catch (error) {
    console.error('Get public link error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});
// Delete job
router.delete('/:id', auth, async (req, res) => {
  try {
    const job = await Job.findOneAndDelete({ 
      _id: req.params.id, 
      createdBy: req.user._id 
    });
    
    if (!job) {
      return res.status(404).json({ message: 'Job not found' });
    }
    
    res.json({ message: 'Job deleted successfully' });
  } catch (error) {
    console.error('Delete job error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;