export default class LoConfig {
    constructor({mqttServerURL,deviceApiKey,deviceId}) {
        this.mqttServerURL  = mqttServerURL;
        this.deviceApiKey  = deviceApiKey;
        this.deviceId  = deviceId;
    }

    getMqttServerUrl() {
        return this.mqttServerURL;
    }
    getDeviceApiKey() {
        return this.deviceApiKey;
    }
    getDeviceId() {
        return this.deviceId;
    }
}