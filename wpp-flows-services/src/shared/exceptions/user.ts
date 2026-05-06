export class UserRegistrationError extends Error {
    constructor(public status = 404) {
        super('User registration failed.')
    }
}

export class HasUserAlreadyRegisteredError extends Error {
    constructor(public status = 404) {
        super('User is already registered for this webinar.')
    }
}