//utils/resumeparser.js
const pdf = require('pdf-parse');
const mammoth = require('mammoth');
const natural = require('natural');
const fs = require('fs');

const SKILLS_DATABASE = [
  'javascript', 'python', 'java', 'c++', 'c#', 'php', 'ruby', 'go', 'rust',
  'react', 'angular', 'vue', 'node.js', 'express', 'django', 'flask', 'spring',
  'mongodb', 'mysql', 'postgresql', 'redis', 'sqlite', 'aws', 'azure', 'gcp',
  'docker', 'kubernetes', 'jenkins', 'git', 'github', 'html', 'css', 'sass'
];

class ResumeParser {
  static async parseResume(filePath, fileType) {
    try {
      let text = '';
      if (fileType === 'application/pdf') {
        const dataBuffer = fs.readFileSync(filePath);
        const pdfData = await pdf(dataBuffer);
        text = pdfData.text;
      } else if (fileType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
        const result = await mammoth.extractRawText({ path: filePath });
        text = result.value;
      } else {
        throw new Error('Unsupported file format');
      }
      return this.extractInformation(text);
    } catch (error) {
      throw new Error(`Resume parsing failed: ${error.message}`);
    }
  }

  static extractInformation(text) {
    const skills = this.extractSkills(text);
    const experience = this.extractExperience(text);
    const education = this.extractEducation(text);
    const summary = this.extractSummary(text);
    return { skills, experience, education, summary };
  }

  static extractSkills(text) {
    const foundSkills = [];
    SKILLS_DATABASE.forEach(skill => {
      if (text.toLowerCase().includes(skill.toLowerCase())) {
        foundSkills.push(skill);
      }
    });
    return [...new Set(foundSkills)];
  }

  static extractExperience(text) {
    const experienceRegex = /(\d+)\s*(?:years?|yrs?)(?:\s*\+?)?\s*(?:of)?\s*experience/gi;
    const matches = text.match(experienceRegex);
    if (matches) {
      const years = matches[0].match(/\d+/);
      return years ? parseInt(years[0]) : 0;
    }
    return 0;
  }

  static extractEducation(text) {
    const educationKeywords = ['bachelor', 'master', 'phd', 'doctorate', 'mba', 'university', 'college'];
    const lines = text.split('\n');
    for (let line of lines) {
      if (educationKeywords.some(keyword => line.toLowerCase().includes(keyword))) {
        return line.trim();
      }
    }
    return 'Not specified';
  }

  static extractSummary(text) {
    const paragraphs = text.split('\n').filter(p => p.trim().length > 50);
    return paragraphs.length > 0 ? paragraphs[0].substring(0, 200) : 'No summary available';
  }
}

module.exports = ResumeParser;