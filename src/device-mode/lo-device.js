import dotenv from 'dotenv'
import LoDeviceController from "./service/LoDeviceController.js";
import log4js from "log4js";

const logger = log4js.getLogger();
logger.level = 'DEBUG';

dotenv.config()
const mqttServerUrl = process.argv[2];
const deviceApiKey = process.argv[3];
const deviceId = process.argv[4];

const loDeviceController = new LoDeviceController()


try {
    const config = loDeviceController.buildDeviceConfigFromEnv({mqttServerUrl, deviceApiKey, deviceId});
    loDeviceController.showHelp();
    loDeviceController.startNewDevice(config)
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