import dotenv from 'dotenv';
import express from 'express';
import connectDB from './db/index.js';

dotenv.config();


const app = express();

app.get('/health', (req, res) => {
  res.send('Hello, World!');
});

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