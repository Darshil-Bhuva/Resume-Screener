//components/candidatedashboard.js
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import EmailComposer from './EmailComposer';

const CandidateDashboard = () => {
  const [candidates, setCandidates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pipelineStats, setPipelineStats] = useState(null);
  const [filters, setFilters] = useState({
    status: 'all',
    scoreMin: '',
    scoreMax: '',
    skills: '',
    jobId: 'all',
    dateFrom: '',
    dateTo: '',
    search: ''
  });
  const [selectedCandidates, setSelectedCandidates] = useState(new Set());
  const [pagination, setPagination] = useState({});
  const [jobs, setJobs] = useState([]);
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [selectedCandidate, setSelectedCandidate] = useState(null);
  const [showResumeModal, setShowResumeModal] = useState(false);
  const [selectedResume, setSelectedResume] = useState(null);
  const [resumeLoading, setResumeLoading] = useState(false);

  useEffect(() => {
    fetchJobs();
    fetchCandidates();
  }, [filters]);

  const fetchJobs = async () => {
    try {
      const response = await axios.get('/api/jobs');
      setJobs(response.data);
    } catch (error) {
      console.error('Error fetching jobs:', error);
    }
  };

  const fetchCandidates = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      
      Object.entries(filters).forEach(([key, value]) => {
        if (value && value !== 'all') {
          params.append(key, value);
        }
      });

      const response = await axios.get(`/api/candidates?${params}`);
      setCandidates(response.data.candidates);
      setPipelineStats(response.data.pipelineStats);
      setPagination(response.data.pagination);
    } catch (error) {
      console.error('Error fetching candidates:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({
      ...prev,
      [key]: value
    }));
    setSelectedCandidates(new Set());
  };

  const handleBulkStatusChange = async (status) => {
    if (selectedCandidates.size === 0) {
      alert('Please select at least one candidate');
      return;
    }

    try {
      const response = await axios.put('/api/candidates/bulk-status', {
        candidateIds: Array.from(selectedCandidates),
        status
      });

      alert(response.data.message);
      setSelectedCandidates(new Set());
      fetchCandidates();
    } catch (error) {
      console.error('Bulk status update error:', error);
      alert('Error updating candidates');
    }
  };

  const toggleCandidateSelection = (candidateId) => {
    const newSelected = new Set(selectedCandidates);
    if (newSelected.has(candidateId)) {
      newSelected.delete(candidateId);
    } else {
      newSelected.add(candidateId);
    }
    setSelectedCandidates(newSelected);
  };

  const selectAllCandidates = () => {
    if (selectedCandidates.size === candidates.length) {
      setSelectedCandidates(new Set());
    } else {
      setSelectedCandidates(new Set(candidates.map(c => c._id)));
    }
  };

  // Enhanced View resume function
  const handleViewResume = async (candidate) => {
    if (!candidate.resumeFile) {
      alert('No resume file available');
      return;
    }

    setResumeLoading(true);
    setSelectedResume(candidate);
    
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        alert('Please log in to view files');
        return;
      }

      const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:5000';
      const resumeUrl = `${apiUrl}/api/resumes/${candidate._id}/file`;
      
      // Method 1: Open in modal
      const response = await fetch(resumeUrl, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch file');
      }

      const blob = await response.blob();
      const fileURL = URL.createObjectURL(blob);
      
      // Set the URL for modal
      setSelectedResume(prev => ({
        ...prev,
        resumeUrl: fileURL
      }));
      setShowResumeModal(true);

    } catch (error) {
      console.error('❌ Error viewing resume:', error);
      
      // Fallback: Direct window open
      try {
        const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:5000';
        const resumeUrl = `${apiUrl}/api/resumes/${candidate._id}/file`;
        window.open(resumeUrl, '_blank');
      } catch (fallbackError) {
        console.error('❌ Fallback error:', fallbackError);
        alert('Failed to open resume. Please try downloading instead.');
      }
    } finally {
      setResumeLoading(false);
    }
  };

  // Download resume function
  const handleDownloadResume = async (candidate) => {
    if (!candidate.resumeFile) {
      alert('No resume file available');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        alert('Please log in to download files');
        return;
      }

      const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:5000';
      const resumeUrl = `${apiUrl}/api/resumes/${candidate._id}/file?download=true`;

      const response = await fetch(resumeUrl, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/pdf',
        },
      });

      if (!response.ok) {
        throw new Error(`Server returned ${response.status}: ${response.statusText}`);
      }

      const blob = await response.blob();
      
      // Validate blob
      if (blob.size === 0) {
        throw new Error('Received empty file (0 bytes)');
      }

      // Create download link
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      
      // Get filename
      let filename = candidate.resumeFile.originalName || 'resume.pdf';
      
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
      
    } catch (error) {
      console.error('❌ Download error:', error);
      alert(`Download failed: ${error.message}`);
    }
  };

  // Close resume modal
  const closeResumeModal = () => {
    setShowResumeModal(false);
    if (selectedResume?.resumeUrl) {
      URL.revokeObjectURL(selectedResume.resumeUrl);
    }
    setSelectedResume(null);
  };

  // EMAIL FUNCTIONS
  const handleSendEmail = (candidate) => {
    setSelectedCandidate(candidate);
    setShowEmailModal(true);
  };

  const handleEmailSent = () => {
    setShowEmailModal(false);
    setSelectedCandidate(null);
    fetchCandidates();
  };

  const handleCloseEmail = () => {
    setShowEmailModal(false);
    setSelectedCandidate(null);
  };

  // HELPER FUNCTIONS
  const getStatusColor = (status) => {
    const colors = {
      new: 'bg-gray-100 text-gray-800',
      screened: 'bg-blue-100 text-blue-800',
      shortlisted: 'bg-green-100 text-green-800',
      rejected: 'bg-red-100 text-red-800',
      interview: 'bg-purple-100 text-purple-800'
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  const getScoreColor = (score) => {
    if (!score) return 'bg-gray-100 text-gray-800';
    if (score >= 80) return 'bg-green-100 text-green-800';
    if (score >= 60) return 'bg-yellow-100 text-yellow-800';
    return 'bg-red-100 text-red-800';
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  if (loading && !candidates.length) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Pipeline Overview */}
      {pipelineStats && (
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900">Candidate Pipeline</h2>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <div className="text-2xl font-bold text-gray-900">{pipelineStats.total}</div>
                <div className="text-sm text-gray-600">Total</div>
              </div>
              <div className="text-center p-4 bg-blue-50 rounded-lg">
                <div className="text-2xl font-bold text-blue-900">{pipelineStats.new}</div>
                <div className="text-sm text-blue-600">New</div>
              </div>
              <div className="text-center p-4 bg-yellow-50 rounded-lg">
                <div className="text-2xl font-bold text-yellow-900">{pipelineStats.screened}</div>
                <div className="text-sm text-yellow-600">Screened</div>
                <div className="text-xs text-yellow-700 mt-1">{pipelineStats.conversionRates?.screened || 0}%</div>
              </div>
              <div className="text-center p-4 bg-green-50 rounded-lg">
                <div className="text-2xl font-bold text-green-900">{pipelineStats.shortlisted}</div>
                <div className="text-sm text-green-600">Shortlisted</div>
                <div className="text-xs text-green-700 mt-1">{pipelineStats.conversionRates?.shortlisted || 0}%</div>
              </div>
              <div className="text-center p-4 bg-purple-50 rounded-lg">
                <div className="text-2xl font-bold text-purple-900">{pipelineStats.interview}</div>
                <div className="text-sm text-purple-600">Interview</div>
                <div className="text-xs text-purple-700 mt-1">{pipelineStats.conversionRates?.interview || 0}%</div>
              </div>
              <div className="text-center p-4 bg-red-50 rounded-lg">
                <div className="text-2xl font-bold text-red-900">{pipelineStats.rejected}</div>
                <div className="text-sm text-red-600">Rejected</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Filters Section */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Filters & Search</h3>
        </div>
        <div className="p-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Status Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
              <select
                value={filters.status}
                onChange={(e) => handleFilterChange('status', e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Status</option>
                <option value="active">Active (New+Screened+Shortlisted)</option>
                <option value="new">New</option>
                <option value="screened">Screened</option>
                <option value="shortlisted">Shortlisted</option>
                <option value="interview">Interview</option>
                <option value="rejected">Rejected</option>
              </select>
            </div>

            {/* Job Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Job</label>
              <select
                value={filters.jobId}
                onChange={(e) => handleFilterChange('jobId', e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Jobs</option>
                {jobs.map(job => (
                  <option key={job._id} value={job._id}>{job.title}</option>
                ))}
              </select>
            </div>

            {/* Score Range */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Score Range</label>
              <div className="flex space-x-2">
                <input
                  type="number"
                  placeholder="Min"
                  value={filters.scoreMin}
                  onChange={(e) => handleFilterChange('scoreMin', e.target.value)}
                  className="w-1/2 border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  min="0"
                  max="100"
                />
                <input
                  type="number"
                  placeholder="Max"
                  value={filters.scoreMax}
                  onChange={(e) => handleFilterChange('scoreMax', e.target.value)}
                  className="w-1/2 border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  min="0"
                  max="100"
                />
              </div>
            </div>

            {/* Skills Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Skills</label>
              <input
                type="text"
                placeholder="e.g., JavaScript, React"
                value={filters.skills}
                onChange={(e) => handleFilterChange('skills', e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Date Range and Search */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">From Date</label>
              <input
                type="date"
                value={filters.dateFrom}
                onChange={(e) => handleFilterChange('dateFrom', e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">To Date</label>
              <input
                type="date"
                value={filters.dateTo}
                onChange={(e) => handleFilterChange('dateTo', e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Search</label>
              <input
                type="text"
                placeholder="Search email, phone, skills..."
                value={filters.search}
                onChange={(e) => handleFilterChange('search', e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Filter Actions */}
          <div className="flex justify-between items-center">
            <div className="text-sm text-gray-600">
              Showing {candidates.length} of {pagination.totalCandidates || 0} candidates
            </div>
            <button
              onClick={() => setFilters({
                status: 'all',
                scoreMin: '',
                scoreMax: '',
                skills: '',
                jobId: 'all',
                dateFrom: '',
                dateTo: '',
                search: ''
              })}
              className="bg-gray-600 text-white px-4 py-2 rounded-md hover:bg-gray-700"
            >
              Clear Filters
            </button>
          </div>
        </div>
      </div>

      {/* Bulk Actions */}
      {selectedCandidates.size > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <span className="text-yellow-800 font-medium">
                {selectedCandidates.size} candidate(s) selected
              </span>
            </div>
            <div className="flex space-x-2">
              <select
                onChange={(e) => handleBulkStatusChange(e.target.value)}
                className="border border-gray-300 rounded-md px-3 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Bulk Actions</option>
                <option value="screened">Mark as Screened</option>
                <option value="shortlisted">Mark as Shortlisted</option>
                <option value="rejected">Mark as Rejected</option>
                <option value="interview">Mark for Interview</option>
              </select>
              <button
                onClick={() => setSelectedCandidates(new Set())}
                className="bg-gray-600 text-white px-3 py-1 rounded-md hover:bg-gray-700"
              >
                Clear Selection
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Candidates Table */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold text-gray-900">Candidates</h3>
            <div className="flex items-center space-x-2">
              <label className="flex items-center text-sm text-gray-700">
                <input
                  type="checkbox"
                  checked={selectedCandidates.size === candidates.length && candidates.length > 0}
                  onChange={selectAllCandidates}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 mr-2"
                />
                Select All
              </label>
            </div>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Select
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Candidate
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Job & Skills
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Score
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Applied
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {candidates.map((candidate) => (
                <tr key={candidate._id} className="hover:bg-gray-50">
                  {/* Selection Checkbox */}
                  <td className="px-6 py-4 whitespace-nowrap">
                    <input
                      type="checkbox"
                      checked={selectedCandidates.has(candidate._id)}
                      onChange={() => toggleCandidateSelection(candidate._id)}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                  </td>

                  {/* Candidate Info */}
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-10 w-10 bg-blue-500 rounded-full flex items-center justify-center text-white font-semibold">
                        {candidate.applicantEmail?.charAt(0).toUpperCase() || '?'}
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900">
                          {candidate.applicantEmail}
                        </div>
                        <div className="text-sm text-gray-500">
                          {candidate.applicantPhone || 'No phone'}
                        </div>
                      </div>
                    </div>
                  </td>

                  {/* Job & Skills */}
                  <td className="px-6 py-4">
                    <div className="text-sm font-medium text-gray-900">
                      {candidate.jobId?.title || 'N/A'}
                    </div>
                    <div className="text-sm text-gray-500">
                      {candidate.skills?.slice(0, 3).join(', ') || 'No skills'}
                      {candidate.skills?.length > 3 && (
                        <span className="text-gray-400"> +{candidate.skills.length - 3} more</span>
                      )}
                    </div>
                  </td>

                  {/* Status */}
                  <td className="px-6 py-4 whitespace-nowrap">
                    <select
                      value={candidate.status}
                      onChange={async (e) => {
                        try {
                          await axios.put('/api/candidates/bulk-status', {
                            candidateIds: [candidate._id],
                            status: e.target.value
                          });
                          fetchCandidates();
                        } catch (error) {
                          console.error('Status update error:', error);
                        }
                      }}
                      className={`text-sm font-medium rounded-full px-3 py-1 ${getStatusColor(candidate.status)} border-0 focus:ring-2 focus:ring-blue-500`}
                    >
                      <option value="new">New</option>
                      <option value="screened">Screened</option>
                      <option value="shortlisted">Shortlisted</option>
                      <option value="rejected">Rejected</option>
                      <option value="interview">Interview</option>
                    </select>
                  </td>

                  {/* Score */}
                  <td className="px-6 py-4 whitespace-nowrap">
                    {candidate.score ? (
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getScoreColor(candidate.score)}`}>
                        {candidate.score}%
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                        Not Screened
                      </span>
                    )}
                  </td>

                  {/* Applied Date */}
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {formatDate(candidate.createdAt)}
                  </td>

                  {/* Actions */}
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                    <button
                      onClick={() => handleSendEmail(candidate)}
                      className="text-blue-600 hover:text-blue-900 font-medium"
                    >
                      Email
                    </button>
                    <button
                      onClick={() => handleViewResume(candidate)}
                      className="text-green-600 hover:text-green-900 font-medium"
                    >
                      View Resume
                    </button>
                    {/* <button
                      onClick={() => handleDownloadResume(candidate)}
                      className="text-purple-600 hover:text-purple-900 font-medium"
                    >
                      Download
                    </button> */}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Empty State */}
        {candidates.length === 0 && (
          <div className="text-center py-12">
            <svg className="w-24 h-24 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No candidates found</h3>
            <p className="text-gray-600">Try adjusting your filters or search terms</p>
          </div>
        )}
      </div>

      {/* Email Composer Modal */}
      {showEmailModal && selectedCandidate && (
        <EmailComposer
          candidate={selectedCandidate}
          onClose={handleCloseEmail}
          onSent={handleEmailSent}
        />
      )}

      {/* Resume Modal */}
      {showResumeModal && selectedResume && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-6xl h-5/6 flex flex-col">
            {/* Modal Header */}
            <div className="flex justify-between items-center p-4 border-b">
              <h3 className="text-lg font-semibold text-gray-900">
                Viewing Resume: {selectedResume.resumeFile?.originalName || 'Resume'}
              </h3>
              <div className="flex space-x-2">
                <button
                  onClick={() => handleDownloadResume(selectedResume)}
                  className="bg-green-600 text-white px-3 py-1 rounded text-sm hover:bg-green-700"
                >
                  Download
                </button>
                <button
                  onClick={closeResumeModal}
                  className="bg-gray-600 text-white px-3 py-1 rounded text-sm hover:bg-gray-700"
                >
                  Close
                </button>
              </div>
            </div>

            {/* Modal Content */}
            <div className="flex-1 p-4">
              {resumeLoading ? (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                    <p className="text-gray-600">Loading resume...</p>
                  </div>
                </div>
              ) : selectedResume.resumeUrl ? (
                <iframe
                  src={selectedResume.resumeUrl}
                  className="w-full h-full border rounded"
                  title="Resume Preview"
                />
              ) : (
                <div className="flex items-center justify-center h-full">
                  <p className="text-gray-600">Unable to load resume</p>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t bg-gray-50">
              <div className="flex justify-between items-center text-sm text-gray-600">
                <div>
                  <span className="font-medium">Candidate:</span> {selectedResume.applicantEmail}
                </div>
                <div>
                  <span className="font-medium">Applied:</span> {formatDate(selectedResume.createdAt)}
                </div>
                <div>
                  <span className="font-medium">Status:</span> 
                  <span className={`ml-1 px-2 py-1 rounded text-xs ${getStatusColor(selectedResume.status)}`}>
                    {selectedResume.status}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CandidateDashboard;