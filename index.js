const express = require('express');
// require('dotenv').config();
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const {authenticateUser}=require("./controller/authentication.js")
const app = express();
app.use(bodyParser.json());
const fileUpload = require("express-fileupload");
const path = require("path");
const nodemailer = require("nodemailer");

const smtpTransport = require('nodemailer-smtp-transport');
const Amadeus = require('amadeus');
const { Airports, db } = require("./models/database");
const amadeus = new Amadeus({
  // clientId: 'KMDXAlIimglzUoohJfRzpGnVY2cNrn10',
  // clientSecret: 'ByRJXCOZDtIrOP6r'
  clientId : 'BpVyvFodRgC57CNu0O6t3FrDG7jiCnjG',
  clientSecret : '2D5c35A1AgbzI9Yx'
});
const AmadeusController = require('./models/amadeus.js');
app.use(express.json());


// const bodyParser = require('body-parser');
const UserController = require('./controller/user.js');
// const bookingRoutes = require('./controller/booking');
// const port = process.env.PORT || 5001;
const cors = require('cors');
app.use(cors());

// const corsOptions = {
//   origin: 'https://fligtway.com',
//   methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
//   optionsSuccessStatus: 204,
// };

// app.use(cors(corsOptions));

app.post('/signup', UserController.signup);
app.post('/login', UserController.login);
app.post('/send-otp', UserController.sendotp);
app.post('/submit-otp', UserController.submitotp);    

app.get('/users', UserController.getAllUsers);
app.put('/users/:id', UserController.updateUserById); // Route to update a user by ID

app.get('/agents',UserController.agents)
app.get('/agents/:id', UserController.getUserById);
app.put('/agents/:id', UserController.updateAgentById); // Route to update a user by ID
app.delete('/agents/:id', UserController.deleteAgentById);





app.get('/getFlightOffers', async (req, res) => {
  try {
    const response = await amadeus.shopping.flightOffersSearch.get({
      originLocationCode: 'MIA',
      destinationLocationCode: 'SFO',
      departureDate: '2024-03-21',
      adults: '2'
    });

    const amadeusData = response.data;

    // Find the existing document and replace it with the new data
    await AmadeusController.findOneAndReplace({}, { amadeusData: amadeusData });

    res.json(amadeusData);
  } catch (error) {
    console.error("Amadeus API Error:", error);
    res.status(error.response?.status || 500).json({ error: error.message });
  }
});










// booking code below api

// Create a schema for your booking data
const bookingSchema = new mongoose.Schema(
  {
    userInformation: Object,
    creditCardData: Object,
    emaiAndId: Object,  
    billingCard: Object,
    flightData: Object,
    fareDetails: Object,
    deviceInfo: Object,
    randomNumber: String,
    acceptAgent: String,
    bookingColor: String,
    bookingCurrentDate: String,
    comments: 
      [{
        content: String,
        timestamp: Date,
      }],
    
  },
  { collection: "bookings" }
); // Specify the collection name here

// comments: [
//   {
//     content: String,
//     timestamp: Date,
//   },
// ],

const Booking = mongoose.model("Booking", bookingSchema);

app.use(bodyParser.json());

app.post("/booking", (req, res) => {
  // Extract data from the request body
  const submitBookingData = req.body;
  console.log("Received data:", submitBookingData);
  console.log("flightData:", submitBookingData.flightData);

  // Generate a random 5-digit number
  // const random_number = Math.floor(Math.random() * 9000) + 1000;

  // Combine data to create the 'randomNumber' field
  const phoneNumber =
    (submitBookingData.userInformation && submitBookingData.emaiAndId.phone) ||
    "";
  // const last_two_digits = phoneNumber.slice(-2);

  const postalCode =
    (submitBookingData.billingCard &&
      submitBookingData.billingCard.postalCode) ||
    "";
  // const last_postal_two_digit = postalCode.slice(-2);

  // const result = `FLW${last_two_digits}${last_postal_two_digit}${random_number}`;

  // // Add the 'result' to the 'submitBookingData' object
  // submitBookingData.randomNumber = result;

  // Save the data to MongoDB
  const newBooking = new Booking(submitBookingData);

  newBooking
    .save()
    .then((savedBooking) => {
      res.json({ success: "Data saved to MongoDB", data: savedBooking });
      
    })
    .catch((err) => {
      console.error(err);
      res.status(500).json({ error: "Failed to save data to MongoDB" });
    });
});

app.get("/bookings", (req, res) => {
  Booking.find({})
    .sort({ _id: -1 })
    .then((data) => {
      res.json(data);
    })
    .catch((err) => {
      console.error(err);
      res.status(500).json({ error: "Failed to fetch data from MongoDB" });
    });
});




app.post("/saveComment/:bookingID", (req, res) => {
  const { comments } = req.body;
  const { bookingID } = req.params;


  Booking.findById(bookingID)
    .then((booking) => {
      if (booking) {
        // Add the new comment to the "comments" array
        const newComment = {
          content: comments,
          timestamp: new Date(),
        };

        booking.comments.push(newComment);

        booking
          .save()
          .then((updatedBooking) => {
            res.json({
              success: "Comment added successfully",
              data: updatedBooking,
            });
          })
          .catch((err) => {
            console.error(err);
            res.status(500).json({ error: "Failed to add comment" });
          });
      } else {
        res
          .status(404)
          .json({ error: "Booking not found with the specified ID" });
      }
    })
    .catch((err) => {
      console.error(err);
      res.status(500).json({ error: "Failed to retrieve booking" });
    });
});


app.get("/fetchComments/:bookingID", (req, res) => {
  const { bookingID } = req.params;

  Booking.findById(bookingID)
    .then((booking) => {
      if (booking) {
        res.json({
          success: "Comments retrieved successfully",
          data: booking.comments,
        });
      } else {
        res.status(404).json({ error: "Booking not found with the specified ID" });
      }
    })
    .catch((err) => {
      console.error(err);
      res.status(500).json({ error: "Failed to retrieve comments" });
    });
});


app.post("/saveAccept/:bookingID", (req, res) => {
  const { acceptAgent, bookingColor } = req.body;
  const { bookingID } = req.params;

  const timestamp = new Date(); // Create a timestamp

  Booking.findByIdAndUpdate(
    bookingID,
    { acceptAgent, bookingColor, timestamp },
    { new: true }
  )
    .then((updatedBooking) => {
      res.json({
        success: "Accept Agent and Timestamp updated successfully",
        data: updatedBooking,
      });
    })
    .catch((err) => {
      console.error(err);
      res
        .status(500)
        .json({ error: "Failed to update Accept Agent and Timestamp" });
    });
});


app.delete('/bookingsdelete/:ID', async (req, res) => {
  const idToDelete = req.params.ID; // Assuming the ID is a string, not an integer

  try {
    // Find and delete the booking with the specified _id
    const deletedBooking = await Booking.findOneAndDelete({ _id: new mongoose.Types.ObjectId(idToDelete) });

    if (deletedBooking) {
      // Send a success response
      res.status(200).send('Booking deleted successfully');
    } else {
      // Send a not found response if the booking is not found
      res.status  (404).send('Booking not found');
    }
  } catch (error) {
    // Handle errors, and send a server error response
    console.error('Error deleting booking:', error);
    res.status(500).send('Internal Server Error');
  }
});





app.post("/saveCancel/:bookingID", (req, res) => {
  const { bookingColor } = req.body;
  const { bookingID } = req.params;

  // Assume you have a mechanism to find and update the specific record based on index
  Booking.findOneAndUpdate(
    { _id: bookingID }, // Change this condition to match your data structure
    { bookingColor: bookingColor }, // Update only the bookingColor field
    { new: true }
  )
    .then((updatedRecord) => {
      res.json({ success: "Color updated successfully", data: updatedRecord });
    })
    .catch((err) => {
      console.error(err);
      res.status(500).json({ error: "Failed to update color" });
    });
});

app.post("/saveIssue/:bookingID", (req, res) => {
  const { bookingColor } = req.body;
  const { bookingID } = req.params;

  // Assume you have a mechanism to find and update the specific record based on index
  Booking.findOneAndUpdate(
    { _id: bookingID }, // Change this condition to match your data structure
    { bookingColor: bookingColor }, // Update only the bookingColor field
    { new: true }
  )
    .then((updatedRecord) => {
      res.json({ success: "Color updated successfully", data: updatedRecord });
    })
    .catch((err) => {
      console.error(err);
      res.status(500).json({ error: "Failed to update color" });
    });
});


app.use(fileUpload());

app.post("/upload", (req, res) => {
  console.log("File upload request received");

  const { files } = req;

  if (!files || Object.keys(files).length === 0) {
    return res.status(400).send("No files were uploaded.");
  }

  const uploadedFile = files.file;

  if (!uploadedFile) {
    return res.status(400).send("No file content found.");
  }

  // Use the original filename
  const originalFilename = uploadedFile.name;
  const destinationPath = path.join(__dirname, "./upload", "upload.csv");

  // Move the uploaded file to the specified destination
  uploadedFile.mv(destinationPath, (error) => {
    if (error) {
      return res.status(500).send(error);
    }

    res.send("File uploaded!");
  });
});

const csvtojson = require("csvtojson");

app.get("/excelData", (req, res) => {
  console.log("Request received for Excel data");

  const csvFilePath = "./upload/upload.csv";

  csvtojson()
    .fromFile(csvFilePath)
    .then((jsonArray) => {
      res.json(jsonArray);
      console.log(jsonArray);
    })
    .catch((error) => {
      console.error("Error converting CSV to JSON:", error);
      res.status(500).json({ error: "Internal Server Error" });
    });
});


function formatDate(date) {
  // Example formatting, modify this according to your date format
  const formattedDate = new Date(date).toLocaleString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  return formattedDate;
}
function formatDate(dateTimeString) {
  const options = { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' };
  const date = new Date(dateTimeString);
  return date.toLocaleString('en-US', options);
}




// let submitFormData = '';

// comman variable for content
const phoneNumberweb = '+1-888-273-3133';
const email = 'support@fligtway.com';
const companyName = 'Fligtway';
const companyAddress = 'Zustravel LLC, 30 N. Gould St Ste 4000, Sheridan, WY 82801';

app.post("/submit-form", (req, res) => {
  // Extract form data from the request
  const submitBookingData = req.body;
  console.log("email check data formdata", submitBookingData);

  // Generate flightDataHTML
  let flightDataHTML = "<tbody>";

  submitBookingData.flightData.data[0].itineraries.forEach(
    (itinerary, itineraryIndex) => {
      itinerary.segments.forEach((segment, segmentIndex) => {
        const carrierCode = segment.carrierCode; // Access carrierCode directly from the segment

        const fullCarrierName = submitBookingData.flightData.dictionaries.carriers[carrierCode] || ''; 
        flightDataHTML += `
        <tr key="${segmentIndex}" style="text-align:left; background-color: ${
          segmentIndex % 2 === 0 ? "#fff" : "#fff"
        };">
        <td style="padding: 8px; font-size: 14px; border: 1px solid #000; color: #000;">
        <img src="https://cmsrepository.com/static/flights/flight/airlinelogo-png/${itinerary.segments[0].carrierCode.toLowerCase()}.png" style="width:25px" /> <br/> <span style="font-size:11px;">${fullCarrierName}</span></td>
          <td style="padding: 8px; font-size: 14px; border: 1px solid #000; color: #000;">
            <b>${segment.departure.iataCode}</b><br />
            ${formatDate(segment.departure.at)}<br />
          </td>
          <td style="padding: 8px; font-size: 14px; border: 1px solid #000; color: #000;">
            <b>${segment.arrival.iataCode}</b><br />
            ${formatDate(segment.arrival.at)}
          </td>
          <td style="padding: 8px; font-size: 14px; border: 1px solid #000; color: #000;">
            ${segment.carrierCode}&nbsp;${segment.number}<br />
          </td>
          <td style="padding: 8px; font-size: 14px; border: 1px solid #000; color: #000;">
            ${
              submitBookingData.flightData.data[0].travelerPricings[0]
                .fareDetailsBySegment[0].cabin || ""
            }
          </td>
          <td style="padding: 8px; font-size: 14px; border: 1px solid #000; color: #000;">
          ${itinerary.duration
            ? itinerary.duration
                .slice(2) // Remove "pt" prefix
                .match(/(\d{1,2})([A-Z])/g) // Match groups of one or two digits followed by a capital letter
                .map(group => group.replace(/(\d+)([A-Z])/, "$1$2")) // Add a space between hours and minutes
                .join(" ") // Join the groups with a space
            : ""}
        </td>

        </tr>`;
      });
    }
  );

  flightDataHTML += "</tbody>";

  const userInformation = submitBookingData.userInformation; // Assuming userInformation is a nested object within submitBookingData
  const keys = Object.keys(userInformation);
  const generateUserInformationHTML = (userInformation, keys) => {
    return `
      <div className="bg-secondary rounded h-100 p-4">
        <div className="table-responsive">
        <div style="overflow-x: auto;">
        <table width="100%" style="border-collapse: collapse; border: 1px solid #000; color: #000;">
          <thead>
            <tr style="background-color: #cccccc8a; text-align:left;">
              <th style="padding: 8px; font-size: 14px; border: 1px solid #000; color: #000;">Serial No.</th>
              <th style="padding: 8px; font-size: 14px; border: 1px solid #000; color: #000;">Traveller Type</th>
              <th style="padding: 8px; font-size: 14px; border: 1px solid #000; color: #000;">First Name</th>
              <th style="padding: 8px; font-size: 14px; border: 1px solid #000; color: #000;">Middle Name</th>
              <th style="padding: 8px; font-size: 14px; border: 1px solid #000; color: #000;">Last Name</th>
              <th style="padding: 8px; font-size: 14px; border: 1px solid #000; color: #000;">Gender</th>
              <th style="padding: 8px; font-size: 14px; border: 1px solid #000; color: #000;">Date</th>
            </tr>
          </thead>
          <tbody>
            ${keys
              .map(
                (key, index) =>
                  `<tr key=${key} style="text-align:left; background-color: ${
                    index % 2 === 0 ? "#fff" : "#fff"
                  };">
                <td style="padding: 8px; font-size: 14px; border: 1px solid #000; color: #000;">${
                  index + 1
                }</td>
                <td style="padding: 8px; font-size: 14px; border: 1px solid #000; color: #000;">${
                  key.startsWith("ADULT")
                    ? "ADT"
                    : key.startsWith("CHILD")
                    ? "CNN"
                    : key.startsWith("HELD_")
                    ? "INF"
                    : ""
                }</td>
                <td style="padding: 8px; font-size: 14px; border: 1px solid #000; color: #000;">${
                  userInformation[key].firstName
                    ? userInformation[key].firstName.charAt(0).toUpperCase() +
                      userInformation[key].firstName.slice(1)
                    : ""
                }</td>
                <td style="padding: 8px; font-size: 14px; border: 1px solid #000; color: #000;">${
                  userInformation[key].middleName
                    ? userInformation[key].middleName.charAt(0).toUpperCase() +
                      userInformation[key].middleName.slice(1)
                    : ""
                }</td>
                <td style="padding: 8px; font-size: 14px; border: 1px solid #000; color: #000;">${
                  userInformation[key].lastName
                    ? userInformation[key].lastName.charAt(0).toUpperCase() +
                      userInformation[key].lastName.slice(1)
                    : ""
                }</td>
                <td style="padding: 8px; font-size: 14px; border: 1px solid #000; color: #000;">${
                  userInformation[key].gender
                    ? userInformation[key].gender.charAt(0).toUpperCase() +
                      userInformation[key].gender.slice(1)
                    : ""
                }</td>
                <td style="padding: 8px; font-size: 14px; border: 1px solid #000; color: #000;">${
                  userInformation[key].date
                }</td>
              </tr>`
              )
              .join("")}
          </tbody>
        </table>
      </div>
      
        </div>
      </div>`;
  };

  // This generated HTML can be used in your mailOptions
  const userInformationHTML = generateUserInformationHTML(
    userInformation,
    keys
  );

  // //Configure Nodemailer transporter (provide your Gmail credentials)
  const transporter = nodemailer.createTransport(
    smtpTransport({
      host: 'smtp.gmail.com',
      port: 587,
      secure: false,
      auth: {
        user: process.env.SMTP_BOOK_USERNAME,  // Replace with your SMTP username
        pass: process.env.SMTP_BOOK_PASSWORD   // Replace with your SMTP password
      }
    })
  );


  // Compose email
  const mailOptions = {
    from: "reservations@fligtway.com",
    to: submitBookingData.emaiAndId.email, // Replace with the recipient's email address
    subject: `BOOKING REFERENCE # ${submitBookingData.randomNumber}`,
    bcc: 'reservations@fligtway.com',
    html: `
    <div style="background: #fff; font-size: 14px; border: 1px solid #000; padding:0 15px;">
		<div class="tem-section">
			<div style="background-color: #fff; padding: 10px; text-align:left;">
				<table width="100%" cellpadding="0" cellspacing="0">
					<tr>
						<td style="text-align: left; width: 50%;">
							<img src="https://i.ibb.co/gDxZkKM/logo.png" alt="" style="width: 130px;">
						</td>
						<td style="text-align: right; width: 50%; font-size: 16px;">
							<b>Booking Reference # ${submitBookingData.randomNumber}</b>
						</td>
					</tr>
				</table>
			</div>

			<div class="need" style="background: #EE4E34;text-align: right;">
				<p style="color: #fff;font-size: 16px; padding: 2px  0.5rem; text-shadow: 1px 1px grey;  box-shadow: rgba(0, 0, 0, 0.19) 0px 10px 20px, rgba(0, 0, 0, 0.23) 0px 6px 6px;">
					Need help, Our 24x7 Toll Free Support: <a style="text-decoration: none;" ><b style="color:#fff;">${phoneNumberweb}</b></a> 
				</p>
			</div>
			<div class="book-para">
				<p>
					Your Booking is  <b>in progress</b> with booking reference # <b>${submitBookingData.randomNumber}</b>
				</p>
				<p>
					If any query please contact our customer support at <a ><b style="color:#000;">${phoneNumberweb}</b></a> or send us an email at <a ><b style="color:#000;">${email}</b></a> and one of our travel expert will be pleased to assist you.In Such unlikely event, if your tickets cannot be processed for any reason you will be notified via email or by telephone and your payment will NOT be processed.
				</p>
			</div>
			<div style="padding: 0rem 0.5rem; background: #EE4E34;">
			<div class="need" style=";background: #EE4E34;text-align: left;">
					<p style="color: #fff;font-size: 18px; padding: 2px  0.5rem; text-shadow: 1px 1px grey;  box-shadow: rgba(0, 0, 0, 0.19) 0px 10px 20px, rgba(0, 0, 0, 0.23) 0px 6px 6px;">
          Travellers Details
					</p>
				</div>
			</div>
			${userInformationHTML}
		</div>
		<div class="col-12">
			<div class="bg-secondary rounded h-100">
				<div class="need" style=";background: #EE4E34;text-align: left;">
					<p style="color: #fff;font-size: 18px; padding: 2px  0.5rem; text-shadow: 1px 1px grey;  box-shadow: rgba(0, 0, 0, 0.19) 0px 10px 20px, rgba(0, 0, 0, 0.23) 0px 6px 6px;">
						Flight Details
					</p>
				</div>
				<div class="table-responsive">
					<div style="overflow-x: auto;">

						<table width="100%" style="border-collapse: collapse; border: 1px solid #000; color: #000;">
							<thead>
								<tr style="background-color: #cccccc8a;text-align:left; " >
									<th style="padding: 8px; font-size: 14px; border: 1px solid #000; color: #000;">Airline</th>
									<th style="padding: 8px; font-size: 14px; border: 1px solid #000; color: #000;">Departure</th>
									<th style="padding: 8px; font-size: 14px; border: 1px solid #000; color: #000;">Arrival</th>
									<th style="padding: 8px; font-size: 14px; border: 1px solid #000; color: #000;">Flight Details</th>
									<th style="padding: 8px; font-size: 14px; border: 1px solid #000; color: #000;">Cabin</th>
									<th style="padding: 8px; font-size: 14px; border: 1px solid #000; color: #000;">Duration</th>
								</tr>
							</thead>
							${flightDataHTML}
						</table>
					</div>
				</div>
			</div>
		</div>
    <div>

    <div class="need" style=";background: #EE4E34;text-align: left;">
      <p style="color: #fff;font-size: 18px; padding: 2px  0.5rem; text-shadow: 1px 1px grey;  box-shadow: rgba(0, 0, 0, 0.19) 0px 10px 20px, rgba(0, 0, 0, 0.23) 0px 6px 6px;">
      Customer Contact
      </p>
    </div>
    <div style="width: 100%; overflow-x: auto;">
    <table style="width: 100%; border-collapse: collapse;">
      <thead style="background-color: #cccccc8a">
        <tr style="text-align:left;">
          <th style="padding: 8px; font-size: 14px; border: 1px solid #000; color: #000;">Email Id	</th>
          <th style="padding: 8px; font-size: 14px; border: 1px solid #000; color: #000;">Contact</th>
        </tr>
      </thead>
      <tbody>
        <tr style="text-align:left;background:#fff;">
          <td style="padding: 8px; font-size: 14px; border: 1px solid #000; color: #000;">
          <a  style="color:#000;" >${submitBookingData.emaiAndId.email}</a>
          </td>
          <td style="padding: 8px; font-size: 14px; border: 1px solid #000; color: #000;">
          <a style="color:#000;" >${submitBookingData.emaiAndId.phone}</a>
          </td>
        </tr>
      </tbody>
    </table>
  </div>

    <div class="need" style=";background: #EE4E34;text-align: left;">
      <p style="color: #fff;font-size: 18px; padding: 2px  0.5rem; text-shadow: 1px 1px grey;  box-shadow: rgba(0, 0, 0, 0.19) 0px 10px 20px, rgba(0, 0, 0, 0.23) 0px 6px 6px;">
      Price Info
      </p>
    </div>
    <div style="width: 100%; overflow-x: auto;">
  <table style="width: 100%; border-collapse: collapse;">
    <thead style="background-color: #cccccc8a">
      
    </thead>
    <tbody style="text-align:left; background:#fff;">
      <tr>
      <th style="padding: 8px; font-size: 14px; border: 1px solid #000; color: #000;">Base Amount</th>
        <td style="padding: 8px; font-size: 14px; border: 1px solid #000; color: #000;text-align:right;font-weight: bold;">
          USD ${submitBookingData.fareDetails.travelerDetails[0].totalAmount}
        </td>
      </tr>
      <tr>
      <th style="padding: 8px; font-size: 14px; border: 1px solid #000; color: #000;">Main Cabin</th>
      <td style="padding: 8px; font-size: 14px; border: 1px solid #000; color: #000;text-align:right;font-weight: bold;">
      ${submitBookingData.fareDetails.cabinAmount ? `USD ${submitBookingData.fareDetails.cabinAmount}` : "No"}
            </td>
      </tr>
      <th style="padding: 8px; font-size: 14px; border: 1px solid #000; color: #000;">Taxes and Fees</th>
      <td style="padding: 8px; font-size: 14px; border: 1px solid #000; color: #000;text-align:right;font-weight: bold;">
      USD ${submitBookingData.fareDetails.travelerDetails[0].taxAmount}
    </td>
      <tr>
      <th style="padding: 8px; font-size: 14px; border: 1px solid #000; color: #000;">Total Amount</th>
      <td style="padding: 8px; font-size: 14px; border: 1px solid #000; color: #000;text-align:right;font-weight: bold;">
      USD ${submitBookingData.fareDetails.totalAmount}
    </td>
      </tr>
    
    </tbody>
  </table>
</div>

<div class="need" style=";background: #EE4E34;text-align: left;">
      <p style="color: #fff;font-size: 18px; padding: 2px  0.5rem; text-shadow: 1px 1px grey;  box-shadow: rgba(0, 0, 0, 0.19) 0px 10px 20px, rgba(0, 0, 0, 0.23) 0px 6px 6px;">
      Terms & Conditions
      </p>
    </div>
    <p>
    Please feel free to contact us to confirm your itinerary, or other special requests (Seats, Meals, Wheelchair, etc.) and luggage weight allowances (a number of airlines have recently made changes to the luggage weight limits) 72 hours prior to the departure date. We look forward to help you again with your future travel plans.
    </p>
    <p>
    1. This is non-refundable unless otherwise stated*
<br>
    2. All fares are not guaranteed until ticketed*
    </ul>
    </p>

    <div class="need" style=";background: #EE4E34;text-align: left;">
      <p style="color: #fff;font-size: 18px; padding: 2px  0.5rem; text-shadow: 1px 1px grey;  box-shadow: rgba(0, 0, 0, 0.19) 0px 10px 20px, rgba(0, 0, 0, 0.23) 0px 6px 6px;">
      Contact Info
      </p>
    </div>
    <div style="width: 100%; overflow-x: auto;">
    <table style="width: 100%; border-collapse: collapse;">
      <thead style="background-color: #cccccc8a">
        <tr style="text-align:left;">
          <th style="padding: 8px; font-size: 14px; border: 1px solid #000; color: #000;">Agency Name</th>
          <th style="padding: 8px; font-size: 14px; border: 1px solid #000; color: #000;">Email Id	</th>
          <th style="padding: 8px; font-size: 14px; border: 1px solid #000; color: #000;">Contact</th>
        </tr>
      </thead>
      <tbody>
        <tr style="text-align:left;background:#fff;">
          <td style="padding: 8px; font-size: 14px; border: 1px solid #000; color: #000;">
            ${companyName}	
          </td>
          <td style="padding: 8px; font-size: 14px; border: 1px solid #000; color: #000;">
          <a  style="color:#000;" >${email}</a>
          </td>
          <td style="padding: 8px; font-size: 14px; border: 1px solid #000; color: #000;">
          <a style="color:#000;" >${phoneNumberweb}</a>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
  <div class="need" style=";background: #EE4E34;text-align: left;">
      <p style="color: #fff;font-size: 18px; padding: 2px  0.5rem; text-shadow: 1px 1px grey;  box-shadow: rgba(0, 0, 0, 0.19) 0px 10px 20px, rgba(0, 0, 0, 0.23) 0px 6px 6px;">
      Policy
      </p>
    </div>
    <p>
    We accept credit cards and debit cards issued in US, Canada and several other countries as listed in the billings section. We also accept AE/AP billing addresses.

    <br> <br>
    1. Please note: your credit/debit card may be billed in multiple charges totaling the final total price. If your credit/debit card or other form of payment is not processed or accepted for any reason, we will notify you within 24 hours (it may take longer than 24 hours for non credit/debit card payment methods). Prior to your form of payment being processed and accepted successfully, if there is a change in the price of air fare or any other change, you may be notified of this change and only upon such notification you have the right to either accept or decline this transaction. If you elect to decline this transaction, you will not be charged.

<br> <br>
2. Our Post Payment Price Guarantee: Upon successful acceptance and processing of your payment (credit/debit card), we guarantee that we will honor the total final quoted price of the airline tickets regardless of any changes or fluctuation in the price of air fare. Please note: all hotel, car rental and tour/activity bookings are only confirmed upon delivery of complete confirmation details to the email you provided with your reservation. In some cases, pre-payment may be required to receive confirmation.

<br> <br>
In order to provide you with further protection, when certain transactions are determined to be high-risk by our systems, we will not process such transactions unless our credit card verification team has determined that it's safe to process them. In order to establish validity of such transactions, we may contact you or your bank.

    </p>
    <div class="need" style=";background: #EE4E34;text-align: left;">
      <p style="color: #fff;font-size: 18px; padding: 2px  0.5rem; text-shadow: 1px 1px grey;  box-shadow: rgba(0, 0, 0, 0.19) 0px 10px 20px, rgba(0, 0, 0, 0.23) 0px 6px 6px;">
      Change/ Cancellation Policy
      </p>
    </div>
    <p>
    All travelers must confirm that their travel documents required are current and valid for their preferred destinations. The ticket(s) are refundable within 4 hours from the time of purchase ONLY for ticketed Airlines, at no extra cost. Once ticket is purchased, name changes are not allowed according to Airlines Policies, but some Specific Airlines allow minor corrections, usually involving 1-2 characters attracting a fees for this service. Prices do not include Baggage and Carry-On or other fees charged directly by the airline. Fares are not guaranteed until ticketed. Fare changes are subject to seat or class availability. All tickets are considered non-transferable & non-endorsable.


    </p>
    
    

    </div>
	</div>
    `,
  };

  // Send email
  transporter.sendMail(mailOptions, (error, info) => {
    if (error) {
      console.log(error);
      res.status(500).send("Error: Unable to send email");
    } else {
      console.log("Email sent: " + info.response);
      res.status(200).send("Email sent successfully");
    }
  })
});




app.post("/cancel-form", (req, res) => {
  // Extract form data from the request
  const submitBookingData = req.body;
  console.log("email check data formdata", submitBookingData);

  // Generate flightDataHTML
  let flightDataHTML = "<tbody>";

  submitBookingData.flightData.data[0].itineraries.forEach(
    (itinerary, itineraryIndex) => {
      itinerary.segments.forEach((segment, segmentIndex) => {
        const carrierCode = segment.carrierCode; // Access carrierCode directly from the segment

        const fullCarrierName = submitBookingData.flightData.dictionaries.carriers[carrierCode] || ''; 
        
        flightDataHTML += `
        <tr key="${segmentIndex}" style="text-align:left; background-color: ${
          segmentIndex % 2 === 0 ? "#fff" : "#fff"
        };">
        <td style="padding: 8px; font-size: 14px; border: 1px solid #000; color: #000;">
        <img src="https://cmsrepository.com/static/flights/flight/airlinelogo-png/${itinerary.segments[0].carrierCode.toLowerCase()}.png" style="width:25px" /> <br/> <span style="font-size:11px;">${fullCarrierName}</span></td>
          <td style="padding: 8px; font-size: 14px; border: 1px solid #000; color: #000;">
            <b>${segment.departure.iataCode}</b><br />
            ${formatDate(segment.departure.at)}<br />
          </td>
          <td style="padding: 8px; font-size: 14px; border: 1px solid #000; color: #000;">
            <b>${segment.arrival.iataCode}</b><br />
            ${formatDate(segment.arrival.at)}
          </td>
          <td style="padding: 8px; font-size: 14px; border: 1px solid #000; color: #000;">
            ${segment.carrierCode}&nbsp;${segment.number}<br />
          </td>
          <td style="padding: 8px; font-size: 14px; border: 1px solid #000; color: #000;">
            ${
              submitBookingData.flightData.data[0].travelerPricings[0]
                .fareDetailsBySegment[0].cabin || ""
            }
          </td>
          <td style="padding: 8px; font-size: 14px; border: 1px solid #000; color: #000;">
          ${itinerary.duration
            ? itinerary.duration
                .slice(2) // Remove "pt" prefix
                .match(/(\d{1,2})([A-Z])/g) // Match groups of one or two digits followed by a capital letter
                .map(group => group.replace(/(\d+)([A-Z])/, "$1$2")) // Add a space between hours and minutes
                .join(" ") // Join the groups with a space
            : ""}
        </td>

        </tr>`;
      });
    }
  );

  flightDataHTML += "</tbody>";

  const userInformation = submitBookingData.userInformation; // Assuming userInformation is a nested object within submitBookingData
  const keys = Object.keys(userInformation);
  const generateUserInformationHTML = (userInformation, keys) => {
    return `
      <div className="bg-secondary rounded h-100 p-4">
        <div className="table-responsive">
        <div style="overflow-x: auto;">
        <table width="100%" style="border-collapse: collapse; border: 1px solid #000; color: #000;">
          <thead>
            <tr style="background-color: #cccccc8a; text-align:left;">
              <th style="padding: 8px; font-size: 14px; border: 1px solid #000; color: #000;">Serial No.</th>
              <th style="padding: 8px; font-size: 14px; border: 1px solid #000; color: #000;">Traveller Type</th>
              <th style="padding: 8px; font-size: 14px; border: 1px solid #000; color: #000;">First Name</th>
              <th style="padding: 8px; font-size: 14px; border: 1px solid #000; color: #000;">Middle Name</th>
              <th style="padding: 8px; font-size: 14px; border: 1px solid #000; color: #000;">Last Name</th>
              <th style="padding: 8px; font-size: 14px; border: 1px solid #000; color: #000;">Gender</th>
              <th style="padding: 8px; font-size: 14px; border: 1px solid #000; color: #000;">Date</th>
            </tr>
          </thead>
          <tbody>
            ${keys
              .map(
                (key, index) =>
                  `<tr key=${key} style="text-align:left; background-color: ${
                    index % 2 === 0 ? "#fff" : "#fff"
                  };">
                <td style="padding: 8px; font-size: 14px; border: 1px solid #000; color: #000;">${
                  index + 1
                }</td>
                <td style="padding: 8px; font-size: 14px; border: 1px solid #000; color: #000;">${
                  key.startsWith("ADULT")
                    ? "ADT"
                    : key.startsWith("CHILD")
                    ? "CNN"
                    : key.startsWith("HELD_")
                    ? "INF"
                    : ""
                }</td>
                <td style="padding: 8px; font-size: 14px; border: 1px solid #000; color: #000;">${
                  userInformation[key].firstName
                    ? userInformation[key].firstName.charAt(0).toUpperCase() +
                      userInformation[key].firstName.slice(1)
                    : ""
                }</td>
                <td style="padding: 8px; font-size: 14px; border: 1px solid #000; color: #000;">${
                  userInformation[key].middleName
                    ? userInformation[key].middleName.charAt(0).toUpperCase() +
                      userInformation[key].middleName.slice(1)
                    : ""
                }</td>
                <td style="padding: 8px; font-size: 14px; border: 1px solid #000; color: #000;">${
                  userInformation[key].lastName
                    ? userInformation[key].lastName.charAt(0).toUpperCase() +
                      userInformation[key].lastName.slice(1)
                    : ""
                }</td>
                <td style="padding: 8px; font-size: 14px; border: 1px solid #000; color: #000;">${
                  userInformation[key].gender
                    ? userInformation[key].gender.charAt(0).toUpperCase() +
                      userInformation[key].gender.slice(1)
                    : ""
                }</td>
                <td style="padding: 8px; font-size: 14px; border: 1px solid #000; color: #000;">${
                  userInformation[key].date
                }</td>
              </tr>`
              )
              .join("")}
          </tbody>
        </table>
      </div>
      
        </div>
      </div>`;
  };

  // This generated HTML can be used in your mailOptions
  const userInformationHTML = generateUserInformationHTML(
    userInformation,
    keys
  );

  // //Configure Nodemailer transporter (provide your Gmail credentials)
  const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
      port: 587,
      secure: false,
      auth: {
        user: process.env.SMTP_USERNAME,  // Replace with your SMTP username
        pass: process.env.SMTP_PASSWORD   // Replace with your SMTP password
      }
  });


  // Compose email
  const mailOptions = {
    from: "reservations@fligtway.com",
    to: submitBookingData.emaiAndId.email, // Replace with the recipient's email address
    subject: `BOOKING IS CANCELLED-${submitBookingData.randomNumber}`,
    bcc: 'reservations@fligtway.com',
    html: `
    <div style="background: #fff; font-size: 14px; border: 1px solid #000; padding:0 15px;">
		<div class="tem-section">
			<div style="background-color: #fff; padding: 10px; text-align:left;">
				<table width="100%" cellpadding="0" cellspacing="0">
					<tr>
						<td style="text-align: left; width: 50%;">
							<img src="https://i.ibb.co/gDxZkKM/logo.png" alt="" style="width: 130px;">
						</td>
						<td style="text-align: right; width: 50%; font-size: 16px;">
							<b>Booking Reference # ${submitBookingData.randomNumber}</b>
						</td>
					</tr>
				</table>
			</div>

			<div class="need" style="background: #EE4E34;text-align: right;">
				<p style="color: #fff;font-size: 16px; padding: 2px  0.5rem; text-shadow: 1px 1px grey;  box-shadow: rgba(0, 0, 0, 0.19) 0px 10px 20px, rgba(0, 0, 0, 0.23) 0px 6px 6px;">
					Need help, Our 24x7 Toll Free Support: <a style="text-decoration: none;" ><b style="color:#fff;">${phoneNumberweb}</b></a> 
				</p>
			</div>
			<div class="book-para">
				<p>
					Your Booking is  <b>CANCELLED</b> with booking reference # <b>${submitBookingData.randomNumber}</b>
				</p>
				<p>
					If any query please contact our customer support at <a ><b style="color:#000;">${phoneNumberweb}</b></a> or send us an email at <a ><b style="color:#000;">${email}</b></a> and one of our travel expert will be pleased to assist you.In Such unlikely event, if your tickets cannot be processed for any reason you will be notified via email or by telephone and your payment will NOT be processed.
				</p>
			</div>
			<div style="padding: 0rem 0.5rem; background: #EE4E34;">
			<div class="need" style=";background: #EE4E34;text-align: left;">
					<p style="color: #fff;font-size: 18px; padding: 2px  0.5rem; text-shadow: 1px 1px grey;  box-shadow: rgba(0, 0, 0, 0.19) 0px 10px 20px, rgba(0, 0, 0, 0.23) 0px 6px 6px;">
          Travellers Details
					</p>
				</div>
			</div>
			${userInformationHTML}
		</div>
		<div class="col-12">
			<div class="bg-secondary rounded h-100">
				<div class="need" style=";background: #EE4E34;text-align: left;">
					<p style="color: #fff;font-size: 18px; padding: 2px  0.5rem; text-shadow: 1px 1px grey;  box-shadow: rgba(0, 0, 0, 0.19) 0px 10px 20px, rgba(0, 0, 0, 0.23) 0px 6px 6px;">
						Flight Details
					</p>
				</div>
				<div class="table-responsive">
					<div style="overflow-x: auto;">

						<table width="100%" style="border-collapse: collapse; border: 1px solid #000; color: #000;">
							<thead>
								<tr style="background-color: #cccccc8a;text-align:left; " >
									<th style="padding: 8px; font-size: 14px; border: 1px solid #000; color: #000;">Airline</th>
									<th style="padding: 8px; font-size: 14px; border: 1px solid #000; color: #000;">Departure</th>
									<th style="padding: 8px; font-size: 14px; border: 1px solid #000; color: #000;">Arrival</th>
									<th style="padding: 8px; font-size: 14px; border: 1px solid #000; color: #000;">Flight Details</th>
									<th style="padding: 8px; font-size: 14px; border: 1px solid #000; color: #000;">Cabin</th>
									<th style="padding: 8px; font-size: 14px; border: 1px solid #000; color: #000;">Duration</th>
								</tr>
							</thead>
							${flightDataHTML}
						</table>
					</div>
				</div>
			</div>
		</div>
    <div>

    <div class="need" style=";background: #EE4E34;text-align: left;">
      <p style="color: #fff;font-size: 18px; padding: 2px  0.5rem; text-shadow: 1px 1px grey;  box-shadow: rgba(0, 0, 0, 0.19) 0px 10px 20px, rgba(0, 0, 0, 0.23) 0px 6px 6px;">
      Customer Contact
      </p>
    </div>
    <div style="width: 100%; overflow-x: auto;">
    <table style="width: 100%; border-collapse: collapse;">
      <thead style="background-color: #cccccc8a">
        <tr style="text-align:left;">
          <th style="padding: 8px; font-size: 14px; border: 1px solid #000; color: #000;">Email Id	</th>
          <th style="padding: 8px; font-size: 14px; border: 1px solid #000; color: #000;">Contact</th>
        </tr>
      </thead>
      <tbody>
        <tr style="text-align:left;background:#fff;">
          <td style="padding: 8px; font-size: 14px; border: 1px solid #000; color: #000;">
          <a  style="color:#000;" >${submitBookingData.emaiAndId.email}</a>
          </td>
          <td style="padding: 8px; font-size: 14px; border: 1px solid #000; color: #000;">
          <a style="color:#000;" >${submitBookingData.emaiAndId.phone}</a>
          </td>
        </tr>
      </tbody>
    </table>
  </div>

    <div class="need" style=";background: #EE4E34;text-align: left;">
      <p style="color: #fff;font-size: 18px; padding: 2px  0.5rem; text-shadow: 1px 1px grey;  box-shadow: rgba(0, 0, 0, 0.19) 0px 10px 20px, rgba(0, 0, 0, 0.23) 0px 6px 6px;">
      Price Info
      </p>
    </div>
    <div style="width: 100%; overflow-x: auto;">
  <table style="width: 100%; border-collapse: collapse;">
    <thead style="background-color: #cccccc8a">
      
    </thead>
    <tbody style="text-align:left; background:#fff;">
      <tr>
      <th style="padding: 8px; font-size: 14px; border: 1px solid #000; color: #000;">Base Amount</th>
        <td style="padding: 8px; font-size: 14px; border: 1px solid #000; color: #000;text-align:right;font-weight: bold;">
          USD ${submitBookingData.fareDetails.travelerDetails[0].totalAmount}
        </td>
      </tr>
      <tr>
      <th style="padding: 8px; font-size: 14px; border: 1px solid #000; color: #000;">Main Cabin</th>
      <td style="padding: 8px; font-size: 14px; border: 1px solid #000; color: #000;text-align:right;font-weight: bold;">
      ${submitBookingData.fareDetails.cabinAmount ? `USD ${submitBookingData.fareDetails.cabinAmount}` : "No"}
            </td>
      </tr>
      <th style="padding: 8px; font-size: 14px; border: 1px solid #000; color: #000;">Taxes and Fees</th>
      <td style="padding: 8px; font-size: 14px; border: 1px solid #000; color: #000;text-align:right;font-weight: bold;">
      USD ${submitBookingData.fareDetails.travelerDetails[0].taxAmount}
    </td>
      <tr>
      <th style="padding: 8px; font-size: 14px; border: 1px solid #000; color: #000;">Total Amount</th>
      <td style="padding: 8px; font-size: 14px; border: 1px solid #000; color: #000;text-align:right;font-weight: bold;">
      USD ${submitBookingData.fareDetails.totalAmount}
    </td>
      </tr>
    
    </tbody>
  </table>
</div>

<div class="need" style=";background: #EE4E34;text-align: left;">
      <p style="color: #fff;font-size: 18px; padding: 2px  0.5rem; text-shadow: 1px 1px grey;  box-shadow: rgba(0, 0, 0, 0.19) 0px 10px 20px, rgba(0, 0, 0, 0.23) 0px 6px 6px;">
      Terms & Conditions
      </p>
    </div>
    <p>
    Please feel free to contact us to confirm your itinerary, or other special requests (Seats, Meals, Wheelchair, etc.) and luggage weight allowances (a number of airlines have recently made changes to the luggage weight limits) 72 hours prior to the departure date. We look forward to help you again with your future travel plans.
    </p>
    <p>
    1. This is non-refundable unless otherwise stated*
<br>
    2. All fares are not guaranteed until ticketed*
    </ul>
    </p>

    <div class="need" style=";background: #EE4E34;text-align: left;">
      <p style="color: #fff;font-size: 18px; padding: 2px  0.5rem; text-shadow: 1px 1px grey;  box-shadow: rgba(0, 0, 0, 0.19) 0px 10px 20px, rgba(0, 0, 0, 0.23) 0px 6px 6px;">
      Contact Info
      </p>
    </div>
    <div style="width: 100%; overflow-x: auto;">
    <table style="width: 100%; border-collapse: collapse;">
      <thead style="background-color: #cccccc8a">
        <tr style="text-align:left;">
          <th style="padding: 8px; font-size: 14px; border: 1px solid #000; color: #000;">Agency Name</th>
          <th style="padding: 8px; font-size: 14px; border: 1px solid #000; color: #000;">Email Id	</th>
          <th style="padding: 8px; font-size: 14px; border: 1px solid #000; color: #000;">Contact</th>
        </tr>
      </thead>
      <tbody>
        <tr style="text-align:left;background:#fff;">
          <td style="padding: 8px; font-size: 14px; border: 1px solid #000; color: #000;">
            ${companyName}	
          </td>
          <td style="padding: 8px; font-size: 14px; border: 1px solid #000; color: #000;">
          <a  style="color:#000;" >${email}</a>
          </td>
          <td style="padding: 8px; font-size: 14px; border: 1px solid #000; color: #000;">
          <a style="color:#000;" >${phoneNumberweb}</a>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
  <div class="need" style=";background: #EE4E34;text-align: left;">
      <p style="color: #fff;font-size: 18px; padding: 2px  0.5rem; text-shadow: 1px 1px grey;  box-shadow: rgba(0, 0, 0, 0.19) 0px 10px 20px, rgba(0, 0, 0, 0.23) 0px 6px 6px;">
      Policy
      </p>
    </div>
    <p>
    We accept credit cards and debit cards issued in US, Canada and several other countries as listed in the billings section. We also accept AE/AP billing addresses.

    <br> <br>
    1. Please note: your credit/debit card may be billed in multiple charges totaling the final total price. If your credit/debit card or other form of payment is not processed or accepted for any reason, we will notify you within 24 hours (it may take longer than 24 hours for non credit/debit card payment methods). Prior to your form of payment being processed and accepted successfully, if there is a change in the price of air fare or any other change, you may be notified of this change and only upon such notification you have the right to either accept or decline this transaction. If you elect to decline this transaction, you will not be charged.

<br> <br>
2. Our Post Payment Price Guarantee: Upon successful acceptance and processing of your payment (credit/debit card), we guarantee that we will honor the total final quoted price of the airline tickets regardless of any changes or fluctuation in the price of air fare. Please note: all hotel, car rental and tour/activity bookings are only confirmed upon delivery of complete confirmation details to the email you provided with your reservation. In some cases, pre-payment may be required to receive confirmation.

<br> <br>
In order to provide you with further protection, when certain transactions are determined to be high-risk by our systems, we will not process such transactions unless our credit card verification team has determined that it's safe to process them. In order to establish validity of such transactions, we may contact you or your bank.

    </p>
    <div class="need" style=";background: #EE4E34;text-align: left;">
      <p style="color: #fff;font-size: 18px; padding: 2px  0.5rem; text-shadow: 1px 1px grey;  box-shadow: rgba(0, 0, 0, 0.19) 0px 10px 20px, rgba(0, 0, 0, 0.23) 0px 6px 6px;">
      Change/ Cancellation Policy
      </p>
    </div>
    <p>
    All travelers must confirm that their travel documents required are current and valid for their preferred destinations. The ticket(s) are refundable within 4 hours from the time of purchase ONLY for ticketed Airlines, at no extra cost. Once ticket is purchased, name changes are not allowed according to Airlines Policies, but some Specific Airlines allow minor corrections, usually involving 1-2 characters attracting a fees for this service. Prices do not include Baggage and Carry-On or other fees charged directly by the airline. Fares are not guaranteed until ticketed. Fare changes are subject to seat or class availability. All tickets are considered non-transferable & non-endorsable.


    </p>
    
    

    </div>
	</div>
    `,
  };

  // Send email
  transporter.sendMail(mailOptions, (error, info) => {
    if (error) {
      console.log(error);
      res.status(500).send("Error: Unable to send email");
    } else {
      console.log("Email sent: " + info.response);
      res.status(200).send("Email sent successfully");
    }
  });
});



app.post("/succes-form", (req, res) => {
  // Extract form data from the request
  const submitBookingData = req.body;
  console.log("email check data formdata", submitBookingData);

  // Generate flightDataHTML
  let flightDataHTML = "<tbody>";

  submitBookingData.flightData.data[0].itineraries.forEach(
    (itinerary, itineraryIndex) => {
      itinerary.segments.forEach((segment, segmentIndex) => {
        const carrierCode = segment.carrierCode; // Access carrierCode directly from the segment

        const fullCarrierName = submitBookingData.flightData.dictionaries.carriers[carrierCode] || ''; 
        flightDataHTML += `
        <tr key="${segmentIndex}" style="text-align:left; background-color: ${
          segmentIndex % 2 === 0 ? "#fff" : "#fff"
        };">
        <td style="padding: 8px; font-size: 14px; border: 1px solid #000; color: #000;">
        <img src="https://cmsrepository.com/static/flights/flight/airlinelogo-png/${itinerary.segments[0].carrierCode.toLowerCase()}.png" style="width:25px" /> <br/> <span style="font-size:11px;">${fullCarrierName}</span></td>
          <td style="padding: 8px; font-size: 14px; border: 1px solid #000; color: #000;">
            <b>${segment.departure.iataCode}</b><br />
            ${formatDate(segment.departure.at)}<br />
          </td>
          <td style="padding: 8px; font-size: 14px; border: 1px solid #000; color: #000;">
            <b>${segment.arrival.iataCode}</b><br />
            ${formatDate(segment.arrival.at)}
          </td>
          <td style="padding: 8px; font-size: 14px; border: 1px solid #000; color: #000;">
            ${segment.carrierCode}&nbsp;${segment.number}<br />
          </td>
          <td style="padding: 8px; font-size: 14px; border: 1px solid #000; color: #000;">
            ${
              submitBookingData.flightData.data[0].travelerPricings[0]
                .fareDetailsBySegment[0].cabin || ""
            }
          </td>
          <td style="padding: 8px; font-size: 14px; border: 1px solid #000; color: #000;">
          ${itinerary.duration
            ? itinerary.duration
                .slice(2) // Remove "pt" prefix
                .match(/(\d{1,2})([A-Z])/g) // Match groups of one or two digits followed by a capital letter
                .map(group => group.replace(/(\d+)([A-Z])/, "$1$2")) // Add a space between hours and minutes
                .join(" ") // Join the groups with a space
            : ""}
        </td>

        </tr>`;
      });
    }
  );

  flightDataHTML += "</tbody>";

  const userInformation = submitBookingData.userInformation; // Assuming userInformation is a nested object within submitBookingData
  const keys = Object.keys(userInformation);
  const generateUserInformationHTML = (userInformation, keys) => {
    return `
      <div className="bg-secondary rounded h-100 p-4">
        <div className="table-responsive">
        <div style="overflow-x: auto;">
        <table width="100%" style="border-collapse: collapse; border: 1px solid #000; color: #000;">
          <thead>
            <tr style="background-color: #cccccc8a; text-align:left;">
              <th style="padding: 8px; font-size: 14px; border: 1px solid #000; color: #000;">Serial No.</th>
              <th style="padding: 8px; font-size: 14px; border: 1px solid #000; color: #000;">Traveller Type</th>
              <th style="padding: 8px; font-size: 14px; border: 1px solid #000; color: #000;">First Name</th>
              <th style="padding: 8px; font-size: 14px; border: 1px solid #000; color: #000;">Middle Name</th>
              <th style="padding: 8px; font-size: 14px; border: 1px solid #000; color: #000;">Last Name</th>
              <th style="padding: 8px; font-size: 14px; border: 1px solid #000; color: #000;">Gender</th>
              <th style="padding: 8px; font-size: 14px; border: 1px solid #000; color: #000;">Date</th>
            </tr>
          </thead>
          <tbody>
            ${keys
              .map(
                (key, index) =>
                  `<tr key=${key} style="text-align:left; background-color: ${
                    index % 2 === 0 ? "#fff" : "#fff"
                  };">
                <td style="padding: 8px; font-size: 14px; border: 1px solid #000; color: #000;">${
                  index + 1
                }</td>
                <td style="padding: 8px; font-size: 14px; border: 1px solid #000; color: #000;">${
                  key.startsWith("ADULT")
                    ? "ADT"
                    : key.startsWith("CHILD")
                    ? "CNN"
                    : key.startsWith("HELD_")
                    ? "INF"
                    : ""
                }</td>
                <td style="padding: 8px; font-size: 14px; border: 1px solid #000; color: #000;">${
                  userInformation[key].firstName
                    ? userInformation[key].firstName.charAt(0).toUpperCase() +
                      userInformation[key].firstName.slice(1)
                    : ""
                }</td>
                <td style="padding: 8px; font-size: 14px; border: 1px solid #000; color: #000;">${
                  userInformation[key].middleName
                    ? userInformation[key].middleName.charAt(0).toUpperCase() +
                      userInformation[key].middleName.slice(1)
                    : ""
                }</td>
                <td style="padding: 8px; font-size: 14px; border: 1px solid #000; color: #000;">${
                  userInformation[key].lastName
                    ? userInformation[key].lastName.charAt(0).toUpperCase() +
                      userInformation[key].lastName.slice(1)
                    : ""
                }</td>
                <td style="padding: 8px; font-size: 14px; border: 1px solid #000; color: #000;">${
                  userInformation[key].gender
                    ? userInformation[key].gender.charAt(0).toUpperCase() +
                      userInformation[key].gender.slice(1)
                    : ""
                }</td>
                <td style="padding: 8px; font-size: 14px; border: 1px solid #000; color: #000;">${
                  userInformation[key].date
                }</td>
              </tr>`
              )
              .join("")}
          </tbody>
        </table>
      </div>
      
        </div>
      </div>`;
  };

  // This generated HTML can be used in your mailOptions
  const userInformationHTML = generateUserInformationHTML(
    userInformation,
    keys
  );

  // //Configure Nodemailer transporter (provide your Gmail credentials)
  const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
      port: 587,
      secure: false,
      auth: {
        user: process.env.SMTP_USERNAME,  // Replace with your SMTP username
        pass: process.env.SMTP_PASSWORD   // Replace with your SMTP password
      }
  });


  // Compose email
  const mailOptions = {
    from: "reservations@fligtway.com",
    to: submitBookingData.emaiAndId.email, // Replace with the recipient's email address
    subject: `BOOKING IS ISSUED-${submitBookingData.randomNumber}`,
    bcc: 'reservations@fligtway.com',
    html: `
    <div style="background: #fff; font-size: 14px; border: 1px solid #000; padding:0 15px;">
		<div class="tem-section">
			<div style="background-color: #fff; padding: 10px; text-align:left;">
				<table width="100%" cellpadding="0" cellspacing="0">
					<tr>
						<td style="text-align: left; width: 50%;">
							<img src="https://i.ibb.co/gDxZkKM/logo.png" alt="" style="width: 130px;">
						</td>
						<td style="text-align: right; width: 50%; font-size: 16px;">
							<b>Booking Reference # ${submitBookingData.randomNumber}</b>
						</td>
					</tr>
				</table>
			</div>

			<div class="need" style="background: #EE4E34;text-align: right;">
				<p style="color: #fff;font-size: 16px; padding: 2px  0.5rem; text-shadow: 1px 1px grey;  box-shadow: rgba(0, 0, 0, 0.19) 0px 10px 20px, rgba(0, 0, 0, 0.23) 0px 6px 6px;">
					Need help, Our 24x7 Toll Free Support: <a style="text-decoration: none;" ><b style="color:#fff;">${phoneNumberweb}</b></a> 
				</p>
			</div>
			<div class="book-para">
				<p>
					Your Booking is  <b>Issued</b> with booking reference # <b>${submitBookingData.randomNumber}</b>
				</p>
				<p>
					If any query please contact our customer support at <a ><b style="color:#000;">${phoneNumberweb}</b></a> or send us an email at <a ><b style="color:#000;">${email}</b></a> and one of our travel expert will be pleased to assist you.In Such unlikely event, if your tickets cannot be processed for any reason you will be notified via email or by telephone and your payment will NOT be processed.
				</p>
			</div>
			<div style="padding: 0rem 0.5rem; background: #EE4E34;">
			<div class="need" style=";background: #EE4E34;text-align: left;">
					<p style="color: #fff;font-size: 18px; padding: 2px  0.5rem; text-shadow: 1px 1px grey;  box-shadow: rgba(0, 0, 0, 0.19) 0px 10px 20px, rgba(0, 0, 0, 0.23) 0px 6px 6px;">
          Travellers Details
					</p>
				</div>
			</div>
			${userInformationHTML}
		</div>
		<div class="col-12">
			<div class="bg-secondary rounded h-100">
				<div class="need" style=";background: #EE4E34;text-align: left;">
					<p style="color: #fff;font-size: 18px; padding: 2px  0.5rem; text-shadow: 1px 1px grey;  box-shadow: rgba(0, 0, 0, 0.19) 0px 10px 20px, rgba(0, 0, 0, 0.23) 0px 6px 6px;">
						Flight Details
					</p>
				</div>
				<div class="table-responsive">
					<div style="overflow-x: auto;">

						<table width="100%" style="border-collapse: collapse; border: 1px solid #000; color: #000;">
							<thead>
								<tr style="background-color: #cccccc8a;text-align:left; " >
									<th style="padding: 8px; font-size: 14px; border: 1px solid #000; color: #000;">Airline</th>
									<th style="padding: 8px; font-size: 14px; border: 1px solid #000; color: #000;">Departure</th>
									<th style="padding: 8px; font-size: 14px; border: 1px solid #000; color: #000;">Arrival</th>
									<th style="padding: 8px; font-size: 14px; border: 1px solid #000; color: #000;">Flight Details</th>
									<th style="padding: 8px; font-size: 14px; border: 1px solid #000; color: #000;">Cabin</th>
									<th style="padding: 8px; font-size: 14px; border: 1px solid #000; color: #000;">Duration</th>
								</tr>
							</thead>
							${flightDataHTML}
						</table>
					</div>
				</div>
			</div>
		</div>
    <div>

    <div class="need" style=";background: #EE4E34;text-align: left;">
      <p style="color: #fff;font-size: 18px; padding: 2px  0.5rem; text-shadow: 1px 1px grey;  box-shadow: rgba(0, 0, 0, 0.19) 0px 10px 20px, rgba(0, 0, 0, 0.23) 0px 6px 6px;">
      Customer Contact
      </p>
    </div>
    <div style="width: 100%; overflow-x: auto;">
    <table style="width: 100%; border-collapse: collapse;">
      <thead style="background-color: #cccccc8a">
        <tr style="text-align:left;">
          <th style="padding: 8px; font-size: 14px; border: 1px solid #000; color: #000;">Email Id	</th>
          <th style="padding: 8px; font-size: 14px; border: 1px solid #000; color: #000;">Contact</th>
        </tr>
      </thead>
      <tbody>
        <tr style="text-align:left;background:#fff;">
          <td style="padding: 8px; font-size: 14px; border: 1px solid #000; color: #000;">
          <a  style="color:#000;" >${submitBookingData.emaiAndId.email}</a>
          </td>
          <td style="padding: 8px; font-size: 14px; border: 1px solid #000; color: #000;">
          <a style="color:#000;" >${submitBookingData.emaiAndId.phone}</a>
          </td>
        </tr>
      </tbody>
    </table>
  </div>

    <div class="need" style=";background: #EE4E34;text-align: left;">
      <p style="color: #fff;font-size: 18px; padding: 2px  0.5rem; text-shadow: 1px 1px grey;  box-shadow: rgba(0, 0, 0, 0.19) 0px 10px 20px, rgba(0, 0, 0, 0.23) 0px 6px 6px;">
      Price Info
      </p>
    </div>
    <div style="width: 100%; overflow-x: auto;">
  <table style="width: 100%; border-collapse: collapse;">
    <thead style="background-color: #cccccc8a">
      
    </thead>
    <tbody style="text-align:left; background:#fff;">
      <tr>
      <th style="padding: 8px; font-size: 14px; border: 1px solid #000; color: #000;">Base Amount</th>
        <td style="padding: 8px; font-size: 14px; border: 1px solid #000; color: #000;text-align:right;font-weight: bold;">
          USD ${submitBookingData.fareDetails.travelerDetails[0].totalAmount}
        </td>
      </tr>
      <tr>
      <th style="padding: 8px; font-size: 14px; border: 1px solid #000; color: #000;">Main Cabin</th>
      <td style="padding: 8px; font-size: 14px; border: 1px solid #000; color: #000;text-align:right;font-weight: bold;">
        ${submitBookingData.fareDetails.cabinAmount ? `USD ${submitBookingData.fareDetails.cabinAmount}` : "No"}
      </td>
      </tr>
      <th style="padding: 8px; font-size: 14px; border: 1px solid #000; color: #000;">Taxes and Fees</th>
      <td style="padding: 8px; font-size: 14px; border: 1px solid #000; color: #000;text-align:right;font-weight: bold;">
      USD ${submitBookingData.fareDetails.travelerDetails[0].taxAmount}
    </td>
      <tr>
      <th style="padding: 8px; font-size: 14px; border: 1px solid #000; color: #000;">Total Amount</th>
      <td style="padding: 8px; font-size: 14px; border: 1px solid #000; color: #000;text-align:right;font-weight: bold;">
      USD ${submitBookingData.fareDetails.totalAmount}
    </td>
      </tr>
    
    </tbody>
  </table>
</div>

<div class="need" style=";background: #EE4E34;text-align: left;">
      <p style="color: #fff;font-size: 18px; padding: 2px  0.5rem; text-shadow: 1px 1px grey;  box-shadow: rgba(0, 0, 0, 0.19) 0px 10px 20px, rgba(0, 0, 0, 0.23) 0px 6px 6px;">
      Terms & Conditions
      </p>
    </div>
    <p>
    Please feel free to contact us to confirm your itinerary, or other special requests (Seats, Meals, Wheelchair, etc.) and luggage weight allowances (a number of airlines have recently made changes to the luggage weight limits) 72 hours prior to the departure date. We look forward to help you again with your future travel plans.
    </p>
    <p>
    1. This is non-refundable unless otherwise stated*
<br>
    2. All fares are not guaranteed until ticketed*
    </ul>
    </p>

    <div class="need" style=";background: #EE4E34;text-align: left;">
      <p style="color: #fff;font-size: 18px; padding: 2px  0.5rem; text-shadow: 1px 1px grey;  box-shadow: rgba(0, 0, 0, 0.19) 0px 10px 20px, rgba(0, 0, 0, 0.23) 0px 6px 6px;">
      Contact Info
      </p>
    </div>
    <div style="width: 100%; overflow-x: auto;">
    <table style="width: 100%; border-collapse: collapse;">
      <thead style="background-color: #cccccc8a">
        <tr style="text-align:left;">
          <th style="padding: 8px; font-size: 14px; border: 1px solid #000; color: #000;">Agency Name</th>
          <th style="padding: 8px; font-size: 14px; border: 1px solid #000; color: #000;">Email Id	</th>
          <th style="padding: 8px; font-size: 14px; border: 1px solid #000; color: #000;">Contact</th>
        </tr>
      </thead>
      <tbody>
        <tr style="text-align:left;background:#fff;">
          <td style="padding: 8px; font-size: 14px; border: 1px solid #000; color: #000;">
            ${companyName}	
          </td>
          <td style="padding: 8px; font-size: 14px; border: 1px solid #000; color: #000;">
          <a  style="color:#000;" >${email}</a>
          </td>
          <td style="padding: 8px; font-size: 14px; border: 1px solid #000; color: #000;">
          <a style="color:#000;" >${phoneNumberweb}</a>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
  <div class="need" style=";background: #EE4E34;text-align: left;">
      <p style="color: #fff;font-size: 18px; padding: 2px  0.5rem; text-shadow: 1px 1px grey;  box-shadow: rgba(0, 0, 0, 0.19) 0px 10px 20px, rgba(0, 0, 0, 0.23) 0px 6px 6px;">
      Policy
      </p>
    </div>
    <p>
    We accept credit cards and debit cards issued in US, Canada and several other countries as listed in the billings section. We also accept AE/AP billing addresses.

    <br> <br>
    1. Please note: your credit/debit card may be billed in multiple charges totaling the final total price. If your credit/debit card or other form of payment is not processed or accepted for any reason, we will notify you within 24 hours (it may take longer than 24 hours for non credit/debit card payment methods). Prior to your form of payment being processed and accepted successfully, if there is a change in the price of air fare or any other change, you may be notified of this change and only upon such notification you have the right to either accept or decline this transaction. If you elect to decline this transaction, you will not be charged.

<br> <br>
2. Our Post Payment Price Guarantee: Upon successful acceptance and processing of your payment (credit/debit card), we guarantee that we will honor the total final quoted price of the airline tickets regardless of any changes or fluctuation in the price of air fare. Please note: all hotel, car rental and tour/activity bookings are only confirmed upon delivery of complete confirmation details to the email you provided with your reservation. In some cases, pre-payment may be required to receive confirmation.

<br> <br>
In order to provide you with further protection, when certain transactions are determined to be high-risk by our systems, we will not process such transactions unless our credit card verification team has determined that it's safe to process them. In order to establish validity of such transactions, we may contact you or your bank.

    </p>
    <div class="need" style=";background: #EE4E34;text-align: left;">
      <p style="color: #fff;font-size: 18px; padding: 2px  0.5rem; text-shadow: 1px 1px grey;  box-shadow: rgba(0, 0, 0, 0.19) 0px 10px 20px, rgba(0, 0, 0, 0.23) 0px 6px 6px;">
      Change/ Cancellation Policy
      </p>
    </div>
    <p>
    All travelers must confirm that their travel documents required are current and valid for their preferred destinations. The ticket(s) are refundable within 4 hours from the time of purchase ONLY for ticketed Airlines, at no extra cost. Once ticket is purchased, name changes are not allowed according to Airlines Policies, but some Specific Airlines allow minor corrections, usually involving 1-2 characters attracting a fees for this service. Prices do not include Baggage and Carry-On or other fees charged directly by the airline. Fares are not guaranteed until ticketed. Fare changes are subject to seat or class availability. All tickets are considered non-transferable & non-endorsable.


    </p>
    
    

    </div>
	</div>
    `,
  };

  // Send email
  transporter.sendMail(mailOptions, (error, info) => {
    if (error) {
      console.log(error);
      res.status(500).send("Error: Unable to send email");
    } else {
      console.log("Email sent: " + info.response);
      res.status(200).send("Email sent successfully");
    }
  });
});




app.get("/bookings/pending", (req, res) => {
  Booking.find({ bookingColor: "yellow" }) // Retrieve only bookings with bookingColor as "yellow"
    .sort({ _id: -1 })
    .then((data) => {
      res.json(data);
    })
    .catch((err) => {
      console.error(err);
      res.status(500).json({ error: "Failed to fetch data from MongoDB" });
    });
});


app.get("/bookings/cancel", (req, res) => {
  Booking.find({ bookingColor: "red" }) // Retrieve only bookings with bookingColor as "red"
    .sort({ _id: -1 })
    .then((data) => {
      res.json(data);
    })
    .catch((err) => {
      console.error(err);
      res.status(500).json({ error: "Failed to fetch data from MongoDB" });
    });
});


app.get("/bookings/white", (req, res) => {
  Booking.find({ $or: [{ bookingColor: "#06a606ad" }, { bookingColor: "" }] }) // Retrieve bookings with bookingColor as "green" or empty
    .sort({ _id: -1 })
    .then((data) => {
      res.json(data);
    })
    .catch((err) => {
      console.error(err);
      res.status(500).json({ error: "Failed to fetch data from MongoDB" });
    });
});





 

app.post('/send-email', (req, res) => {

  const { first_name, last_name, email, mobile_number, message } = req.body;

  // Check if all required fields are present
  if (!first_name || !last_name || !email || !mobile_number || !message) {
    return res.status(400).send('All fields are required');
  }

  // Setup nodemailer transporter with SMTP
  const transporter = nodemailer.createTransport(
    smtpTransport({
      host: 'smtp.gmail.com',
      port: 587,
      secure: false,
      auth: {
        user: process.env.SMTP_USERNAME,  // Replace with your SMTP username
        pass: process.env.SMTP_PASSWORD   // Replace with your SMTP password
      }
    })
  );
  // Setup email data
  const mailOptions = {
    from: 'support@fligtway.com',  // Sender email address (should be valid)
    to: 'support@fligtway.com',    // Recipient email address (update to the correct address)
    subject: 'New Enquiry',
    text: `First Name: ${first_name}\nLast Name: ${last_name}\nEmail: ${email}\nMobile Number: ${mobile_number}\n\nMessage:\n${message}`
  };

  // Send email
  transporter.sendMail(mailOptions, (error, info) => {
    if (error) {
      console.error(error);
      res.status(500).send('Error sending ddmessage');
    } else {
      console.log('Email sent: ' + info.response);
      res.send('Message sent successfully!');
    }
  })
});





// const _dirname = path.dirname("");
// const buildPath = path.join(__dirname, '../frontend/build');
// app.use(express.static(buildPath));

// app.get('/*', function(req, res) {
//   const indexHtmlPath = path.join(__dirname, "../frontend/build/index.html");

//   res.sendFile(indexHtmlPath, function (err) {
//     if (err) {
//       res.status(500).send(err);
//     }
//   });
// });

app.get('/', (req,res)=>{
  res.send({msg:"backend is working"})
})

// // Use your booking routes
// app.use('/booking', bookingRouter);

const port = process.env.PORT || 8000;

app.listen(port, () => {
  console.log(`Server is listening on port ${port}`);
});


// let PORT=process.env.PORT || 5000
// app.listen(PORT, () => {
//   console.log(`Server is listening on port ${PORT}`);
// });
