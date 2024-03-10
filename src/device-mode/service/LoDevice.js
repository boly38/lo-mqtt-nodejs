import log4js from "log4js";
import mqtt from "mqtt";
import LoConfigFeature from "./feature/LoConfigFeature.js";
import LoCommandFeature from "./feature/LoCommandFeature.js";
import LoResourceFeature from "./feature/LoResourceFeature.js";
import LoDataFeature from "./feature/LoDataFeature.js";
import {isSet} from "./util.js";

// reconnectPeriod<=0 means no reconnection
// reconnectPeriod=1000 means reconnection after 1 second
const MQTT_RECONNECT_PERIOD_MS = 1000;
// number of connect retries allowed
const MAX_CONNECT_RETRIES = 2;
const MQTT_PROTOCOL_NAME = 'MQIsdp';
const MQTT_DEVICE_MODE_DEFAULT_CONNECT_OPTIONS = {
    username: 'json+device',
    protocolId: MQTT_PROTOCOL_NAME,
    protocolVersion: 3,
    rejectUnauthorized: false,
    // keepAlive: 30 // seems no more supported?
    reconnectPeriod: MQTT_RECONNECT_PERIOD_MS
};

export default class LoDevice {

    /**
     *
     * @param mqttServerUrl
     * @param deviceApiKey
     * @param deviceId
     * @param config
     * @param resource
     * @param publishDeviceConfig    when true publish config
     * @param publishDeviceData      when true publish data
     * @param publishDeviceResource  when true publish resource
     */
    constructor({
                    mqttServerUrl, deviceApiKey, deviceId,
                    config, resource,
                    publishDeviceConfig, publishDeviceData, publishDeviceResource
                }) {
        this.logger = log4js.getLogger();
        this.logger.level = 'DEBUG';

        this.mqttServerUrl = mqttServerUrl;
        this.deviceApiKey = deviceApiKey;
        this.deviceId = deviceId;

        this.client = null;
        this.connectionCount = 0;
        this.reconnectRetry = 0;
        this.features = [
            new LoConfigFeature({config, publishDeviceConfig}),
            new LoCommandFeature({}),
            new LoResourceFeature({resource, publishDeviceResource}),
            new LoDataFeature({publishDeviceData, deviceId, "getDeviceStats": () => this.getDeviceStats()})
        ];
    }

    getDeviceStats() {
        const {connectionCount, reconnectRetry} = this;
        const stats = {connectionCount, reconnectRetry};
        this.features.forEach(feature => {
            if (isSet(feature.getStats) && isSet(feature.getName)) {
                const name = feature.getName();
                const featureStats = feature.getStats();
                stats[name] = featureStats;
            }
        });
        return stats;
    }

    /**
     * Device MQTT connection
     * @param onEndCallback          callback on device MQTT connection end (with error as arg if any)
     * @returns {Promise<unknown>}
     */
    connect({onEndCallback}) {
        const loDevice = this;
        let {
            logger, client, connectionCount, reconnectRetry,
            deviceId: clientId, deviceApiKey: password, mqttServerUrl: serverUrl,
        } = loDevice;
        loDevice.onEndCallback = onEndCallback;
        return new Promise((resolve, reject) => {
            try {

                logger.info(`${serverUrl}: ${clientId} trying to connect...`);
                if (client != null) {
                    loDevice.close()
                }
                client = mqtt.connect(serverUrl, {
                    ...MQTT_DEVICE_MODE_DEFAULT_CONNECT_OPTIONS,
                    clientId, password
                });
                loDevice.client = client
                // After connection actions
                client.on('connect', function () {
                    logger.info(`${serverUrl}: ${clientId} connected.`);
                    connectionCount++;
                    loDevice.features.forEach(feature => feature.onConnect({client}));
                    resolve();
                });

                // MQTT on Close
                client.on('close', function () {
                    logger.info('connection closed');
                    if (reconnectRetry >= MAX_CONNECT_RETRIES) {
                        const noMoreRetryMessage = `aborted after ${MAX_CONNECT_RETRIES} retries`;
                        logger.warn(noMoreRetryMessage);
                        loDevice.close();
                        reject(noMoreRetryMessage);
                        if (loDevice.onEndCallback) {
                            loDevice.onEndCallback(noMoreRetryMessage);
                        }
                    }
                });

                // MQTT on subscription ACK
                client.on('suback', function (topic, message) {
                    logger.info(`subscribed to [${topic}] ${message}`);
                });

                // MQTT on error
                client.on('error', error => {
                    // https://nodejs.org/api/errors.html#errors_class_error
                    if (error.code) {
                        logger.error('error code:' + error.code + ' message:' + error.message);
                    } else {
                        logger.error('error:' + error.message);
                        if (onEndCallback) {
                            onEndCallback(error);
                        }
                        reject(error);
                    }
                });

                // MQTT on reconnect
                client.on('reconnect', function () {
                    logger.info('reconnect');
                    reconnectRetry++;
                    logger.info(`reconnect (retry ${reconnectRetry} / ${MAX_CONNECT_RETRIES})`);
                });

                // MQTT on message
                client.on('message', (topic, messageString) => {
                    const request = JSON.parse(messageString);
                    logger.debug(`[${topic}]< ${JSON.stringify(request)}`);
                    loDevice.features.forEach(feature => {
                        let featureTopics = feature.getHandledTopics();
                        if (featureTopics?.includes(topic)) {
                            feature.onMessage(topic, request);
                        }
                    });
                });
                client.subscribeTopic = topic => {
                    logger.info(`subscribe [${topic}]`);
                    this.client.subscribe(topic, err => {
                        if (err) {
                            logger.warn(`FAILED to subscribe on [$\{topic}]> ${err}`); // check mqtt rate limit
                        }
                    });
                };

                client.publishTopic = (topic, object) => {
                    const objectStr = JSON.stringify(object);
                    logger.info(`[${topic}]> ${objectStr}`);
                    this.client.publish(topic, objectStr);
                };

            } catch (exception) {
                logger.error(exception);
                reject(exception);
            }
        });
    }

    forceReconnect() {
        return new Promise(resolve => {
            const loDevice = this;
            const {logger, client} = loDevice;
            const force = true;
            logger.info('forceReconnect');
            client.end(force, () => {
                loDevice.connect({"onEndCallback": loDevice.onEndCallback}).then(resolve);
            });
        });
    }

    close() {
        const {client, logger, deviceId: clientId, mqttServerUrl: serverUrl} = this;
        if (client) {
            client.end(true, {}, () => logger.info(`${serverUrl}: ${clientId} disconnected.`));
        }
    }

}
