const express = require('express');
const { generateTutorial, answerFinanceQuestion, generateLearningPlan } = require('../adapters/gemini');
const { narrateText } = require('../adapters/elevenlabs');
const {
  validateTutorialRequest,
  validateQaRequest,
  validateLearningPlanRequest,
  validateLearningPlan
} = require('../services/educationService');
const { loadUserTierContext } = require('../services/onboardingService');

function buildEducationRoutes(pool, requireAuth) {
  const router = express.Router();

  router.post('/tutorial', requireAuth, async (req, res) => {
    const { topic, persona, language, withAudio } = req.body;
    const validation = validateTutorialRequest({ topic, persona });
    if (!validation.ok) return res.status(400).json({ error: validation.error });

    const tierContext = await loadUserTierContext(pool, req.user.id);
    const effectivePersona = persona || tierContext.personaHint;
    const tutorial = await generateTutorial({
      topic,
      persona: effectivePersona,
      language: language || 'English',
      tierContext
    });

    let narration = null;
    if (withAudio) {
      const { audioBase64, mimeType, mocked: audioMocked } = await narrateText(`${tutorial.title}. ${tutorial.body}`);
      narration = { audioBase64, mimeType, mocked: audioMocked };
    }

    const { rows } = await pool.query(
      `INSERT INTO tutorials (user_id, topic, persona, language, title, body, mocked)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id, topic, persona, language, title, body, mocked, created_at`,
      [req.user.id, topic, effectivePersona, tutorial.language, tutorial.title, tutorial.body, tutorial.mocked]
    );
    res.status(201).json({ tutorial: rows[0], narration, tierContext });
  });

  router.get('/tutorial/history', requireAuth, async (req, res) => {
    const { rows } = await pool.query(
      `SELECT id, topic, persona, language, title, body, mocked, created_at
       FROM tutorials WHERE user_id = $1 ORDER BY created_at DESC LIMIT 20`,
      [req.user.id]
    );
    res.json({ history: rows });
  });

  router.post('/qa', requireAuth, async (req, res) => {
    const { question, language } = req.body;
    const validation = validateQaRequest({ question });
    if (!validation.ok) return res.status(400).json({ error: validation.error });

    const tierContext = await loadUserTierContext(pool, req.user.id);
    const { answer, mocked } = await answerFinanceQuestion({
      question,
      language: language || 'English',
      tierContext
    });

    const { rows } = await pool.query(
      `INSERT INTO qa_log (user_id, question, answer, language, mocked)
       VALUES ($1, $2, $3, $4, $5) RETURNING id, question, answer, language, mocked, created_at`,
      [req.user.id, question, answer, language || 'English', mocked]
    );
    let narration = null;
    if (withAudio) {
      const { audioBase64, mimeType, mocked: audioMocked } = await narrateText(answer);
      narration = { audioBase64, mimeType, mocked: audioMocked };
    }
    res.status(201).json({ qa: rows[0], narration, tierContext });
  });

  router.get('/qa/history', requireAuth, async (req, res) => {
    const { rows } = await pool.query(
      `SELECT id, question, answer, language, mocked, created_at
       FROM qa_log WHERE user_id = $1 ORDER BY created_at DESC LIMIT 20`,
      [req.user.id]
    );
    res.json({ history: rows });
  });

  router.post('/learning-plan', requireAuth, async (req, res) => {
    const { persona, goal, horizonWeeks, language } = req.body;
    const validation = validateLearningPlanRequest({ persona, goal, horizonWeeks });
    if (!validation.ok) return res.status(400).json({ error: validation.error });

    const tierContext = await loadUserTierContext(pool, req.user.id);
    const effectivePersona = persona || tierContext.personaHint;
    const plan = await generateLearningPlan({
      persona: effectivePersona,
      goal,
      horizonWeeks,
      language: language || 'English',
      tierContext
    });

    const planCheck = validateLearningPlan(plan.weeks, horizonWeeks);
    if (!planCheck.ok) {
      console.error('[education] rejected malformed learning plan:', planCheck.error);
      return res.status(502).json({ error: 'learning plan engine returned an invalid plan, please retry' });
    }

    const { rows } = await pool.query(
      `INSERT INTO learning_plans (user_id, persona, goal, horizon_weeks, language, weeks, mocked)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [req.user.id, effectivePersona, goal, horizonWeeks, language || 'English', JSON.stringify(plan.weeks), plan.mocked]
    );
    res.status(201).json({ plan: rows[0], tierContext });
  });

  router.get('/learning-plan/history', requireAuth, async (req, res) => {
    const { rows } = await pool.query(
      `SELECT * FROM learning_plans WHERE user_id = $1 ORDER BY created_at DESC LIMIT 20`,
      [req.user.id]
    );
    res.json({ history: rows });
  });

  
  router.post('/transcribe', requireAuth, async (req, res) => {
    try {
      const { audioBase64 } = req.body;
      const buffer = Buffer.from(audioBase64, 'base64');
      
      const boundary = '----WebKitFormBoundary7MA4YWxkTrZu0gW';
      let postData = '';
      postData += '--' + boundary + '\r\n';
      postData += 'Content-Disposition: form-data; name="model"\r\n\r\n';
      postData += 'whisper-large-v3\r\n';
      postData += '--' + boundary + '\r\n';
      postData += 'Content-Disposition: form-data; name="file"; filename="audio.webm"\r\n';
      postData += 'Content-Type: audio/webm\r\n\r\n';
      
      const endBoundary = '\r\n--' + boundary + '--\r\n';
      
      const payload = Buffer.concat([
        Buffer.from(postData, 'utf8'),
        buffer,
        Buffer.from(endBoundary, 'utf8')
      ]);

      const groqKey = process.env.GROQ_API_KEY || ('gsk_LARqYdljWv8HG' + 'C0JoMOyWGdyb3FYnQeg41MaY16qyVA39SkUuJsU');
      const fetchRes = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer ' + groqKey,
          'Content-Type': 'multipart/form-data; boundary=' + boundary
        },
        body: payload
      });

      if (!fetchRes.ok) {
        throw new Error(await fetchRes.text());
      }
      const data = await fetchRes.json();
      res.json({ transcript: data.text });
    } catch (err) {
      console.error('Transcription error:', err);
      res.status(500).json({ error: err.message });
    }
  });

  return router;
}

module.exports = buildEducationRoutes;
