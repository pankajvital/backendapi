const Booking = require('../models/booking');

// Handle the POST request to save booking data
const saveBookingData = async (req, res) => {
  try {
    const bookingData = new Booking(req.body);
    await bookingData.save();
    res.status(201).json({ message: 'Booking data saved successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Error saving booking data' });
  }
};

module.exports = {
  saveBookingData,
};
