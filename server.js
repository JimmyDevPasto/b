import express from 'express';
import http from 'http';
import { Server as SocketIOServer } from 'socket.io';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';
import { User } from './user.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;
const MONGO_URI = process.env.MONGO_URI;
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';

// MongoDB Connection
mongoose
  .connect(MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log('Connected to MongoDB'))
  .catch((err) => console.error('MongoDB connection error:', err));

const server = http.createServer(app);

const io = new SocketIOServer(server, {
  cors: {
    origin: FRONTEND_URL,
    methods: ['GET', 'POST'],
  },
});

app.use(cors({ origin: FRONTEND_URL }));

// In-memory users list
const users = new Map();

io.on('connection', (socket) => {
  console.log('New client connected:', socket.id);

  socket.on('userLocation', async (data) => {
    const { location, id } = data;

    if (!location || !Array.isArray(location) || location.length !== 2) {
      console.error('Invalid location data:', data);
      return;
    }

    try {
      // Save to MongoDB
      const newUser = new User({ location });
      await newUser.save();

      // Store in memory with socket ID and user-provided ID
      users.set(socket.id, { 
        id: id || socket.id, 
        location, 
        socketId: socket.id 
      });

      // Broadcast updated users list
      io.emit('updateLocations', Array.from(users.values()));
    } catch (error) {
      console.error('Error saving location:', error);
    }
  });

  socket.on('disconnect', async () => {
    console.log('User disconnected:', socket.id);

    // Remove user from memory and database
    if (users.has(socket.id)) {
      users.delete(socket.id);
      
      try {
        await User.deleteOne({ _id: socket.id });
      } catch (error) {
        console.error('Error removing user from database:', error);
      }

      // Broadcast updated users list
      io.emit('updateLocations', Array.from(users.values()));
    }
  });
});

server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});