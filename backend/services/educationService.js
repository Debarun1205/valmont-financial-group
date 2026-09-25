/**
 * Financial Education service — Modules 9/10 core logic (tutorial,
 * live-guidance Q&A, learning plan). Same principle as advisoryService.js:
 * the actual content generation is Gemini's job (adapters/gemini.js); what
 * belongs here is input validation and a sanity check on whatever Gemini
 * (or its mock fallback) returns, so a malformed AI response can never
 * reach the user.
 */

const VALID_PERSONAS = ['gig worker', 'student', 'salaried professional'];

function validateTutorialRequest({ topic, persona }) {
  if (!topic || typeof topic !== 'string' || topic.trim().length === 0) {
    return { ok: false, error: 'topic is required' };
  }
  if (!VALID_PERSONAS.includes(persona)) {
    return { ok: false, error: `persona must be one of ${VALID_PERSONAS.join(', ')}` };
  }
  return { ok: true };
}

function validateQaRequest({ question }) {
  if (!question || typeof question !== 'string' || question.trim().length === 0) {
    return { ok: false, error: 'question is required' };
  }
  if (question.length > 500) {
    return { ok: false, error: 'question is too long (max 500 characters)' };
  }
  return { ok: true };
}

function validateLearningPlanRequest({ persona, goal, horizonWeeks }) {
  if (!VALID_PERSONAS.includes(persona)) {
    return { ok: false, error: `persona must be one of ${VALID_PERSONAS.join(', ')}` };
  }
  if (!goal || typeof goal !== 'string' || goal.trim().length === 0) {
    return { ok: false, error: 'goal is required' };
  }
  if (!horizonWeeks || horizonWeeks <= 0 || !Number.isInteger(horizonWeeks) || horizonWeeks > 26) {
    return { ok: false, error: 'horizonWeeks must be a positive integer, max 26' };
  }
  return { ok: true };
}

/**
 * Sanity-checks a learning plan (from Gemini or its mock fallback): the
 * right number of weeks, sequential and each with a non-empty topic.
 * Protects the demo from a malformed/hallucinated AI response reaching the UI.
 */
function validateLearningPlan(weeks, expectedWeekCount) {
  if (!Array.isArray(weeks) || weeks.length !== expectedWeekCount) {
    return { ok: false, error: `expected exactly ${expectedWeekCount} weeks, got ${Array.isArray(weeks) ? weeks.length : 'non-array'}` };
  }
  for (let i = 0; i < weeks.length; i++) {
    const w = weeks[i];
    if (!w || typeof w.week !== 'number' || w.week !== i + 1) {
      return { ok: false, error: `week entries must be sequential starting at 1 (problem at index ${i})` };
    }
    if (!w.topic || typeof w.topic !== 'string' || w.topic.trim().length === 0) {
      return { ok: false, error: `week ${w.week} is missing a topic` };
    }
  }
  return { ok: true };
}

module.exports = {
  VALID_PERSONAS,
  validateTutorialRequest,
  validateQaRequest,
  validateLearningPlanRequest,
  validateLearningPlan
};
