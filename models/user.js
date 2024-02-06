

const mongoose = require('mongoose');
// mongoose.connect('mongodb://127.0.0.1:27017/revision');

module.exports = mongoose.model('users',
 {name:String, email: String, password: String, otp: Number,role: {
    type: String,
    enum: ['superadmin', 'supervisor', 'agent'],
    default: 'agent' // Set a default role if not specified
  } });