//pages/jobs.js
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import Navbar from '../components/Navbar';
import JobCard from '../components/JobCard';
import LoadingSpinner from '../components/LoadingSpinner';
import { COMMON_SKILLS, DEFAULT_REQUIREMENTS } from '../utils/constants';

const Jobs = () => {
  const [jobs, setJobs] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editingJob, setEditingJob] = useState(null); // ADD EDITING STATE
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    requirements: [''],
    skills: [''],
    location: '',
    experience: { min: 0, max: 10 },
    salaryRange: { min: '', max: '' }
  });
  const [loading, setLoading] = useState(false);
  const [formLoading, setFormLoading] = useState(false);

  useEffect(() => {
    fetchJobs();
  }, []);

  const fetchJobs = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/api/jobs');
      setJobs(response.data);
    } catch (error) {
      console.error('Error fetching jobs:', error);
      alert('Error loading jobs');
    } finally {
      setLoading(false);
    }
  };

  // RESET FORM DATA
  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      requirements: [''],
      skills: [''],
      location: '',
      experience: { min: 0, max: 10 },
      salaryRange: { min: '', max: '' }
    });
    setEditingJob(null);
  };

  // SETUP EDIT FORM
  const setupEditForm = (job) => {
    setEditingJob(job);
    setFormData({
      title: job.title,
      description: job.description,
      requirements: job.requirements.length > 0 ? job.requirements : [''],
      skills: job.skills.length > 0 ? job.skills : [''],
      location: job.location,
      experience: job.experience || { min: 0, max: 10 },
      salaryRange: job.salaryRange || { min: '', max: '' }
    });
    setShowForm(true);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name.includes('.')) {
      const [parent, child] = name.split('.');
      setFormData(prev => ({
        ...prev,
        [parent]: {
          ...prev[parent],
          [child]: value
        }
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
    }
  };

  const handleArrayChange = (index, value, field) => {
    const newArray = [...formData[field]];
    newArray[index] = value;
    setFormData(prev => ({
      ...prev,
      [field]: newArray
    }));
  };

  const addArrayField = (field) => {
    setFormData(prev => ({
      ...prev,
      [field]: [...prev[field], '']
    }));
  };

  const removeArrayField = (index, field) => {
    if (formData[field].length > 1) {
      setFormData(prev => ({
        ...prev,
        [field]: prev[field].filter((_, i) => i !== index)
      }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormLoading(true);

    try {
      // Filter out empty requirements and skills
      const submissionData = {
        ...formData,
        requirements: formData.requirements.filter(req => req.trim() !== ''),
        skills: formData.skills.filter(skill => skill.trim() !== '')
      };

      if (editingJob) {
        // UPDATE EXISTING JOB
        await axios.put(`/api/jobs/${editingJob._id}`, submissionData);
        alert('Job updated successfully!');
      } else {
        // CREATE NEW JOB
        await axios.post('/api/jobs', submissionData);
        alert('Job created successfully!');
      }

      setShowForm(false);
      resetForm();
      fetchJobs(); // Refresh the list
    } catch (error) {
      console.error('Error saving job:', error);
      alert(error.response?.data?.message || 'Error saving job. Please try again.');
    } finally {
      setFormLoading(false);
    }
  };


  // === ADD THIS FUNCTION RIGHT HERE ===
 // FIXED: Copy application link function
const copyApplicationLink = async (job) => {
  try {
    // Use the new API endpoint to get/create public link
    const response = await axios.get(`/api/jobs/${job._id}/public-link`);
    
    if (response.data.success) {
      const applicationUrl = response.data.applicationUrl;
      
      // Copy to clipboard
      await navigator.clipboard.writeText(applicationUrl);
      
      let message = 'Application link copied to clipboard! Share this link with candidates.';
      if (response.data.wasNew) {
        message += ' (Job is now public)';
      }
      
      alert(message);
      
      // Refresh jobs to show updated public status
      fetchJobs();
    } else {
      alert('Error creating application link. Please try again.');
    }
  } catch (error) {
    console.error('Error copying link:', error);
    
    // Fallback: Try the old method
    try {
      if (!job.publicLink) {
        // Make job public first
        const makePublicResponse = await axios.post(`/api/jobs/${job._id}/make-public`);
        
        if (makePublicResponse.data.success) {
          const applicationUrl = makePublicResponse.data.applicationUrl;
          await navigator.clipboard.writeText(applicationUrl);
          alert('Application link copied to clipboard! Share this link with candidates.');
          fetchJobs();
          return;
        }
      }
      
      // If job already has publicLink
      const applicationUrl = `${window.location.origin}/apply/${job.publicLink}`;
      await navigator.clipboard.writeText(applicationUrl);
      alert('Application link copied to clipboard!');
      
    } catch (fallbackError) {
      console.error('Fallback error:', fallbackError);
      alert('Error creating application link. Please try again.');
    }
  }
};
  // === END OF NEW FUNCTION ===


  const deleteJob = async (jobId) => {
    if (window.confirm('Are you sure you want to delete this job?')) {
      try {
        await axios.delete(`/api/jobs/${jobId}`);
        fetchJobs();
        alert('Job deleted successfully!');
      } catch (error) {
        console.error('Error deleting job:', error);
        alert('Error deleting job. Please try again.');
      }
    }
  };

  return (
    <>
      <Navbar />
      <div className="p-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Jobs Management</h1>
          <button
            onClick={() => {
              resetForm();
              setShowForm(true);
            }}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
          >
            Create New Job
          </button>
        </div>

        {/* EDIT/CREATE JOB FORM */}
        {showForm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <h2 className="text-2xl font-bold mb-4">
                  {editingJob ? 'Edit Job' : 'Create New Job'}
                </h2>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Job Title *
                    </label>
                    <input
                      type="text"
                      name="title"
                      value={formData.title}
                      onChange={handleChange}
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="e.g., Senior React Developer"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Description *
                    </label>
                    <textarea
                      name="description"
                      value={formData.description}
                      onChange={handleChange}
                      required
                      rows="4"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Describe the job role, responsibilities, and what you're looking for in a candidate..."
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Location *
                    </label>
                    <input
                      type="text"
                      name="location"
                      value={formData.location}
                      onChange={handleChange}
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="e.g., Remote, New York, London"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Min Experience (years)
                      </label>
                      <input
                        type="number"
                        name="experience.min"
                        value={formData.experience.min}
                        onChange={handleChange}
                        min="0"
                        max="50"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Max Experience (years)
                      </label>
                      <input
                        type="number"
                        name="experience.max"
                        value={formData.experience.max}
                        onChange={handleChange}
                        min="0"
                        max="50"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Min Salary ($)
                      </label>
                      <input
                        type="number"
                        name="salaryRange.min"
                        value={formData.salaryRange.min}
                        onChange={handleChange}
                        min="0"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="e.g., 50000"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Max Salary ($)
                      </label>
                      <input
                        type="number"
                        name="salaryRange.max"
                        value={formData.salaryRange.max}
                        onChange={handleChange}
                        min="0"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="e.g., 100000"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Requirements *
                      <span className="text-xs text-gray-500 ml-2">(At least one required)</span>
                    </label>
                    {formData.requirements.map((req, index) => (
                      <div key={index} className="flex gap-2 mb-2">
                        <input
                          type="text"
                          value={req}
                          onChange={(e) => handleArrayChange(index, e.target.value, 'requirements')}
                          className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="Enter a requirement"
                        />
                        {formData.requirements.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeArrayField(index, 'requirements')}
                            className="px-3 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
                          >
                            Remove
                          </button>
                        )}
                      </div>
                    ))}
                    <button
                      type="button"
                      onClick={() => addArrayField('requirements')}
                      className="mt-2 bg-green-600 text-white px-3 py-2 rounded-md hover:bg-green-700"
                    >
                      Add Requirement
                    </button>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Skills *
                      <span className="text-xs text-gray-500 ml-2">(At least one required)</span>
                    </label>
                    {formData.skills.map((skill, index) => (
                      <div key={index} className="flex gap-2 mb-2">
                        <input
                          type="text"
                          value={skill}
                          onChange={(e) => handleArrayChange(index, e.target.value, 'skills')}
                          className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="Enter a skill"
                          list="common-skills"
                        />
                        <datalist id="common-skills">
                          {COMMON_SKILLS.map((commonSkill, idx) => (
                            <option key={idx} value={commonSkill} />
                          ))}
                        </datalist>
                        {formData.skills.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeArrayField(index, 'skills')}
                            className="px-3 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
                          >
                            Remove
                          </button>
                        )}
                      </div>
                    ))}
                    <button
                      type="button"
                      onClick={() => addArrayField('skills')}
                      className="mt-2 bg-green-600 text-white px-3 py-2 rounded-md hover:bg-green-700"
                    >
                      Add Skill
                    </button>
                  </div>

                  <div className="flex gap-4 pt-4">
                    <button
                      type="submit"
                      disabled={formLoading}
                      className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:opacity-50"
                    >
                      {formLoading ? 'Saving...' : (editingJob ? 'Update Job' : 'Create Job')}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowForm(false);
                        resetForm();
                      }}
                      className="flex-1 bg-gray-600 text-white py-2 px-4 rounded-md hover:bg-gray-700"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}

        {/* JOBS LIST */}
        {loading ? (
          <div className="flex justify-center items-center py-12">
            <LoadingSpinner size="large" text="Loading jobs..." />
          </div>
        ) : (
          <div className="space-y-6">
            {jobs.map((job) => (
              <JobCard
                key={job._id}
                job={job}
                onDelete={deleteJob}
                onEdit={setupEditForm} // ADD EDIT PROP
                onShare={copyApplicationLink} 
                showActions={true}
                resumeCount={0}
              />
            ))}
          </div>
        )}

        {!loading && jobs.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-600 mb-4">No jobs created yet</p>
            <button
              onClick={() => {
                resetForm();
                setShowForm(true);
              }}
              className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
            >
              Create Your First Job
            </button>
          </div>
        )}
      </div>
    </>
  );
};

export default Jobs;