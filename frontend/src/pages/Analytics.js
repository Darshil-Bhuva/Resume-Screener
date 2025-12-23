import React from 'react';
import Navbar from '../components/Navbar';
import AnalyticsDashboard from '../components/AnalyticsDashboard';

const Analytics = () => {
  return (
    <>
      <Navbar />
      <div className="p-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Analytics Dashboard</h1>
          <div className="text-sm text-gray-600">
            Real-time insights into your hiring process
          </div>
        </div>
        
        <AnalyticsDashboard />
      </div>
    </>
  );
};

export default Analytics;