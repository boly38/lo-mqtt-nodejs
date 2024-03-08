import log4js from "log4js";
import mqtt from "mqtt";
import {loadJSON} from "./util.js";


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

const INITIAL_CONFIG = loadJSON("../data/initialConfig.json");
const INITIAL_RESOURCE = loadJSON("../data/initialResource.json");

const topicConfigUpdate = 'dev/cfg/upd';
const topicConfig = 'dev/cfg';
const topicData = 'dev/data';
const topicResource = 'dev/rsc';
const topicCommand = 'dev/cmd';
const topicCommandRsp = 'dev/cmd/res';
const topicResourceUpd = 'dev/rsc/upd';
const topicResourceUpdResp = 'dev/rsc/upd/res';
const topicResourceUpdErr = 'dev/rsc/upd/err';
export default class LoDevice {
    constructor({mqttServerUrl, deviceApiKey, deviceId}) {
        this.logger = log4js.getLogger();
        this.logger.level = 'DEBUG';

        this.mqttServerUrl = mqttServerUrl;
        this.deviceApiKey = deviceApiKey;
        this.deviceId = deviceId;

        this.client = null;
        this.connectionCount = 0;
        this.reconnectRetry = 0;
        this.deviceResources = INITIAL_RESOURCE;
        this.deviceConfig = INITIAL_CONFIG;
    }

    connect({publishDeviceConfig, onEndCallback}) {
        const loDevice = this;
        loDevice.onEndCallback = onEndCallback;
        return new Promise((resolve, reject) => {
            let {
                logger,
                connectionCount,
                reconnectRetry,
                deviceId: clientId,
                deviceApiKey: password,
                mqttServerUrl: serverUrl
            } = loDevice;
            logger.info(`${serverUrl}: ${clientId} trying to connect...`);
            if (this.client != null) {
                loDevice.close()
            }
            loDevice.client = mqtt.connect(serverUrl, {
                ...MQTT_DEVICE_MODE_DEFAULT_CONNECT_OPTIONS,
                clientId,
                password
            });
            // After connection actions
            loDevice.client.on('connect', function () {
                logger.info(`${serverUrl}: ${clientId} connected.`);
                connectionCount++;
                reconnectRetry = 0;
                if (publishDeviceConfig) {
                    loDevice.publishDeviceConfig();
                }
                /**
                 if (!byPassInit) {
                 publishDeviceConfig();

                 subscribeTopic(topicConfigUpdate);

                 publishDeviceData();

                 if (process.env.LO_MQTT_SKIP_STARTUP_PUBLISH !== "true") {
                 publishDeviceResources();
                 }

                 subscribeTopic(topicCommand);

                 subscribeTopic(topicResourceUpd);
                 }
                 */
                resolve();
            });
            loDevice.client.on('close', function () {
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

            // Other callbacks
            loDevice.client.on('suback', function (topic, message) {
                logger.info('subscribed to ' + topic);
            });

            loDevice.client.on('error', error => {
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

            this.client.on('reconnect', function () {
                logger.info('reconnect');
                reconnectRetry++;
                logger.info(`reconnect (retry ${reconnectRetry} / ${MAX_CONNECT_RETRIES})`);
            });
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

    publishDeviceConfig() {
        const {logger, client, deviceConfig} = this;
        const msgConfigStr = JSON.stringify(deviceConfig);
        logger.info(`[${topicConfig}]> ${msgConfigStr}`);
        client.publish(topicConfig, msgConfigStr);
    }


    close() {
        const {client, logger, deviceId: clientId, mqttServerUrl: serverUrl} = this;
        if (client) {
            client.end(true, {}, () => logger.info(`${serverUrl}: ${clientId} disconnected.`));
        }
    }
}