const axios = require('axios');
const SpeechToTextV1 = require('ibm-watson/speech-to-text/v1.js');
const { IamAuthenticator } = require('ibm-watson/auth/index.js');

// const { promisify } = require('util');
// const exec = promisify(require('child_process').exec);
const { transcript } = require('./transcript_en.js');
// const path = require('path');
// const os = require('os');

const functions = require('firebase-functions');
// for FCM, authentication, firebase realtime database
const admin = require('firebase-admin');
admin.initializeApp();
// TODO IMPLEMENT IBM WATSON SPEECH TO TEXT

// EVENTS, onCreate, onUpdate, onDelete, onWrite (documents)
// want to lookout for update to cloud storage or, user uploads file
// firestore entry created after file has been upload (double writing? :/)
// rather upload to cloud storage bucket , act on that
// onFinalize

//embed userId into trigger function
exports.IBMSpeechToText = functions
  .region('asia-southeast1')
  .runWith({ timeoutSeconds: 540 })
  .storage.object()
  .onFinalize(async (object) => {
    console.log('object', object);
    if (!object.name.startsWith('uploads/')) {
      console.log(`File ${object.name} is not a user audio. Ignoring it.`);
      return null;
    }
    const [folder, userId, filename] = object.name.split('/');
    const fileBucket = object.bucket; // The Storage bucket that contains the file.
    const filePath = object.name; // File path in the bucket.
    const contentType = object.contentType; // File content type.
    // Exit if this is triggered on a file that is not an audio.
    if (!contentType.startsWith('audio/')) {
      return functions.logger.log('This is not an audio.');
    }

    const audioUri = object.mediaLink;
    const speechToText = new SpeechToTextV1({
      authenticator: new IamAuthenticator({
        apikey: functions.config().ibmwatsonsapi.key,
      }),
      serviceUrl: functions.config().ibmwatsonsapi.url,
    });

    console.log('audioUri :>> ', audioUri);
    const response = await axios({
      method: 'get',
      url: audioUri,
      responseType: 'stream',
    });

    var paramsAudio = {
      audio: response.data,
      contentType: 'application/octet-stream',
      model: 'en-US_NarrowbandModel',
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
    let results = transcript;
    // UNCOMMENT TO ACTIVE SPEECTOTTEXT
    // results = await speechToText.recognize(paramsAudio);
    // console.log('results', results);
    // console.log('results', JSON.stringify(results, null, 2));
    // TODO: remove audio file from storage

    const bucket = admin.storage().bucket();
    const path = object.name;
    bucket.file(path).delete();

    //  `${folder}/${userId}/${filename}`)
    console.log('path', path);

    //update firestore with the results
    return admin
      .firestore()
      .collection(`users`)
      .doc(userId)
      .collection('transcript')
      .doc(filename)
      .create({ response: JSON.stringify(results) })
      .catch((e) => {
        console.error('error in saving transcript to firestore', e);
      });
  });

//test on deployed app
