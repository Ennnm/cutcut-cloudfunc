const axios = require('axios');
const SpeechToTextV1 = require('ibm-watson/speech-to-text/v1.js');
const { IamAuthenticator } = require('ibm-watson/auth/index.js');
const params = require('./params');

const { promisify } = require('util');
const exec = promisify(require('child_process').exec);

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
exports.IBMSpeechToText = functions.storage
  .object()
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
      ...params,
    };
    let results = { result: 'test' };
    results = await speechToText.recognize(paramsAudio);
    console.log('results', JSON.stringify(results, null, 2));
    //update firestore with the results
    return admin
      .firestore()
      .collection('transcripts')
      .doc()
      .create(results)
      .catch((e) => {
        console.error('error in saving transcript to firestore', e);
      });
  });
