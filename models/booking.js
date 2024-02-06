const mongoose = require('mongoose')

const bookingSchema = new mongoose.Schema({
    userInformation: Object,
    creditCardData: Object,
    email: String,
    billingCard: Object,
    flightData: Object,
    randomNumber: String,
  });
  
  module.exports = mongoose.model('Booking', bookingSchema);

