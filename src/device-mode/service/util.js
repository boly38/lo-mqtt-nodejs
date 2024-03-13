import InvalidConfigurationError from "../exception/InvalidConfigurationError.js";
import * as fs from "fs";
import Axios from "axios";

function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

function isSet(variable) {
    return (variable !== undefined && variable !== null);
}

function isTrue(variable) {
    return ["true", "TRUE", "1"].indexOf(variable) >= 0
}

function randomFromArray(arrayValue) {
   return arrayValue[Math.floor(Math.random() * arrayValue.length)];
}

function assumeConfigurationKeySet(object, keyName, envDefaultValue = null, defaultValue = null) {
    if (!keyName in object || !isSet(object[keyName])) {
        const envValue = process.env[envDefaultValue];
        if (isSet(envValue)) {
            object[keyName] = envValue;
            return;
        }
        if (isSet(defaultValue)) {
            object[keyName] = defaultValue;
            return;
        }
        const context = envDefaultValue != null ? ` env:${envDefaultValue}` : "";
        throw new InvalidConfigurationError(`please set ${keyName}${context} ===> ${envValue}`);
    }
}

function loadJSON(path) {
    let buffer = fs.readFileSync(new URL(path, import.meta.url));
    return JSON.parse(buffer);
}

async function downloadFile(url, outputLocationPath) {
    return new Promise((resolve, reject) => {
        const method = "get", responseType = "stream";
        const writer = fs.createWriteStream(outputLocationPath);
        Axios({method, url, responseType})
            .then(response => {
            //ensure that the user can call `then()` only when the file has
            //been downloaded entirely.
            response.data.pipe(writer);
            let error = null;
            writer.on('error', err => {
                error = err;
                writer.close();
                reject(err);
            });
            writer.on('close', () => {
                if (!error) {
                    resolve(true);
                }
                //no need to call the reject here, as it will have been called in the
                //'error' stream;
            });
        });
    });
}

function randomLongId() {
    return Math.ceil(Math.random() * 100000000000);
}

export {sleep, isSet, isTrue, randomFromArray, assumeConfigurationKeySet, loadJSON, downloadFile, randomLongId};