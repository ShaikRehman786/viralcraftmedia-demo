import User from '../models/User.js';
import Task from '../models/Task.js';

/**
 * Automatically routes and suggests the best employee based on skills and current active workload.
 */
export const getSuggestedEmployee = async (category) => {
  const skillMap = {
    'Short Form Editing': 'Video Editor',
    'Podcast Editing': 'Podcast Editor',
    'Marketing': 'Marketing Specialist',
    'Website Development': 'Web Developer',
    'Branding': 'Graphic Designer',
    'Consultation': 'Project Coordinator'
  };

  const requiredSkill = skillMap[category] || 'Video Editor';

  try {
    // Find active staff members with the matching required skill
    const candidates = await User.find({ 
      role: 'EMPLOYEE', 
      status: 'active',
      skills: requiredSkill
    });

    if (!candidates || candidates.length === 0) {
      // Fallback: Pick any active editor or employee if no exact match is configured
      const fallbackCandidates = await User.find({ role: 'EMPLOYEE', status: 'active' });
      if (!fallbackCandidates || fallbackCandidates.length === 0) return null;
      return fallbackCandidates[0]._id;
    }

    // Determine workload: Count active tasks (assigned or in_progress) for each editor
    let bestCandidate = null;
    let minActiveTasks = Infinity;

    for (const candidate of candidates) {
      const activeTasksCount = await Task.countDocuments({
        assignedTo: candidate._id,
        status: { $in: ['assigned', 'in_progress'] }
      });

      if (activeTasksCount < minActiveTasks) {
        minActiveTasks = activeTasksCount;
        bestCandidate = candidate;
      }
    }

    return bestCandidate ? bestCandidate._id : null;
  } catch (err) {
    console.error('Workload-based skill suggestion routing failed:', err.message);
    return null;
  }
};
