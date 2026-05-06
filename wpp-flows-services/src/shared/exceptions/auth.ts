export class AuthRequiredError extends Error {
    constructor(public status = 401) {
        super('Authentication is required.')
    }
}

export class InvalidAuthError extends Error {
    constructor(public status = 401) {
        super('Invalid authentication.')
    }
}