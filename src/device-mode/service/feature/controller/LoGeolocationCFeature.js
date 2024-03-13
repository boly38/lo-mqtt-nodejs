import log4js from "log4js";
import ControllerFeatureInternalError from "../../../exception/ControllerFeatureInternalError.js";
import {randomLongId, sleep} from "../../util.js";

const geolocationSquares = {// @formatter:off
    "europe": [[50.513427, -3.691406], [41.508577, 27.597656],],
    "france": [[49.296472, -1.911621], [43.452919,  7.44873],],
    "idf":    [[48.945955,  2.146454], [48.665571,  2.528229],],// île-de-France
    "lyon":   [[45.794818,  4.774228], [45.673563,  4.950331],]
}// @formatter:on
export default class LoGeolocationCFeature {
    constructor({controller}) {
        this.logger = log4js.getLogger("LoGeolocationCFeature");
        this.logger.level = 'DEBUG';
        this.controller = controller;
    }

    getName() {
        return "geolocation";
    }

    throwError(userDetails) {
        throw new ControllerFeatureInternalError(
            this.getName(), 'geolocationSquare input must be a square of locations in which the device will be localized'
        );
    }

    order(order) {
        for (const squareName of Object.keys(geolocationSquares)) {
            switch(order) {
                case squareName :
                    this.generateGeolocatedDevicesInSquare(squareName, geolocationSquares[squareName])
                        .then(() => {
                        });
                    return;
                case `${squareName}10`:
                    this.generateGeolocatedDevicesInSquare(squareName, geolocationSquares[squareName], 10)
                        .then(() => {
                        });
                    return;
                case `${squareName}100`:
                    this.generateGeolocatedDevicesInSquare(squareName, geolocationSquares[squareName], 100)
                        .then(() => {
                        });
                    return;
                case `${squareName}1000`:
                    this.generateGeolocatedDevicesInSquare(squareName, geolocationSquares[squareName], 1000)
                        .then(() => {
                        });
                    return;
            }
        }
        this.logger.info(`[C] ${this.getName()}|unsupported order ${order}`);
    }

    /**
     * generate fleet of nb devices connections having different urn and random positon from given square
     * @param squareName square name
     * @param geolocationSquare square geo-coordinates limits in which the device must be localized in form of [[number,number], [number, number]]
     * @param nb number of localized device to generate
     * @returns {Promise<void>}
     */
    async generateGeolocatedDevicesInSquare(squareName, geolocationSquare, nb = 1) {
        if (
            geolocationSquare.length !== 2 ||
            geolocationSquare[0].length !== 2 ||
            geolocationSquare[1].length !== 2 ||
            'number' !== typeof geolocationSquare[0][0] ||
            'number' !== typeof geolocationSquare[0][1] ||
            'number' !== typeof geolocationSquare[1][0] ||
            'number' !== typeof geolocationSquare[1][1]
        ) {
            this.throwError(`geolocationSquare ${squareName} input must be a square of locations in which the device will be localized`);
        }
        const lastDeviceId = this.controller.getLastDeviceId();
        this.logger.info(`generating ${nb} device in "${squareName}" zone using prefix:"${lastDeviceId}"`);
        for (let index = 0; index < nb; index++) {
            let deviceUrn = `${lastDeviceId}_${randomLongId()}`;// generate deviceUrn with a random id
            this.controller.firstSetDeviceId(deviceUrn);
            await this.controller.firstReconnect();
            await sleep(1000);
            const newRandomCoordinates = this.randomCoordinateWithinSquare(geolocationSquare);
            this.controller.firstSetGeoloc(newRandomCoordinates);
            this.controller.firstSendPluginOrder("data","send");
            await sleep(1000);
        }
    }

    /**
     * random coordinates within the square of geolocationSquare
     * @param geolocationSquare square
     * @returns {*[]} coordinates
     */
    randomCoordinateWithinSquare(geolocationSquare) {
        // The
        return [
            geolocationSquare[1][0] + (geolocationSquare[0][0] - geolocationSquare[1][0]) * Math.random(),
            geolocationSquare[0][1] + (geolocationSquare[1][1] - geolocationSquare[0][1]) * Math.random(),
        ];
    }
}