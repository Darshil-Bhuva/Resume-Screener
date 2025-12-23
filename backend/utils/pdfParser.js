//utils/pdfparse
const pdf = require('pdf-parse');

// Enhanced PDF parsing with contact information extraction
class EnhancedPDFParser {
  static async parseResume(dataBuffer) {
    try {
      const pdfData = await pdf(dataBuffer);
      const text = pdfData.text;
      
      // Extract contact information (REMOVED NAME)
      const extractedData = {
        text: text,
        applicantEmail: this.extractEmail(text),
        applicantPhone: this.extractPhone(text),
        skills: this.extractSkills(text),
        experience: this.extractExperience(text),
        education: this.extractEducation(text)
      };
      
      return extractedData;
    } catch (error) {
      console.error('PDF parsing error:', error);
      return {
        text: '',
        applicantEmail: '',
        applicantPhone: '',
        skills: [],
        experience: 0,
        education: ''
      };
    }
  }

  // Extract email addresses
  static extractEmail(text) {
    const emailRegex = /[\w._%+-]+@[\w.-]+\.[A-Za-z]{2,}/g;
    const emails = text.match(emailRegex);
    
    if (emails && emails.length > 0) {
      // Return the first valid email (usually the primary one)
      return emails[0];
    }
    
    return '';
  }

  // Extract phone numbers
  static extractPhone(text) {
    const phonePatterns = [
      // International format with +
      /\+?[\d\s\-()]{10,15}/g,
      
      // US format (xxx) xxx-xxxx
      /\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/g,
      
      // Indian format +91 xxxxx xxxxx
      /(?:\+91[\-\s]?)?\d{5}[\-\s]?\d{5}/g,
      
      // General digit sequences
      /[\d]{7,15}/g
    ];

    for (const pattern of phonePatterns) {
      const matches = text.match(pattern);
      if (matches) {
        for (const match of matches) {
          const cleanNumber = match.replace(/[\s\-()]/g, '');
          // Validate phone number length
          if (cleanNumber.length >= 7 && cleanNumber.length <= 15) {
            return match.trim();
          }
        }
      }
    }
    
    return '';
  }

  // Extract skills (basic keyword matching)
  static extractSkills(text) {
    const commonSkills = [
      'JavaScript', 'React', 'Node.js', 'Python', 'Java', 'HTML', 'CSS',
      'MongoDB', 'SQL', 'Git', 'AWS', 'Docker', 'TypeScript', 'Angular',
      'Vue.js', 'PHP', 'C++', 'C#', 'Ruby', 'Swift', 'Kotlin', 'Go',
      'Machine Learning', 'AI', 'Data Science', 'DevOps', 'Agile',
      'Project Management', 'Leadership', 'Communication', 'Teamwork'
    ];

    const foundSkills = [];
    const lowerText = text.toLowerCase();

    commonSkills.forEach(skill => {
      if (lowerText.includes(skill.toLowerCase())) {
        foundSkills.push(skill);
      }
    });

    return foundSkills.slice(0, 10); // Return top 10 skills
  }

  // Extract experience in years
  static extractExperience(text) {
    const experiencePatterns = [
      /(\d+)\s*(?:years?|yrs?)(?:\s+of)?\s*(?:experience|exp)/gi,
      /experience\s*:\s*(\d+)\s*(?:years?|yrs?)/gi,
      /(\d+)\s*-\s*(\d+)\s*(?:years?|yrs?)/g
    ];

    for (const pattern of experiencePatterns) {
      const matches = [...text.matchAll(pattern)];
      if (matches.length > 0) {
        for (const match of matches) {
          const years = parseInt(match[1] || match[2]);
          if (years && years <= 50) { // Reasonable upper limit
            return years;
          }
        }
      }
    }

    // Fallback: look for any year mentions
    const yearMentions = text.match(/(\d+)\s*(?:years?|yrs?)/gi);
    if (yearMentions) {
      let maxYears = 0;
      yearMentions.forEach(mention => {
        const years = parseInt(mention);
        if (years && years > maxYears && years <= 50) {
          maxYears = years;
        }
      });
      return maxYears;
    }

    return 0;
  }

  // Extract education information
  static extractEducation(text) {
    const educationKeywords = [
      'bachelor', 'master', 'phd', 'mba', 'btech', 'mtech', 'be', 'me',
      'bsc', 'msc', 'ba', 'ma', 'associate', 'diploma', 'certificate'
    ];

    const lines = text.split('\n');
    for (const line of lines) {
      const lowerLine = line.toLowerCase();
      if (educationKeywords.some(keyword => lowerLine.includes(keyword))) {
        return line.trim().substring(0, 100); // Return first 100 chars
      }
    }

    return '';
  }
}

module.exports = EnhancedPDFParser;