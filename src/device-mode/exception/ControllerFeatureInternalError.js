import ErrorConstants from './ErrorConstants.js';

export default class ControllerFeatureInternalError {
    constructor(name, userDetails = null) {
        this.code = ErrorConstants.CONTROLLER_FEATURE_INTERNAL_ERROR.code;
        this.details = `${name}| ` + userDetails ? userDetails : ErrorConstants.CONTROLLER_FEATURE_INTERNAL_ERROR.message;
    }
}

