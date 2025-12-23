const EmailService = require('../utils/emailService');
const User = require('../models/User');

// Real email sending endpoint - UPDATED
router.post('/:id/send-email', auth, async (req, res) => {
  try {
    const { subject, message, emailType, interviewDetails } = req.body;
    const candidateId = req.params.id;

    // Get logged-in user details
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const candidate = await Resume.findOne({ _id: candidateId })
      .populate('jobId');

    if (!candidate) {
      return res.status(404).json({ message: 'Candidate not found' });
    }

    if (candidate.jobId.createdBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }

    let emailHtml, emailSubject;

    // Determine email type and template
    if (emailType === 'status_update') {
      emailHtml = EmailService.getStatusUpdateTemplate(
        candidate, 
        candidate.jobId, 
        candidate.status, 
        message, // new status
        user // Pass user data
      );
      emailSubject = `Application Update - ${candidate.jobId.title} - ${user.company}`;
    } 
    else if (emailType === 'interview') {
      emailHtml = EmailService.getInterviewScheduleTemplate(
        candidate,
        candidate.jobId,
        interviewDetails,
        user // Pass user data
      );
      emailSubject = `Interview Invitation - ${candidate.jobId.title} - ${user.company}`;
    }
    else {
      // Custom email
      emailHtml = EmailService.getCustomEmailTemplate(
        candidate,
        candidate.jobId,
        subject,
        message,
        user // Pass user data
      );
      emailSubject = subject;
    }

    // Send actual email with user data
    const emailResult = await EmailService.sendEmail(
      candidate.applicantEmail,
      emailSubject,
      emailHtml,
      null,
      user // Pass user for sender information
    );

    if (!emailResult.success) {
      return res.status(500).json({
        success: false,
        message: 'Failed to send email',
        error: emailResult.error
      });
    }

    // Log email activity
    candidate.notes.push({
      content: `Email sent: ${emailSubject} (From: ${user.email})`,
      createdBy: req.user._id,
      emailSent: true,
      emailSubject: emailSubject,
      sentBy: user.name,
      sentFrom: user.email
    });

    await candidate.save();

    res.json({
      success: true,
      message: `Email sent successfully to ${candidate.applicantEmail}`,
      emailData: {
        to: candidate.applicantEmail,
        from: user.email,
        company: user.company,
        subject: emailSubject,
        type: emailType
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

// Bulk email sending - UPDATED
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

// Get user email templates - NEW ENDPOINT
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