import axios from 'axios';
import SpeechToTextV1 from 'ibm-watson/speech-to-text/v1.js';
import { IamAuthenticator } from 'ibm-watson/auth/index.js';
import multer from 'multer';
import nextConnect from 'next-connect';

import middleware from '../../middleware/middleware';
import { params } from './params.js';
const path = require('path');
const os = require('os');

import fs from 'fs';

const functions = require('firebase-functions');
const request = require('request-promise');
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
    const metageneration = object.metageneration; // Number of times metadata has been generated. New objects have a value of 1.

    // Exit if this is triggered on a file that is not an audio.
    if (!contentType.startsWith('audio/')) {
      return functions.logger.log('This is not an audio.');
    }

    const audioUri = `gs://${fileBucket}/${filePath}`;
    //replace with firebase env var
    const speechToText = new SpeechToTextV1({
      authenticator: new IamAuthenticator({
        apikey: functions.config().ibmwatsonsapi.key,
      }),
      serviceUrl: functions.config().ibmwatsonsapi.url,
    });

    axios({
      method: 'get',
      url: audioUri,
      responseType: 'stream',
    })
      .then((response) => {
        var paramsAudio = {
          audio: response.data,
          ...params,
        };

        speechToText.recognize(paramsAudio).then((results) => {
          console.log(JSON.stringify(results, null, 2));
          //update firestore with the results
          await admin
            .firestore()
            .collection('transcripts')
            .doc()
            .create(results)
            .catch((e) => {
              console.error('error in saving transcript to firestore', e);
            });
        });
      })
      .catch((e) => {
        console.error(
          'error in axios getting audio stream from firebase storage '
        );
      });
  });
