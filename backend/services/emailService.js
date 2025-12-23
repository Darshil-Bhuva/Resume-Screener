const sgMail = require('@sendgrid/mail');
const { json } = require('express');
const nodemailer = require("nodemailer");

// Initialize SendGrid with your API key
sgMail.setApiKey(process.env.SENDGRID_API_KEY);

class EmailService {
  constructor() {
    this.fromEmail = 'harshalbadgujar.it23@scet.ac.in '|| process.env.SENDGRID_FROM_EMAIL || 'noreply@yourdomain.com';
    this.fromName = process.env.SENDGRID_FROM_NAME || 'Resume Screening App';
  }

  /**
   * Send email to candidate
   */
  async sendCandidateEmail(candidate, subject, htmlContent, textContent = null) {
    try {
      console.log(candidate.applicantEmail);
      if (!candidate.applicantEmail) {
        throw new Error('No recipient email address');
      }
        console.log("sendCandidateEmail : ",  candidate.applicantEmail);
      const msg = {
        to: candidate.applicantEmail,
        from: {
          email: this.fromEmail,
          name: this.fromName,
        },
        subject: subject,
        html: htmlContent,
        text: textContent || this.htmlToText(htmlContent),
        tracking_settings: {
          click_tracking: { enable: true },
          open_tracking: { enable: true },
        },
        mail_settings: {
          sandbox_mode: {
            enable: process.env.NODE_ENV === 'development' && process.env.SENDGRID_SANDBOX === 'true'
          }
        }
      };

      console.log('📧 Attempting to send email to:', candidate.applicantEmail);
      console.log('📧 From:', this.fromEmail);
      
      const response = await sgMail.send(msg);
      
      console.log('✅ Email queued successfully:', {
        statusCode: response[0].statusCode,
        headers: response[0].headers,
        messageId: response[0].headers['x-message-id']
      });

      return {
        success: true,
        messageId: response[0].headers['x-message-id'],
        statusCode: response[0].statusCode,
        candidateEmail: candidate.applicantEmail
      };

    } catch (error) {
      console.error('❌ SendGrid error:', {
        message: error.message,
        code: error.code,
        response: error.response?.body
      });

      // Enhanced error handling
      let userMessage = 'Failed to send email';
      
      if (error.response) {
        const sendGridError = error.response.body;
        if (sendGridError && sendGridError.errors) {
          userMessage = sendGridError.errors.map(err => err.message).join(', ');
        }
      } else if (error.code === 'UNAUTHORIZED') {
        userMessage = 'SendGrid API key is invalid';
      } else if (error.code === 'FORBIDDEN') {
        userMessage = 'SendGrid account not verified or domain not authenticated';
      }

      return {
        success: false,
        error: userMessage,
        details: error.response?.body || error.message
      };
    }
  }
     user =  process.env.USER;
     pass = process.env.PASS;
  // from nodemailer
  async sendEmail(candidate, emailData){
      const transporter = nodemailer.createTransport({
     host: 'smtp.gmail.com',
    port: 465,
      auth: {
        user: user,
        pass: pass  // use App Password, not real password
      }
    });

  // 2. Define email options
    const mailOptions = {
      from: "demoemail@gmail.com",
      to: candidate.applicantEmail,
      subject: emailData.subject,
      text: emailData.message
    };

  // 3. Send email
    try {
      const info = await transporter.sendMail(mailOptions);
      console.log("Email sent:", info.response);

        return {
        success: true,
        messageId: response[0].headers['x-message-id'],
        statusCode: response[0].statusCode,
        candidateEmail: candidate.applicantEmail
      };

    } catch (err) {
      console.error("Error sending email:", err);
    }

  }


  /**
   * Convert HTML to plain text (fallback)
   */
  htmlToText(html) {
    return html
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<p\s*\/?>/gi, '\n\n')
      .replace(/<[^>]+>/g, '')
      .replace(/&nbsp;/g, ' ')
      .trim();
  }

  /**
   * Send interview invitation
   */
  async sendInterviewInvitation(candidate, interviewDetails) {
    const subject = `Interview Invitation - ${candidate.jobId?.title || 'Position'}`;
    
    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #2563eb; color: white; padding: 20px; text-align: center; }
            .content { padding: 20px; background: #f9fafb; }
            .details { background: white; padding: 15px; border-radius: 5px; margin: 15px 0; }
            .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 14px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Interview Invitation</h1>
            </div>
            <div class="content">
              <p>Dear Candidate,</p>
              <p>Thank you for your interest in the <strong>${candidate.jobId?.title || 'position'}</strong>.</p>
              
              <div class="details">
                <h3>Interview Details:</h3>
                <p><strong>Date:</strong> ${interviewDetails.date}</p>
                <p><strong>Time:</strong> ${interviewDetails.time}</p>
                <p><strong>Type:</strong> ${interviewDetails.type || 'Video Call'}</p>
                <p><strong>Location/Link:</strong> ${interviewDetails.location || interviewDetails.link}</p>
                ${interviewDetails.notes ? `<p><strong>Additional Notes:</strong> ${interviewDetails.notes}</p>` : ''}
              </div>
              
              <p>Please confirm your availability by replying to this email.</p>
              <p>Best regards,<br>Recruitment Team</p>
            </div>
            <div class="footer">
              <p>This is an automated message. Please do not reply directly to this email.</p>
            </div>
          </div>
        </body>
      </html>
    `;

    return this.sendCandidateEmail(candidate, subject, htmlContent);
    
  }

  /**
   * Send rejection email
   */
  async sendRejectionEmail(candidate, feedback = '') {
    const subject = `Update on Your Application - ${candidate.jobId?.title || 'Position'}`;
    
    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #dc2626; color: white; padding: 20px; text-align: center; }
            .content { padding: 20px; background: #f9fafb; }
            .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 14px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Application Update</h1>
            </div>
            <div class="content">
              <p>Dear Candidate,</p>
              <p>Thank you for your interest in the <strong>${candidate.jobId?.title || 'position'}</strong> and for the time you invested in the application process.</p>
              
              <p>After careful consideration, we regret to inform you that we have decided to move forward with other candidates whose qualifications more closely match our current needs.</p>
              
              ${feedback ? `<p><strong>Feedback:</strong> ${feedback}</p>` : ''}
              
              <p>We appreciate your interest in our company and encourage you to apply for future positions that match your skills and experience.</p>
              
              <p>Best regards,<br>Recruitment Team</p>
            </div>
            <div class="footer">
              <p>This is an automated message. Please do not reply directly to this email.</p>
            </div>
          </div>
        </body>
      </html>
    `;

    return this.sendCandidateEmail(candidate, subject, htmlContent);
  }

  /**
   * Send custom email
   */
  async sendCustomEmail(candidate, emailData) {
    console.log(candidate.applicantEmail);
    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #2563eb; color: white; padding: 20px; text-align: center; }
            .content { padding: 20px; background: #f9fafb; white-space: pre-wrap; }
            .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 14px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>${emailData.subject}</h1>
            </div>
            <div class="content">
              ${emailData.message.replace(/\n/g, '<br>')}
            </div>
            <div class="footer">
              <p>This email was sent from Resume Screening App.</p>
            </div>
          </div>
        </body>
      </html>
    `;

    // return this.sendCandidateEmail(candidate, emailData.subject, htmlContent);
    return this.sendEmail(candidate, emailData);
  }
}

module.exports = new EmailService();