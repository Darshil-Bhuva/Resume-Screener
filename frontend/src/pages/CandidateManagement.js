import React from 'react';
import Navbar from '../components/Navbar';
import CandidateDashboard from '../components/CandidateDashboard';

const CandidateManagement = () => {
  return (
    <>
      <Navbar />
      <div className="p-6">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Candidate Management</h1>
            <p className="text-gray-600 mt-1">Manage your candidate pipeline and communications</p>
          </div>
        </div>
        
        <CandidateDashboard />
      </div>
    </>
  );
};

export default CandidateManagement;