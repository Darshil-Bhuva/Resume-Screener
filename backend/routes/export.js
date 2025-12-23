const express = require('express');
const ExcelJS = require('exceljs');
const Resume = require('../models/Resume');
const Job = require('../models/Job');
const auth = require('../middleware/auth');
const moment = require('moment');

const router = express.Router();

// Export candidates to Excel
router.get('/candidates/excel', auth, async (req, res) => {
  try {
    const userId = req.user._id;
    const { jobId } = req.query;

    // Get jobs based on filter
    let jobs, jobIds;
    if (jobId && jobId !== 'all') {
      // Single job export
      const job = await Job.findOne({ _id: jobId, createdBy: userId });
      if (!job) {
        return res.status(404).json({ message: 'Job not found' });
      }
      jobs = [job];
      jobIds = [jobId];
    } else {
      // All jobs export
      jobs = await Job.find({ createdBy: userId });
      jobIds = jobs.map(job => job._id);
    }

    // Get all resumes for the selected jobs
    const resumes = await Resume.find({ jobId: { $in: jobIds } })
      .populate('jobId', 'title')
      .sort({ createdAt: -1 });

    // Create Excel workbook
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Candidates');

    // Define columns
    worksheet.columns = [
      { header: 'Candidate Email', key: 'email', width: 30 },
      { header: 'Mobile Number', key: 'phone', width: 20 },
      { header: 'Job Title', key: 'jobTitle', width: 25 },
      { header: 'Status', key: 'status', width: 15 },
      { header: 'AI Score', key: 'score', width: 12 },
      { header: 'Experience (Years)', key: 'experience', width: 18 },
      { header: 'Education', key: 'education', width: 25 },
      { header: 'Skills', key: 'skills', width: 40 },
      { header: 'Applied Date', key: 'appliedDate', width: 20 },
      { header: 'Resume File Name', key: 'resumeFileName', width: 30 },
      { header: 'Resume Download Link', key: 'resumeLink', width: 50 }
    ];

    // Style header row
    worksheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFF' } };
    worksheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: '2E86AB' }
    };
    worksheet.getRow(1).alignment = { vertical: 'middle', horizontal: 'center' };

    // Add data rows
    resumes.forEach((resume, index) => {
      const row = worksheet.addRow({
        email: resume.applicantEmail || 'N/A',
        phone: resume.applicantPhone || 'N/A',
        jobTitle: resume.jobId?.title || 'N/A',
        status: formatStatus(resume.status),
        score: resume.score ? `${resume.score}%` : 'Not Screened',
        experience: resume.experience || 'N/A',
        education: resume.education || 'N/A',
        skills: (resume.skills || []).join(', ') || 'N/A',
        appliedDate: moment(resume.createdAt).format('YYYY-MM-DD HH:mm'),
        resumeFileName: resume.resumeFile?.originalName || 'N/A',
        resumeLink: generateResumeLink(req, resume)
      });

      // Alternate row colors for better readability
      if (index % 2 === 0) {
        row.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'F8F9FA' }
        };
      }

      // Style status column based on status
      const statusCell = row.getCell('status');
      statusCell.font = { bold: true };
      
      switch (resume.status) {
        case 'shortlisted':
          statusCell.font.color = { argb: '15803D' }; // Green
          break;
        case 'rejected':
          statusCell.font.color = { argb: 'DC2626' }; // Red
          break;
        case 'interview':
          statusCell.font.color = { argb: '7C3AED' }; // Purple
          break;
        case 'screened':
          statusCell.font.color = { argb: '1D4ED8' }; // Blue
          break;
        default:
          statusCell.font.color = { argb: '6B7280' }; // Gray
      }

      // Style score column based on value
      const scoreCell = row.getCell('score');
      if (resume.score >= 80) {
        scoreCell.font = { bold: true, color: { argb: '15803D' } }; // Green
      } else if (resume.score >= 60) {
        scoreCell.font = { bold: true, color: { argb: 'D97706' } }; // Orange
      } else if (resume.score > 0) {
        scoreCell.font = { bold: true, color: { argb: 'DC2626' } }; // Red
      }
    });

    // Auto-filter for easy filtering in Excel
    worksheet.autoFilter = {
      from: { row: 1, column: 1 },
      to: { row: 1, column: worksheet.columnCount }
    };

    // Freeze header row
    worksheet.views = [
      { state: 'frozen', xSplit: 0, ySplit: 1 }
    ];

    // Generate filename
    const jobTitle = jobId && jobId !== 'all' 
      ? jobs[0].title.replace(/[^a-zA-Z0-9]/g, '_') 
      : 'All_Jobs';
    
    const timestamp = moment().format('YYYY-MM-DD_HH-mm');
    const filename = `Candidates_${jobTitle}_${timestamp}.xlsx`;

    // Set response headers
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    // Write to response
    await workbook.xlsx.write(res);
    res.end();

  } catch (error) {
    console.error('Export error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Error generating Excel file',
      error: error.message 
    });
  }
});

// Helper function to format status
function formatStatus(status) {
  const statusMap = {
    'new': 'New',
    'screened': 'Screened',
    'shortlisted': 'Shortlisted',
    'rejected': 'Rejected',
    'interview': 'Interview'
  };
  return statusMap[status] || status;
}

// Helper function to generate resume download link
function generateResumeLink(req, resume) {
  if (!resume.resumeFile) return 'No resume file';
  
  const baseUrl = `${req.protocol}://${req.get('host')}`;
  return `${baseUrl}/api/resumes/${resume._id}/file?download=true`;
}

// Export job-wise summary
router.get('/jobs/summary/excel', auth, async (req, res) => {
  try {
    const userId = req.user._id;
    const jobs = await Job.find({ createdBy: userId });

    // Get resume counts for each job
    const jobStats = await Promise.all(
      jobs.map(async (job) => {
        const resumes = await Resume.find({ jobId: job._id });
        return {
          jobTitle: job.title,
          location: job.location,
          totalApplications: resumes.length,
          new: resumes.filter(r => r.status === 'new').length,
          screened: resumes.filter(r => r.status === 'screened').length,
          shortlisted: resumes.filter(r => r.status === 'shortlisted').length,
          rejected: resumes.filter(r => r.status === 'rejected').length,
          interview: resumes.filter(r => r.status === 'interview').length,
          averageScore: resumes.filter(r => r.score).length > 0 
            ? resumes.reduce((sum, r) => sum + (r.score || 0), 0) / resumes.filter(r => r.score).length 
            : 0
        };
      })
    );

    // Create Excel workbook
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Job Summary');

    // Define columns for job summary
    worksheet.columns = [
      { header: 'Job Title', key: 'jobTitle', width: 30 },
      { header: 'Location', key: 'location', width: 20 },
      { header: 'Total Applications', key: 'totalApplications', width: 18 },
      { header: 'New', key: 'new', width: 10 },
      { header: 'Screened', key: 'screened', width: 12 },
      { header: 'Shortlisted', key: 'shortlisted', width: 12 },
      { header: 'Rejected', key: 'rejected', width: 12 },
      { header: 'Interview', key: 'interview', width: 12 },
      { header: 'Shortlist Rate', key: 'shortlistRate', width: 15 },
      { header: 'Avg AI Score', key: 'averageScore', width: 15 }
    ];

    // Style header row
    worksheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFF' } };
    worksheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: '2E86AB' }
    };
    worksheet.getRow(1).alignment = { vertical: 'middle', horizontal: 'center' };

    // Add data rows
    jobStats.forEach((job, index) => {
      const shortlistRate = job.totalApplications > 0 
        ? ((job.shortlisted / job.totalApplications) * 100).toFixed(1) 
        : 0;

      const row = worksheet.addRow({
        jobTitle: job.jobTitle,
        location: job.location,
        totalApplications: job.totalApplications,
        new: job.new,
        screened: job.screened,
        shortlisted: job.shortlisted,
        rejected: job.rejected,
        interview: job.interview,
        shortlistRate: `${shortlistRate}%`,
        averageScore: `${Math.round(job.averageScore)}%`
      });

      // Alternate row colors
      if (index % 2 === 0) {
        row.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'F8F9FA' }
        };
      }

      // Style shortlist rate based on value
      const rateCell = row.getCell('shortlistRate');
      const rateValue = parseFloat(shortlistRate);
      if (rateValue >= 20) {
        rateCell.font = { bold: true, color: { argb: '15803D' } };
      } else if (rateValue >= 10) {
        rateCell.font = { bold: true, color: { argb: 'D97706' } };
      } else {
        rateCell.font = { bold: true, color: { argb: 'DC2626' } };
      }

      // Style average score
      const scoreCell = row.getCell('averageScore');
      if (job.averageScore >= 80) {
        scoreCell.font = { bold: true, color: { argb: '15803D' } };
      } else if (job.averageScore >= 60) {
        scoreCell.font = { bold: true, color: { argb: 'D97706' } };
      } else {
        scoreCell.font = { bold: true, color: { argb: 'DC2626' } };
      }
    });

    // Add summary row
    const totalRow = worksheet.addRow({
      jobTitle: 'TOTAL',
      totalApplications: jobStats.reduce((sum, job) => sum + job.totalApplications, 0),
      new: jobStats.reduce((sum, job) => sum + job.new, 0),
      screened: jobStats.reduce((sum, job) => sum + job.screened, 0),
      shortlisted: jobStats.reduce((sum, job) => sum + job.shortlisted, 0),
      rejected: jobStats.reduce((sum, job) => sum + job.rejected, 0),
      interview: jobStats.reduce((sum, job) => sum + job.interview, 0)
    });

    totalRow.font = { bold: true };
    totalRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'E5E7EB' }
    };

    // Auto-filter
    worksheet.autoFilter = {
      from: { row: 1, column: 1 },
      to: { row: 1, column: worksheet.columnCount }
    };

    // Generate filename
    const timestamp = moment().format('YYYY-MM-DD_HH-mm');
    const filename = `Job_Summary_${timestamp}.xlsx`;

    // Set response headers
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    await workbook.xlsx.write(res);
    res.end();

  } catch (error) {
    console.error('Job summary export error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Error generating job summary Excel file'
    });
  }
});

module.exports = router;