//components/jobcard.js
import React from 'react';
import { Link } from 'react-router-dom';
import { formatDate, getStatusColor } from '../utils/helpers';

const JobCard = ({ 
  job, 
  onDelete, 
  onEdit,
  onShare,
  showActions = true,
  resumeCount = 0 
}) => {
  if (!job) return null;

  const statusColor = getStatusColor(job.status);
  
  return (
    <div className="bg-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 p-6 mb-6 border border-gray-100">
      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Left Section - Job Details */}
        <div className="lg:col-span-2">
          <div className="flex flex-col h-full">
            {/* Header */}
            <div className="flex justify-between items-start mb-4">
              <div className="flex-1">
                <h3 className="text-2xl font-bold text-gray-900 mb-3">
                  {job.title}
                </h3>
                <div className="flex items-center space-x-6 text-sm text-gray-600 mb-4">
                  <span className="flex items-center bg-blue-50 px-3 py-1 rounded-full">
                    <svg className="w-4 h-4 mr-2 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    {job.location}
                  </span>
                  <span className="flex items-center bg-green-50 px-3 py-1 rounded-full">
                    <svg className="w-4 h-4 mr-2 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    {job.experience?.min || 0} - {job.experience?.max || 10} years
                  </span>
                </div>
              </div>
            </div>

            {/* Description */}
            <div className="mb-4 flex-1">
              <p className="text-gray-700 leading-relaxed line-clamp-3">
                {job.description}
              </p>
            </div>

            {/* Skills Section */}
            <div className="mb-4">
              <h4 className="text-sm font-semibold text-gray-900 mb-3 uppercase tracking-wide">Required Skills</h4>
              <div className="flex flex-wrap gap-2">
                {job.skills?.map((skill, index) => (
                  <span
                    key={index}
                    className="inline-flex items-center px-3 py-1.5 rounded-full text-sm font-medium bg-gradient-to-r from-blue-50 to-blue-100 text-blue-700 border border-blue-200"
                  >
                    {skill}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Middle Section - Requirements & Details */}
        <div className="lg:col-span-1">
          <div className="h-full flex flex-col">
            {/* Requirements */}
            {job.requirements && job.requirements.length > 0 && (
              <div className="mb-4">
                <h4 className="text-sm font-semibold text-gray-900 mb-3 uppercase tracking-wide">Key Requirements</h4>
                <ul className="space-y-2">
                  {job.requirements.slice(0, 3).map((req, index) => (
                    <li key={index} className="flex items-start text-sm text-gray-700">
                      <svg className="w-4 h-4 text-green-500 mr-2 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      <span className="flex-1">{req}</span>
                    </li>
                  ))}
                  {job.requirements.length > 3 && (
                    <li className="text-xs text-gray-500 font-medium">
                      +{job.requirements.length - 3} more requirements
                    </li>
                  )}
                </ul>
              </div>
            )}

            {/* Salary Range */}
            {(job.salaryRange?.min || job.salaryRange?.max) && (
              <div className="mb-4">
                <h4 className="text-sm font-semibold text-gray-900 mb-2 uppercase tracking-wide">Salary Range</h4>
                <p className="text-lg font-bold text-gray-900 bg-gradient-to-r from-green-50 to-emerald-50 p-3 rounded-lg border border-green-100">
                  ${job.salaryRange.min?.toLocaleString() || 'N/A'} - ${job.salaryRange.max?.toLocaleString() || 'N/A'}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Right Section - Status & Actions */}
        <div className="lg:col-span-1">
          <div className="h-full flex flex-col">
            {/* Status & Counts */}
            <div className="flex flex-wrap gap-3 mb-4">
              <span className={`inline-flex items-center px-4 py-2 rounded-full text-sm font-bold bg-${statusColor}-100 text-${statusColor}-800 border border-${statusColor}-200 uppercase tracking-wide`}>
                {job.status}
              </span>
              
              {resumeCount > 0 && (
                <span className="inline-flex items-center px-3 py-2 rounded-lg text-sm font-medium bg-blue-100 text-blue-800 border border-blue-200">
                  <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  {resumeCount} Resume{resumeCount !== 1 ? 's' : ''}
                </span>
              )}
              
              {job.applicationCount > 0 && (
                <span className="inline-flex items-center px-3 py-2 rounded-lg text-sm font-medium bg-green-100 text-green-800 border border-green-200">
                  <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                  </svg>
                  {job.applicationCount} Application{job.applicationCount !== 1 ? 's' : ''}
                </span>
              )}
            </div>

            {/* Public Job Status */}
            {job.isPublic && (
              <div className="mb-4 p-3 bg-gradient-to-r from-purple-50 to-indigo-50 rounded-lg border border-purple-200">
                <div className="flex items-center">
                  <svg className="w-5 h-5 text-purple-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                  </svg>
                  <span className="text-sm font-semibold text-purple-800">Public Job - Accepting Applications</span>
                </div>
              </div>
            )}

            {/* Action Buttons */}
            {showActions && (
              <div className="space-y-3 mt-auto">
                <div className="grid grid-cols-2 gap-2">
                  <Link
                    to={`/screening/${job._id}`}
                    className="inline-flex items-center justify-center px-4 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg hover:from-blue-700 hover:to-blue-800 transition-all duration-200 font-semibold text-sm shadow-md hover:shadow-lg"
                  >
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    Screen
                  </Link>
                  
                  {onShare && (
                    <button
                      onClick={() => onShare(job)}
                      className="inline-flex items-center justify-center px-4 py-3 bg-gradient-to-r from-purple-600 to-purple-700 text-white rounded-lg hover:from-purple-700 hover:to-purple-800 transition-all duration-200 font-semibold text-sm shadow-md hover:shadow-lg"
                    >
                      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                      </svg>
                      Share
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-2">
                  {onEdit && (
                    <button
                      onClick={() => onEdit(job)}
                      className="inline-flex items-center justify-center px-4 py-3 bg-gradient-to-r from-gray-600 to-gray-700 text-white rounded-lg hover:from-gray-700 hover:to-gray-800 transition-all duration-200 font-semibold text-sm shadow-md hover:shadow-lg"
                    >
                      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                      Edit
                    </button>
                  )}
                  
                  {onDelete && (
                    <button
                      onClick={() => onDelete(job._id)}
                      className="inline-flex items-center justify-center px-4 py-3 bg-gradient-to-r from-red-600 to-red-700 text-white rounded-lg hover:from-red-700 hover:to-red-800 transition-all duration-200 font-semibold text-sm shadow-md hover:shadow-lg"
                    >
                      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                      Delete
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Footer - Creation Date */}
      <div className="flex justify-between items-center pt-4 mt-4 border-t border-gray-200">
        <div className="text-sm text-gray-500">
          <span className="font-medium">Created:</span> {formatDate(job.createdAt)}
          {job.updatedAt !== job.createdAt && (
            <span className="block text-xs text-gray-400 mt-1">
              <span className="font-medium">Updated:</span> {formatDate(job.updatedAt)}
            </span>
          )}
        </div>
        
        <div className="flex space-x-2">
          <Link
            to={`/jobs/${job._id}`}
            className="inline-flex items-center px-3 py-1.5 text-sm text-gray-600 hover:text-gray-900 font-medium hover:bg-gray-100 rounded-lg transition-colors duration-200"
          >
            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>
            View Details
          </Link>
        </div>
      </div>
    </div>
  );
};

// Compact version for lists
export const JobCardCompact = ({ job, onClick }) => {
  const statusColor = getStatusColor(job.status);
  
  return (
    <div 
      onClick={() => onClick(job)}
      className="bg-white rounded-xl shadow-md hover:shadow-lg transition-all duration-300 p-5 mb-4 border border-gray-100 cursor-pointer"
    >
      <div className="flex justify-between items-start">
        <div className="flex-1">
          <h4 className="text-lg font-bold text-gray-900 mb-2">{job.title}</h4>
          <p className="text-gray-600 mb-3">{job.location}</p>
          <div className="flex flex-wrap gap-2 mb-3">
            {job.skills?.slice(0, 3).map((skill, index) => (
              <span
                key={index}
                className="inline-block px-2.5 py-1 text-xs bg-blue-100 text-blue-800 rounded-full font-medium"
              >
                {skill}
              </span>
            ))}
            {job.skills?.length > 3 && (
              <span className="inline-block px-2.5 py-1 text-xs bg-gray-100 text-gray-600 rounded-full">
                +{job.skills.length - 3}
              </span>
            )}
          </div>
        </div>
        <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-${statusColor}-100 text-${statusColor}-800 uppercase tracking-wide`}>
          {job.status}
        </span>
      </div>
      
      {/* Experience and date */}
      <div className="flex justify-between items-center mt-3 text-sm text-gray-500">
        <span className="bg-gray-100 px-2 py-1 rounded">
          {job.experience?.min || 0}-{job.experience?.max || 10} years
        </span>
        <span>
          {formatDate(job.createdAt)}
        </span>
      </div>

      {/* Public job indicator */}
      {job.isPublic && (
        <div className="flex items-center mt-3 pt-3 border-t border-gray-100">
          <svg className="w-4 h-4 text-purple-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
          </svg>
          <span className="text-sm text-purple-600 font-medium">Public Job</span>
          {job.applicationCount > 0 && (
            <span className="text-sm text-green-600 ml-2 font-medium">
              ({job.applicationCount} applications)
            </span>
          )}
        </div>
      )}
    </div>
  );
};

// Minimal version for dropdowns and selects
export const JobCardMinimal = ({ job, selected = false, onSelect }) => {
  return (
    <div 
      onClick={() => onSelect && onSelect(job)}
      className={`p-4 border-2 rounded-xl cursor-pointer transition-all duration-200 ${
        selected 
          ? 'border-blue-500 bg-blue-50 shadow-md' 
          : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm'
      }`}
    >
      <div className="flex justify-between items-start">
        <div className="flex-1">
          <h5 className="font-bold text-gray-900 text-sm mb-1">{job.title}</h5>
          <p className="text-xs text-gray-600 mb-2">{job.location}</p>
        </div>
        {selected && (
          <svg className="w-5 h-5 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
          </svg>
        )}
      </div>
      <div className="mt-2 flex flex-wrap gap-1">
        {job.skills?.slice(0, 2).map((skill, index) => (
          <span
            key={index}
            className="inline-block px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded-full font-medium"
          >
            {skill}
          </span>
        ))}
        {job.skills?.length > 2 && (
          <span className="inline-block px-2 py-1 text-xs bg-gray-100 text-gray-500 rounded-full">
            +{job.skills.length - 2}
          </span>
        )}
      </div>
      {job.isPublic && (
        <div className="mt-2 flex items-center">
          <svg className="w-3 h-3 text-purple-500 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
          </svg>
          <span className="text-xs text-purple-600 font-medium">Accepting Applications</span>
        </div>
      )}
    </div>
  );
};

// Stats card version for dashboard
export const JobCardStats = ({ job, resumeCount, screenedCount, shortlistedCount }) => {
  return (
    <div className="bg-white rounded-xl shadow-lg p-5 border border-gray-100">
      <h4 className="font-bold text-gray-900 mb-3 text-lg">{job.title}</h4>
      <p className="text-gray-600 mb-4 text-sm">{job.location}</p>
      
      <div className="grid grid-cols-3 gap-3 text-center mb-4">
        <div className="bg-blue-50 rounded-lg p-3 border border-blue-100">
          <div className="text-xl font-bold text-blue-600">{resumeCount || 0}</div>
          <div className="text-xs text-blue-800 font-medium">Total</div>
        </div>
        <div className="bg-green-50 rounded-lg p-3 border border-green-100">
          <div className="text-xl font-bold text-green-600">{screenedCount || 0}</div>
          <div className="text-xs text-green-800 font-medium">Screened</div>
        </div>
        <div className="bg-purple-50 rounded-lg p-3 border border-purple-100">
          <div className="text-xl font-bold text-purple-600">{shortlistedCount || 0}</div>
          <div className="text-xs text-purple-800 font-medium">Shortlisted</div>
        </div>
      </div>

      {/* Public applications count */}
      {job.applicationCount > 0 && (
        <div className="mb-4 p-3 bg-yellow-50 rounded-lg border border-yellow-200">
          <div className="text-center">
            <div className="text-lg font-bold text-yellow-700">{job.applicationCount}</div>
            <div className="text-xs text-yellow-800 font-medium">Public Applications</div>
          </div>
        </div>
      )}
      
      <div className="pt-3 border-t border-gray-200">
        <Link
          to={`/screening/${job._id}`}
          className="block text-center bg-gradient-to-r from-blue-600 to-blue-700 text-white py-2 px-4 rounded-lg text-sm font-semibold hover:from-blue-700 hover:to-blue-800 transition-all duration-200 shadow-md hover:shadow-lg"
        >
          Manage Resumes
        </Link>
      </div>
    </div>
  );
};

export default JobCard;