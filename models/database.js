require('dotenv').config();
const mongoose = require('mongoose');
// Define the database connection URI
// const dbURI = 'mongodb://127.0.0.1:27017/revision';//// when you live then only comments this const
// const dbURI = 'mongodb+srv://pankajvital:containervitalatlas@cluster0.lcqmkxi.mongodb.net/flight';

// Establish the database connection
mongoose.connect(process.env.DBURL, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

// // // on live connection
// mongoose.connect(dbURI, {
//   useNewUrlParser: true,
//   useUnifiedTopology: true,
// });

// Get the Mongoose connection object
const db = mongoose.connection;

// Listen for connection events
db.on('error', console.error.bind(console, 'MongoDB connection error:'));
db.once('open', () => {
  console.log('Connected to MongoDB');
});

// Export the Mongoose connection
module.exports = db;


