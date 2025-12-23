//components/navbar.js

import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const Navbar = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <nav className="bg-white shadow-lg">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center space-x-8">
            <Link to="/" className="text-xl font-bold text-gray-800">
              ResumeScreener
            </Link>
            {user && (
              <div className="hidden md:flex space-x-4">
                <Link to="/" className="text-gray-600 hover:text-blue-600 px-3 py-2 rounded-md">
                  Dashboard
                </Link>
                <Link to="/jobs" className="text-gray-600 hover:text-blue-600 px-3 py-2 rounded-md">
                  Jobs
                </Link>
                <Link to="/candidates" className="text-gray-600 hover:text-blue-600 px-3 py-2 rounded-md">
                  Candidates
                </Link>
                <Link to="/analytics" className="text-gray-600 hover:text-blue-600 px-3 py-2 rounded-md">
                  Analytics
                </Link>
              </div>
            )}
          </div>

          {user && (
            <div className="flex items-center space-x-4">
              <span className="text-gray-700">
                Welcome, {user.name} ({user.company})
              </span>
              <button
                onClick={handleLogout}
                className="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700"
              >
                Logout
              </button>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;