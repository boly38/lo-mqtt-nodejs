import LoDevice from "./LoDevice.js";
import {assumeConfigurationKeySet} from "./util.js";
import log4js from "log4js";
import * as readline from "readline";
import {default as nodeGlobalProxy} from "node-global-proxy";
import LoGeolocationCFeature from "./feature/controller/LoGeolocationCFeature.js";

//~ orders: use alpha order
const ORDER_HELP = ["h", "?", "help"];
const ORDER_INFO = ["i", "x", "info"]; // +x
const ORDER_QUIT = ["q", "quit", "bye"];
const ORDER_RECONNECT = ["*", "reconnect"];
//~ controller plugins orders
const ORDER_GENERATE_DEVICES_AND_LOCATION = [
    "europe", "europe100", "europe1000",
    "france", "france10", "france100",
    "idf", "idf10", "idf100",
    "lyon", "lyon10", "lyon100"
];
//~ plugins orders: use alpha order
const ORDER_ADD_COMMAND_NO_ANSWER = ["k", "cmdNoAnswer"];
const ORDER_ADD_CONFIG_UPDATE_FAILURE = ["c", "cfgFail"];
const ORDER_ADD_RESOURCE_UPDATE_FAILURE = ["r", "rscFail"];
const ORDER_SEND_CONFIG = ["g", "cfgSend"];
const ORDER_SEND_MESSAGE = ["m", "dataSend"];
const ORDER_SEND_RESOURCE = ["o", "rscSend"];
const ORDER_TOGGLE_RESOURCE_UPDATE_FAILURE_CUSTOM_DEVICE_ERROR = ["d", "rscFailDevice"];
const ORDER_TOGGLE_RESOURCE_UPDATE_FAILURE_NO_ANSWER = ["n", "rscFailNoAnswer"];
const ORDER_TOGGLE_RESOURCE_UPDATE_DOWNLOAD_STEP = ["f", "rscDownload"];
const ORDER_TOGGLE_RESOURCE_UPDATE_CRASH_DOWNLOAD = ["z", "rscCrashDownload"];

export default class LoDeviceController {
    constructor() {
        this.logger = log4js.getLogger("LoDeviceController");
        this.logger.level = 'DEBUG';
        this.devices = [];
        this.initProxy();
        this.cfeatures = [
            new LoGeolocationCFeature({"controller": this})
        ];
    }

    initProxy() {
        const http = process.env.LO_MQTT_HTTP_PROXY;
        const https = process.env.LO_MQTT_HTTPS_PROXY;
        if (http || https) {
            nodeGlobalProxy.setConfig({http, https});
            nodeGlobalProxy.start();
        }
    }

    initAskAction() {
        const controller = this;
        this.readInterface = readline.createInterface({
            input: process.stdin,
            output: process.stdout,
        })
        const ask = (question, reAsk = true) => {
            this.readInterface.question(question, (answer) => {
                // logger.debug(`The answer received:  ${answer}\n`)
                let quit = false;
//~ orders
                if (ORDER_HELP.includes(answer)) {
                    controller.showHelp();
                } else if (ORDER_INFO.includes(answer)) {
                    controller.firstInfo();
                } else if (ORDER_QUIT.includes(answer)) {
                    this.stopAskInput();
                    quit = true;
                    controller.quit();
                } else if (ORDER_RECONNECT.includes(answer)) {
                    controller.firstReconnect();
//~ plugins orders
                } else if (ORDER_ADD_COMMAND_NO_ANSWER.includes(answer)) {
                    controller.firstSendPluginOrder("command", "add-no-answer");
                } else if (ORDER_ADD_CONFIG_UPDATE_FAILURE.includes(answer)) {
                    controller.firstSendPluginOrder("config", "add-failure");
                } else if (ORDER_ADD_RESOURCE_UPDATE_FAILURE.includes(answer)) {
                    controller.firstSendPluginOrder("resource", "add-failure");
                } else if (ORDER_SEND_CONFIG.includes(answer)) {
                    controller.firstSendPluginOrder("config", "send");
                } else if (ORDER_SEND_MESSAGE.includes(answer)) {
                    controller.firstSendPluginOrder("data", "send");
                } else if (ORDER_SEND_RESOURCE.includes(answer)) {
                    controller.firstSendPluginOrder("resource", "send");
                } else if (ORDER_TOGGLE_RESOURCE_UPDATE_FAILURE_CUSTOM_DEVICE_ERROR.includes(answer)) {
                    controller.firstSendPluginOrder("resource", "toggle-custom-device-error");
                } else if (ORDER_TOGGLE_RESOURCE_UPDATE_FAILURE_NO_ANSWER.includes(answer)) {
                    controller.firstSendPluginOrder("resource", "toggle-no-answer");
                } else if (ORDER_TOGGLE_RESOURCE_UPDATE_DOWNLOAD_STEP.includes(answer)) {
                    controller.firstSendPluginOrder("resource", "toggle-download-step");
                } else if (ORDER_TOGGLE_RESOURCE_UPDATE_CRASH_DOWNLOAD.includes(answer)) {
                    controller.firstSendPluginOrder("resource", "toggle-download-crash");
                } else if (ORDER_GENERATE_DEVICES_AND_LOCATION.includes(answer)) {
                    controller.sendCPluginOrder("geolocation", answer);
                }
                if (!quit && reAsk) {
                    ask(question);// warn : recursive call
                }
            })
        }

        ask("|> ")
    }


    stopAskInput() {
        if (this.readInterface) {
            this.readInterface.close()
            this.readInterface.removeAllListeners()
        }
    }

    buildDeviceConfigFromEnv(config) {
        assumeConfigurationKeySet(config, "mqttServerUrl", "LO_MQTT_ENDPOINT")
        assumeConfigurationKeySet(config, "deviceApiKey", "LO_MQTT_DEVICE_API_KEY")
        assumeConfigurationKeySet(config, "deviceId", "LO_MQTT_DEVICE_ID")
        assumeConfigurationKeySet(config, "publishDeviceConfig", "LO_MQTT_STARTUP_PUBLISH_CONFIG", "true")
        assumeConfigurationKeySet(config, "publishDeviceData", "LO_MQTT_STARTUP_PUBLISH_DATA", "true")
        assumeConfigurationKeySet(config, "publishDeviceResource", "LO_MQTT_STARTUP_PUBLISH_RESOURCE", "true")
        this.validMqttUrl(config.mqttServerUrl)
        return config;
    }

    startNewDevice(config) {
        const device = new LoDevice(config);
        this.lastDeviceId = device.getDeviceId();
        this.devices.push(device);
        return device.connect({
            "onEndCallback": () => {
                this.stopAskInput();// today we manage only one device, so leave here right now
            }
        });
    }

    showHelp() {
        console.log("| => ~~ help menu ~~ <=");
        this.showHelpLine(ORDER_HELP, "display help menu");
        this.showHelpLine(ORDER_INFO, "display device info");
        this.showHelpLine(ORDER_QUIT, "disconnect and quit");
        this.showHelpLine(ORDER_RECONNECT, "force disconnect / reconnect");
        this.showHelpLine(ORDER_ADD_COMMAND_NO_ANSWER, "command> add no answer");
        this.showHelpLine(ORDER_ADD_CONFIG_UPDATE_FAILURE, "config> add update failure");
        this.showHelpLine(ORDER_ADD_RESOURCE_UPDATE_FAILURE, "resource> add update failure");
        this.showHelpLine(ORDER_SEND_CONFIG, "config> send");
        this.showHelpLine(ORDER_SEND_MESSAGE, "data> send");
        this.showHelpLine(ORDER_SEND_RESOURCE, "resource> send");
        this.showHelpLine(ORDER_TOGGLE_RESOURCE_UPDATE_FAILURE_CUSTOM_DEVICE_ERROR, "resource> toggle custom device error");
        this.showHelpLine(ORDER_TOGGLE_RESOURCE_UPDATE_FAILURE_NO_ANSWER, "resource> toggle no answer");
        this.showHelpLine(ORDER_TOGGLE_RESOURCE_UPDATE_DOWNLOAD_STEP, "resource> toggle download step");
        this.showHelpLine(ORDER_TOGGLE_RESOURCE_UPDATE_CRASH_DOWNLOAD, "resource> toggle download step crash");
    }

    showHelpLine(order, desc) {
        console.log(`| ${order.join(',').padStart(20)} | ${desc}`);
    }

    quit() {
        this.devices.forEach(d => d.close());
    }

    validMqttUrl(url) {
        return /^(mqtts?):\/\/(.*):[0-9]{2,6}$/.test(url) || /^(wss?):\/\/(.*):[0-9]{2,6}(\/mqtt)?$/.test(url);
    }

    sendCPluginOrder(name, order) {
        for (const feature of this.cfeatures) {
            if (name === feature.getName() && feature.order) {
                feature.order(order);
                return;// found it so bye
            }
        }
        this.logger.info(`no ${name} eligible to order ${order}`);
    }

    getLastDeviceId() {
        return this.lastDeviceId;
    }

    applyToFirstDevice(callable) {
        if (this.devices.length < 1) {
            this.logger.debug("no device to apply");
            return;
        }
        callable(this.devices[0]);
    }

    firstInfo() {
        this.applyToFirstDevice(d => d.info());
    }

    firstReconnect() {
        this.applyToFirstDevice(d => d.forceReconnect().then(() => {
        }));
    }

    firstSendPluginOrder(name, order) {
        this.applyToFirstDevice(d => d.sendPluginOrder(name, order));
    }

    firstSetDeviceId(deviceId) {
        this.applyToFirstDevice(d => d.setDeviceId(deviceId));
    }

    firstSetGeoloc(coordinates) {
        this.applyToFirstDevice(d => d.setGeoloc(coordinates));
    }
}
