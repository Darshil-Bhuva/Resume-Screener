//routes/resumes.js
const express = require('express');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const Resume = require('../models/Resume');
const Job = require('../models/Job');
const auth = require('../middleware/auth');
const EnhancedPDFParser = require('../utils/pdfParser');

const router = express.Router();

// Multer configuration for file upload
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = 'uploads/';
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
    fileSize: 10 * 1024 * 1024 // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Only PDF files are allowed'), false);
    }
  }
});

// Upload and process resume route
router.post('/upload', auth, upload.single('resume'), async (req, res) => {
  try {
    const { jobId, applicantEmail, applicantPhone, useExtractedData = 'true' } = req.body;

    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    if (!jobId) {
      return res.status(400).json({ message: 'Job ID is required' });
    }

    let extractedData = {};
    let extractedText = '';

    try {
      const dataBuffer = fs.readFileSync(req.file.path);
      extractedData = await EnhancedPDFParser.parseResume(dataBuffer);
      extractedText = extractedData.text;
    } catch (pdfError) {
      console.error('PDF parsing error:', pdfError);
    }

    // Determine final applicant data
    let finalApplicantData = {};
    
    if (useExtractedData === 'true' && extractedData.applicantEmail) {
      finalApplicantData = {
        applicantEmail: extractedData.applicantEmail || applicantEmail || 'unknown@example.com',
        applicantPhone: extractedData.applicantPhone || applicantPhone || '',
        skills: extractedData.skills || [],
        experience: extractedData.experience || 0,
        education: extractedData.education || ''
      };
    } else {
      finalApplicantData = {
        applicantEmail: applicantEmail || extractedData.applicantEmail || 'unknown@example.com',
        applicantPhone: applicantPhone || extractedData.applicantPhone || '',
        skills: extractedData.skills || [],
        experience: extractedData.experience || 0,
        education: extractedData.education || ''
      };
    }

    const resume = new Resume({
      jobId,
      applicantEmail: finalApplicantData.applicantEmail,
      applicantPhone: finalApplicantData.applicantPhone,
      resumeFile: {
        filename: req.file.filename,
        path: req.file.path,
        originalName: req.file.originalname,
        size: req.file.size,
        mimetype: req.file.mimetype
      },
      extractedText: extractedText,
      skills: finalApplicantData.skills,
      experience: finalApplicantData.experience,
      education: finalApplicantData.education,
      dataSource: useExtractedData === 'true' && extractedData.applicantEmail ? 'auto' : 'manual'
    });

    await resume.save();
    
    res.status(201).json({
      ...resume.toObject(),
      extractionResults: {
        emailFound: !!extractedData.applicantEmail,
        phoneFound: !!extractedData.applicantPhone,
        skillsFound: extractedData.skills?.length || 0
      }
    });
  } catch (error) {
    console.error('Upload resume error:', error);
    
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    
    res.status(500).json({ message: 'Server error during resume upload' });
  }
});

// Get resumes for a job
router.get('/job/:jobId', auth, async (req, res) => {
  try {
    const resumes = await Resume.find({ jobId: req.params.jobId })
      .populate('jobId')
      .sort({ createdAt: -1 });
    res.json(resumes);
  } catch (error) {
    console.error('Get resumes error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get resume statistics
router.get('/stats', auth, async (req, res) => {
  try {
    const total = await Resume.countDocuments();
    const screened = await Resume.countDocuments({ status: 'screened' });
    const shortlisted = await Resume.countDocuments({ status: 'shortlisted' });
    
    res.json({
      total,
      screened,
      shortlisted
    });
  } catch (error) {
    console.error('Get stats error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update resume status
router.put('/:id/status', auth, async (req, res) => {
  try {
    const { status } = req.body;
    
    if (!['new', 'screened', 'rejected', 'shortlisted', 'interview'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status' });
    }
    
    const resume = await Resume.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true }
    );
    
    if (!resume) {
      return res.status(404).json({ message: 'Resume not found' });
    }
    
    res.json(resume);
  } catch (error) {
    console.error('Update status error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Delete resume
router.delete('/:id', auth, async (req, res) => {
  try {
    const resume = await Resume.findByIdAndDelete(req.params.id);
    
    if (!resume) {
      return res.status(404).json({ message: 'Resume not found' });
    }
    
    // Delete the uploaded file
    if (resume.resumeFile && resume.resumeFile.path) {
      if (fs.existsSync(resume.resumeFile.path)) {
        fs.unlinkSync(resume.resumeFile.path);
      }
    }
    
    res.json({ message: 'Resume deleted successfully' });
  } catch (error) {
    console.error('Delete resume error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get resume file - COMPLETELY FIXED VERSION
router.get('/:id/file', auth, async (req, res) => {
  try {
    console.log('🔍 Fetching resume file for ID:', req.params.id);
    
    const resume = await Resume.findById(req.params.id);
    
    if (!resume) {
      console.log('❌ Resume not found in database');
      return res.status(404).json({ message: 'Resume not found' });
    }

    console.log('✅ Found resume:', resume.applicantEmail);

    // Check if user has access to this resume's job
    const job = await Job.findOne({ 
      _id: resume.jobId, 
      createdBy: req.user._id 
    });

    if (!job) {
      console.log('🚫 Access denied - user not authorized for this job');
      return res.status(403).json({ message: 'Access denied' });
    }

    if (!resume.resumeFile || !resume.resumeFile.path) {
      console.log('❌ No resume file path found in database');
      return res.status(404).json({ message: 'Resume file not found in database' });
    }

    // Get the actual file path - handle both relative and absolute paths
    let filePath = resume.resumeFile.path;
    
    // If path is relative, make it absolute from backend root
    if (!path.isAbsolute(filePath)) {
      filePath = path.join(__dirname, '..', filePath);
    }
    
    console.log('🔍 Looking for file at path:', filePath);

    // Check if file exists
    if (!fs.existsSync(filePath)) {
      console.log('❌ File not found at primary path:', filePath);
      
      // Try alternative locations
      const alternativePaths = [
        path.join(__dirname, '../uploads', resume.resumeFile.filename),
        path.join(__dirname, '../uploads', path.basename(filePath)),
        resume.resumeFile.path
      ];
      
      let foundPath = null;
      for (const altPath of alternativePaths) {
        console.log('🔍 Trying alternative path:', altPath);
        if (fs.existsSync(altPath)) {
          foundPath = altPath;
          console.log('✅ File found at alternative path:', foundPath);
          break;
        }
      }
      
      if (!foundPath) {
        console.log('❌ File not found in any location');
        return res.status(404).json({ 
          message: 'Resume file not found on server',
          storedPath: resume.resumeFile.path,
          filename: resume.resumeFile.filename
        });
      }
      
      filePath = foundPath;
    } else {
      console.log('✅ File found at primary path');
    }

    // Set headers for PDF
    const filename = resume.resumeFile.originalName || 'resume.pdf';
    const safeFilename = encodeURIComponent(filename);
    
    console.log('📤 Sending file:', filename);

    if (req.query.download === 'true') {
      // Force download
      res.setHeader('Content-Disposition', `attachment; filename="${safeFilename}"; filename*=UTF-8''${safeFilename}`);
    } else {
      // Inline view (for browser preview)
      res.setHeader('Content-Disposition', `inline; filename="${safeFilename}"; filename*=UTF-8''${safeFilename}`);
    }
    
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('X-File-Name', safeFilename);
    
    // Send the file
    res.sendFile(filePath, (err) => {
      if (err) {
        console.error('❌ Error sending file:', err);
        if (!res.headersSent) {
          res.status(500).json({ 
            message: 'Error sending file',
            error: err.message 
          });
        }
      } else {
        console.log('✅ File sent successfully');
      }
    });
    
  } catch (error) {
    console.error('❌ Get resume file error:', error);
    res.status(500).json({ 
      message: 'Server error while fetching resume',
      error: error.message 
    });
  }
});

// Get resume file info
router.get('/:id/file-info', auth, async (req, res) => {
  try {
    const resume = await Resume.findById(req.params.id);
    
    if (!resume) {
      return res.status(404).json({ message: 'Resume not found' });
    }

    // Check if user has access to this resume's job
    const job = await Job.findOne({ 
      _id: resume.jobId, 
      createdBy: req.user._id 
    });

    if (!job) {
      return res.status(403).json({ message: 'Access denied' });
    }

    if (!resume.resumeFile) {
      return res.status(404).json({ message: 'Resume file not found' });
    }

    res.json({
      success: true,
      fileInfo: {
        originalName: resume.resumeFile.originalName,
        filename: resume.resumeFile.filename,
        path: resume.resumeFile.path,
        size: resume.resumeFile.size,
        uploadDate: resume.createdAt
      }
    });
    
  } catch (error) {
    console.error('Get resume file info error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Add note to resume
router.post('/:id/notes', auth, async (req, res) => {
  try {
    const { content } = req.body;
    
    if (!content || content.trim() === '') {
      return res.status(400).json({ message: 'Note content is required' });
    }
    
    const resume = await Resume.findById(req.params.id);
    
    if (!resume) {
      return res.status(404).json({ message: 'Resume not found' });
    }
    
    resume.notes.push({
      content: content.trim(),
      createdBy: req.user._id
    });
    
    await resume.save();
    res.json(resume);
  } catch (error) {
    console.error('Add note error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;