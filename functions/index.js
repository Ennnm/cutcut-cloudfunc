const axios = require('axios');
const SpeechToTextV1 = require('ibm-watson/speech-to-text/v1.js');
const { IamAuthenticator } = require('ibm-watson/auth/index.js');
const params = require('./params');

const { promisify } = require('util');
const exec = promisify(require('child_process').exec);
const { transcript } = require('./transcript_en.js');
// import axios from 'axios';
// import SpeechToTextV1 from 'ibm-watson/speech-to-text/v1.js';
// import { IamAuthenticator } from 'ibm-watson/auth/index.js';

// import { params } from './params.js';
const path = require('path');
const os = require('os');

const functions = require('firebase-functions');
// const request = require('request-promise');
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
    const fileBucket = object.bucket; // The Storage bucket that contains the file.
    const filePath = object.name; // File path in the bucket.
    const contentType = object.contentType; // File content type.
    // Exit if this is triggered on a file that is not an audio.
    if (!contentType.startsWith('audio/')) {
      return functions.logger.log('This is not an audio.');
    }
    console.log('contentType :>> ', contentType);
    const myFile = admin.storage().bucket().file(filePath);
    const audioUri = object.mediaLink;
    // const audioUri = `gs://${fileBucket}/${filePath}`;
    const speechToText = new SpeechToTextV1({
      authenticator: new IamAuthenticator({
        apikey: functions.config().ibmwatsonsapi.key,
      }),
      serviceUrl: functions.config().ibmwatsonsapi.url,
    });
    functions.logger.log(audioUri);
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
      speakerLabels: false,
      processingMetrics: false,
      audioMetrics: false,
      endOfPhraseSilenceTime: 0.8, // default: 0.8
      splitTranscriptAtPhraseEnd: true,
      speechDetectorSensitivity: 0.5, // default: 0.5, 1.0 suppresses no audio
      backgroundAudioSuppression: 0.0, // default:0.0, 1.0 suppresses all audio
    };
    let results = transcript;
    console.log('paramsAudio :>> ', paramsAudio);
    // results = await speechToText.recognize(paramsAudio);
    console.log('results', results);
    // console.log('results', JSON.stringify(results, null, 2));
    //update firestore with the results
    return (
      admin
        .firestore()
        .collection('transcripts')
        // to name doc after userId
        .doc('transcript')
        .set({ response: JSON.stringify(results) })
        // .set({ response: JSON.stringify(results[0]) })
        .catch((e) => {
          console.error('error in saving transcript to firestore', e);
        })
    );
  });
//TODO get result from frontend, use to cut transcript
//test on deployed app
