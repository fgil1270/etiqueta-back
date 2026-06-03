import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus, Logger } from '@nestjs/common';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
    private readonly logger = new Logger(AllExceptionsFilter.name);

    catch(exception: unknown, host: ArgumentsHost): void {
        const context = host.switchToHttp();
        const request = context.getRequest();
        const response = context.getResponse();

        const isHttpException = exception instanceof HttpException;
        const status = isHttpException ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;
        const responseBody = isHttpException ? exception.getResponse() : null;
        const message = this.getErrorMessage(exception, responseBody);

        this.logger.error(
            `${request.method} ${request.url} - ${message}`,
            exception instanceof Error ? exception.stack : undefined,
        );

        response.status(status).json({
            statusCode: status,
            message,
            timestamp: new Date().toISOString(),
            path: request.url,
        });
    }

    private getErrorMessage(exception: unknown, responseBody: unknown): string {
        if (exception instanceof HttpException) {
            if (typeof responseBody === 'string') {
                return responseBody;
            }

            if (responseBody && typeof responseBody === 'object' && 'message' in responseBody) {
                const message = (responseBody as { message?: string | string[] }).message;
                return Array.isArray(message) ? message.join(', ') : message ?? exception.message;
            }

            return exception.message;
        }

        if (exception instanceof Error) {
            return exception.message;
        }

        return 'Unexpected error';
    }
}