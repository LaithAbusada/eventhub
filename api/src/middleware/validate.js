import {z} from 'zod';
import { buildReturnShape, HttpError } from '../errors.js';

export const validateBody = (schema) => (req,res,next) => {
 
        const result = schema.safeParse(req.body ?? {})

        if (!result.success) {
            return next(new HttpError(422,"VALIDATION_FAILED","Some fields are invalid",result.error.issues.map((issue)=> {
                return {field: issue.path.join('.'), message: issue.message}
            })))
        } else {
            req.body = result.data;
            next();
        }

    
}

export const validateQuery = (schema) => (req,res,next) => {
    const cleanedPairs = Object.entries(req.query).filter(([key,value])=>value!=='');
    const cleanedQuery = Object.fromEntries(cleanedPairs);

    const result = schema.safeParse(cleanedQuery);

    if (!result.success) {
       return next(new HttpError(400,"BAD_QUERY","Some query parameters are invalid", result.error.issues.map((issue)=> {
                return {field: issue.path.join('.'), message: issue.message}
            })))
    } else {
         req.validQuery = result.data;
         next();
    }
}