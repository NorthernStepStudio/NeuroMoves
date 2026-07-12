const { resolveEvaVoiceId, normalizeResolverText } = require('../src/audio/tts/evaVoiceResolver');

console.log('Normalized "Great job!":', normalizeResolverText("Great job!"));
console.log('Normalized "Great Job!":', normalizeResolverText("Great Job!"));
console.log('Resolved "Great job!":', resolveEvaVoiceId("Great job!"));
console.log('Resolved "Great Job!":', resolveEvaVoiceId("Great Job!"));
console.log('Resolved "great job":', resolveEvaVoiceId("great job"));
