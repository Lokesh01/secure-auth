import 'dotenv/config';
import express, { NextFunction, Request, Response, urlencoded } from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { config } from '#config/app.config';
import connectDB from './database/database';
import { errorHandler } from '#middlewares/errorHandler';
import { asyncHandler } from '#middlewares/asyncHandler';
import { HTTP_STATUS } from '#config/http.config';

//routes imports
import authRoutes from './modules/auth/auth.routes';

const app = express();
const BASE_PATH = config.BASE_PATH;

//middlewares
app.use(express.json());
app.use(urlencoded({ extended: true }));
app.use(cors({ origin: config.APP_ORIGIN, credentials: true }));
app.use(cookieParser());

app.get(
  '/',
  asyncHandler(async (req: Request, res: Response, _next: NextFunction) => {
    res.status(HTTP_STATUS.OK).json({ message: 'API is running...' });
  })
);

//health check
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

//routes
app.use(`${BASE_PATH}/auth`, authRoutes);

app.use(errorHandler);

app.listen(config.PORT, async () => {
  console.log(
    `Server running in ${config.NODE_ENV} mode on port ${config.PORT}`
  );
  await connectDB();
});
