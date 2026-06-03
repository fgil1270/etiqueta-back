"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var AllExceptionsFilter_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.AllExceptionsFilter = void 0;
const common_1 = require("@nestjs/common");
let AllExceptionsFilter = AllExceptionsFilter_1 = class AllExceptionsFilter {
    constructor() {
        this.logger = new common_1.Logger(AllExceptionsFilter_1.name);
    }
    catch(exception, host) {
        const context = host.switchToHttp();
        const request = context.getRequest();
        const response = context.getResponse();
        const isHttpException = exception instanceof common_1.HttpException;
        const status = isHttpException ? exception.getStatus() : common_1.HttpStatus.INTERNAL_SERVER_ERROR;
        const responseBody = isHttpException ? exception.getResponse() : null;
        const message = this.getErrorMessage(exception, responseBody);
        this.logger.error(`${request.method} ${request.url} - ${message}`, exception instanceof Error ? exception.stack : undefined);
        response.status(status).json({
            statusCode: status,
            message,
            timestamp: new Date().toISOString(),
            path: request.url,
        });
    }
    getErrorMessage(exception, responseBody) {
        if (exception instanceof common_1.HttpException) {
            if (typeof responseBody === 'string') {
                return responseBody;
            }
            if (responseBody && typeof responseBody === 'object' && 'message' in responseBody) {
                const message = responseBody.message;
                return Array.isArray(message) ? message.join(', ') : message ?? exception.message;
            }
            return exception.message;
        }
        if (exception instanceof Error) {
            return exception.message;
        }
        return 'Unexpected error';
    }
};
exports.AllExceptionsFilter = AllExceptionsFilter;
exports.AllExceptionsFilter = AllExceptionsFilter = AllExceptionsFilter_1 = __decorate([
    (0, common_1.Catch)()
], AllExceptionsFilter);
//# sourceMappingURL=all-exceptions.filter.js.map