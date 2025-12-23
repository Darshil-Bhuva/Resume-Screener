import React, { useState, useEffect } from 'react';
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import axios from 'axios';

const AnalyticsDashboard = () => {
  const [analyticsData, setAnalyticsData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedJob, setSelectedJob] = useState('all');
  const [timeRange, setTimeRange] = useState('30days');
  const [skillsData, setSkillsData] = useState([]);

  // ADD THIS MISSING FUNCTION
  const handleJobChange = (jobId) => {
    setSelectedJob(jobId);
  };

  useEffect(() => {
    fetchAnalyticsData();
  }, [selectedJob, timeRange]);

  const fetchAnalyticsData = async () => {
    try {
      setLoading(true);
      const url = selectedJob === 'all' 
        ? '/api/analytics/dashboard'
        : `/api/analytics/dashboard?jobId=${selectedJob}`;
      
      const response = await axios.get(url);
      const data = response.data;
      
      // Enhance skills data with real-time detection metrics
      const enhancedSkillsData = await enhanceSkillsData(data.topSkills);
      setSkillsData(enhancedSkillsData);
      
      setAnalyticsData(data);
    } catch (error) {
      console.error('Error fetching analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  // Enhanced skills detection with real-time metrics
  const enhanceSkillsData = async (topSkills) => {
    if (!topSkills || topSkills.length === 0) return [];

    try {
      // Get current job requirements for skill gap analysis
      const jobResponse = await axios.get('/api/jobs');
      const jobs = jobResponse.data;
      
      // Extract all required skills from active jobs
      const allRequiredSkills = jobs.flatMap(job => job.skills || []);
      
      const skillFrequency = {};
      allRequiredSkills.forEach(skill => {
        const skillLower = skill.toLowerCase().trim();
        skillFrequency[skillLower] = (skillFrequency[skillLower] || 0) + 1;
      });

      return topSkills.map(skillItem => {
        const skillLower = skillItem.skill.toLowerCase().trim();
        const demand = skillFrequency[skillLower] || 0;
        
        return {
          ...skillItem,
          skill: formatSkillName(skillItem.skill),
          demand: demand,
          status: getSkillStatus(demand, skillItem.count),
          matchScore: calculateSkillMatchScore(skillItem.skill, allRequiredSkills),
          trend: getSkillTrend(skillItem.skill, skillItem.count)
        };
      });
    } catch (error) {
      console.error('Error enhancing skills data:', error);
      return topSkills.map(skill => ({
        ...skill,
        skill: formatSkillName(skill.skill),
        demand: 0,
        status: 'neutral',
        matchScore: 0,
        trend: 'stable'
      }));
    }
  };

  // Format skill names for better display
  const formatSkillName = (skill) => {
    const skillMap = {
      'javascript': 'JavaScript',
      'node.js': 'Node.js',
      'nodejs': 'Node.js',
      'html': 'HTML',
      'css': 'CSS',
      'react': 'React',
      'python': 'Python',
      'java': 'Java',
      'sql': 'SQL',
      'mongodb': 'MongoDB',
      'aws': 'AWS',
      'docker': 'Docker',
      'kubernetes': 'Kubernetes',
      'git': 'Git',
      'typescript': 'TypeScript',
      'angular': 'Angular',
      'vue': 'Vue.js',
      'php': 'PHP',
      'c++': 'C++',
      'c#': 'C#',
      'ruby': 'Ruby',
      'go': 'Go',
      'rust': 'Rust'
    };

    return skillMap[skill.toLowerCase()] || skill.charAt(0).toUpperCase() + skill.slice(1);
  };

  const getSkillStatus = (demand, supply) => {
    if (demand === 0) return 'low-demand';
    if (supply > demand * 2) return 'high-supply';
    if (supply < demand) return 'high-demand';
    return 'balanced';
  };

  const calculateSkillMatchScore = (skill, requiredSkills) => {
    const skillLower = skill.toLowerCase();
    const isRequired = requiredSkills.some(reqSkill => 
      reqSkill.toLowerCase().includes(skillLower)
    );
    return isRequired ? 100 : 0;
  };

  const getSkillTrend = (skill, count) => {
    // Simple trend calculation based on count
    if (count > 20) return 'rising';
    if (count > 10) return 'stable';
    return 'emerging';
  };

  // FIXED: Custom label for pie chart with perfect percentage display
  const renderCustomizedLabel = ({
    cx, cy, midAngle, innerRadius, outerRadius, percent, name
  }) => {
    // Only show label if percentage is significant (more than 5%)
    if (percent < 0.05) return null;
    
    const RADIAN = Math.PI / 180;
    const radius = innerRadius + (outerRadius - innerRadius) * 0.7; // Moved closer to center
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);

    // Shorten long names and ensure clean display
    const displayName = name.length > 8 ? `${name.substring(0, 6)}...` : name;
    const percentage = (percent * 100).toFixed(0);
    
    return (
      <text 
        x={x} 
        y={y} 
        fill="white" 
        textAnchor={x > cx ? 'start' : 'end'} 
        dominantBaseline="central"
        fontSize={11}
        fontWeight="bold"
        stroke="black"
        strokeWidth={0.5}
        paintOrder="stroke"
      >
        {`${percentage}%`}
      </text>
    );
  };

  // Excel Export Function
  const exportToExcel = async (type = 'candidates') => {
    try {
      let url = '';
      
      if (type === 'candidates') {
        url = `/api/export/candidates/excel?jobId=${selectedJob}`;
      } else {
        url = '/api/export/jobs/summary/excel';
      }

      // Use fetch with proper authentication
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });

      if (!response.ok) {
        throw new Error('Export failed');
      }

      // Convert response to blob and create download
      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      link.href = downloadUrl;
      
      // Get filename from response headers or generate one
      const contentDisposition = response.headers.get('content-disposition');
      let filename = `export_${type}_${new Date().toISOString().split('T')[0]}.xlsx`;
      
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename="(.+)"/);
        if (filenameMatch) {
          filename = filenameMatch[1];
        }
      }
      
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(downloadUrl);

      alert(`${type === 'candidates' ? 'Candidates' : 'Job Summary'} Excel file downloaded successfully!`);

    } catch (error) {
      console.error('Export error:', error);
      alert('Error exporting data. Please try again.');
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!analyticsData) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600">No analytics data available</p>
      </div>
    );
  }

  // Colors for charts
  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];
  const STATUS_COLORS = {
    new: '#6B7280',
    screened: '#3B82F6',
    shortlisted: '#10B981',
    rejected: '#EF4444',
    interview: '#8B5CF6'
  };

  // Skill status colors
  const SKILL_STATUS_COLORS = {
    'high-demand': '#EF4444',    // Red
    'high-supply': '#10B981',    // Green
    'balanced': '#3B82F6',       // Blue
    'low-demand': '#6B7280',     // Gray
    'neutral': '#6B7280'         // Gray
  };

  // Prepare data for charts with better label handling
  const statusData = Object.entries(analyticsData.statusDistribution)
    .filter(([_, count]) => count > 0) // Filter out zero values
    .map(([status, count]) => ({
      name: getStatusDisplayName(status),
      value: count,
      color: STATUS_COLORS[status],
      fullName: status
    }));

  const scoreData = [
    { name: 'Excellent (80-100)', value: analyticsData.scoreRanges.excellent, shortName: '80-100' },
    { name: 'Good (60-79)', value: analyticsData.scoreRanges.good, shortName: '60-79' },
    { name: 'Average (40-59)', value: analyticsData.scoreRanges.average, shortName: '40-59' },
    { name: 'Poor (0-39)', value: analyticsData.scoreRanges.poor, shortName: '0-39' }
  ];

  // Helper function for status display names
  function getStatusDisplayName(status) {
    const statusMap = {
      'new': 'New',
      'screened': 'Screened',
      'shortlisted': 'Shortlisted',
      'rejected': 'Rejected',
      'interview': 'Interview'
    };
    return statusMap[status] || status;
  }

  // Custom tooltip for charts
  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 border border-gray-300 rounded shadow-lg">
          <p className="font-semibold">{label}</p>
          {payload.map((entry, index) => (
            <p key={index} style={{ color: entry.color }}>
              {entry.name}: {entry.value}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  // Enhanced Skills Tooltip
  const SkillsTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white p-3 border border-gray-300 rounded shadow-lg max-w-xs">
          <p className="font-semibold text-sm mb-2">{data.skill}</p>
          <div className="space-y-1 text-xs">
            <p><strong>Found in:</strong> {data.count} resumes</p>
            <p><strong>Job Demand:</strong> {data.demand} jobs require this</p>
            <p><strong>Status:</strong> 
              <span className={`ml-1 px-2 py-1 rounded text-xs ${
                data.status === 'high-demand' ? 'bg-red-100 text-red-800' :
                data.status === 'high-supply' ? 'bg-green-100 text-green-800' :
                data.status === 'balanced' ? 'bg-blue-100 text-blue-800' :
                'bg-gray-100 text-gray-800'
              }`}>
                {data.status.replace('-', ' ')}
              </span>
            </p>
            <p><strong>Trend:</strong> {data.trend}</p>
            <p><strong>Match Score:</strong> {data.matchScore}%</p>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-6">
      {/* Header with Job Filter */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-gray-900">
              {analyticsData.currentJob ? analyticsData.currentJob.title : 'All Jobs'} Analytics
            </h2>
            <p className="text-gray-600">
              {analyticsData.currentJob 
                ? `Detailed insights for ${analyticsData.currentJob.title}`
                : 'Overall hiring performance across all jobs'
              }
            </p>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-4">
            <select
              value={selectedJob}
              onChange={(e) => handleJobChange(e.target.value)}
              className="border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Jobs</option>
              {analyticsData.allJobs?.map(job => (
                <option key={job._id} value={job._id}>
                  {job.title}
                </option>
              ))}
            </select>
            
            <select
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value)}
              className="border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="7days">Last 7 Days</option>
              <option value="30days">Last 30 Days</option>
              <option value="90days">Last 90 Days</option>
            </select>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Total Jobs Card */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-3 rounded-lg bg-blue-100">
              <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Jobs</p>
              <p className="text-2xl font-semibold text-gray-900">{analyticsData.summary.totalJobs}</p>
            </div>
          </div>
        </div>

        {/* Total Resumes Card */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-3 rounded-lg bg-green-100">
              <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Resumes</p>
              <p className="text-2xl font-semibold text-gray-900">{analyticsData.summary.totalResumes}</p>
            </div>
          </div>
        </div>

        {/* Shortlisted Card */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-3 rounded-lg bg-purple-100">
              <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Shortlisted</p>
              <p className="text-2xl font-semibold text-gray-900">{analyticsData.summary.totalShortlisted}</p>
              <p className="text-xs text-gray-500 mt-1">
                {analyticsData.summary.totalResumes > 0 
                  ? Math.round((analyticsData.summary.totalShortlisted / analyticsData.summary.totalResumes) * 100) 
                  : 0
                }% of total
              </p>
            </div>
          </div>
        </div>

        {/* Conversion Rate Card */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-3 rounded-lg bg-orange-100">
              <svg className="w-6 h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Shortlist Rate</p>
              <p className="text-2xl font-semibold text-gray-900">{analyticsData.summary.conversionRate}%</p>
              <p className="text-xs text-gray-500 mt-1">Applications to shortlist</p>
            </div>
          </div>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Application Status Chart - FIXED TEXT OVERFLOW */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Application Status Distribution</h3>
          <ResponsiveContainer width="100%" height={350}>
            <PieChart>
              <Pie
                data={statusData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={renderCustomizedLabel}
                outerRadius={120}
                innerRadius={60}
                fill="#8884d8"
                dataKey="value"
                paddingAngle={2}
                isAnimationActive={true}
              >
                {statusData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} stroke="#fff" strokeWidth={2} />
                ))}
              </Pie>
              <Tooltip 
                formatter={(value, name, props) => [
                  value, 
                  getStatusDisplayName(props.payload.fullName || name)
                ]}
                labelFormatter={(label) => `Status: ${label}`}
              />
              <Legend 
                formatter={(value, entry) => {
                  const data = statusData.find(item => item.name === value);
                  return (
                    <span style={{ color: data?.color, fontSize: '12px' }}>
                      {value}
                    </span>
                  );
                }}
                wrapperStyle={{ fontSize: '12px', paddingTop: '15px' }}
              />
            </PieChart>
          </ResponsiveContainer>
          <div className="mt-2 text-xs text-gray-500 text-center">
            Percentages shown on chart segments
          </div>
        </div>

        {/* Score Distribution Chart */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">AI Screening Score Distribution</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart 
              data={scoreData}
              margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="shortName" 
                angle={-45}
                textAnchor="end"
                height={60}
                fontSize={12}
              />
              <YAxis fontSize={12} />
              <Tooltip content={<CustomTooltip />} />
              <Legend />
              <Bar 
                dataKey="value" 
                fill="#8884d8" 
                name="Number of Resumes"
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Application Trends */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Application Trends ({timeRange === '7days' ? '7' : timeRange === '90days' ? '90' : '30'} Days)
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart 
              data={analyticsData.dailyApplications}
              margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="date" 
                fontSize={12}
                angle={-45}
                textAnchor="end"
                height={60}
              />
              <YAxis fontSize={12} />
              <Tooltip content={<CustomTooltip />} />
              <Legend />
              <Line 
                type="monotone" 
                dataKey="applications" 
                stroke="#8884d8" 
                strokeWidth={2}
                activeDot={{ r: 6 }} 
                name="Daily Applications"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* ENHANCED: Top Skills with Real-time Detection */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Skills Analysis</h3>
            <div className="flex gap-2">
              <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">High Supply</span>
              <span className="text-xs bg-red-100 text-red-800 px-2 py-1 rounded">High Demand</span>
              <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">Balanced</span>
            </div>
          </div>
          
          <ResponsiveContainer width="100%" height={300}>
            <BarChart 
              data={skillsData}
              layout="vertical"
              margin={{ left: 120, right: 20, top: 20, bottom: 20 }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                type="number" 
                fontSize={12}
                label={{ value: 'Number of Resumes', position: 'insideBottom', offset: -5 }}
              />
              <YAxis 
                type="category" 
                dataKey="skill" 
                width={110}
                tick={{ fontSize: 11 }}
                interval={0}
              />
              <Tooltip content={<SkillsTooltip />} />
              <Legend />
              <Bar 
                dataKey="count" 
                name="Found in Resumes"
                radius={[0, 4, 4, 0]}
              >
                {skillsData.map((entry, index) => (
                  <Cell 
                    key={`cell-${index}`} 
                    fill={SKILL_STATUS_COLORS[entry.status] || '#6B7280'} 
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          
          {/* Skills Summary */}
          <div className="mt-4 grid grid-cols-2 gap-4 text-xs">
            <div className="text-center p-2 bg-blue-50 rounded">
              <div className="font-semibold text-blue-800">High Demand Skills</div>
              <div className="text-blue-600">
                {skillsData.filter(skill => skill.status === 'high-demand').length}
              </div>
            </div>
            <div className="text-center p-2 bg-green-50 rounded">
              <div className="font-semibold text-green-800">High Supply Skills</div>
              <div className="text-green-600">
                {skillsData.filter(skill => skill.status === 'high-supply').length}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Export Data Section */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Export Data</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <button 
            onClick={() => exportToExcel('candidates')}
            className="bg-green-600 text-white py-3 px-4 rounded-md hover:bg-green-700 transition-colors flex items-center justify-center"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Export Candidates Excel
          </button>
          
          <button 
            onClick={() => exportToExcel('summary')}
            className="bg-blue-600 text-white py-3 px-4 rounded-md hover:bg-blue-700 transition-colors flex items-center justify-center"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Export Job Summary Excel
          </button>
        </div>
        
        <div className="mt-4 text-xs text-gray-600">
          <p><strong>Candidates Export Includes:</strong> Email, Mobile, Job Title, Status, AI Score, Experience, Education, Skills, Applied Date, Resume Links</p>
          <p><strong>Job Summary Export Includes:</strong> Job performance metrics, application counts, shortlist rates, and average scores</p>
        </div>
      </div>

      {/* Job Performance Table */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">
            {selectedJob === 'all' ? 'Job Performance Comparison' : 'Job Performance Details'}
          </h3>
        </div>
        <div className="p-6">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead>
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Job Title
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Applications
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Screened
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Shortlisted
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Shortlist Rate
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Avg Score
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {analyticsData.jobStats.map((job, index) => (
                  <tr key={index} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {job.jobTitle}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {job.totalApplications}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {job.screened}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <span className="font-semibold text-green-600">{job.shortlisted}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        job.shortlistRate >= 20 ? 'bg-green-100 text-green-800' :
                        job.shortlistRate >= 10 ? 'bg-yellow-100 text-yellow-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {job.shortlistRate}%
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        job.averageScore >= 80 ? 'bg-green-100 text-green-800' :
                        job.averageScore >= 60 ? 'bg-yellow-100 text-yellow-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {job.averageScore}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <button 
            onClick={fetchAnalyticsData}
            className="bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition-colors flex items-center justify-center"
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Refresh Analytics
          </button>
          <button 
            onClick={() => setSelectedJob('all')}
            className="bg-gray-600 text-white py-2 px-4 rounded-md hover:bg-gray-700 transition-colors flex items-center justify-center"
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
            View All Jobs
          </button>
        </div>
      </div>
    </div>
  );
};

export default AnalyticsDashboard;