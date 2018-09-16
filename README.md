# wemo-control
A lightweight Node.js service that calls a webhook on Wemo device state transitions, e.g. from 'On' to 'Standby'. Primarily useful for announcing the completion of activities for devices that do not otherwise have an audible alert, e.g. coffeemakers and electric kettles.

*N.B.* - This project has only been tested with Wemo Smart Plugs, but should work in principle with other devices.

## Requirements

This is a [Node.js](https://nodejs.org/en/) server, and this documentation will assume that Node.js is installed, and that the user has some familiarity with Node.js and `npm`.

This project should run on most modern Debian variants. It may run on other operating systems; YMMV.

## Setup Instructions

1. Clone this project
   ```
   git clone https://github.com/mpaik/wemo-control.git
   cd wemo-control
   ```

2. Install the server and dependencies
    *N.B.*: This project is not available via the public `npm` repository due to its alpha quality and likely limited userbase.

    ```
    npm install
    ```

## Configuration Instructions

The `config.json` file contains all the configuration information for the application. These include:

`logFile` - **String**. Name of logfile. This project uses Winston logging.

`fileLogLevel` - **String**. Log level for file logger.

`consoleLogLevel` - **String**. Log level for console logger.

`triggers` - Contains configuration for webhooks to be called on state transitions of Wemo devices. Each child of this object is a named device, e.g. `Coffeemaker` that contains its own configuration information, consisting of:

* `fromState`: The start state of the edge transition upon which to fire an action. Valid values are `on`, `off`, and `standby`

* `toState`: The end state of the edge transition upon which to fire an action. Valid values are `on`, `off`, and `standby`. Note that the event will be fired if and only if the device transitions directly from `fromState` to `toState` - transitions with intervening steps will not cause the event to fire. For instance, a transition edge from `on` to `off` will not be fired if the device goes from `on` to `standby` and then from `standby` to `off`. Also note that not all Wemo devices support all of these states.

* `webhookUrl`: The url of the webhook to be called on the configured state transition

* `webhookMethod`: The method via which to call the webhook, e.g. `GET` or `POST`. Note that if `GET` is used, the content of the JSON posted will be exposed; therefore the `GET` method is not advised and is only provided for completeness for webhook services that do not accept `POST` requests.

* `webhookContentType`: The content type of the request. Typically `application/json`

* `webhookRequestBody`: The body content of the request. Note that this has **only** been tested with JSON via `POST`; other data formats or use via `GET` may or may not work as intended. Pull requests with enhancements welcomed.

The request body should contain all the information necessary to trigger the webhook, including credentials. Other authentication mechanisms are not presently supported. Pull requests with enhancements welcomed.

## Usage Instructions

Once the server is configured, it can be run with `npm run start`, or simply `node wemo-control.js`.

The server will activate and periodically poll for Wemo devices visible on the local network.

To test that the server is operating as intended, toggle power to Wemo devices after the detection routine has polled for devices. The log should display the state changes made.