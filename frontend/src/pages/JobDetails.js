//pages/jobdetails.js
import React from 'react';
import { useParams, Link } from 'react-router-dom';
import Navbar from '../components/Navbar';

const JobDetails = () => {
  const { id } = useParams();

  return (
    <>
      <Navbar />
      <div className="p-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Job Details</h1>
          <Link
            to="/jobs"
            className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700"
          >
            Back to Jobs
          </Link>
        </div>
        
        <div className="bg-white rounded-lg shadow p-6">
          <p className="text-gray-600">
            Detailed job view and editing will be implemented here.
          </p>
          <div className="mt-4">
            <Link
              to={`/screening/${id}`}
              className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
            >
              Screen Resumes for this Job
            </Link>
          </div>
        </div>
      </div>
    </>
  );
};

export default JobDetails;