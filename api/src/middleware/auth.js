import jwt from 'jsonwebtoken';
import { config } from '../config.js';
import { buildReturnShape } from '../errors.js';

export const signToken = (user) => {

    const token = jwt.sign({sub: user.id, role: user.role},config.jwtSecret,{expiresIn : config.jwtExpiresIn});


    return token;

}

export const auth =  (req,res,next) => {

    const authorization  =  req.headers.authorization || '';
    const bearer = authorization.startsWith('Bearer ') ? authorization.slice("Bearer ".length) : null;
    if (!authorization || !bearer) {
        res.status(401).json(buildReturnShape("UNAUTHORIZED","Log in first"))
        return;
    }

    try {


        const userVerify = jwt.verify(
            bearer,
            config.jwtSecret,
            { algorithms: ['HS256'] }
        )

        req.user = userVerify;

        next();
    } catch {
        res.status(401).json(buildReturnShape("UNAUTHORIZED","Please log in again"))
        return;
    }

}



export const requireRole = (role) => (req,res,next) => {
    if (req?.user?.role != role) {
        res.status(403).json(buildReturnShape("FORBIDDEN","Only organizers can do this"))
    } else {
        next();
    }
}