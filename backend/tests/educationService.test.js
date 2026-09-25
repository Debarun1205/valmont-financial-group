const assert = require('assert');
const {
  validateTutorialRequest,
  validateQaRequest,
  validateLearningPlanRequest,
  validateLearningPlan
} = require('../services/educationService');

function run() {
  // Tutorial requests
  const okTutorial = validateTutorialRequest({ topic: 'compound interest', persona: 'student' });
  assert.strictEqual(okTutorial.ok, true);
  const badPersona = validateTutorialRequest({ topic: 'compound interest', persona: 'astronaut' });
  assert.strictEqual(badPersona.ok, false);
  const noTopic = validateTutorialRequest({ topic: '', persona: 'student' });
  assert.strictEqual(noTopic.ok, false);

  // Q&A requests
  const okQa = validateQaRequest({ question: 'What is an emergency fund?' });
  assert.strictEqual(okQa.ok, true);
  const emptyQa = validateQaRequest({ question: '   ' });
  assert.strictEqual(emptyQa.ok, false);
  const tooLongQa = validateQaRequest({ question: 'a'.repeat(501) });
  assert.strictEqual(tooLongQa.ok, false);
  assert.match(tooLongQa.error, /too long/);

  // Learning plan requests
  const okPlanReq = validateLearningPlanRequest({ persona: 'gig worker', goal: 'emergency fund', horizonWeeks: 4 });
  assert.strictEqual(okPlanReq.ok, true);
  const badHorizon = validateLearningPlanRequest({ persona: 'gig worker', goal: 'emergency fund', horizonWeeks: 0 });
  assert.strictEqual(badHorizon.ok, false);
  const tooLongHorizon = validateLearningPlanRequest({ persona: 'gig worker', goal: 'emergency fund', horizonWeeks: 52 });
  assert.strictEqual(tooLongHorizon.ok, false);

  // Learning plan content sanity check
  const goodWeeks = [{ week: 1, topic: 'Budgeting' }, { week: 2, topic: 'Saving' }];
  assert.strictEqual(validateLearningPlan(goodWeeks, 2).ok, true);

  const wrongCount = validateLearningPlan(goodWeeks, 3);
  assert.strictEqual(wrongCount.ok, false);
  assert.match(wrongCount.error, /expected exactly 3/);

  const outOfOrder = [{ week: 1, topic: 'Budgeting' }, { week: 3, topic: 'Saving' }];
  assert.strictEqual(validateLearningPlan(outOfOrder, 2).ok, false);

  const missingTopic = [{ week: 1, topic: 'Budgeting' }, { week: 2, topic: '' }];
  assert.strictEqual(validateLearningPlan(missingTopic, 2).ok, false);

  console.log('✅ educationService: all assertions passed');
}

run();
