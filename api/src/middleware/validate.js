import {z} from 'zod';
import { HttpError } from '../errors.js';

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