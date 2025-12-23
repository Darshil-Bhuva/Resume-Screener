//routes/candidate.js
const express = require('express');
const Resume = require('../models/Resume');
const Job = require('../models/Job');
const auth = require('../middleware/auth');
const EmailService = require('../services/emailService');
const router = express.Router();
const User = require('../models/User');
// Get all candidates with advanced filtering
router.get('/', auth, async (req, res) => {
  try {
    const userId = req.user._id;
    const {
      status,
      scoreMin,
      scoreMax,
      skills,
      jobId,
      dateFrom,
      dateTo,
      search,
      page = 1,
      limit = 20
    } = req.query;

    // Get user's jobs
    const jobs = await Job.find({ createdBy: userId });
    const jobIds = jobs.map(job => job._id);

    // Build filter query
    let filter = { jobId: { $in: jobIds } };

    // Status filter
    if (status && status !== 'all') {
      if (status === 'active') {
        filter.status = { $in: ['new', 'screened', 'shortlisted'] };
      } else {
        filter.status = status;
      }
    }

    // Score range filter
    if (scoreMin || scoreMax) {
      filter.score = {};
      if (scoreMin) filter.score.$gte = parseInt(scoreMin);
      if (scoreMax) filter.score.$lte = parseInt(scoreMax);
    }

    // Skills filter
    if (skills) {
      const skillsArray = skills.split(',').map(skill => skill.trim());
      filter.skills = { $in: skillsArray.map(skill => new RegExp(skill, 'i')) };
    }

    // Job filter
    if (jobId && jobId !== 'all') {
      filter.jobId = jobId;
    }

    // Date range filter
    if (dateFrom || dateTo) {
      filter.createdAt = {};
      if (dateFrom) filter.createdAt.$gte = new Date(dateFrom);
      if (dateTo) filter.createdAt.$lte = new Date(dateTo + 'T23:59:59.999Z');
    }

    // Search across multiple fields
    if (search) {
      const searchRegex = new RegExp(search, 'i');
      filter.$or = [
        { applicantEmail: searchRegex },
        { applicantPhone: searchRegex },
        { education: searchRegex },
        { skills: searchRegex },
        { extractedText: searchRegex }
      ];
    }

    // Calculate pagination
    const skip = (page - 1) * limit;

    // Get candidates with population
    const candidates = await Resume.find(filter)
      .populate('jobId', 'title location')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .lean();

    // Get total count for pagination
    const total = await Resume.countDocuments(filter);

    // Get pipeline statistics
    const pipelineStats = await getPipelineStats(jobIds);

    res.json({
      candidates,
      pagination: {
        current: parseInt(page),
        total: Math.ceil(total / limit),
        totalCandidates: total
      },
      pipelineStats
    });

  } catch (error) {
    console.error('Candidate fetch error:', error);
    res.status(500).json({ message: 'Error fetching candidates' });
  }
});

// Get pipeline statistics
async function getPipelineStats(jobIds) {
  const resumes = await Resume.find({ jobId: { $in: jobIds } });
  
  const total = resumes.length;
  const newCount = resumes.filter(r => r.status === 'new').length;
  const screened = resumes.filter(r => r.status === 'screened').length;
  const shortlisted = resumes.filter(r => r.status === 'shortlisted').length;
  const rejected = resumes.filter(r => r.status === 'rejected').length;
  const interview = resumes.filter(r => r.status === 'interview').length;

  // Calculate conversion rates
  const screenedRate = total > 0 ? (screened / total * 100).toFixed(1) : 0;
  const shortlistRate = screened > 0 ? (shortlisted / screened * 100).toFixed(1) : 0;
  const interviewRate = shortlisted > 0 ? (interview / shortlisted * 100).toFixed(1) : 0;

  return {
    total,
    new: newCount,
    screened,
    shortlisted,
    rejected,
    interview,
    conversionRates: {
      screened: screenedRate,
      shortlisted: shortlistRate,
      interview: interviewRate
    }
  };
}

// Bulk update candidate status
router.put('/bulk-status', auth, async (req, res) => {
  try {
    const { candidateIds, status } = req.body;

    if (!candidateIds || !candidateIds.length) {
      return res.status(400).json({ message: 'No candidates selected' });
    }

    if (!['new', 'screened', 'shortlisted', 'rejected', 'interview'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status' });
    }

    // Verify candidates belong to user's jobs
    const userJobs = await Job.find({ createdBy: req.user._id });
    const userJobIds = userJobs.map(job => job._id);

    const result = await Resume.updateMany(
      {
        _id: { $in: candidateIds },
        jobId: { $in: userJobIds }
      },
      { status }
    );

    res.json({
      success: true,
      message: `Updated ${result.modifiedCount} candidates to ${status}`,
      modifiedCount: result.modifiedCount
    });

  } catch (error) {
    console.error('Bulk status update error:', error);
    res.status(500).json({ message: 'Error updating candidates' });
  }
});

// Add note to candidate
router.post('/:id/notes', auth, async (req, res) => {
  try {
    const { content } = req.body;
    const candidateId = req.params.id;

    if (!content || content.trim() === '') {
      return res.status(400).json({ message: 'Note content is required' });
    }

    // Verify candidate belongs to user's job
    const candidate = await Resume.findOne({ _id: candidateId })
      .populate('jobId');
    
    if (!candidate) {
      return res.status(404).json({ message: 'Candidate not found' });
    }

    if (candidate.jobId.createdBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }

    candidate.notes.push({
      content: content.trim(),
      createdBy: req.user._id
    });

    await candidate.save();

    res.json({
      success: true,
      message: 'Note added successfully',
      notes: candidate.notes
    });

  } catch (error) {
    console.error('Add note error:', error);
    res.status(500).json({ message: 'Error adding note' });
  }
});

// Get candidate details
router.get('/:id', auth, async (req, res) => {
  try {
    const candidateId = req.params.id;

    const candidate = await Resume.findOne({ _id: candidateId })
      .populate('jobId', 'title description skills requirements')
      .populate('notes.createdBy', 'name email');

    if (!candidate) {
      return res.status(404).json({ message: 'Candidate not found' });
    }

    // Verify access
    const job = await Job.findOne({ 
      _id: candidate.jobId._id, 
      createdBy: req.user._id 
    });

    if (!job) {
      return res.status(403).json({ message: 'Access denied' });
    }

    res.json({
      success: true,
      candidate
    });

  } catch (error) {
    console.error('Candidate details error:', error);
    res.status(500).json({ message: 'Error fetching candidate details' });
  }
});

router.post('/test-email', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    
    const testResult = await EmailService.sendEmail(
      user.email, // Send test to yourself
      'Test Email from Resume Screener',
      `
        <h1>Test Email</h1>
        <p>This is a test email from your Resume Screener application.</p>
        <p><strong>Sent by:</strong> ${user.name}</p>
        <p><strong>Company:</strong> ${user.company}</p>
        <p><strong>Email:</strong> ${user.email}</p>
        <p>If you received this, your email configuration is working!</p>
      `,
      null,
      user
    );

    res.json({
      success: testResult.success,
      message: testResult.message,
      user: {
        name: user.name,
        email: user.email,
        company: user.company
      }
    });
  } catch (error) {
    console.error('Test email error:', error);
    res.status(500).json({
      success: false,
      message: 'Test email failed',
      error: error.message
    });
  }
});

// Send email to candidate (placeholder for email integration)
router.post('/:id/send-email', auth, async (req, res) => {
  try {
    const { subject, message } = req.body;
    const candidateId = req.params.id;

    // Verify candidate exists and belongs to user
    const candidate = await Resume.findOne({ _id: candidateId })
      .populate('jobId');

    if (!candidate) {
      return res.status(404).json({ 
        success: false,
        message: 'Candidate not found' 
      });
    }

    // Verify job belongs to user
    const job = await Job.findOne({ 
      _id: candidate.jobId._id, 
      createdBy: req.user._id 
    });

    if (!job) {
      return res.status(403).json({ 
        success: false,
        message: 'Access denied' 
      });
    }

    // For now, we'll simulate email sending
    // In production, integrate with your email service (SendGrid, Mailgun, etc.)
    console.log('📧 Email prepared for sending:', {
      to: candidate.applicantEmail,
      subject,
      message,
      candidate: candidate.applicantEmail,
      job: job.title
    });

    // Simulate successful email sending
    // TODO: Integrate with actual email service
    const emailResult = {
      success: true,
      messageId: `mock-${Date.now()}`,
      timestamp: new Date().toISOString()
    };

    // Update candidate record with email sent
    candidate.communications = candidate.communications || [];
    candidate.communications.push({
      type: 'email',
      subject,
      message,
      sentBy: req.user._id,
      sentAt: new Date(),
      status: 'sent',
      messageId: emailResult.messageId
    });

    await candidate.save();

    res.json({
      success: true,
      message: `Email sent successfully to ${candidate.applicantEmail}`,
      emailData: {
        to: candidate.applicantEmail,
        subject,
        message,
        candidate: {
          email: candidate.applicantEmail,
          job: job.title
        },
        result: emailResult
      }
    });
  } catch (error) {
    console.error('Send email error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Error sending email',
      error: error.message 
    });
  }
});

// Bulk email sending
router.post('/bulk/send-email', auth, async (req, res) => {
  try {
    const { candidateIds, subject, message, emailType } = req.body;

    if (!candidateIds || !candidateIds.length) {
      return res.status(400).json({ message: 'No candidates selected' });
    }

    // Get logged-in user details
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Verify candidates belong to user's jobs
    const userJobs = await Job.find({ createdBy: req.user._id });
    const userJobIds = userJobs.map(job => job._id);

    const candidates = await Resume.find({
      _id: { $in: candidateIds },
      jobId: { $in: userJobIds }
    }).populate('jobId');

    const results = {
      total: candidates.length,
      successful: 0,
      failed: 0,
      details: []
    };

    // Send emails to each candidate
    for (const candidate of candidates) {
      try {
        const emailHtml = EmailService.getCustomEmailTemplate(
          candidate,
          candidate.jobId,
          subject,
          message,
          user // Pass user data
        );

        const emailResult = await EmailService.sendEmail(
          candidate.applicantEmail,
          subject,
          emailHtml,
          null,
          user // Pass user for sender information
        );

        if (emailResult.success) {
          results.successful++;
          results.details.push({
            candidate: candidate.applicantEmail,
            status: 'success',
            message: 'Email sent successfully'
          });

          // Log email activity with user info
          candidate.notes.push({
            content: `Bulk email sent: ${subject} (From: ${user.email})`,
            createdBy: req.user._id,
            emailSent: true,
            emailSubject: subject,
            sentBy: user.name,
            sentFrom: user.email
          });

          await candidate.save();
        } else {
          results.failed++;
          results.details.push({
            candidate: candidate.applicantEmail,
            status: 'failed',
            message: emailResult.error
          });
        }
      } catch (candidateError) {
        results.failed++;
        results.details.push({
          candidate: candidate.applicantEmail,
          status: 'failed',
          message: candidateError.message
        });
      }
    }

    res.json({
      success: true,
      message: `Bulk email completed: ${results.successful} successful, ${results.failed} failed`,
      sentBy: user.name,
      sentFrom: user.email,
      company: user.company,
      results
    });

  } catch (error) {
    console.error('Bulk email error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Error sending bulk emails',
      error: error.message 
    });
  }
});

router.get('/templates/predefined', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const templates = EmailService.getPredefinedTemplates(user);
    
    res.json({
      success: true,
      templates,
      userInfo: {
        name: user.name,
        email: user.email,
        company: user.company
      }
    });

  } catch (error) {
    console.error('Get templates error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Error fetching email templates'
    });
  }
});

// Auto-send status update emails
router.post('/:id/update-status-with-email', auth, async (req, res) => {
  try {
    const { status, customMessage } = req.body;
    const candidateId = req.params.id;

    const candidate = await Resume.findOne({ _id: candidateId })
      .populate('jobId');

    if (!candidate) {
      return res.status(404).json({ message: 'Candidate not found' });
    }

    if (candidate.jobId.createdBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const oldStatus = candidate.status;
    candidate.status = status;
    await candidate.save();

    // Send status update email
    const emailHtml = EmailService.getStatusUpdateTemplate(
      candidate,
      candidate.jobId,
      oldStatus,
      status
    );

    const emailResult = await EmailService.sendEmail(
      candidate.applicantEmail,
      `Application Status Update - ${candidate.jobId.title}`,
      emailHtml
    );

    res.json({
      success: true,
      message: `Status updated and email ${emailResult.success ? 'sent' : 'failed'}`,
      statusUpdated: true,
      emailSent: emailResult.success,
      candidate: candidate
    });

  } catch (error) {
    console.error('Status update with email error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Error updating status and sending email' 
    });
  }
});

module.exports = router;