import ErrorConstants from './ErrorConstants.js';

export default class InvalidConfigurationError {
    constructor(userDetails = null) {
        this.code = ErrorConstants.INVALID_CONFIGURATION.code;
        this.details = userDetails ? userDetails : ErrorConstants.INVALID_CONFIGURATION.message;
    }
}

