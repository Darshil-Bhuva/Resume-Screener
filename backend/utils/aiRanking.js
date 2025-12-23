//utils/airanking.js
const natural = require('natural');
const tf = require('@tensorflow/tfjs-node');

class ResumeRanker {
  constructor() {
    this.tokenizer = new natural.WordTokenizer();
    this.tfidf = new natural.TfIdf();
  }

  // Calculate match score between resume and job
  async calculateMatchScore(resumeData, jobData) {
    const scores = {
      skills: this.calculateSkillsScore(resumeData.skills, jobData.skills),
      experience: this.calculateExperienceScore(resumeData.experience, jobData.experience),
      education: this.calculateEducationScore(resumeData.education, jobData.requirements),
      keywords: this.calculateKeywordScore(resumeData.text, jobData),
      overall: 0
    };

    // Weighted average for overall score
    scores.overall = (
      scores.skills * 0.4 +
      scores.experience * 0.3 +
      scores.education * 0.2 +
      scores.keywords * 0.1
    );

    return scores;
  }

  calculateSkillsScore(resumeSkills, jobSkills) {
    if (!resumeSkills || !jobSkills) return 0;
    
    const resumeSkillsSet = new Set(resumeSkills.map(s => s.toLowerCase()));
    const jobSkillsSet = new Set(jobSkills.map(s => s.toLowerCase()));
    
    const matchingSkills = [...resumeSkillsSet].filter(skill => 
      jobSkillsSet.has(skill)
    );
    
    return jobSkillsSet.size > 0 ? matchingSkills.length / jobSkillsSet.size : 0;
  }

  calculateExperienceScore(resumeExp, jobExp) {
    const minExp = jobExp?.min || 0;
    const maxExp = jobExp?.max || 10;
    const candidateExp = resumeExp || 0;
    
    if (candidateExp >= minExp && candidateExp <= maxExp) {
      return 1.0; // Perfect match
    } else if (candidateExp > maxExp) {
      return 0.8; // Overqualified but good
    } else {
      // Underqualified - linear scale
      return Math.max(0, candidateExp / minExp);
    }
  }

  calculateEducationScore(education, requirements) {
    // Simple education matching
    const educationKeywords = ['bachelor', 'master', 'phd', 'degree', 'diploma'];
    const requirementText = requirements.join(' ').toLowerCase();
    const educationText = (education || '').toLowerCase();
    
    let score = 0;
    educationKeywords.forEach(keyword => {
      if (requirementText.includes(keyword) && educationText.includes(keyword)) {
        score += 0.2;
      }
    });
    
    return Math.min(1, score);
  }

  calculateKeywordScore(resumeText, jobData) {
    const jobText = `${jobData.title} ${jobData.description} ${jobData.requirements.join(' ')}`;
    const jobKeywords = this.extractKeywords(jobText);
    const resumeKeywords = this.extractKeywords(resumeText);
    
    const matchingKeywords = resumeKeywords.filter(keyword =>
      jobKeywords.includes(keyword)
    );
    
    return jobKeywords.length > 0 ? matchingKeywords.length / jobKeywords.length : 0;
  }

  extractKeywords(text) {
    const tokens = this.tokenizer.tokenize(text.toLowerCase());
    const stopwords = natural.stopwords;
    
    return tokens
      .filter(token => 
        token.length > 2 && 
        !stopwords.includes(token) &&
        !/\d+/.test(token)
      )
      .slice(0, 50); // Top 50 keywords
  }

  // Rank multiple resumes for a job
  async rankResumes(resumes, job) {
    const rankedResumes = await Promise.all(
      resumes.map(async (resume) => {
        const scores = await this.calculateMatchScore(resume, job);
        return {
          ...resume.toObject ? resume.toObject() : resume,
          matchScores: scores,
          overallScore: scores.overall
        };
      })
    );

    // Sort by overall score descending
    return rankedResumes.sort((a, b) => b.overallScore - a.overallScore);
  }
}

module.exports = new ResumeRanker();