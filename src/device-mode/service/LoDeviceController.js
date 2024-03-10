import LoDevice from "./LoDevice.js";
import {assumeConfigurationKeySet} from "./util.js";
import log4js from "log4js";
import * as readline from "readline";
import {default as nodeGlobalProxy} from "node-global-proxy";

const ORDER_HELP = ["help", "h", "?"];
const ORDER_RECONNECT = ["*", "reconnect"];
const ORDER_QUIT = ["bye", "quit", "q"];
export default class LoDeviceController {
    constructor() {
        this.logger = log4js.getLogger();
        this.logger.level = 'DEBUG';
        this.devices = [];
        this.initProxy();
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
                if (ORDER_HELP.indexOf(answer) >= 0) {
                    controller.showHelp();
                } else if (ORDER_RECONNECT.indexOf(answer) >= 0) {
                    controller.reconnectFirst();
                } else if (ORDER_QUIT.indexOf(answer) >= 0) {
                    this.stopAskInput();
                    quit = true;
                    controller.quit();
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
        this.showHelpLine(ORDER_RECONNECT, "force disconnect / reconnect");
        this.showHelpLine(ORDER_QUIT, "disconnect and quit");
    }

    showHelpLine(order, desc) {
        console.log(`| ${order.join(',').padStart(20)} | ${desc}`);
    }

    quit() {
        this.devices.forEach(d => d.close());
    }

    reconnectFirst() {
        if (this.devices.length < 1) {
            this.logger.info("no device to reconnect");
            return;
        }
        this.devices[0].forceReconnect().then(r => {
        })
    }
    validMqttUrl(url) {
        return /^(mqtts?):\/\/(.*):[0-9]{2,6}$/.test(url) || /^(wss?):\/\/(.*):[0-9]{2,6}(\/mqtt)?$/.test(url);
    }

}
