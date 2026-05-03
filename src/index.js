import dotenv from 'dotenv';
import express from 'express';
import connectDB from './db/index.js';
import cors from 'cors';
import healthCheckRoutes from './routes/healthcheck.routes.js';
import authRoutes from './routes/auth.routes.js';
import cookieParser from 'cookie-parser';

dotenv.config();


const app = express();

//middlewares 
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors({
  origin:process.env.CORS_ORIGIN?.split(",") || 'http://localhost:5173',
  credentials:true,
  methods:['GET','POST','PUT','DELETE','PATCH','OPTIONS'],
  allowHeaders:['Content-Type','Authorization']
}))
app.use(cookieParser());

//routes
app.use("/api/v1",healthCheckRoutes)
app.use("/api/v1/auth",authRoutes)


const PORT = process.env.PORT || 3000;

connectDB().then(()=>{
  console.log('Database connected successfully');
}).catch((error)=>{
  console.error('Database connection failed', error);
  process.exit(1);
}
)
app.listen(PORT,()=>{
    console.log(`Server is running on port ${PORT}`);
})