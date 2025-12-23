const express = require('express');
const router = express.Router();
const Candidate = require('../models/Candidate');

// Get all candidates with filters
router.get('/', async (req, res) => {
  try {
    const {
      status,
      jobId,
      scoreMin,
      scoreMax,
      skills,
      dateFrom,
      dateTo,
      search,
      page = 1,
      limit = 10
    } = req.query;

    // Build filter object
    let filter = {};

    if (status && status !== 'all') {
      if (status === 'active') {
        filter.status = { $in: ['new', 'screened', 'shortlisted'] };
      } else {
        filter.status = status;
      }
    }

    if (jobId && jobId !== 'all') {
      filter.jobId = jobId;
    }

    if (scoreMin || scoreMax) {
      filter.score = {};
      if (scoreMin) filter.score.$gte = parseInt(scoreMin);
      if (scoreMax) filter.score.$lte = parseInt(scoreMax);
    }

    if (skills) {
      const skillsArray = skills.split(',').map(skill => skill.trim());
      filter.skills = { $in: skillsArray.map(skill => new RegExp(skill, 'i')) };
    }

    if (dateFrom || dateTo) {
      filter.createdAt = {};
      if (dateFrom) filter.createdAt.$gte = new Date(dateFrom);
      if (dateTo) filter.createdAt.$lte = new Date(dateTo + 'T23:59:59.999Z');
    }

    if (search) {
      filter.$or = [
        { applicantEmail: { $regex: search, $options: 'i' } },
        { applicantPhone: { $regex: search, $options: 'i' } },
        { skills: { $in: [new RegExp(search, 'i')] } }
      ];
    }

    // Pagination
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    // Get candidates
    const candidates = await Candidate.find(filter)
      .populate('jobId')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum);

    // Get total count for pagination
    const totalCandidates = await Candidate.countDocuments(filter);

    // Get pipeline stats
    const pipelineStats = await Candidate.getPipelineStats(jobId && jobId !== 'all' ? jobId : null);

    res.json({
      success: true,
      candidates,
      pipelineStats,
      pagination: {
        currentPage: pageNum,
        totalPages: Math.ceil(totalCandidates / limitNum),
        totalCandidates,
        hasNext: pageNum < Math.ceil(totalCandidates / limitNum),
        hasPrev: pageNum > 1
      }
    });

  } catch (error) {
    console.error('Error fetching candidates:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch candidates'
    });
  }
});

// Bulk status update
router.put('/bulk-status', async (req, res) => {
  try {
    const { candidateIds, status } = req.body;

    if (!candidateIds || !status) {
      return res.status(400).json({
        success: false,
        error: 'Candidate IDs and status are required'
      });
    }

    const result = await Candidate.updateMany(
      { _id: { $in: candidateIds } },
      { $set: { status } }
    );

    res.json({
      success: true,
      message: `Updated ${result.modifiedCount} candidates to ${status} status`,
      modifiedCount: result.modifiedCount
    });

  } catch (error) {
    console.error('Bulk status update error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update candidate status'
    });
  }
});

module.exports = router;