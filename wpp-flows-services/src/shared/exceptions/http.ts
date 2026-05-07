export class HttpError extends Error {
    constructor(message: string, public status: number) {
        super(message);
    }
}

export class NotFoundError extends HttpError {
    constructor(resource = "Resource") {
        super(`${resource} not found.`, 404);
    }
}

export class ConflictError extends HttpError {
    constructor(message = "Resource already exists.") {
        super(message, 409);
    }
}

export class ValidationError extends HttpError {
    constructor(message = "Invalid request.") {
        super(message, 400);
    }
}

export class ForbiddenError extends HttpError {
    constructor(message = "Forbidden.") {
        super(message, 403);
    }
}
