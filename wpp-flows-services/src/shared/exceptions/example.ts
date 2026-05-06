export class ExampleNotFoundError extends Error {
    constructor(public status = 404) {
        super('Example not found.')
    }
}