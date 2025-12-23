//components/resumecard.js

import React, { useState } from 'react';
import { 
  getScoreColor, 
  getScoreLevel, 
  getStatusDisplay, 
  formatDate, 
  generateRandomColor 
} from '../utils/helpers';

const ResumeCard = ({ 
  resume, 
  onStatusChange, 
  onScreen, 
  onAddNote,
  showActions = true 
}) => {
  const [showNotes, setShowNotes] = useState(false);
  const [newNote, setNewNote] = useState('');
  const [loading, setLoading] = useState({ view: false, download: false });

  if (!resume) return null;

  const handleAddNote = () => {
    if (newNote.trim()) {
      onAddNote(resume._id, newNote.trim());
      setNewNote('');
      setShowNotes(false);
    }
  };

  const handleStatusChange = (newStatus) => {
    onStatusChange(resume._id, newStatus);
  };

  // Get API base URL
  const getApiBaseUrl = () => {
    return process.env.REACT_APP_API_URL || 'http://localhost:5000';
  };

  // View resume function - COMPLETELY FIXED
  const handleViewResume = async () => {
    if (!resume.resumeFile) {
      alert('No resume file available');
      return;
    }

    setLoading(prev => ({ ...prev, view: true }));
    
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        alert('Please log in to view files');
        return;
      }

      const apiUrl = getApiBaseUrl();
      const resumeUrl = `${apiUrl}/api/resumes/${resume._id}/file`;
      
      console.log('🔗 Opening resume URL:', resumeUrl);

      // Method: Direct window open with token
      const headers = new Headers();
      headers.append('Authorization', `Bearer ${token}`);
      
      fetch(resumeUrl, { headers })
        .then(response => {
          if (!response.ok) throw new Error('Failed to fetch file');
          return response.blob();
        })
        .then(blob => {
          const fileURL = URL.createObjectURL(blob);
          const newWindow = window.open(fileURL, '_blank');
          if (!newWindow) {
            alert('Please allow popups to view the resume');
          }
        })
        .catch(error => {
          console.error('❌ Error viewing resume:', error);
          // Fallback: Direct link
          window.open(resumeUrl, '_blank');
        });

    } catch (error) {
      console.error('❌ View resume error:', error);
      alert('Failed to open resume. Please try downloading instead.');
    } finally {
      setLoading(prev => ({ ...prev, view: false }));
    }
  };

  // Download resume function - COMPLETELY FIXED
  const handleDownloadResume = async () => {
    if (!resume.resumeFile) {
      alert('No resume file available');
      return;
    }

    setLoading(prev => ({ ...prev, download: true }));
    
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        alert('Please log in to download files');
        return;
      }

      const apiUrl = getApiBaseUrl();
      const resumeUrl = `${apiUrl}/api/resumes/${resume._id}/file?download=true`;
      
      console.log('📥 Downloading from:', resumeUrl);

      const response = await fetch(resumeUrl, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/pdf',
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Server returned ${response.status}: ${response.statusText}`);
      }

      const blob = await response.blob();
      
      // Validate blob
      if (blob.size === 0) {
        throw new Error('Received empty file (0 bytes)');
      }

      if (blob.type !== 'application/pdf') {
        console.warn('⚠️ Expected PDF but received:', blob.type);
      }

      // Create download link
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      
      // Get filename
      let filename = resume.resumeFile.originalName || 'resume.pdf';
      
      // Clean filename
      filename = filename.replace(/[^a-zA-Z0-9.-]/g, '_');
      if (!filename.toLowerCase().endsWith('.pdf')) {
        filename += '.pdf';
      }
      
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      // Clean up
      setTimeout(() => {
        window.URL.revokeObjectURL(url);
      }, 100);
      
      console.log('✅ Download completed:', filename);
      
    } catch (error) {
      console.error('❌ Download error:', error);
      alert(`Download failed: ${error.message}\n\nPlease check:\n1. You are logged in\n2. The file exists on server\n3. Check browser console for details`);
    } finally {
      setLoading(prev => ({ ...prev, download: false }));
    }
  };

  // Generate initials from email
  const getEmailInitials = (email) => {
    if (!email) return '?';
    const username = email.split('@')[0];
    return username.charAt(0).toUpperCase();
  };

  const initials = getEmailInitials(resume.applicantEmail);
  const randomColor = generateRandomColor();

  return (
    <div className="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow duration-300 p-6">
      {/* Header Section */}
      <div className="flex justify-between items-start mb-4">
        <div className="flex items-start space-x-4 flex-1">
          {/* Applicant Avatar */}
          <div 
            className="flex-shrink-0 h-12 w-12 rounded-full flex items-center justify-center text-white font-semibold"
            style={{ backgroundColor: randomColor }}
          >
            {initials}
          </div>
          
          {/* Applicant Info */}
          <div className="flex-1 min-w-0">
            <div className="flex flex-col sm:flex-row sm:items-center sm:space-x-4 text-sm text-gray-600">
              <a 
                href={`mailto:${resume.applicantEmail}`} 
                className="hover:text-blue-600 truncate font-medium text-gray-900"
              >
                {resume.applicantEmail}
              </a>
              {resume.applicantPhone && (
                <span className="truncate text-gray-600">{resume.applicantPhone}</span>
              )}
            </div>
            <div className="flex items-center space-x-2 mt-1">
              <span className="text-xs text-gray-500">
                Applied {formatDate(resume.createdAt)}
              </span>
              {resume.dataSource && (
                <span className={`text-xs px-2 py-1 rounded ${
                  resume.dataSource === 'auto' 
                    ? 'bg-green-100 text-green-800' 
                    : 'bg-blue-100 text-blue-800'
                }`}>
                  {resume.dataSource === 'auto' ? 'Auto-filled' : 'Manual entry'}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Status and Actions */}
        <div className="flex flex-col items-end space-y-2 ml-4">
          {showActions && (
            <select
              value={resume.status}
              onChange={(e) => handleStatusChange(e.target.value)}
              className="text-sm border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="new">New</option>
              <option value="screened">Screened</option>
              <option value="shortlisted">Shortlisted</option>
              <option value="rejected">Rejected</option>
              <option value="interview">Interview</option>
            </select>
          )}
          
          <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium capitalize ${
            resume.status === 'shortlisted' ? 'bg-green-100 text-green-800' :
            resume.status === 'rejected' ? 'bg-red-100 text-red-800' :
            resume.status === 'interview' ? 'bg-purple-100 text-purple-800' :
            resume.status === 'screened' ? 'bg-blue-100 text-blue-800' :
            'bg-gray-100 text-gray-800'
          }`}>
            {getStatusDisplay(resume.status)}
          </span>
        </div>
      </div>

      {/* Resume File Actions - UPDATED */}
      {resume.resumeFile && (
        <div className="mb-4 p-3 bg-gray-50 rounded-lg border border-gray-200">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
            <div className="flex items-center flex-1">
              <svg className="w-5 h-5 text-red-500 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <div className="min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">
                  {resume.resumeFile.originalName}
                </p>
                <p className="text-xs text-gray-500">
                  Uploaded {formatDate(resume.createdAt)} • 
                  {resume.resumeFile.size ? ` ${(resume.resumeFile.size / 1024 / 1024).toFixed(2)} MB` : ''}
                </p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={handleViewResume}
                disabled={loading.view || loading.download}
                className="inline-flex items-center px-3 py-2 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed min-w-[120px] justify-center"
              >
                {loading.view ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Opening...
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                    View Resume
                  </>
                )}
              </button>
              <button
                onClick={handleDownloadResume}
                disabled={loading.download || loading.view}
                className="inline-flex items-center px-3 py-2 bg-green-600 text-white rounded text-sm hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed min-w-[120px] justify-center"
              >
                {loading.download ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Downloading...
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                    Download
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Screening Results */}
      {resume.screeningResults ? (
        <div className="mb-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
            {/* Overall Score */}
            <div className="text-center">
              <div className={`text-2xl font-bold rounded-lg p-2 ${getScoreColor(resume.score)}`}>
                {resume.score}%
              </div>
              <p className="text-xs text-gray-600 mt-1">Overall Score</p>
              <p className="text-xs text-gray-500">{getScoreLevel(resume.score)}</p>
            </div>

            {/* Skills Match */}
            <div className="text-center">
              <div className="text-xl font-semibold text-gray-900">
                {resume.screeningResults.skillsMatch}%
              </div>
              <p className="text-xs text-gray-600">Skills Match</p>
            </div>

            {/* Experience Match */}
            <div className="text-center">
              <div className="text-xl font-semibold text-gray-900">
                {resume.screeningResults.experienceMatch}%
              </div>
              <p className="text-xs text-gray-600">Experience</p>
              {resume.screeningResults.foundExperience > 0 && (
                <p className="text-xs text-gray-500">
                  {resume.screeningResults.foundExperience} years
                </p>
              )}
            </div>

            {/* Actions */}
            {showActions && (
              <div className="text-center flex flex-col space-y-1">
                <button
                  onClick={() => setShowNotes(!showNotes)}
                  className="text-sm text-blue-600 hover:text-blue-800"
                >
                  {showNotes ? 'Hide Notes' : 'Add Note'}
                </button>
                {!resume.screeningResults && onScreen && (
                  <button
                    onClick={() => onScreen(resume._id)}
                    className="text-sm text-green-600 hover:text-green-800"
                  >
                    Screen Again
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Skills Analysis */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            {/* Matched Skills */}
            <div>
              <p className="font-medium text-green-600 mb-1">Matched Skills ({resume.screeningResults.matchedKeywords.length}):</p>
              <div className="flex flex-wrap gap-1">
                {resume.screeningResults.matchedKeywords.map((skill, index) => (
                  <span
                    key={index}
                    className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-green-100 text-green-800"
                  >
                    {skill}
                  </span>
                ))}
                {resume.screeningResults.matchedKeywords.length === 0 && (
                  <span className="text-xs text-gray-500">No skills matched</span>
                )}
              </div>
            </div>

            {/* Missing Skills */}
            <div>
              <p className="font-medium text-red-600 mb-1">Missing Skills ({resume.screeningResults.missingKeywords.length}):</p>
              <div className="flex flex-wrap gap-1">
                {resume.screeningResults.missingKeywords.map((skill, index) => (
                  <span
                    key={index}
                    className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-red-100 text-red-800"
                  >
                    {skill}
                  </span>
                ))}
                {resume.screeningResults.missingKeywords.length === 0 && (
                  <span className="text-xs text-gray-500">All skills matched</span>
                )}
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* No Screening Results */
        <div className="mb-4 p-4 bg-yellow-50 rounded-lg border border-yellow-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <svg className="w-5 h-5 text-yellow-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.35 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
              <span className="text-yellow-800 font-medium">Not Screened Yet</span>
            </div>
            {showActions && onScreen && (
              <button
                onClick={() => onScreen(resume._id)}
                className="bg-green-600 text-white px-3 py-1 rounded text-sm hover:bg-green-700"
              >
                Screen Now
              </button>
            )}
          </div>
        </div>
      )}

      {/* Notes Section */}
      {showNotes && (
        <div className="mt-4 p-4 bg-gray-50 rounded-lg">
          <h4 className="font-medium text-gray-900 mb-2">Add Note</h4>
          <textarea
            value={newNote}
            onChange={(e) => setNewNote(e.target.value)}
            placeholder="Add your notes about this candidate..."
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            rows="3"
          />
          <div className="flex justify-end space-x-2 mt-2">
            <button
              onClick={() => setShowNotes(false)}
              className="px-3 py-1 text-sm text-gray-600 hover:text-gray-800"
            >
              Cancel
            </button>
            <button
              onClick={handleAddNote}
              disabled={!newNote.trim()}
              className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Add Note
            </button>
          </div>
        </div>
      )}

      {/* Existing Notes */}
      {resume.notes && resume.notes.length > 0 && (
        <div className="mt-4">
          <h4 className="font-medium text-gray-900 mb-2">Notes ({resume.notes.length})</h4>
          <div className="space-y-2 max-h-32 overflow-y-auto">
            {resume.notes.map((note, index) => (
              <div key={index} className="bg-gray-50 p-3 rounded text-sm">
                <p className="text-gray-800">{note.content}</p>
                <p className="text-xs text-gray-500 mt-1">
                  {formatDate(note.createdAt)}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default ResumeCard;