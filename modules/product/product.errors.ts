export class AppError extends Error {
    constructor(
        public readonly statusCode: number,
        message: string,
        public readonly data: unknown = null
    ) {
        super(message);
        this.name = new.target.name;
    }
}

export class BadRequestError extends AppError {
    constructor(message: string) {
        super(400, message);
    }
}

export class NotFoundError extends AppError {
    constructor(message: string) {
        super(404, message);
    }
}

export class ConflictError extends AppError {
    constructor(message: string) {
        super(409, message);
    }
}
