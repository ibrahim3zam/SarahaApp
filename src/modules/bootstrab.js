import chalk from "chalk";
import connectDB from "../DB/connection.js";
import { template } from "../utils/sendEmail/generateHtml.js";
import { sendEmail } from "../utils/sendEmail/sendEmail.js";
import authRouter from "./authModule/auth.controller.js";
import messageRouter from "./messageModule/message.controller.js";
import userRouter from "./userModule/user.controller.js";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import cors from "cors";
 
const startApp = (app,express) => {

 const port = process.env.PORT ;

app.use(express.json());
app.use(cors(
    {origin: "*",
    methods: ["GET","POST","PUT","DELETE"],
    allowedHeaders: ["Content-Type","Authorization"]
}
))
app.use(helmet())
app.use(rateLimit(
    {windowMs: 15 * 60 * 1000, // 15 دقيقة
max: 100, // الحد الأقصى لعدد الطلبات من نفس IP خلال فترة الـ windowMs
message: "Too many requests from this IP, please try again after 15 minutes" 
}
))

connectDB();

app.use('/uploads', express.static("./uploads"));
app.use('/auth',authRouter)
app.use('/message',messageRouter)
app.use('/users',userRouter)

app.use((err,req,res,next) =>{
 res.status(err.cause ||500).json({errMsg:err.message,
    status:err.cause ||500,
    stack:err.stack
 })    
})

    app.listen(port, () => {

  console.log(chalk.bgGreen(`Srever is Running....on Port${port}`));
  
    });
}






export default startApp;