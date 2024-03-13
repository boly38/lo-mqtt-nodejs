import log4js from "log4js";
import {isTrue} from "../../util.js";

const topicData = 'dev/data';

export default class LoDataFeature {
    constructor({publishDeviceData, getDeviceStats, getGeoloc}) {
        this.logger = log4js.getLogger("LoDataFeature");
        this.logger.level = 'DEBUG';
        this.publishDeviceData = publishDeviceData;
        this.getDeviceStats = getDeviceStats;
        this.getGeoloc = getGeoloc;
        this.sendMessages = 0;
    }
    getName() {
        return "data";
    }
    info() {
        this.logger.info(`${this.getName()}` +
            (this.sendMessages > 0 ? `| ${this.sendMessages} sendMessages ` : '')
        );
    }
    getStats() {
        const {sendMessages} = this;
        return {sendMessages}
    }
    order(order) {
        if ("send" === order) {
            this.publishData();
            return;
        }
        this.logger.info(`${this.getName()}|unsupported order ${order}`);
    }
    onConnect({client}) {
        const {publishDeviceData, deviceId, getDeviceStats} = this;
        this.deviceId = deviceId;
        this.getDeviceStats = getDeviceStats;
        this.client = client;
        client.publishData = object => client.publishTopic(topicData, object);

        if (isTrue(publishDeviceData)) {
            this.publishData();
        }
    }

    getHandledTopics() {
        return [];
    }

    publishData() {
        this.client.publishData(this.getDeviceDataMessage());
        this.sendMessages++;
    }

    getDeviceDataMessage() {
        const {deviceId} = this.client;
        const messageModel = 'nodeDeviceModeV1';
        const now = new Date().toISOString();
        const geoloc = this.getGeoloc();
        let value = {
            temp: 12.75,
            humidity: 62.1,
            gpsFix: true,
            gpsSats: [12, 14, 21]
        };
        const deviceStats = this.getDeviceStats();
        value = {...value, ...deviceStats}
        return {
            s: deviceId,
            ts: now,
            m: messageModel,
            loc: geoloc,
            v: value,
        };
    }

}