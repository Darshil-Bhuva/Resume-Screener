//utils/MatchingAlgorithm.js

class MatchingAlgorithm {
    static calculateMatchScore(candidateSkills, jobRequiredSkills, jobPreferredSkills = []) {
      const requiredSkills = jobRequiredSkills.map(s => s.toLowerCase());
      const preferredSkills = jobPreferredSkills.map(s => s.toLowerCase());
      const candidateSkillSet = new Set(candidateSkills.map(s => s.toLowerCase()));
  
      const matchedRequired = requiredSkills.filter(skill => candidateSkillSet.has(skill));
      const requiredMatchPercentage = requiredSkills.length > 0 ? (matchedRequired.length / requiredSkills.length) * 70 : 0;
  
      const matchedPreferred = preferredSkills.filter(skill => candidateSkillSet.has(skill));
      const preferredMatchPercentage = preferredSkills.length > 0 ? (matchedPreferred.length / preferredSkills.length) * 30 : 0;
  
      const totalScore = Math.min(100, Math.round(requiredMatchPercentage + preferredMatchPercentage));
  
      const skillsMatch = [
        ...requiredSkills.map(skill => ({ skill, match: candidateSkillSet.has(skill), importance: 'required' })),
        ...preferredSkills.map(skill => ({ skill, match: candidateSkillSet.has(skill), importance: 'preferred' }))
      ];
  
      return { score: totalScore, skillsMatch };
    }
  
    static generateImprovementSuggestions(candidateSkills, jobRequiredSkills, jobPreferredSkills) {
      const suggestions = [];
      const candidateSkillSet = new Set(candidateSkills.map(s => s.toLowerCase()));
      
      const missingRequired = jobRequiredSkills.filter(skill => !candidateSkillSet.has(skill.toLowerCase()));
      if (missingRequired.length > 0) {
        suggestions.push({
          category: 'Critical Skills Gap',
          suggestion: `Learn these required skills: ${missingRequired.join(', ')}`,
          priority: 'high'
        });
      }
  
      const missingPreferred = jobPreferredSkills.filter(skill => !candidateSkillSet.has(skill.toLowerCase()));
      if (missingPreferred.length > 0) {
        suggestions.push({
          category: 'Skill Enhancement',
          suggestion: `Consider learning these preferred skills: ${missingPreferred.join(', ')}`,
          priority: 'medium'
        });
      }
  
      if (candidateSkills.length < 5) {
        suggestions.push({
          category: 'Skill Diversity',
          suggestion: 'Consider adding more technical skills to your resume',
          priority: 'medium'
        });
      }
  
      return suggestions;
    }
  }
  
  module.exports = MatchingAlgorithm;