/* eslint quotes: ["error", "double"]*/
exports.params = {
  objectMode: true,
  contentType: "application/octet-stream",
  model: "en-US_NarrowbandModel",
  maxAlternatives: 1,
  interimResults: false,
  timestamps: true,
  profanityFilter: true,
  smartFormatting: true,
  speakerLabels: true,
  processingMetrics: false,
  audioMetrics: false,
  endOfPhraseSilenceTime: 0.8, // default: 0.8
  splitTranscriptAtPhraseEnd: true,
  speechDetectorSensitivity: 0.5, // default: 0.5, 1.0 suppresses no audio
  backgroundAudioSuppression: 0.0, // default:0.0, 1.0 suppresses all audio
};
