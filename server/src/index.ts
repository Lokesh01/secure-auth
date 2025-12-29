import "dotenv/config";
import express, { Request, Response, urlencoded } from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import { config } from "./config/app.config";

const app = express();
const BASE_PATH = config.BASE_PATH;

//middlewares
app.use(express.json());
app.use(urlencoded({ extended: true }));
app.use(cors({ origin: config.APP_ORIGIN, credentials: true }));
app.use(cookieParser());

app.get("/", (req: Request, res: Response) => {
  res.status(200).json({ message: "Secure Auth API is running..." });
});

app.listen(config.PORT, () => {
  console.log(
    `Server running in ${config.NODE_ENV} mode on port ${config.PORT}`
  );
});
