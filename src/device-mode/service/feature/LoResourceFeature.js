import log4js from "log4js";
import {isTrue} from "../util.js";

const topicResource = 'dev/rsc';

const topicResourceUpd = 'dev/rsc/upd';
const topicResourceUpdResp = 'dev/rsc/upd/res';
const topicResourceUpdErr = 'dev/rsc/upd/err';
export default class LoResourceFeature {
    constructor({resource, publishDeviceResource}) {
        this.logger = log4js.getLogger();
        this.logger.level = 'DEBUG';
        this.resource = resource;
        this.publishDeviceResource = publishDeviceResource;
    }

    getName() {
        return "resource";
    }

    getHandledTopics() {
        return [topicResourceUpd];
    }

    onConnect({client}) {
        const {resource, publishDeviceResource} = this;
        client.publishResource = object => client.publishTopic(topicResource, object);
        client.subscribeTopic(topicResourceUpd);
        if (isTrue(publishDeviceResource)) {
            client.publishResource(resource);
        }
    }

    onMessage(topic, message) {
        this.logger.debug(`[${topic}]< ${message}`);
    }
}