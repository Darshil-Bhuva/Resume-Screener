import React, { useState } from 'react';
import axios from 'axios';

const EmailComposer = ({ candidate, onClose, onSent }) => {
  const [emailData, setEmailData] = useState({
    subject: '',
    message: '',
    type: 'custom' // 'custom', 'interview', 'rejection'
  });
  const [interviewDetails, setInterviewDetails] = useState({
    date: '',
    time: '',
    type: 'video',
    location: '',
    notes: ''
  });
  const [rejectionFeedback, setRejectionFeedback] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Predefined templates
  const templateOptions = {
    custom: 'Custom Email',
    interview: 'Interview Invitation',
    rejection: 'Rejection Email'
  };

  // Load template
  const loadTemplate = (templateType) => {
    setEmailData(prev => ({ ...prev, type: templateType }));
    
    switch (templateType) {
      case 'interview':
        setEmailData({
          type: 'interview',
          subject: `Interview Invitation - ${candidate.jobId?.title || 'Position'}`,
          message: `Dear Candidate,\n\nThank you for your application for the ${candidate.jobId?.title || 'position'}.\n\nWe would like to invite you for an interview. Please let us know your availability.\n\nBest regards,\nRecruitment Team`
        });
        break;
      case 'rejection':
        setEmailData({
          type: 'rejection',
          subject: `Update on Your Application - ${candidate.jobId?.title || 'Position'}`,
          message: `Dear Candidate,\n\nThank you for your interest in our company and for the time you invested in the application process.\n\nAfter careful consideration, we regret to inform you that we have decided to move forward with other candidates whose qualifications more closely match our current needs.\n\nWe appreciate your interest and encourage you to apply for future positions.\n\nBest regards,\nRecruitment Team`
        });
        break;
      default:
        setEmailData({
          type: 'custom',
          subject: '',
          message: ''
        });
    }
  };

  const handleSendEmail = async () => {
    if (!emailData.subject.trim() || !emailData.message.trim()) {
      setError('Subject and message are required');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      let response;

      if (emailData.type === 'interview') {
        // Send interview invitation
        response = await axios.post('/api/email/send-interview', {
          candidateId: candidate._id,
          interviewDate: interviewDetails.date,
          interviewTime: interviewDetails.time,
          interviewType: interviewDetails.type,
          interviewLocation: interviewDetails.location,
          notes: interviewDetails.notes
        });
      } else if (emailData.type === 'rejection') {
        // Send rejection email
        response = await axios.post('/api/email/send-rejection', {
          candidateId: candidate._id,
          feedback: rejectionFeedback
        });
      } else {
        // Send custom email
        response = await axios.post('/api/email/send', {
          candidateId: candidate._id,
          subject: emailData.subject,
          message: emailData.message
        });
      }

      if (response.data.success) {
        setSuccess(`Email sent successfully to ${candidate.applicantEmail}`);
        
        // Clear form
        setEmailData({ subject: '', message: '', type: 'custom' });
        setInterviewDetails({ date: '', time: '', type: 'video', location: '', notes: '' });
        setRejectionFeedback('');
        
        // Callback to parent
        setTimeout(() => {
          if (onSent) onSent();
        }, 2000);
      } else {
        setError(response.data.error || 'Failed to send email');
      }
    } catch (error) {
      console.error('Email sending error:', error);
      const errorMessage = error.response?.data?.error || 
                          error.response?.data?.details || 
                          'Failed to send email. Please check your SendGrid configuration.';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex justify-between items-center p-4 border-b">
          <h3 className="text-lg font-semibold text-gray-900">
            Send Email to Candidate
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Candidate Info */}
        <div className="p-4 bg-gray-50 border-b">
          <div className="flex items-center space-x-3">
            <div className="flex-shrink-0 h-10 w-10 bg-blue-500 rounded-full flex items-center justify-center text-white font-semibold">
              {candidate.applicantEmail?.charAt(0).toUpperCase() || '?'}
            </div>
            <div>
              <div className="text-sm font-medium text-gray-900">
                {candidate.applicantEmail}
              </div>
              <div className="text-sm text-gray-500">
                {candidate.jobId?.title || 'No job specified'}
              </div>
            </div>
          </div>
        </div>

        {/* Email Content */}
        <div className="p-4 space-y-4 overflow-y-auto max-h-[60vh]">
          {/* Template Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Email Template
            </label>
            <div className="flex space-x-2">
              {Object.entries(templateOptions).map(([value, label]) => (
                <button
                  key={value}
                  onClick={() => loadTemplate(value)}
                  className={`px-3 py-2 text-sm rounded-md ${
                    emailData.type === value
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Subject */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Subject *
            </label>
            <input
              type="text"
              value={emailData.subject}
              onChange={(e) => setEmailData(prev => ({ ...prev, subject: e.target.value }))}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Email subject..."
            />
          </div>

          {/* Interview Details */}
          {emailData.type === 'interview' && (
            <div className="space-y-3 p-3 bg-blue-50 rounded-md">
              <h4 className="font-medium text-blue-900">Interview Details</h4>
              
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm text-blue-800 mb-1">Date *</label>
                  <input
                    type="date"
                    value={interviewDetails.date}
                    onChange={(e) => setInterviewDetails(prev => ({ ...prev, date: e.target.value }))}
                    className="w-full border border-blue-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm text-blue-800 mb-1">Time *</label>
                  <input
                    type="time"
                    value={interviewDetails.time}
                    onChange={(e) => setInterviewDetails(prev => ({ ...prev, time: e.target.value }))}
                    className="w-full border border-blue-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm text-blue-800 mb-1">Type</label>
                  <select
                    value={interviewDetails.type}
                    onChange={(e) => setInterviewDetails(prev => ({ ...prev, type: e.target.value }))}
                    className="w-full border border-blue-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="video">Video Call</option>
                    <option value="phone">Phone Call</option>
                    <option value="in-person">In-Person</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-blue-800 mb-1">
                    {interviewDetails.type === 'in-person' ? 'Address' : 'Link'}
                  </label>
                  <input
                    type="text"
                    value={interviewDetails.location}
                    onChange={(e) => setInterviewDetails(prev => ({ ...prev, location: e.target.value }))}
                    className="w-full border border-blue-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder={interviewDetails.type === 'in-person' ? 'Office address...' : 'Meeting link...'}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm text-blue-800 mb-1">Additional Notes</label>
                <textarea
                  value={interviewDetails.notes}
                  onChange={(e) => setInterviewDetails(prev => ({ ...prev, notes: e.target.value }))}
                  rows="2"
                  className="w-full border border-blue-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Any additional instructions..."
                />
              </div>
            </div>
          )}

          {/* Rejection Feedback */}
          {emailData.type === 'rejection' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Feedback (Optional)
              </label>
              <textarea
                value={rejectionFeedback}
                onChange={(e) => setRejectionFeedback(e.target.value)}
                rows="3"
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Optional feedback for the candidate..."
              />
            </div>
          )}

          {/* Message */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Message *
            </label>
            <textarea
              value={emailData.message}
              onChange={(e) => setEmailData(prev => ({ ...prev, message: e.target.value }))}
              rows="8"
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Type your email message here..."
            />
          </div>

          {/* Status Messages */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-md p-3">
              <div className="flex items-center">
                <svg className="w-5 h-5 text-red-400 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
                <span className="text-red-800 text-sm">{error}</span>
              </div>
            </div>
          )}

          {success && (
            <div className="bg-green-50 border border-green-200 rounded-md p-3">
              <div className="flex items-center">
                <svg className="w-5 h-5 text-green-400 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <span className="text-green-800 text-sm">{success}</span>
              </div>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex justify-end space-x-3 p-4 border-t bg-gray-50">
          <button
            onClick={onClose}
            disabled={loading}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            Cancel
          </button>
          <button
            onClick={handleSendEmail}
            disabled={loading || !emailData.subject.trim() || !emailData.message.trim()}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <div className="flex items-center">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Sending...
              </div>
            ) : (
              'Send Email'
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default EmailComposer;