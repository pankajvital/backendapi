const mongoose = require('mongoose');

const AmadeusSchema = new mongoose.Schema({
    amadeusData: Object
  });
  
  const AmadeusModel = mongoose.model('Offers', AmadeusSchema);
  
  module.exports = AmadeusModel;