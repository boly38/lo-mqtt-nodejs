import log4js from "log4js";

const topicCommand = 'dev/cmd';
const topicCommandRsp = 'dev/cmd/res';
export default class LoCommandFeature {
    constructor({}) {
        this.logger = log4js.getLogger();
        this.logger.level = 'DEBUG';
    }

    getName() {
        return "command";
    }

    getStats() {
        return {handledCommand: 0}
    }

    getHandledTopics() {
        return [topicCommand];
    }

    onConnect({client}) {
        client.subscribeTopic(topicCommand);
    }

    onMessage(topic, message) {
        this.logger.debug(`[${topic}]< ${message}`);
    }
}