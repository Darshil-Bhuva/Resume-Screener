//pages/dashboard.js
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import Navbar from '../components/Navbar';

const Dashboard = () => {
  const [stats, setStats] = useState({
    totalJobs: 0,
    totalResumes: 0,
    screenedResumes: 0,
    shortlisted: 0
  });
  const [recentJobs, setRecentJobs] = useState([]);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const [jobsRes, resumesRes] = await Promise.all([
        axios.get('/api/jobs'),
        axios.get('/api/resumes/stats')
      ]);
      
      setStats({
        totalJobs: jobsRes.data.length,
        totalResumes: resumesRes.data.total,
        screenedResumes: resumesRes.data.screened,
        shortlisted: resumesRes.data.shortlisted
      });

      setRecentJobs(jobsRes.data.slice(0, 5));
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    }
  };

  const StatCard = ({ title, value, color, link }) => (
    <Link
      to={link}
      className="bg-white rounded-lg shadow p-6 hover:shadow-md transition-shadow"
    >
      <div className="flex items-center">
        <div className={`p-3 rounded-lg bg-${color}-100`}>
          <div className={`h-6 w-6 bg-${color}-500 rounded`}></div>
        </div>
        <div className="ml-4">
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <p className="text-2xl font-semibold text-gray-900">{value}</p>
        </div>
      </div>
    </Link>
  );

  return (
    <>
      <Navbar />
      <div className="p-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Dashboard</h1>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <StatCard
            title="Active Jobs"
            value={stats.totalJobs}
            color="blue"
            link="/jobs"
          />
          <StatCard
            title="Total Resumes"
            value={stats.totalResumes}
            color="green"
            link="/jobs"
          />
          <StatCard
            title="Screened"
            value={stats.screenedResumes}
            color="purple"
            link="/analytics"
          />
          <StatCard
            title="Shortlisted"
            value={stats.shortlisted}
            color="orange"
            link="/analytics"
          />
        </div>

        {/* Recent Jobs */}
        <div className="bg-white rounded-lg shadow mb-8">
          <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
            <h2 className="text-lg font-semibold text-gray-900">Recent Jobs</h2>
            <Link
              to="/jobs"
              className="text-blue-600 hover:text-blue-800 font-medium"
            >
              View All
            </Link>
          </div>
          <div className="p-6">
            {recentJobs.length > 0 ? (
              <div className="space-y-4">
                {recentJobs.map((job) => (
                  <div key={job._id} className="flex justify-between items-center py-3 border-b border-gray-100">
                    <div>
                      <h3 className="font-medium text-gray-900">{job.title}</h3>
                      <p className="text-sm text-gray-600">{job.location}</p>
                    </div>
                    <Link
                      to={`/screening/${job._id}`}
                      className="bg-blue-600 text-white px-4 py-2 rounded text-sm hover:bg-blue-700"
                    >
                      Screen Resumes
                    </Link>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-gray-600 mb-4">No jobs created yet</p>
                <Link
                  to="/jobs"
                  className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
                >
                  Create Your First Job
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Quick Actions</h2>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Link
                to="/jobs"
                className="p-4 border-2 border-dashed border-gray-300 rounded-lg text-center hover:border-blue-400 hover:bg-blue-50 transition-colors"
              >
                <h3 className="font-medium text-gray-900">Create New Job</h3>
                <p className="text-sm text-gray-600 mt-1">Post a new job opening</p>
              </Link>
              <Link
                to="/jobs"
                className="p-4 border-2 border-dashed border-gray-300 rounded-lg text-center hover:border-green-400 hover:bg-green-50 transition-colors"
              >
                <h3 className="font-medium text-gray-900">Manage Jobs</h3>
                <p className="text-sm text-gray-600 mt-1">View and edit existing jobs</p>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default Dashboard;