import log4js from "log4js";
import {isTrue} from "../util.js";

const topicConfigUpdate = 'dev/cfg/upd';
const topicConfig = 'dev/cfg';
export default class LoConfigFeature {
    constructor({config, publishDeviceConfig}) {
        this.logger = log4js.getLogger();
        this.logger.level = 'DEBUG';
        this.config = config;
        this.publishDeviceConfig = publishDeviceConfig;
    }

    getName() {
        return "config";
    }

    getHandledTopics() {
        return [topicConfigUpdate];
    }

    onConnect({client}) {
        const {config, publishDeviceConfig} = this;
        client.publishConfig = object => client.publishTopic(topicConfig, object);
        client.subscribeTopic(topicConfigUpdate);
        if (isTrue(publishDeviceConfig)) {
            client.publishConfig(config);
        }
    }

    onMessage(topic, message) {
        this.logger.debug(`[${topic}]< ${message}`);
    }
}