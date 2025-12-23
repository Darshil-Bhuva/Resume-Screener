const express = require('express');
const router = express.Router();

// Try to import Candidate model with error handling
let Candidate;
try {
  Candidate = require('../models/Candidate');
} catch (error) {
  console.error('❌ Candidate model not found. Creating mock implementation...');
  // Mock implementation for development
  Candidate = {
    findById: () => ({
      populate: () => Promise.resolve(null)
    })
  };
}

const emailService = require('../services/emailService');

/**
 * Send custom email to candidate
 */
router.post('/send', async (req, res) => {
  try {
    const { candidateId, subject, message } = req.body;

    if (!candidateId || !subject || !message) {
      return res.status(400).json({
        success: false,
        error: 'Candidate ID, subject, and message are required'
      });
    }

    console.log('📧 Sending email to candidate:', candidateId);

    // Find candidate
    const candidate = await Candidate.findById(candidateId).populate('jobId');
    if (!candidate) {
      return res.status(404).json({
        success: false,
        error: 'Candidate not found'
      });
    }

    console.log('📧 Found candidate:', candidate.applicantEmail);

    // Send email
    const result = await emailService.sendCustomEmail(candidate, {
      subject,
      message
    });

    if (result.success) {
      // Update candidate's last contacted date
      candidate.lastContacted = new Date();
      await candidate.save();

      res.json({
        success: true,
        message: 'Email sent successfully',
        messageId: result.messageId,
        candidateEmail: candidate.applicantEmail
      });
    } else {
      res.status(500).json({
        success: false,
        error: result.error,
        details: result.details
      });
    }

  } catch (error) {
    console.error('❌ Email route error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      details: error.message
    });
  }
});

/**
 * Send interview invitation
 */
router.post('/send-interview', async (req, res) => {
  try {
    const { candidateId, interviewDate, interviewTime, interviewType, interviewLocation, notes } = req.body;

    if (!candidateId || !interviewDate || !interviewTime) {
      return res.status(400).json({
        success: false,
        error: 'Candidate ID, date, and time are required'
      });
    }

    const candidate = await Candidate.findById(candidateId).populate('jobId');
    if (!candidate) {
      return res.status(404).json({
        success: false,
        error: 'Candidate not found'
      });
    }

    const interviewDetails = {
      date: interviewDate,
      time: interviewTime,
      type: interviewType,
      location: interviewLocation,
      notes: notes
    };

    const result = await emailService.sendInterviewInvitation(candidate, interviewDetails);

    if (result.success) {
      // Update candidate status to interview
      candidate.status = 'interview';
      candidate.lastContacted = new Date();
      await candidate.save();

      res.json({
        success: true,
        message: 'Interview invitation sent successfully',
        messageId: result.messageId
      });
    } else {
      res.status(500).json({
        success: false,
        error: result.error
      });
    }

  } catch (error) {
    console.error('❌ Interview email error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to send interview invitation'
    });
  }
});

/**
 * Send rejection email
 */
router.post('/send-rejection', async (req, res) => {
  try {
    const { candidateId, feedback } = req.body;

    if (!candidateId) {
      return res.status(400).json({
        success: false,
        error: 'Candidate ID is required'
      });
    }

    const candidate = await Candidate.findById(candidateId).populate('jobId');
    if (!candidate) {
      return res.status(404).json({
        success: false,
        error: 'Candidate not found'
      });
    }

    const result = await emailService.sendRejectionEmail(candidate, feedback);

    if (result.success) {
      // Update candidate status to rejected
      candidate.status = 'rejected';
      candidate.lastContacted = new Date();
      await candidate.save();

      res.json({
        success: true,
        message: 'Rejection email sent successfully',
        messageId: result.messageId
      });
    } else {
      res.status(500).json({
        success: false,
        error: result.error
      });
    }

  } catch (error) {
    console.error('❌ Rejection email error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to send rejection email'
    });
  }
});

/**
 * Check email delivery status
 */
router.get('/status/:messageId', async (req, res) => {
  res.json({
    success: true,
    status: 'queued',
    message: 'Email has been queued for delivery. Set up webhooks for real-time status.'
  });
});

/**
 * Test email configuration
 */
router.get('/test-config', async (req, res) => {
  try {
    const testCandidate = {
      applicantEmail: process.env.TEST_EMAIL || 'test@example.com',
      jobId: { title: 'Test Position' }
    };

    const result = await emailService.sendCustomEmail(testCandidate, {
      subject: 'Test Email from Resume Screening App',
      message: 'This is a test email to verify your SendGrid configuration is working properly.'
    });

    res.json({
      success: result.success,
      message: result.success ? 'Test email sent successfully' : result.error,
      details: result
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Test failed',
      details: error.message
    });
  }
});

module.exports = router;