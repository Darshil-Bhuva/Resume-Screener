//frontend/utils/constants.js
// API Configuration
export const API_BASE_URL = 'http://localhost:5000/api';

// Application Constants
export const STATUS_OPTIONS = [
  { value: 'new', label: 'New', color: 'gray' },
  { value: 'screened', label: 'Screened', color: 'blue' },
  { value: 'shortlisted', label: 'Shortlisted', color: 'green' },
  { value: 'rejected', label: 'Rejected', color: 'red' },
  { value: 'interview', label: 'Interview', color: 'purple' }
];

export const SCORE_LEVELS = {
  EXCELLENT: { min: 80, color: 'green', label: 'Excellent' },
  GOOD: { min: 60, color: 'yellow', label: 'Good' },
  AVERAGE: { min: 40, color: 'orange', label: 'Average' },
  POOR: { min: 0, color: 'red', label: 'Poor' }
};

export const FILE_CONFIG = {
  MAX_FILE_SIZE: 10 * 1024 * 1024, // 10MB
  ALLOWED_TYPES: ['application/pdf'],
  MAX_FILES: 10
};

// Experience levels
export const EXPERIENCE_LEVELS = [
  { value: 0, label: 'Fresher' },
  { value: 1, label: '1+ years' },
  { value: 2, label: '2+ years' },
  { value: 3, label: '3+ years' },
  { value: 5, label: '5+ years' },
  { value: 8, label: '8+ years' },
  { value: 10, label: '10+ years' }
];

// Job types (for future enhancement)
export const JOB_TYPES = [
  'Full-time',
  'Part-time',
  'Contract',
  'Internship',
  'Remote'
];

// Industries (for future enhancement)
export const INDUSTRIES = [
  'Technology',
  'Healthcare',
  'Finance',
  'Education',
  'Manufacturing',
  'Retail',
  'Hospitality',
  'Other'
];

// Default job requirements
export const DEFAULT_REQUIREMENTS = [
  'Strong communication skills',
  'Team player',
  'Problem-solving abilities',
  'Ability to work under pressure'
];

// Common skills list for autocomplete
export const COMMON_SKILLS = [
  'JavaScript',
  'React',
  'Node.js',
  'Python',
  'Java',
  'HTML',
  'CSS',
  'MongoDB',
  'SQL',
  'Git',
  'AWS',
  'Docker',
  'Communication',
  'Leadership',
  'Project Management',
  'Problem Solving',
  'Teamwork',
  'Agile Methodology'
];