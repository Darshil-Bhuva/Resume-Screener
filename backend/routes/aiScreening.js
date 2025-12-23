//routes/aiscreening.js
const express = require('express');
const natural = require('natural');
const Resume = require('../models/Resume');
const Job = require('../models/Job');
const auth = require('../middleware/auth');

const router = express.Router();

// AI Screening function
const screenResume = async (resume, job) => {
  try {
    const resumeText = resume.extractedText?.toLowerCase() || '';
    const jobSkills = job.skills.map(skill => skill.toLowerCase());
    const jobRequirements = job.requirements.map(req => req.toLowerCase());
    
    let skillsMatch = 0;
    const matchedKeywords = [];
    const missingKeywords = [];
    
    // Check skills match
    jobSkills.forEach(skill => {
      if (resumeText.includes(skill)) {
        skillsMatch++;
        matchedKeywords.push(skill);
      } else {
        missingKeywords.push(skill);
      }
    });
    
    // Check experience
    let experienceMatch = 0;
    let foundExperience = 0;
    
    try {
      const expRegex = /(\d+)\s*(?:years?|yrs?|year's?|year of)/gi;
      const expMatches = [...resumeText.matchAll(expRegex)];
      
      if (expMatches.length > 0) {
        const experiences = expMatches.map(m => parseInt(m[1])).filter(exp => exp <= 50); // Filter unrealistic numbers
        foundExperience = experiences.length > 0 ? Math.max(...experiences) : 0;
      }
    } catch (expError) {
      console.error('Experience extraction error:', expError);
      foundExperience = 0;
    }
    
    const minExp = job.experience?.min || 0;
    if (minExp === 0) {
      experienceMatch = 100;
    } else if (foundExperience >= minExp) {
      experienceMatch = 100;
    } else {
      experienceMatch = Math.round((foundExperience / minExp) * 100);
    }
    
    // Calculate overall score
    const skillsScore = jobSkills.length > 0 ? (skillsMatch / jobSkills.length) * 100 : 0;
    const overallScore = Math.round((skillsScore * 0.6) + (experienceMatch * 0.4));
    
    return {
      skillsMatch: Math.round(skillsScore),
      experienceMatch: experienceMatch,
      overallScore: overallScore,
      matchedKeywords,
      missingKeywords,
      foundExperience: foundExperience
    };
  } catch (error) {
    console.error('Screening function error:', error);
    return {
      skillsMatch: 0,
      experienceMatch: 0,
      overallScore: 0,
      matchedKeywords: [],
      missingKeywords: job.skills,
      foundExperience: 0
    };
  }
};

// Screen single resume
router.post('/screen/:resumeId', auth, async (req, res) => {
  try {
    const resume = await Resume.findById(req.params.resumeId);
    if (!resume) {
      return res.status(404).json({ message: 'Resume not found' });
    }
    
    const job = await Job.findById(resume.jobId);
    if (!job) {
      return res.status(404).json({ message: 'Job not found' });
    }
    
    const screeningResults = await screenResume(resume, job);
    
    resume.screeningResults = screeningResults;
    resume.score = screeningResults.overallScore;
    resume.status = 'screened';
    await resume.save();
    
    res.json({ resume, screeningResults });
  } catch (error) {
    console.error('Screen resume error:', error);
    res.status(500).json({ message: 'Server error during screening' });
  }
});

// Bulk screen resumes for a job
router.post('/screen/job/:jobId', auth, async (req, res) => {
  try {
    const resumes = await Resume.find({ 
      jobId: req.params.jobId, 
      status: 'new' 
    });
    
    const job = await Job.findById(req.params.jobId);
    if (!job) {
      return res.status(404).json({ message: 'Job not found' });
    }
    
    let screenedCount = 0;
    const screeningPromises = resumes.map(async (resume) => {
      try {
        const screeningResults = await screenResume(resume, job);
        resume.screeningResults = screeningResults;
        resume.score = screeningResults.overallScore;
        resume.status = 'screened';
        await resume.save();
        screenedCount++;
      } catch (error) {
        console.error(`Error screening resume ${resume._id}:`, error);
      }
    });
    
    await Promise.all(screeningPromises);
    
    res.json({ 
      message: `Screening completed. Processed ${screenedCount} out of ${resumes.length} resumes.` 
    });
  } catch (error) {
    console.error('Bulk screen error:', error);
    res.status(500).json({ message: 'Server error during bulk screening' });
  }
});

module.exports = router;