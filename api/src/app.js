import express from 'express';

import {errorHandler, notFound} from './errors.js';
import { authRoutes } from './routes/auth.js';

export const app = express();
app.use(express.json());
app.get('/api/health',(req,res) => res.json({"ok" : true}));
app.use('/api/auth',authRoutes);
app.use(notFound)
app.use(errorHandler);


