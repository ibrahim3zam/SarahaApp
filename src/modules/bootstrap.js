import chalk from 'chalk';
import connectDB from '../DB/connection.js';
import { template } from '../utils/sendEmail/generateHtml.js';
import { sendEmail } from '../utils/sendEmail/sendEmail.js';
import authRouter from './authModule/auth.controller.js';
import messageRouter from './messageModule/message.controller.js';
import userRouter from './userModule/user.controller.js';
import helmet from 'helmet';
import cors from 'cors';
import { mongo } from 'mongoose';
  import pino from 'pino';
import rateLimit from 'express-rate-limit';

  const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  
});


const startApp = async(app, express) => {
  const port = process.env.PORT;

  app.use(express.json());
  
 //cors will be added in the future when we need to deploy the frontend and backend separately, for now we will keep it simple and allow all origins
  
 //   app.use(
    // cors({
    //   origin: '*',
    //   methods: ['GET', 'POST', 'PUT', 'DELETE'],
    //   allowedHeaders: ['Content-Type', 'Authorization'],
    // })
//   );
  app.use(helmet());
app.use("/", globalLimiter);

     await connectDB();

  app.use('/uploads', express.static('./uploads'));
  app.use('/auth', authRouter);
  app.use('/message', messageRouter);
  app.use('/users', userRouter);

  // app.use((err,req,res,next) =>{
  //  res.status(err.cause ||500).json({errMsg:err.message,
  //     status:err.cause ||500,
  //     stack:err.stack
  //  })
  // })
  app.use((err, req, res, next) => {
    const statusCode = err.statusCode || 500;
    const isDev = process.env.NODE_ENV === 'development';
    res.status(statusCode).json({
      message: err.message || 'Internal Server Error',
      ...(isDev
        ? {
            stack: err.stack,
          }
        : {}),
    });
  });
  const logger = pino({
    level: "info"
  });

  app.listen(port, () => {
    console.log(chalk.bgGreen(`Srever is Running....on Port${port}`));
    // logger.info(`Server is running on port ${port}`);
    
  });
};

export default startApp;
