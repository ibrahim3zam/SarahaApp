import chalk from 'chalk';
import connectDB from '../DB/connection.js';
import { template } from '../utils/sendEmail/generateHtml.js';
import { sendEmail } from '../utils/sendEmail/sendEmail.js';
import authRouter from './authModule/auth.controller.js';
import messageRouter from './messageModule/message.controller.js';
import userRouter from './userModule/user.controller.js';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import cors from 'cors';
import ExpressMongoSanitize from 'express-mongo-sanitize';
import { mongo } from 'mongoose';

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
app.use(ExpressMongoSanitize());
  app.use(helmet());
  app.use(
    rateLimit({
      windowMs: 15 * 60 * 1000, // 15 دقيقة
      max: 100, // الحد الأقصى لعدد الطلبات من نفس IP خلال فترة الـ windowMs
      message:
        'Too many requests from this IP, please try again after 15 minutes',
    })
  );

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

  app.listen(port, () => {
    console.log(chalk.bgGreen(`Srever is Running....on Port${port}`));
  });
};

export default startApp;
