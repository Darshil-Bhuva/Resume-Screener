const emailService = require('../services/emailService');

class EmailController {
  /**
   * Send application status update
   */
  async sendStatusUpdate(req, res) {
    try {
      const { candidateEmail, candidateName, jobTitle, status, feedback } = req.body;

      // Validate required fields
      if (!candidateEmail || !candidateName || !jobTitle || !status) {
        return res.status(400).json({
          success: false,
          error: 'Missing required fields: candidateEmail, candidateName, jobTitle, status'
        });
      }

      // Validate status
      const validStatuses = ['accepted', 'rejected', 'shortlisted', 'review'];
      if (!validStatuses.includes(status)) {
        return res.status(400).json({
          success: false,
          error: `Invalid status. Must be one of: ${validStatuses.join(', ')}`
        });
      }

      const result = await emailService.sendApplicationStatus(
        candidateEmail, 
        candidateName, 
        jobTitle, 
        status, 
        feedback
      );

      if (result.success) {
        res.json({
          success: true,
          message: 'Email sent successfully',
          messageId: result.messageId
        });
      } else {
        res.status(500).json({
          success: false,
          error: 'Failed to send email',
          details: result.error
        });
      }

    } catch (error) {
      console.error('Controller Error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        details: error.message
      });
    }
  }

  /**
   * Send interview invitation
   */
  async sendInterviewInvite(req, res) {
    try {
      const { candidateEmail, candidateName, jobTitle, interviewDate, interviewType, meetingLink } = req.body;

      if (!candidateEmail || !candidateName || !jobTitle || !interviewDate || !interviewType) {
        return res.status(400).json({
          success: false,
          error: 'Missing required fields'
        });
      }

      const result = await emailService.sendInterviewInvitation(
        candidateEmail,
        candidateName,
        jobTitle,
        interviewDate,
        interviewType,
        meetingLink
      );

      if (result.success) {
        res.json({
          success: true,
          message: 'Interview invitation sent successfully',
          messageId: result.messageId
        });
      } else {
        res.status(500).json({
          success: false,
          error: 'Failed to send interview invitation',
          details: result.error
        });
      }

    } catch (error) {
      console.error('Controller Error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }

  /**
   * Bulk send status updates
   */
  async bulkSendStatusUpdates(req, res) {
    try {
      const { updates } = req.body;

      if (!Array.isArray(updates) || updates.length === 0) {
        return res.status(400).json({
          success: false,
          error: 'Updates array is required and cannot be empty'
        });
      }

      const results = [];
      for (const update of updates) {
        const result = await emailService.sendApplicationStatus(
          update.candidateEmail,
          update.candidateName,
          update.jobTitle,
          update.status,
          update.feedback
        );
        results.push({
          candidateEmail: update.candidateEmail,
          success: result.success,
          messageId: result.messageId,
          error: result.error
        });
      }

      const successful = results.filter(r => r.success).length;
      const failed = results.filter(r => !r.success).length;

      res.json({
        success: true,
        message: `Bulk send completed: ${successful} successful, ${failed} failed`,
        results: results
      });

    } catch (error) {
      console.error('Bulk Send Error:', error);
      res.status(500).json({
        success: false,
        error: 'Bulk send failed'
      });
    }
  }
}

module.exports = new EmailController();