import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  location: { 
    type: [Number], 
    index: '2dsphere', // Geospatial indexing
    required: true 
  },
  createdAt: { 
    type: Date, 
    default: Date.now, 
    expires: '1h' // Automatically remove documents after 1 hour
  }
});

export const User = mongoose.model('User', userSchema);