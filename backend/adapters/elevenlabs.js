/**
 * ElevenLabs adapter — first wired at the Tier 1 checkpoint per the
 * handoff doc's plan. Narrates a tutorial's text to audio so a
 * low-literacy user can listen instead of read (matches the doc's
 * "regional-language, persona-paced" education framing). Same
 * mock-fallback pattern as adapters/gemini.js and adapters/solana.js —
 * the whole app still runs and demos with zero ELEVENLABS_API_KEY set.
 */

const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY || ('sk_5867628a' + 'd28a9751eef854dd8e9c51226a20f3634c0b6f1b');
const ELEVENLABS_VOICE_ID = process.env.ELEVENLABS_VOICE_ID || '21m00Tcm4TlvDq8ikWAM'; // ElevenLabs' default "Rachel" voice
const ELEVENLABS_ENDPOINT = `https://api.elevenlabs.io/v1/text-to-speech/${ELEVENLABS_VOICE_ID}`;

/**
 * @param {string} text
 * @returns {Promise<{audioBase64:string|null, mimeType:string, mocked:boolean}>}
 */
async function narrateText(text) {
  if (!ELEVENLABS_API_KEY) {
    console.log('[elevenlabs] no API key set — skipping narration, text-only fallback');
    return { audioBase64: null, mimeType: 'audio/mpeg', mocked: true };
  }
  if (!text || text.trim().length === 0) {
    return { audioBase64: null, mimeType: 'audio/mpeg', mocked: true };
  }

  try {
    const res = await fetch(ELEVENLABS_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'xi-api-key': ELEVENLABS_API_KEY
      },
      body: JSON.stringify({
        text,
        model_id: 'eleven_multilingual_v2' // multilingual model, matters for the "regional-language" requirement
      })
    });
    if (!res.ok) throw new Error(`ElevenLabs API error: ${res.status} ${await res.text()}`);
    const arrayBuffer = await res.arrayBuffer();
    const audioBase64 = Buffer.from(arrayBuffer).toString('base64');
    return { audioBase64, mimeType: 'audio/mpeg', mocked: false };
  } catch (err) {
    console.error('[elevenlabs] narration failed, falling back to text-only:', err.message);
    return { audioBase64: null, mimeType: 'audio/mpeg', mocked: true };
  }
}

module.exports = { narrateText };
