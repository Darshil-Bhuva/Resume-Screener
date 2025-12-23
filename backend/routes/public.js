//routes/public.js
const express = require('express');
const multer = require('multer');
const pdf = require('pdf-parse');
const fs = require('fs');
const Job = require('../models/Job');
const Resume = require('../models/Resume');
const EnhancedPDFParser = require('../utils/pdfParser');
const emailService = require('../services/emailService');

const router = express.Router();

// Multer configuration for public uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = 'uploads/public/';
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const originalName = file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
    cb(null, Date.now() + '-' + originalName);
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Only PDF files are allowed'), false);
    }
  }
});

// Get public job details
router.get('/job/:link', async (req, res) => {
  try {
    const job = await Job.findOne({ 
      publicLink: req.params.link,
      status: 'active'
    }).select('-createdBy');

    if (!job) {
      return res.status(404).json({ 
        success: false,
        message: 'Job not found or no longer active' 
      });
    }

    res.json({
      success: true,
      job: job
    });
  } catch (error) {
    console.error('Get public job error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Server error' 
    });
  }
});

// Submit application to public job
router.post('/apply/:link', upload.single('resume'), async (req, res) => {
  try {
    const { email, phone } = req.body;
    console.log("email at /apply/:link : ",email);
    if (!req.file) {
      return res.status(400).json({ 
        success: false,
        message: 'Resume file is required' 
      });
    }

    if (!email) {
      return res.status(400).json({ 
        success: false,
        message: 'Email is required' 
      });
    }

    // Find the job
    const job = await Job.findOne({ 
      publicLink: req.params.link,
      status: 'active'
    });

    if (!job) {
      return res.status(404).json({ 
        success: false,
        message: 'Job not found or no longer active' 
      });
    }

    let extractedData = {};
    let extractedText = '';

    try {
      // Extract data from PDF
      const dataBuffer = fs.readFileSync(req.file.path);
      extractedData = await EnhancedPDFParser.parseResume(dataBuffer);
      extractedText = extractedData.text;
    } catch (pdfError) {
      console.error('PDF parsing error:', pdfError);
      // Continue with manual data
    }

    // Use extracted data if available, otherwise use submitted data
    const finalEmail = extractedData.applicantEmail || email;
    const finalPhone = extractedData.applicantPhone || phone || '';

    // Create resume record
    const resume = new Resume({
      jobId: job._id,
      applicantEmail: finalEmail,
      applicantPhone: finalPhone,
      resumeFile: {
        filename: req.file.filename,
        path: req.file.path,
        originalName: req.file.originalname
      },
      extractedText: extractedText,
      skills: extractedData.skills || [],
      experience: extractedData.experience || 0,
      education: extractedData.education || '',
      dataSource: extractedData.applicantEmail ? 'auto' : 'manual',
      status: 'new'
    });

    await resume.save();

    // Update job application count
    await Job.findByIdAndUpdate(job._id, {
      $inc: { applicationCount: 1 }
    });
      const candidate = {
        applicantEmail : email
      }
      const  emailData ={
        subject : "Job Apply",
        message : "applying for this role"
      } 
      console.log("candidate.applicantEmail :",candidate.applicantEmail);
    await emailService.sendCustomEmail(candidate, emailData)

    res.json({
      success: true,
      message: 'Application submitted successfully!',
      applicationId: resume._id
    });

  } catch (error) {
    console.error('Public application error:', error);
    
    // Clean up uploaded file if error occurs
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    
    res.status(500).json({ 
      success: false,
      message: 'Error submitting application. Please try again.' 
    });
  }
});

// Get public job details - ENHANCED WITH BETTER ERROR HANDLING
router.get('/job/:link', async (req, res) => {
    try {
      console.log('Fetching public job with link:', req.params.link);
      
      const job = await Job.findOne({ 
        publicLink: req.params.link,
        status: 'active'
      }).select('-createdBy');
  
      if (!job) {
        console.log('Job not found for link:', req.params.link);
        return res.status(404).json({ 
          success: false,
          message: 'Job not found or no longer active' 
        });
      }
  
      console.log('Found job:', job.title);
      res.json({
        success: true,
        job: job
      });
    } catch (error) {
      console.error('Get public job error:', error);
      res.status(500).json({ 
        success: false,
        message: 'Server error' 
      });
    }
  });

// Get job application statistics (public info)
router.get('/stats/:link', async (req, res) => {
  try {
    const job = await Job.findOne({ 
      publicLink: req.params.link,
      status: 'active'
    }).select('applicationCount title');

    if (!job) {
      return res.status(404).json({ 
        success: false,
        message: 'Job not found' 
      });
    }

    res.json({
      success: true,
      applicationCount: job.applicationCount,
      jobTitle: job.title
    });
  } catch (error) {
    console.error('Get job stats error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Server error' 
    });
  }
});

module.exports = router;