import log4js from "log4js";

const topicCommand = 'dev/cmd';
const topicCommandRsp = 'dev/cmd/res';
const nodeResponse = 'this is an answer from nodeJs client LoCommandFeature';
export default class LoCommandFeature {
    constructor({}) {
        this.logger = log4js.getLogger();
        this.logger.level = 'DEBUG';
        this.handledCommand = 0;
        this.commandNoAnswer = 0;
    }

    getName() {
        return "command";
    }

    getStats() {
        const {handledCommand} = this;
        return {handledCommand}
    }

    getHandledTopics() {
        return [topicCommand];
    }

    onConnect({client}) {
        this.publishCommandResponse = object => client.publishTopic(topicCommandRsp, object);
        client.subscribeTopic(topicCommand);
    }

    onMessage(topic, message) {
        if (topicCommand === topic) {
            this.onCommandMessage(message);
        }
    }

    onCommandMessage(message) {
        if (this.commandNoAnswer <= 0) {
            const msgCommand = {"res": {"data": nodeResponse}, "cid": message.cid};
            this.logger.info(`OK result [${topicCommandRsp}]> ${JSON.stringify(msgCommand)}`);
            this.publishCommandResponse(msgCommand);
        } else {
            this.logger.info('no answer to command');
            this.commandNoAnswer--;
        }
        this.handledCommand++;
    }
}