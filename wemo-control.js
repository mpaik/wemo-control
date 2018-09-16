// Copyright 2018 Michael Paik
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     https://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

'use strict'

const Wemo = require('wemo-client'),
  	  wemo = new Wemo(),
      config = require('./config.json'),
      logger = require('winston'),
      got = require('got'),
      states = {},
      triggers = {};

const stateMap = {
	"off" : 0,
	"on" : 1,
	"standby": 8
}

// Winston logger configuration
const winstonConfig = {
  transports: [
    new logger.transports.File({
      level: config.fileLogLevel,
      filename: "./"+config.logFile,
      handleExceptions: true,
      json: true,
      colorize: false
    }),
    new logger.transports.Console({
      level: config.consoleLogLevel,
      handleExceptions: true,
      json: false,
      colorize: true
    })
    ],
    exitOnError: false
};

logger.configure(winstonConfig);
logger.debug(`Logger initialized`);

Object.keys(config.triggers).map((k, i) => {
  logger.debug(`Creating trigger for device ${k}.`);
  triggers[k] = config.triggers[k];
});

function foundDevice(err, deviceInfo) {
  logger.info(`Discovered device: ${deviceInfo.friendlyName} of type: ${deviceInfo.modelName}.`);

  // Get the client for the found device
  var client = wemo.client(deviceInfo);
  logger.debug(`Created client for device ${deviceInfo.friendlyName}`);

  // You definitely want to listen to error events (e.g. device went offline),
  // Node will throw them as an exception if they are left unhandled  
  client.on('error', (err) => {
    logger.error('Asynchronous error.', err);
  });

  // Handle BinaryState events
  client.on('binaryState', (state) => {
    let devName = deviceInfo.friendlyName;
    if (states.hasOwnProperty(devName)) {
      // If we've seen this before
      logger.debug(`Device ${devName} changed state to ${state}.`);
      // If we have a trigger
      if (triggers.hasOwnProperty(devName)) {
        // If our previous state matches the fromState
        let trigger = triggers[devName];
        // If we match the from/to states
        if (stateMap[trigger.fromState] == states[devName] &&
          stateMap[trigger.toState] == state) {
          let opts = {
            headers: {
              "content-type": trigger.webhookContentType
            },
            method: `${trigger.webhookMethod}`,
            json: trigger.webhookContentType === "application/json" ? true : false,
            rejectUnauthorized: false
          };
          // Add body iff included in the trigger
          if (trigger.webhookRequestBody != null) {
            opts["body"] = trigger.webhookRequestBody;
          }
          logger.debug(`Sending request to ${trigger.webhookUrl}`);
          (async () => {
            try {
              const response = await got(trigger.webhookUrl,opts);
              logger.info(`Received response.`,response.body);
            }
            catch (err) {
              logger.error(`Error while waiting for HTTP response.`,err);
            }
          })();
          logger.info(`Sent request to ${trigger.webhookUrl}.`);
        }
      }
      // Set the new state
      states[devName] = state;
    }
    else {
      logger.debug(`Got initial state ${state} for device ${deviceInfo.friendlyName}`);
      states[deviceInfo.friendlyName] = state;
    }
  });
};

wemo.discover(foundDevice)
// Repeat discovery every 90 seconds.
setInterval(() => wemo.discover(foundDevice), 90000);
