import log4js from "log4js";
import {downloadFile, isTrue, randomFromArray} from "../util.js";

const topicResource = 'dev/rsc';

const topicResourceUpd = 'dev/rsc/upd';
const topicResourceUpdResp = 'dev/rsc/upd/res';
const topicResourceUpdErr = 'dev/rsc/upd/err';
const nodeResponse = 'this is an answer from nodeJs client LoCommandFeature';
// one of predefined error
const possibleErrors = [
    // 2.1 // "UNKNOWN_RESOURCE",
    'INVALID_RESOURCE',
    'WRONG_SOURCE_VERSION',
    'WRONG_TARGET_VERSION',
    'NOT_AUTHORIZED',
    'INTERNAL_ERROR',
];
export default class LoResourceFeature {
    constructor({resource, publishDeviceResource}) {
        this.logger = log4js.getLogger();
        this.logger.level = 'DEBUG';
        this.resource = resource;
        this.publishDeviceResource = publishDeviceResource;
        this.resourceFailure = 0;
        this.withNoAnswer = false;
        this.withDeviceError = process.env.LO_MQTT_DEFAULT_WITH_DEVICE_ERROR === 'true' | false;
        4
        this.withDownloadStep = true;
        this.withDownloadExit = false;
        this.handledResource = 0;
    }

    getName() {
        return "resource";
    }

    info() {
        this.logger.info(`${this.getName()}` +
            (this.handledResource > 0 ? `| ${this.handledResource} handled` : '') +
            (this.withDownloadStep ? `| with download step` : ' without download step') +
            (this.withDownloadStep && this.withDownloadExit ? ' crash planned(enforce exit) !' : '') +
            (this.resourceFailure > 0 ? ` with ${this.resourceFailure} failure planned` : '') +
            (this.resourceFailure > 0 && this.withDeviceError ? '(custom error)' : '') +
            (this.resourceFailure > 0 && this.withNoAnswer ? '(no answer)' : '')
        );
    }

    getStats() {
        const {handledResource} = this;
        return {handledResource}
    }

    getHandledTopics() {
        return [topicResourceUpd];
    }

    order(order) {// @formatter:off
        switch(order) {
            case "add-failure":                this.resourceFailure++; break;
            case "send":                       this.publishResource(this.resource); break;
            case "toggle-custom-device-error": this.withDeviceError = !this.withDeviceError; break;
            case "toggle-no-answer":           this.withNoAnswer = !this.withNoAnswer; break;
            case "toggle-download-step":       this.withDownloadStep = !this.withDownloadStep; break;
            case "toggle-download-crash":      this.withDownloadExit = !this.withDownloadExit; break;
            default:this.logger.info(`unsupported order ${order}`);
        }
    }// @formatter:on

    onConnect({client}) {
        const {resource, publishDeviceResource} = this;
        this.publishResource = object => client.publishTopic(topicResource, object);
        this.publishResourceUpdateError = object => client.publishTopic(topicResourceUpdErr, object);
        this.publishResourceUpdateResponse = object => client.publishTopic(topicResourceUpdResp, object);
        client.subscribeTopic(topicResourceUpd);
        if (isTrue(publishDeviceResource)) {
            this.publishResource(resource);
        }
    }

    onMessage(topic, message) {
        if (topicResourceUpd === topic) {
            this.onMessageRessourceUpdate(message);
        }
    }

    onMessageRessourceUpdate(message) {
        if (this.resourceFailure > 0) {
            this.onMessageResourceUpdateFailure(message);
        } else {
            this.onMessageResourceUpdateSuccess(message);
        }
        this.handledResource++;
    }

    onMessageResourceUpdateFailure(message) {
        const {logger} = this;
        if (this.withNoAnswer) {
            logger.info('no answer to resource update');
        } else if (this.withDeviceError) {
            // device custom details
            const msgDeviceError = {
                errorCode: 'NY_NODE_JS_UNKNOWN_RESOURCE',
                errorDetails: nodeResponse,
            };
            logger.info(`[${topicResourceUpdErr}]> ${JSON.stringify(msgDeviceError)}`);
            this.publishResourceUpdateError(msgDeviceError);
        } else {
            const randomError = randomFromArray(possibleErrors);
            const msgError = {res: randomError, cid: message.cid};
            logger.info(`FAILED [${topicResourceUpdResp}]> ${JSON.stringify(msgError)}`);
            this.publishResourceUpdateResponse(msgError);
        }
        this.resourceFailure--;
    }

    onMessageResourceUpdateSuccess(message) {
        const {logger} = this;

        // good resource update
        const correlationId = message.cid;
        const resourceId = message.id;
        const resourceNewVersion = message.new;
        const resourceUrl = message.m.uri;
        const resourceSize = message.m.size;
        const resourceMd5 = message.m.md5;

        // accept update
        const msgOk = {res: 'OK', cid: correlationId};
        logger.info(`ACCEPT [${topicResourceUpdResp}]> ${JSON.stringify(msgOk)}`);
        this.publishResourceUpdateResponse(msgOk);
        const simulateUpdateDone = () => this.simulateResourceUpdateDone(resourceId, resourceNewVersion);

        if (this.withDownloadStep) {
            // download resource
            this.downloadFileStep(
                resourceId,
                resourceNewVersion,
                resourceUrl,
                resourceSize,
                resourceMd5,
                this.withDownloadExit
            ).then(r => {
                if (!this.withDownloadExit) {
                    simulateUpdateDone();
                }
            });
        } else {
            simulateUpdateDone();
        }
    }

    simulateResourceUpdateDone(resourceId, resourceNewVersion) {
        // act version update internally
        this.resource.rsc[resourceId].v = resourceNewVersion;
        // publish new version
        this.publishResource(this.resource);
    }

    downloadFileStep(
        resourceId,
        resourceNewVersion,
        resourceUrl,
        resourceSize,
        resourceMd5,
        downloadError
    ) {
        const {logger} = this;
        return new Promise((resolve, reject) => {
            logger.debug(`download resource ${resourceId} version ${resourceNewVersion} from ${resourceUrl}`);
            downloadFile(resourceUrl, 'lastFirmware.raw')
                .catch(err => {// download issues are just reported as warn
                    let details = "";
                    if ("EPROTO" === err.code) {
                        details += " protocol issue (seems that resource server don't match url scheme).";
                    }
                    logger.warn(`Download error code:${err.code} errno:${err.errno} ${details}`);
                    reject(err);
                })
                .then(result => {
                    logger.debug('download done');
                    if (downloadError) {
                        setTimeout(() => {
                            logger.debug('simulate an error while downloading firmware: enforce exit()');
                            process.exit();
                        }, 10);
                    }
                    resolve();
                });
        });
    }
}