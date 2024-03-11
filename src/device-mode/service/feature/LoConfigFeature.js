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
        this.configFailure = 0;
        this.handledConfig = 0;
    }

    getName() {
        return "config";
    }

    info() {
        this.logger.info(`${this.getName()}` +
            (this.handledConfig > 0 ? `| ${this.handledConfig} handled ` : '') +
            (this.configFailure > 0 ? `| with ${this.configFailure} failure planned` : '')
        );
    }

    getStats() {
        const {handledConfig} = this;
        return {handledConfig}
    }

    getHandledTopics() {
        return [topicConfigUpdate];
    }

    order(order) {
        if ("add-failure" === order) {
            this.configFailure++;
            return;
        } else if ("send" === order) {
            this.publishConfig(this.config);
            return;
        }
        this.logger.info(`unsupported order ${order}`);
    }

    onConnect({client}) {
        const {config, publishDeviceConfig} = this;
        this.publishConfig = object => client.publishTopic(topicConfig, object);
        client.subscribeTopic(topicConfigUpdate);
        if (isTrue(publishDeviceConfig)) {
            this.publishConfig(config);
        }
    }

    onMessage(topic, message) {
        if (topicConfigUpdate === topic) {
            this.onConfigUpdateMessage(message);
        }
    }

    onConfigUpdateMessage(message) {
        if (this.configFailure > 0) {
            // hack a wrong value for a requested parameter
            const msgWrongCfg = message;
            const firstParam = Object.keys(message.cfg)[0];
            msgWrongCfg.cfg[firstParam].v = 666;// w/ initialConfig: a string is expected
            this.logger.info(`FAILED config [${topicConfig}]> ${JSON.stringify(msgWrongCfg)}`);
            this.publishConfig(msgWrongCfg);
            this.configFailure--;
        } else {
            // success
            this.config = message;
            this.publishConfig(this.config);
        }
        this.handledConfig++;
    }
}