# lo-mqtt-nodejs - Live Objects MQTT Client
[![scheduled npm audit](https://github.com/boly38/lo-mqtt-nodejs/actions/workflows/audit.yml/badge.svg)](https://github.com/boly38/lo-mqtt-nodejs/actions/workflows/audit.yml)

This project includes **Live Objects Client code samples for the MQTT protocol**.
- LiveObjects [official help](https://liveobjects.orange-business.com/#/cms/documentation-faq) includes [a dev. guide mqtt section](https://liveobjects.orange-business.com/doc/html/lo_manual_v2.html#MQTT_API)
- Samples are written in JavaScript for node.js.
- Samples require minimal common environment described in "Quick start" below.

## Quick start

### Download

Clone this repository from GitHub:

````bash
$ git clone https://github.com/boly38/lo-mqtt-nodejs.git
````

### Prerequisites

1. Install NodeJs (https://nodejs.org/en/download/)
2. Install samples dependencies (from package.json, example, https://github.com/mqttjs/MQTT.js)
````bash
npm install
````

### Setup your own private environment

- copy the template in a private file
````bash
cp .env.template .env.dontpush.myEnv1
cp .env.template .env.dontpush.myEnv2
````
- edit `.env.dontpush.myEnv1`
- application rely on `.env` file
````bash
cp .env.dontpush.myEnv1 .env
````
### Start lo-device
[lo-device](./src/device-mode/lo-device.js) - a mqtt client using `device mode`.
This client is able to :
- connect, disconnect, forceReconnect.
and via features:
- receive and handle command, process firmware updates, process config update.
- publish current config/resource, send data messages.

The client "controller" asks to the user the order via terminal and input.

Controller features:
- geolocation: generates X devices from given square : ex. `europe`, `france`, `lyon`.

To start the client:
```bash
 node ./src/device-mode/lo-device.js
 ```

Then use `h` to display help.