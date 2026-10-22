import express from 'express';

import {errorHandler, notFound} from './errors.js';

export const app = express();
app.use(express.json());
app.get('/api/health',(req,res) => res.json({"ok" : true}));
app.use(notFound)
app.use(errorHandler);


