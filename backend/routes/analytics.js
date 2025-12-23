const express = require('express');
const Resume = require('../models/Resume');
const Job = require('../models/Job');
const auth = require('../middleware/auth');

const router = express.Router();

// Get comprehensive analytics data with job filtering
router.get('/dashboard', auth, async (req, res) => {
  try {
    const userId = req.user._id;
    const { jobId } = req.query;

    // Get jobs based on filter
    let jobs, jobIds;
    if (jobId) {
      // Single job analytics
      const job = await Job.findOne({ _id: jobId, createdBy: userId });
      if (!job) {
        return res.status(404).json({ message: 'Job not found' });
      }
      jobs = [job];
      jobIds = [jobId];
    } else {
      // All jobs analytics
      jobs = await Job.find({ createdBy: userId });
      jobIds = jobs.map(job => job._id);
    }

    // Get all resumes for the selected jobs
    const resumes = await Resume.find({ jobId: { $in: jobIds } });

    // 1. Status Distribution (UPDATED: Focus on shortlisted)
    const statusDistribution = {
      new: resumes.filter(r => r.status === 'new').length,
      screened: resumes.filter(r => r.status === 'screened').length,
      shortlisted: resumes.filter(r => r.status === 'shortlisted').length, // This is now key metric
      rejected: resumes.filter(r => r.status === 'rejected').length,
      interview: resumes.filter(r => r.status === 'interview').length
    };

    // 2. Score Distribution
    const scoreRanges = {
      excellent: resumes.filter(r => r.score >= 80).length,
      good: resumes.filter(r => r.score >= 60 && r.score < 80).length,
      average: resumes.filter(r => r.score >= 40 && r.score < 60).length,
      poor: resumes.filter(r => r.score < 40).length
    };

    // 3. Application Trends (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const dailyApplications = [];
    for (let i = 0; i < 30; i++) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      
      const count = resumes.filter(r => {
        const resumeDate = new Date(r.createdAt).toISOString().split('T')[0];
        return resumeDate === dateStr;
      }).length;

      dailyApplications.unshift({
        date: dateStr,
        applications: count
      });
    }

    // 4. Skills Analysis
    const allSkills = resumes.flatMap(r => r.skills || []);
    const skillFrequency = {};
    allSkills.forEach(skill => {
      skillFrequency[skill] = (skillFrequency[skill] || 0) + 1;
    });

    const topSkills = Object.entries(skillFrequency)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([skill, count]) => ({ skill, count }));

    // 5. Job-wise Statistics (Enhanced with shortlist focus)
    const jobStats = await Promise.all(
      jobs.map(async (job) => {
        const jobResumes = resumes.filter(r => r.jobId.toString() === job._id.toString());
        const screenedResumes = jobResumes.filter(r => r.status === 'screened' || r.screeningResults);
        const shortlistedResumes = jobResumes.filter(r => r.status === 'shortlisted');
        
        const averageScore = screenedResumes.length > 0 
          ? screenedResumes.reduce((sum, r) => sum + (r.score || 0), 0) / screenedResumes.length 
          : 0;

        const shortlistRate = jobResumes.length > 0 
          ? (shortlistedResumes.length / jobResumes.length * 100) 
          : 0;

        return {
          jobId: job._id,
          jobTitle: job.title,
          totalApplications: jobResumes.length,
          screened: screenedResumes.length,
          shortlisted: shortlistedResumes.length, // Key metric
          averageScore: Math.round(averageScore),
          shortlistRate: Math.round(shortlistRate)
        };
      })
    );

    // 6. Screening Performance (Updated with shortlist focus)
    const screeningPerformance = {
      totalScreened: resumes.filter(r => r.screeningResults).length,
      totalShortlisted: resumes.filter(r => r.status === 'shortlisted').length, // NEW
      autoScreened: resumes.filter(r => r.dataSource === 'auto' && r.screeningResults).length,
      manualScreened: resumes.filter(r => r.dataSource === 'manual' && r.screeningResults).length,
      averageScreeningScore: resumes.filter(r => r.score).length > 0 
        ? resumes.reduce((sum, r) => sum + (r.score || 0), 0) / resumes.filter(r => r.score).length 
        : 0,
      overallShortlistRate: resumes.length > 0 
        ? (resumes.filter(r => r.status === 'shortlisted').length / resumes.length * 100) 
        : 0
    };

    // 7. Get all jobs for dropdown
    const allUserJobs = await Job.find({ createdBy: userId }).select('title _id');

    res.json({
      statusDistribution,
      scoreRanges,
      dailyApplications,
      topSkills,
      jobStats,
      screeningPerformance,
      allJobs: allUserJobs, // For job filter dropdown
      currentJob: jobId ? jobs[0] : null,
      summary: {
        totalJobs: jobs.length,
        totalResumes: resumes.length,
        totalShortlisted: statusDistribution.shortlisted, // UPDATED: Changed from screened to shortlisted
        conversionRate: resumes.length > 0 ? (statusDistribution.shortlisted / resumes.length * 100).toFixed(1) : 0
      }
    });

  } catch (error) {
    console.error('Analytics error:', error);
    res.status(500).json({ message: 'Error fetching analytics data' });
  }
});

// Get job-specific detailed analytics
router.get('/job/:jobId/detailed', auth, async (req, res) => {
  try {
    const jobId = req.params.jobId;
    
    // Verify job belongs to user
    const job = await Job.findOne({ _id: jobId, createdBy: req.user._id });
    if (!job) {
      return res.status(404).json({ message: 'Job not found' });
    }

    const resumes = await Resume.find({ jobId });

    // Enhanced job-specific analytics
    const analytics = {
      jobTitle: job.title,
      jobId: job._id,
      totalApplications: resumes.length,
      statusBreakdown: {
        new: resumes.filter(r => r.status === 'new').length,
        screened: resumes.filter(r => r.status === 'screened').length,
        shortlisted: resumes.filter(r => r.status === 'shortlisted').length, // Focus metric
        rejected: resumes.filter(r => r.status === 'rejected').length,
        interview: resumes.filter(r => r.status === 'interview').length
      },
      scoreAnalysis: {
        average: resumes.filter(r => r.score).length > 0 
          ? resumes.reduce((sum, r) => sum + (r.score || 0), 0) / resumes.filter(r => r.score).length 
          : 0,
        highScores: resumes.filter(r => r.score >= 80).length,
        lowScores: resumes.filter(r => r.score < 40).length,
        scoreDistribution: [
          { range: '80-100', count: resumes.filter(r => r.score >= 80).length },
          { range: '60-79', count: resumes.filter(r => r.score >= 60 && r.score < 80).length },
          { range: '40-59', count: resumes.filter(r => r.score >= 40 && r.score < 60).length },
          { range: '0-39', count: resumes.filter(r => r.score < 40).length }
        ]
      },
      skillGap: calculateSkillGap(resumes, job.skills),
      timeline: getApplicationTimeline(resumes),
      candidateQuality: {
        averageExperience: resumes.filter(r => r.experience).length > 0 
          ? resumes.reduce((sum, r) => sum + (r.experience || 0), 0) / resumes.filter(r => r.experience).length 
          : 0,
        skillsMatchRate: calculateSkillsMatchRate(resumes, job.skills),
        shortlistConversion: resumes.length > 0 
          ? (resumes.filter(r => r.status === 'shortlisted').length / resumes.length * 100).toFixed(1) 
          : 0
      }
    };

    res.json(analytics);
  } catch (error) {
    console.error('Job analytics error:', error);
    res.status(500).json({ message: 'Error fetching job analytics' });
  }
});

// Helper function to calculate skill gap
function calculateSkillGap(resumes, requiredSkills) {
  const skillFrequency = {};
  resumes.forEach(resume => {
    (resume.skills || []).forEach(skill => {
      const skillLower = skill.toLowerCase();
      skillFrequency[skillLower] = (skillFrequency[skillLower] || 0) + 1;
    });
  });

  const skillGap = requiredSkills.map(skill => {
    const skillLower = skill.toLowerCase();
    const foundCount = skillFrequency[skillLower] || 0;
    return {
      skill,
      found: foundCount,
      percentage: resumes.length > 0 ? ((foundCount / resumes.length) * 100).toFixed(1) : 0,
      status: foundCount > 0 ? 'available' : 'missing'
    };
  });

  return skillGap;
}

// Helper function to calculate skills match rate
function calculateSkillsMatchRate(resumes, requiredSkills) {
  if (resumes.length === 0) return 0;
  
  const totalMatches = resumes.reduce((sum, resume) => {
    const resumeSkills = (resume.skills || []).map(s => s.toLowerCase());
    const requiredSkillsLower = requiredSkills.map(s => s.toLowerCase());
    const matches = requiredSkillsLower.filter(skill => resumeSkills.includes(skill)).length;
    return sum + (matches / requiredSkills.length) * 100;
  }, 0);

  return (totalMatches / resumes.length).toFixed(1);
}

// Helper function to get application timeline
function getApplicationTimeline(resumes) {
  const last7Days = [];
  for (let i = 6; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    const dateStr = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    
    const count = resumes.filter(r => {
      const resumeDate = new Date(r.createdAt);
      return resumeDate.toDateString() === date.toDateString();
    }).length;

    last7Days.push({
      date: dateStr,
      applications: count
    });
  }

  return last7Days;
}

module.exports = router;