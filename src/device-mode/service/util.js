import InvalidConfigurationError from "../exception/InvalidConfigurationError.js";
import * as fs from "fs";
import path from 'path';
import {fileURLToPath} from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function isSet(variable) {
    return (variable !== undefined && variable !== null);
}

function isTrue(variable) {
    return ["true", "TRUE", "1"].indexOf(variable) >= 0
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

export {isSet, isTrue, assumeConfigurationKeySet, loadJSON};