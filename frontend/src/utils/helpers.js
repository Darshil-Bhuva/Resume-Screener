//frontend/utils/helpers.js
import { SCORE_LEVELS, STATUS_OPTIONS } from './constants';

// Format date to readable string
export const formatDate = (dateString) => {
  if (!dateString) return 'N/A';
  
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

// Get color class based on score
export const getScoreColor = (score) => {
  if (score >= SCORE_LEVELS.EXCELLENT.min) {
    return 'text-green-600 bg-green-100';
  } else if (score >= SCORE_LEVELS.GOOD.min) {
    return 'text-yellow-600 bg-yellow-100';
  } else if (score >= SCORE_LEVELS.AVERAGE.min) {
    return 'text-orange-600 bg-orange-100';
  } else {
    return 'text-red-600 bg-red-100';
  }
};

// Get score level text
export const getScoreLevel = (score) => {
  if (score >= SCORE_LEVELS.EXCELLENT.min) return SCORE_LEVELS.EXCELLENT.label;
  if (score >= SCORE_LEVELS.GOOD.min) return SCORE_LEVELS.GOOD.label;
  if (score >= SCORE_LEVELS.AVERAGE.min) return SCORE_LEVELS.AVERAGE.label;
  return SCORE_LEVELS.POOR.label;
};

// Get status color
export const getStatusColor = (status) => {
  const statusObj = STATUS_OPTIONS.find(s => s.value === status);
  if (!statusObj) return 'gray';
  return statusObj.color;
};

// Get status display text
export const getStatusDisplay = (status) => {
  const statusObj = STATUS_OPTIONS.find(s => s.value === status);
  return statusObj ? statusObj.label : status;
};

// Format file size
export const formatFileSize = (bytes) => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

// Validate email format
export const validateEmail = (email) => {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email);
};

// Validate phone number (basic validation)
export const validatePhone = (phone) => {
  const re = /^[\+]?[1-9][\d]{0,15}$/;
  return re.test(phone.replace(/[\s\-\(\)]/g, ''));
};

// Truncate text with ellipsis
export const truncateText = (text, maxLength = 100) => {
  if (!text) return '';
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + '...';
};

// Calculate average score from resumes
export const calculateAverageScore = (resumes) => {
  if (!resumes || resumes.length === 0) return 0;
  
  const totalScore = resumes.reduce((sum, resume) => {
    return sum + (resume.score || 0);
  }, 0);
  
  return Math.round(totalScore / resumes.length);
};

// Filter resumes by status
export const filterResumesByStatus = (resumes, status) => {
  if (!resumes) return [];
  return resumes.filter(resume => resume.status === status);
};

// Sort resumes by score (descending)
export const sortResumesByScore = (resumes) => {
  if (!resumes) return [];
  return [...resumes].sort((a, b) => (b.score || 0) - (a.score || 0));
};

// Generate random color for avatars
export const generateRandomColor = () => {
  const colors = [
    'bg-blue-500', 'bg-green-500', 'bg-yellow-500', 
    'bg-red-500', 'bg-purple-500', 'bg-pink-500',
    'bg-indigo-500', 'bg-teal-500', 'bg-orange-500'
  ];
  return colors[Math.floor(Math.random() * colors.length)];
};

// Get initials from name
export const getInitials = (name) => {
  if (!name) return '?';
  return name
    .split(' ')
    .map(part => part.charAt(0))
    .join('')
    .toUpperCase()
    .substring(0, 2);
};

// Debounce function for search inputs
export const debounce = (func, wait) => {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
};

// Format file name for display
export const formatFileName = (filename) => {
  if (!filename) return 'Unknown File';
  
  // Remove uploaded timestamp prefix if exists
  const cleanName = filename.replace(/^\d+-/, '');
  
  // Truncate long names
  if (cleanName.length > 30) {
    return cleanName.substring(0, 27) + '...';
  }
  
  return cleanName;
};

// Download file helper
export const downloadFile = (url, filename) => {
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

// Copy to clipboard
export const copyToClipboard = async (text) => {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch (err) {
    // Fallback for older browsers
    const textArea = document.createElement('textarea');
    textArea.value = text;
    document.body.appendChild(textArea);
    textArea.select();
    document.execCommand('copy');
    document.body.removeChild(textArea);
    return true;
  }
};

// Calculate screening statistics
export const getScreeningStats = (resumes) => {
  if (!resumes) {
    return {
      total: 0,
      screened: 0,
      shortlisted: 0,
      rejected: 0,
      interview: 0,
      averageScore: 0
    };
  }

  const stats = {
    total: resumes.length,
    screened: filterResumesByStatus(resumes, 'screened').length,
    shortlisted: filterResumesByStatus(resumes, 'shortlisted').length,
    rejected: filterResumesByStatus(resumes, 'rejected').length,
    interview: filterResumesByStatus(resumes, 'interview').length,
    averageScore: calculateAverageScore(resumes)
  };

  return stats;
};