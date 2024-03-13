import dotenv from 'dotenv'
import LoDeviceController from "./service/LoDeviceController.js";
import log4js from "log4js";
import {loadJSON} from "./service/util.js";

const logger = log4js.getLogger("lo-device");
logger.level = 'DEBUG';

dotenv.config()
const mqttServerUrl = process.argv[2];
const deviceApiKey = process.argv[3];
const deviceId = process.argv[4];

try {
    const loDeviceController = new LoDeviceController()
    let deviceConfig = loDeviceController.buildDeviceConfigFromEnv({mqttServerUrl, deviceApiKey, deviceId});
    const config = loadJSON("../data/initialConfig.json");
    const resource = loadJSON("../data/initialResource.json");
    deviceConfig = {...deviceConfig, config, resource};

    loDeviceController.showHelp();
    loDeviceController.startNewDevice(deviceConfig)
        .then(() => {
            loDeviceController.initAskAction();
        }).catch(err => {
        // cant start issue are already logged
    })
} catch (exception) {
    if ("code" in exception) {
        logger.error(` Error: ${exception.code} : ${exception.details}`);
    } else {
        logger.error("unexpected error:", exception);
    }
}
