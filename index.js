import express from 'express';
import startApp from './src/modules/bootstrap.js';
import dotenv from 'dotenv';

dotenv.config();
const app = express();
startApp(app, express);
