//pages/resumescreening.js
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useDropzone } from 'react-dropzone';
import axios from 'axios';
import Navbar from '../components/Navbar';
import ResumeCard from '../components/ResumeCard';
import LoadingSpinner from '../components/LoadingSpinner';
import { InlineSpinner } from '../components/LoadingSpinner';

const ResumeScreening = () => {
  const { jobId } = useParams();
  const navigate = useNavigate();
  const [resumes, setResumes] = useState([]);
  const [job, setJob] = useState(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [screening, setScreening] = useState(false);
  const [bulkScreening, setBulkScreening] = useState(false);
  const [selectedResumes, setSelectedResumes] = useState(new Set());
  const [showUploadForm, setShowUploadForm] = useState(false);
  const [uploadFormData, setUploadFormData] = useState({
    applicantEmail: '',
    applicantPhone: ''
  });
  const [useAutoExtraction, setUseAutoExtraction] = useState(true);
  const [extractionResults, setExtractionResults] = useState(null);
  const [recentUploads, setRecentUploads] = useState([]);

  useEffect(() => {
    fetchJobAndResumes();
  }, [jobId]);

  const fetchJobAndResumes = async () => {
    try {
      setLoading(true);
      const [jobRes, resumesRes] = await Promise.all([
        axios.get(`/api/jobs/${jobId}`),
        axios.get(`/api/resumes/job/${jobId}`)
      ]);
      setJob(jobRes.data);
      setResumes(resumesRes.data);
    } catch (error) {
      console.error('Error fetching data:', error);
      alert('Error loading data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Enhanced Dropzone for file upload with auto-extraction
  const onDrop = async (acceptedFiles) => {
    setUploading(true);
    setExtractionResults(null);
    
    try {
      const uploadResults = [];
      
      for (const file of acceptedFiles) {
        const formData = new FormData();
        formData.append('resume', file);
        formData.append('jobId', jobId);
        formData.append('useExtractedData', useAutoExtraction.toString());
        
        // Only include manual data if auto-extraction is disabled OR if we're showing the form
        if (!useAutoExtraction || showUploadForm) {
          formData.append('applicantEmail', uploadFormData.applicantEmail || '');
          formData.append('applicantPhone', uploadFormData.applicantPhone || '');
        }
        
        const response = await axios.post('/api/resumes/upload', formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
        
        uploadResults.push(response.data);
      }
      
      // Show extraction results
      if (uploadResults.length > 0) {
        const results = uploadResults[0].extractionResults;
        setExtractionResults(results);
        
        let message = 'Resume uploaded successfully!';
        if (results.emailFound) {
          message += ' Contact information was automatically extracted from the PDF.';
        } else {
          message += ' No contact information found in PDF. Please add manually.';
        }
        alert(message);
      }
      
      // Reset form and refresh data
      setUploadFormData({
        applicantEmail: '',
        applicantPhone: ''
      });
      setShowUploadForm(false);
      fetchJobAndResumes();
      
    } catch (error) {
      console.error('Error uploading resumes:', error);
      alert('Error uploading resumes. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf']
    },
    multiple: true
  });

  // Handle individual resume screening
  const runScreening = async (resumeId = null) => {
    setScreening(true);
    try {
      if (resumeId) {
        await axios.post(`/api/ai/screen/${resumeId}`);
        alert('Resume screened successfully!');
      } else {
        // Bulk screen all new resumes
        setBulkScreening(true);
        await axios.post(`/api/ai/screen/job/${jobId}`);
        alert('All resumes screened successfully!');
      }
      fetchJobAndResumes();
    } catch (error) {
      console.error('Error running screening:', error);
      alert('Error during screening. Please try again.');
    } finally {
      setScreening(false);
      setBulkScreening(false);
    }
  };

  // Handle bulk actions
  const handleBulkAction = async (action) => {
    if (selectedResumes.size === 0) {
      alert('Please select at least one resume');
      return;
    }

    try {
      const resumeIds = Array.from(selectedResumes);
      
      if (action === 'screen') {
        setBulkScreening(true);
        for (const resumeId of resumeIds) {
          await axios.post(`/api/ai/screen/${resumeId}`);
        }
        alert('Selected resumes screened successfully!');
      } else if (action === 'delete') {
        if (window.confirm(`Are you sure you want to delete ${selectedResumes.size} resume(s)?`)) {
          for (const resumeId of resumeIds) {
            await axios.delete(`/api/resumes/${resumeId}`);
          }
          alert('Selected resumes deleted successfully!');
        }
      } else {
        // Status update
        for (const resumeId of resumeIds) {
          await axios.put(`/api/resumes/${resumeId}/status`, { status: action });
        }
        alert(`Selected resumes marked as ${action}!`);
      }
      
      setSelectedResumes(new Set());
      fetchJobAndResumes();
    } catch (error) {
      console.error('Error performing bulk action:', error);
      alert('Error performing action. Please try again.');
    } finally {
      setBulkScreening(false);
    }
  };

  // Update resume status
  const updateStatus = async (resumeId, status) => {
    try {
      await axios.put(`/api/resumes/${resumeId}/status`, { status });
      fetchJobAndResumes();
    } catch (error) {
      console.error('Error updating status:', error);
      alert('Error updating status');
    }
  };

  // Add note to resume
  const addNote = async (resumeId, content) => {
    if (!content.trim()) return;
    
    try {
      await axios.post(`/api/resumes/${resumeId}/notes`, { content });
      fetchJobAndResumes();
    } catch (error) {
      console.error('Error adding note:', error);
      alert('Error adding note');
    }
  };

  // Toggle resume selection
  const toggleResumeSelection = (resumeId) => {
    const newSelected = new Set(selectedResumes);
    if (newSelected.has(resumeId)) {
      newSelected.delete(resumeId);
    } else {
      newSelected.add(resumeId);
    }
    setSelectedResumes(newSelected);
  };

  // Select all resumes
  const selectAllResumes = () => {
    if (selectedResumes.size === resumes.length) {
      setSelectedResumes(new Set());
    } else {
      setSelectedResumes(new Set(resumes.map(resume => resume._id)));
    }
  };

  // Get screening statistics
  const getScreeningStats = () => {
    const total = resumes.length;
    const screened = resumes.filter(r => r.status === 'screened' || r.screeningResults).length;
    const shortlisted = resumes.filter(r => r.status === 'shortlisted').length;
    const newResumes = resumes.filter(r => r.status === 'new').length;
    
    return { total, screened, shortlisted, newResumes };
  };

  const stats = getScreeningStats();

  if (!job && !loading) {
    return (
      <>
        <Navbar />
        <div className="p-6">
          <div className="text-center py-12">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Job Not Found</h2>
            <p className="text-gray-600 mb-4">The job you're looking for doesn't exist.</p>
            <Link
              to="/jobs"
              className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
            >
              Back to Jobs
            </Link>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Navbar />
      <div className="p-6">
        {/* Header Section */}
        <div className="flex justify-between items-start mb-6">
          <div>
            <div className="flex items-center space-x-4 mb-2">
              <Link
                to="/jobs"
                className="text-blue-600 hover:text-blue-800 flex items-center"
              >
                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                Back to Jobs
              </Link>
            </div>
            <h1 className="text-3xl font-bold text-gray-900">
              Resume Screening
            </h1>
            <p className="text-gray-600 mt-1">
              Job: <span className="font-semibold">{job?.title}</span> | {job?.location}
            </p>
            <p className="text-sm text-gray-500 mt-1">
              Experience: {job?.experience?.min || 0} - {job?.experience?.max || 10} years
            </p>
          </div>
          
          <div className="flex space-x-2">
            <button
              onClick={() => runScreening()}
              disabled={screening || bulkScreening || stats.newResumes === 0}
              className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center"
            >
              {bulkScreening ? <InlineSpinner /> : (
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              )}
              {bulkScreening ? 'Screening...' : `Screen All (${stats.newResumes})`}
            </button>
          </div>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow p-4">
            <div className="text-2xl font-bold text-gray-900">{stats.total}</div>
            <div className="text-sm text-gray-600">Total Resumes</div>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <div className="text-2xl font-bold text-blue-600">{stats.screened}</div>
            <div className="text-sm text-gray-600">Screened</div>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <div className="text-2xl font-bold text-green-600">{stats.shortlisted}</div>
            <div className="text-sm text-gray-600">Shortlisted</div>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <div className="text-2xl font-bold text-orange-600">{stats.newResumes}</div>
            <div className="text-sm text-gray-600">New</div>
          </div>
        </div>

        {/* Upload Section */}
        <div className="bg-white rounded-lg shadow mb-6">
          <div className="p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Upload Resumes</h2>
              <div className="flex items-center space-x-4">
                {/* Auto-extraction Toggle */}
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={useAutoExtraction}
                    onChange={(e) => setUseAutoExtraction(e.target.checked)}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700">Auto-extract contact info</span>
                </label>
                
                <button
                  onClick={() => setShowUploadForm(!showUploadForm)}
                  className="text-blue-600 hover:text-blue-800 text-sm"
                >
                  {showUploadForm ? 'Hide Form' : 'Show Contact Info'}
                </button>
              </div>
            </div>

            {/* Extraction Info */}
            {useAutoExtraction && (
              <div className="mb-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
                <div className="flex items-center">
                  <svg className="w-5 h-5 text-blue-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span className="text-sm text-blue-800">
                    Contact information will be automatically extracted from PDF files. 
                    You can override this by showing the form below.
                  </span>
                </div>
              </div>
            )}

            {/* Extraction Results */}
            {extractionResults && (
              <div className="mb-4 p-3 bg-green-50 rounded-lg border border-green-200">
                <h4 className="font-medium text-green-800 mb-2">Extraction Results:</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                  <div className="flex items-center">
                    <span className={`w-2 h-2 rounded-full mr-2 ${extractionResults.emailFound ? 'bg-green-500' : 'bg-gray-300'}`}></span>
                    <span className={extractionResults.emailFound ? 'text-green-700' : 'text-gray-500'}>
                      Email: {extractionResults.emailFound ? 'Found' : 'Not found'}
                    </span>
                  </div>
                  <div className="flex items-center">
                    <span className={`w-2 h-2 rounded-full mr-2 ${extractionResults.phoneFound ? 'bg-green-500' : 'bg-gray-300'}`}></span>
                    <span className={extractionResults.phoneFound ? 'text-green-700' : 'text-gray-500'}>
                      Phone: {extractionResults.phoneFound ? 'Found' : 'Not found'}
                    </span>
                  </div>
                  <div className="flex items-center">
                    <span className={`w-2 h-2 rounded-full mr-2 ${extractionResults.skillsFound > 0 ? 'bg-green-500' : 'bg-gray-300'}`}></span>
                    <span className={extractionResults.skillsFound > 0 ? 'text-green-700' : 'text-gray-500'}>
                      Skills: {extractionResults.skillsFound} found
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Contact Info Form */}
            {showUploadForm && (
              <div className="mb-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
                <div className="flex justify-between items-center mb-3">
                  <h3 className="font-medium text-gray-900">Contact Information</h3>
                  <span className="text-sm text-gray-500">
                    {useAutoExtraction ? 'Auto-fill enabled' : 'Manual entry'}
                  </span>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Email {!useAutoExtraction && '*'}
                    </label>
                    <input
                      type="email"
                      value={uploadFormData.applicantEmail}
                      onChange={(e) => setUploadFormData(prev => ({
                        ...prev,
                        applicantEmail: e.target.value
                      }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder={useAutoExtraction ? "Will auto-fill from PDF" : "applicant@email.com"}
                      disabled={useAutoExtraction}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Phone
                    </label>
                    <input
                      type="tel"
                      value={uploadFormData.applicantPhone}
                      onChange={(e) => setUploadFormData(prev => ({
                        ...prev,
                        applicantPhone: e.target.value
                      }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder={useAutoExtraction ? "Will auto-fill from PDF" : "Phone number"}
                      disabled={useAutoExtraction}
                    />
                  </div>
                </div>
                
                {useAutoExtraction && (
                  <div className="mt-3 p-2 bg-yellow-50 rounded border border-yellow-200">
                    <p className="text-sm text-yellow-800">
                      <strong>Note:</strong> Auto-extraction is enabled. The form fields will be automatically 
                      filled with data extracted from the PDF. Disable auto-extraction to enter information manually.
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Dropzone */}
            <div
              {...getRootProps()}
              className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center mb-4 hover:border-blue-400 transition-colors cursor-pointer bg-gray-50"
            >
              <input {...getInputProps()} />
              {uploading ? (
                <div className="flex flex-col items-center">
                  <InlineSpinner size="medium" />
                  <p className="mt-2 text-gray-600">
                    {useAutoExtraction ? 'Uploading and extracting data...' : 'Uploading...'}
                  </p>
                </div>
              ) : isDragActive ? (
                <div>
                  <p className="text-lg text-blue-600">Drop the PDF files here...</p>
                  <p className="text-sm text-blue-500 mt-2">
                    {useAutoExtraction ? 'Contact info will be auto-extracted' : 'Use form above to enter details'}
                  </p>
                </div>
              ) : (
                <div>
                  <svg className="w-12 h-12 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                  <p className="text-lg text-gray-600">
                    Drag & drop PDF resumes here, or click to select files
                  </p>
                  <p className="text-sm text-gray-500 mt-2">
                    {useAutoExtraction 
                      ? 'Contact information will be automatically extracted'
                      : 'Fill the form above to add contact information'
                    }
                  </p>
                  <p className="text-xs text-blue-600 mt-2">
                    Auto-extraction: {useAutoExtraction ? 'ON' : 'OFF'}
                  </p>
                </div>
              )}
            </div>

            {/* Recent Uploads Preview */}
            {recentUploads.length > 0 && (
              <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                <h4 className="font-medium text-gray-900 mb-2">Recently Uploaded:</h4>
                <div className="space-y-2">
                  {recentUploads.map((resume, index) => (
                    <div key={index} className="flex items-center justify-between p-2 bg-white rounded border">
                      <div className="flex-1">
                        <p className="font-medium text-sm">{resume.applicantEmail}</p>
                        <p className="text-xs text-gray-600">{resume.applicantPhone || 'No phone'}</p>
                      </div>
                      <span className={`text-xs px-2 py-1 rounded ${
                        resume.dataSource === 'auto' 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-blue-100 text-blue-800'
                      }`}>
                        {resume.dataSource === 'auto' ? 'Auto-filled' : 'Manual'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Bulk Actions */}
        {resumes.length > 0 && (
          <div className="bg-white rounded-lg shadow mb-6">
            <div className="p-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={selectedResumes.size === resumes.length && resumes.length > 0}
                      onChange={selectAllResumes}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="ml-2 text-sm text-gray-700">Select All</span>
                  </label>
                  <span className="text-sm text-gray-600">
                    {selectedResumes.size} resume(s) selected
                  </span>
                </div>
                
                <div className="flex space-x-2">
                  <select
                    onChange={(e) => handleBulkAction(e.target.value)}
                    value=""
                    disabled={selectedResumes.size === 0 || bulkScreening}
                    className="border border-gray-300 rounded px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                  >
                    <option value="">Bulk Actions</option>
                    <option value="screen">Screen Selected</option>
                    <option value="shortlisted">Mark as Shortlisted</option>
                    <option value="rejected">Mark as Rejected</option>
                    <option value="interview">Mark for Interview</option>
                    <option value="delete">Delete Selected</option>
                  </select>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Resumes List */}
        {loading ? (
          <div className="flex justify-center items-center py-12">
            <LoadingSpinner size="large" text="Loading resumes..." />
          </div>
        ) : (
          <div className="space-y-6">
            {resumes.map((resume) => (
              <div key={resume._id} className="flex items-start space-x-4">
                <div className="flex-shrink-0 pt-6">
                  <input
                    type="checkbox"
                    checked={selectedResumes.has(resume._id)}
                    onChange={() => toggleResumeSelection(resume._id)}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                </div>
                <div className="flex-1">
                  <ResumeCard
                    resume={resume}
                    onStatusChange={updateStatus}
                    onScreen={runScreening}
                    onAddNote={addNote}
                    showActions={true}
                  />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Empty State */}
        {!loading && resumes.length === 0 && (
          <div className="text-center py-12">
            <svg className="w-24 h-24 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No resumes yet</h3>
            <p className="text-gray-600 mb-4">
              Upload PDF resumes to start screening candidates for this job.
            </p>
            <p className="text-sm text-gray-500">
              Use the upload area above to add resumes.
            </p>
          </div>
        )}
      </div>
    </>
  );
};

export default ResumeScreening;