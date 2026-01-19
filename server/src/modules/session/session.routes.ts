import express from 'express';
import { sessionController } from './session.module';

const sessionRoutes = express.Router();

sessionRoutes.get('/all', sessionController.getAllSession);
sessionRoutes.get('/', sessionController.getSession);
sessionRoutes.delete('/:id', sessionController.deleteSessionById);

export default sessionRoutes;
