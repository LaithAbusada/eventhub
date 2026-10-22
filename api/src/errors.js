import mongoose from 'mongoose';
const {CastError,ValidationError} = mongoose.Error;

export class HttpError extends Error {
    constructor(status,code,message,details) {
        super(message)
        this.status = status;
        this.code = code;
        this.details = details;
    }
}

export function notFound(req,res,next) { 
    const error = new HttpError(404,"NOT_FOUND",`no route for ${req.method} ${req.path}`)
    next(error);
}

export function buildReturnShape(code,message,details) {
    return {"error" : {
        "code" : code,
        "message" : message,
        "details" : details
    }}
}
export function errorHandler(err,req,res,next) {

    if (err.code === 11000) {
        res.status(409).json(buildReturnShape("DUPLICATE","There is a MongoDB Duplicate KEY",err.details));
        return;
    }
    if (err instanceof CastError) {
        res.status(404).json(buildReturnShape("NOT_FOUND","ID isnt a valid object"))
                return;

    }
    if (err instanceof ValidationError) {
        res.status(422).json(buildReturnShape("VALIDATION_FAILED","Validation Failed"))
                return;

    }
    if (err.type === "entity.parse.failed") {
        res.status(400).json(buildReturnShape("BAD_JSON","Bad JSON Detected",err.details))
                return;

    }
    if (err instanceof HttpError) {
        return res.status(err.status).json(buildReturnShape(err.code,err.message,err.details))
    }

    console.error(err);
    res.status(500).json(buildReturnShape("INTERNAL","Something went Wrong"));
}

