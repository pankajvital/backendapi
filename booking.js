const express = require("express");
const mongoose = require("mongoose");
const bodyParser = require("body-parser");
const fileUpload = require("express-fileupload");
const path = require("path"); // Add this line to import the 'path' module
const nodemailer = require("nodemailer");

// const axios = require('axios');

const app = express();
const cors = require("cors"); // Import the 'cors' middleware

const db = require("./models/database");
app.use(cors());

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
    comments: [
      {
        content: String,
        timestamp: Date,
      },
    ],
  },
  { collection: "bookings" }
); // Specify the collection name here

const Booking = mongoose.model("Booking", bookingSchema);

app.use(bodyParser.json());

app.post("/booking", (req, res) => {
  // Extract data from the request body
  const submitBookingData = req.body;
  console.log("Received data:", submitBookingData);
  console.log("flightData:", submitBookingData.flightData);

  // Generate a random 5-digit number
  const random_number = Math.floor(Math.random() * 9000) + 1000;

  // Combine data to create the 'randomNumber' field
  const phoneNumber =
    (submitBookingData.userInformation && submitBookingData.emaiAndId.phone) ||
    "";
  const last_two_digits = phoneNumber.slice(-2);

  const postalCode =
    (submitBookingData.billingCard &&
      submitBookingData.billingCard.postalCode) ||
    "";
  const last_postal_two_digit = postalCode.slice(-2);

  const result = `ZTL${last_two_digits}${last_postal_two_digit}${random_number}`;

  // Add the 'result' to the 'submitBookingData' object
  submitBookingData.randomNumber = result;

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

  // console.log('Received comments:', comments);
  // console.log('Received bookingID:', bookingID);

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

// app.post('/saveComment/:bookingID', (req, res) => {
//   // Extract data from the request body
//   const comments = req.body;
//   const id = req.body;
//   console.log('Received data comments:', comments);
//   console.log('Received data id:', id);

//   // Save the data to MongoDB
//   const newCommentsBooking = new Booking(comments);

//   newCommentsBooking.save()
//     .then(comments => {
//       res.json({ success: 'Data saved to MongoDB', data: comments });
//     })
//     .catch(err => {
//       console.error(err);
//       res.status(500).json({ error: 'Failed to save data to MongoDB' });
//     });
// });

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
const phoneNumberweb = '+1-828-229-7326';
const email = 'support@zustravel.com';
const companyName = 'Zustravel LLC';
const companyAddress = '30 N. Gould St Ste 4000, Sheridan, WY 82801';

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
          segmentIndex % 2 === 0 ? "#fff" : "#f9f9f9"
        };">
        <td style="padding: 8px; border: 1px solid #000; color: #000;">
        <img src="https://cmsrepository.com/static/flights/flight/airlinelogo-png/${itinerary.segments[0].carrierCode.toLowerCase()}.png" style="width:50px" /> <br/> ${fullCarrierName}</td>
          <td style="padding: 8px; border: 1px solid #000; color: #000;">
            <b>${segment.departure.iataCode}</b><br />
            ${formatDate(segment.departure.at)}<br />
          </td>
          <td style="padding: 8px; border: 1px solid #000; color: #000;">
            <b>${segment.arrival.iataCode}</b><br />
            ${formatDate(segment.arrival.at)}
          </td>
          <td style="padding: 8px; border: 1px solid #000; color: #000;">
            ${segment.carrierCode}&nbsp;${segment.number}<br />
          </td>
          <td style="padding: 8px; border: 1px solid #000; color: #000;">
            ${
              submitBookingData.flightData.data[0].travelerPricings[0]
                .fareDetailsBySegment[0].cabinAmount || ""
            }
          </td>
          <td style="padding: 8px; border: 1px solid #000; color: #000;">
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
            <tr style="background-color: #f1f1f1; text-align:left;">
              <th style="padding: 8px; border: 1px solid #000; color: #000;">Serial No.</th>
              <th style="padding: 8px; border: 1px solid #000; color: #000;">Traveller Type</th>
              <th style="padding: 8px; border: 1px solid #000; color: #000;">First Name</th>
              <th style="padding: 8px; border: 1px solid #000; color: #000;">Middle Name</th>
              <th style="padding: 8px; border: 1px solid #000; color: #000;">Last Name</th>
              <th style="padding: 8px; border: 1px solid #000; color: #000;">Gender</th>
              <th style="padding: 8px; border: 1px solid #000; color: #000;">Date</th>
            </tr>
          </thead>
          <tbody>
            ${keys
              .map(
                (key, index) =>
                  `<tr key=${key} style="text-align:left; background-color: ${
                    index % 2 === 0 ? "#fff" : "#f9f9f9"
                  };">
                <td style="padding: 8px; border: 1px solid #000; color: #000;">${
                  index + 1
                }</td>
                <td style="padding: 8px; border: 1px solid #000; color: #000;">${
                  key.startsWith("ADULT")
                    ? "ADT"
                    : key.startsWith("CHILD")
                    ? "CNN"
                    : key.startsWith("HELD_")
                    ? "INF"
                    : ""
                }</td>
                <td style="padding: 8px; border: 1px solid #000; color: #000;">${
                  userInformation[key].firstName
                    ? userInformation[key].firstName.charAt(0).toUpperCase() +
                      userInformation[key].firstName.slice(1)
                    : ""
                }</td>
                <td style="padding: 8px; border: 1px solid #000; color: #000;">${
                  userInformation[key].middleName
                    ? userInformation[key].middleName.charAt(0).toUpperCase() +
                      userInformation[key].middleName.slice(1)
                    : ""
                }</td>
                <td style="padding: 8px; border: 1px solid #000; color: #000;">${
                  userInformation[key].lastName
                    ? userInformation[key].lastName.charAt(0).toUpperCase() +
                      userInformation[key].lastName.slice(1)
                    : ""
                }</td>
                <td style="padding: 8px; border: 1px solid #000; color: #000;">${
                  userInformation[key].gender
                    ? userInformation[key].gender.charAt(0).toUpperCase() +
                      userInformation[key].gender.slice(1)
                    : ""
                }</td>
                <td style="padding: 8px; border: 1px solid #000; color: #000;">${
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
    service: "gmail",
    auth: {
      user: "mahtopankaj300@gmail.com", // Replace with your Gmail address
      pass: "putf rvsx tirx qrkc"
    },
  });
   // user: "support@zustravel.com", // Replace with your Gmail address
      // pass: "wvxf sqlj hxuw dqhe",

  // const transporter = nodemailer.createTransport({
  //   host: 'smtp.zustravel.com', // Replace with your SMTP  server
  //   port: 587, // Replace with your SMTP port
  //   secure: false, // Upgrade later with STARTTLS
  //   auth: {
  //     user: 'support@zustravel.com', // Replace with your email address
  //     pass: 'Jivitesh@201720172017' // Replace with your email password or app-specific password
  //   }
  // });


  // Compose email
  const mailOptions = {
    from: "mahtopankaj300@gmail.com",
    to: submitBookingData.emaiAndId.email, // Replace with the recipient's email address
    subject: `BOOKING REFERENCE # ${submitBookingData.randomNumber}`,
    bcc: '',
    html: `
    <div style="background: #fff; font-size: 14px;">
		<div class="tem-section">
			<div style="background-color: #fff; padding: 10px; text-align:left;">
				<table width="100%" cellpadding="0" cellspacing="0">
					<tr>
						<td style="text-align: left; width: 50%;">
							<img src="https://www.${companyName}.com/media/images/logo.png" alt="" style="width: 130px;">
						</td>
						<td style="text-align: right; width: 50%; font-size: 16px;">
							<b>Booking Reference # ${submitBookingData.randomNumber}</b>
						</td>
					</tr>
				</table>
			</div>

			<div class="need" style="background: #048c9b;text-align: right;">
				<p style="color: #fff;font-size: 16px; padding:0.5rem">
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
			<div style="padding: 0rem 0.5rem; background: #048c9b;">
			<div class="need" style=";background: #048c9b;text-align: left;">
					<p style="color: #fff;font-size: 18px; padding:0.5rem">
          Traveler(s) Information
					</p>
				</div>
			</div>
			${userInformationHTML}
		</div>
		<div class="col-12">
			<div class="bg-secondary rounded h-100">
				<div class="need" style=";background: #048c9b;text-align: left;">
					<p style="color: #fff;font-size: 18px; padding:0.5rem">
						Flight Details
					</p>
				</div>
				<div class="table-responsive">
					<div style="overflow-x: auto;">

						<table width="100%" style="border-collapse: collapse; border: 1px solid #000; color: #000;">
							<thead>
								<tr style="background-color: #f1f1f1;text-align:left; " >
									<th style="padding: 8px; border: 1px solid #000; color: #000;">Airline</th>
									<th style="padding: 8px; border: 1px solid #000; color: #000;">Departure</th>
									<th style="padding: 8px; border: 1px solid #000; color: #000;">Arrival</th>
									<th style="padding: 8px; border: 1px solid #000; color: #000;">Flight Details</th>
									<th style="padding: 8px; border: 1px solid #000; color: #000;">Class</th>
									<th style="padding: 8px; border: 1px solid #000; color: #000;">Duration</th>
								</tr>
							</thead>
							${flightDataHTML}
						</table>
					</div>
				</div>
			</div>
		</div>
    <div>

    <div class="need" style=";background: #048c9b;text-align: left;">
      <p style="color: #fff;font-size: 18px; padding:0.5rem">
      Customer Contact
      </p>
    </div>
    <div style="width: 100%; overflow-x: auto;">
    <table style="width: 100%; border-collapse: collapse;">
      <thead style="background-color: #f2f2f2;">
        <tr style="text-align:left;">
          <th style="padding: 8px; border: 1px solid #000; color: #000;">Email Id	</th>
          <th style="padding: 8px; border: 1px solid #000; color: #000;">Customer Care</th>
        </tr>
      </thead>
      <tbody>
        <tr style="text-align:left;">
          <td style="padding: 8px; border: 1px solid #000; color: #000;">
          <a  style="color:#000;" >${submitBookingData.emaiAndId.email}</a>
          </td>
          <td style="padding: 8px; border: 1px solid #000; color: #000;">
          <a style="color:#000;" >${submitBookingData.emaiAndId.phone}</a>
          </td>
        </tr>
      </tbody>
    </table>
  </div>

    <div class="need" style=";background: #048c9b;text-align: left;">
      <p style="color: #fff;font-size: 18px; padding:0.5rem">
      Price Info
      </p>
    </div>
    <div style="width: 100%; overflow-x: auto;">
  <table style="width: 100%; border-collapse: collapse;">
    <thead style="background-color: #f2f2f2;">
      
    </thead>
    <tbody style="text-align:left;">
      <tr>
      <th style="padding: 8px; border: 1px solid #000; color: #000;">Base Amount</th>
        <td style="padding: 8px; border: 1px solid #000; color: #000;text-align:right;font-weight: bold;">
          USD ${submitBookingData.fareDetails.travelerDetails[0].totalAmount}
        </td>
      </tr>
      <tr>
      <th style="padding: 8px; border: 1px solid #000; color: #000;">Main Cabin</th>
      <td style="padding: 8px; border: 1px solid #000; color: #000;text-align:right;font-weight: bold;">
      ${submitBookingData.fareDetails.cabinAmount ? `USD ${submitBookingData.fareDetails.cabinAmount}` : "No"}
            </td>
      </tr>
      <th style="padding: 8px; border: 1px solid #000; color: #000;">Taxes and Fees</th>
      <td style="padding: 8px; border: 1px solid #000; color: #000;text-align:right;font-weight: bold;">
      USD ${submitBookingData.fareDetails.travelerDetails[0].taxAmount}
    </td>
      <tr>
      <th style="padding: 8px; border: 1px solid #000; color: #000;">Total Amount</th>
      <td style="padding: 8px; border: 1px solid #000; color: #000;text-align:right;font-weight: bold;">
      USD ${submitBookingData.fareDetails.totalAmount}
    </td>
      </tr>
    
    </tbody>
  </table>
</div>

<div class="need" style=";background: #048c9b;text-align: left;">
      <p style="color: #fff;font-size: 18px; padding:0.5rem">
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

    <div class="need" style=";background: #048c9b;text-align: left;">
      <p style="color: #fff;font-size: 18px; padding:0.5rem">
      Contact Info
      </p>
    </div>
    <div style="width: 100%; overflow-x: auto;">
    <table style="width: 100%; border-collapse: collapse;">
      <thead style="background-color: #f2f2f2;">
        <tr style="text-align:left;">
          <th style="padding: 8px; border: 1px solid #000; color: #000;">Agency Name</th>
          <th style="padding: 8px; border: 1px solid #000; color: #000;">Email Id	</th>
          <th style="padding: 8px; border: 1px solid #000; color: #000;">Customer Care</th>
        </tr>
      </thead>
      <tbody>
        <tr style="text-align:left;">
          <td style="padding: 8px; border: 1px solid #000; color: #000;">
            ${companyName}	
          </td>
          <td style="padding: 8px; border: 1px solid #000; color: #000;">
          <a  style="color:#000;" >${email}</a>
          </td>
          <td style="padding: 8px; border: 1px solid #000; color: #000;">
          <a style="color:#000;" >${phoneNumberweb}</a>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
  <div class="need" style=";background: #048c9b;text-align: left;">
      <p style="color: #fff;font-size: 18px; padding:0.5rem">
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
    <div class="need" style=";background: #048c9b;text-align: left;">
      <p style="color: #fff;font-size: 18px; padding:0.5rem">
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
          segmentIndex % 2 === 0 ? "#fff" : "#f9f9f9"
        };">
        <td style="padding: 8px; border: 1px solid #000; color: #000;">
        <img src="https://cmsrepository.com/static/flights/flight/airlinelogo-png/${itinerary.segments[0].carrierCode.toLowerCase()}.png" style="width:50px" /> <br/> ${fullCarrierName}</td>
          <td style="padding: 8px; border: 1px solid #000; color: #000;">
            <b>${segment.departure.iataCode}</b><br />
            ${formatDate(segment.departure.at)}<br />
          </td>
          <td style="padding: 8px; border: 1px solid #000; color: #000;">
            <b>${segment.arrival.iataCode}</b><br />
            ${formatDate(segment.arrival.at)}
          </td>
          <td style="padding: 8px; border: 1px solid #000; color: #000;">
            ${segment.carrierCode}&nbsp;${segment.number}<br />
          </td>
          <td style="padding: 8px; border: 1px solid #000; color: #000;">
            ${
              submitBookingData.flightData.data[0].travelerPricings[0]
                .fareDetailsBySegment[0].cabinAmount || ""
            }
          </td>
          <td style="padding: 8px; border: 1px solid #000; color: #000;">
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
            <tr style="background-color: #f1f1f1; text-align:left;">
              <th style="padding: 8px; border: 1px solid #000; color: #000;">Serial No.</th>
              <th style="padding: 8px; border: 1px solid #000; color: #000;">Traveller Type</th>
              <th style="padding: 8px; border: 1px solid #000; color: #000;">First Name</th>
              <th style="padding: 8px; border: 1px solid #000; color: #000;">Middle Name</th>
              <th style="padding: 8px; border: 1px solid #000; color: #000;">Last Name</th>
              <th style="padding: 8px; border: 1px solid #000; color: #000;">Gender</th>
              <th style="padding: 8px; border: 1px solid #000; color: #000;">Date</th>
            </tr>
          </thead>
          <tbody>
            ${keys
              .map(
                (key, index) =>
                  `<tr key=${key} style="text-align:left; background-color: ${
                    index % 2 === 0 ? "#fff" : "#f9f9f9"
                  };">
                <td style="padding: 8px; border: 1px solid #000; color: #000;">${
                  index + 1
                }</td>
                <td style="padding: 8px; border: 1px solid #000; color: #000;">${
                  key.startsWith("ADULT")
                    ? "ADT"
                    : key.startsWith("CHILD")
                    ? "CNN"
                    : key.startsWith("HELD_")
                    ? "INF"
                    : ""
                }</td>
                <td style="padding: 8px; border: 1px solid #000; color: #000;">${
                  userInformation[key].firstName
                    ? userInformation[key].firstName.charAt(0).toUpperCase() +
                      userInformation[key].firstName.slice(1)
                    : ""
                }</td>
                <td style="padding: 8px; border: 1px solid #000; color: #000;">${
                  userInformation[key].middleName
                    ? userInformation[key].middleName.charAt(0).toUpperCase() +
                      userInformation[key].middleName.slice(1)
                    : ""
                }</td>
                <td style="padding: 8px; border: 1px solid #000; color: #000;">${
                  userInformation[key].lastName
                    ? userInformation[key].lastName.charAt(0).toUpperCase() +
                      userInformation[key].lastName.slice(1)
                    : ""
                }</td>
                <td style="padding: 8px; border: 1px solid #000; color: #000;">${
                  userInformation[key].gender
                    ? userInformation[key].gender.charAt(0).toUpperCase() +
                      userInformation[key].gender.slice(1)
                    : ""
                }</td>
                <td style="padding: 8px; border: 1px solid #000; color: #000;">${
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
    service: "gmail",
    auth: {
      user: "mahtopankaj300@gmail.com", // Replace with your Gmail address
      pass: "putf rvsx tirx qrkc"
    },
  });
   // user: "support@zustravel.com", // Replace with your Gmail address
      // pass: "wvxf sqlj hxuw dqhe",

  // const transporter = nodemailer.createTransport({
  //   host: 'smtp.zustravel.com', // Replace with your SMTP  server
  //   port: 587, // Replace with your SMTP port
  //   secure: false, // Upgrade later with STARTTLS
  //   auth: {
  //     user: 'support@zustravel.com', // Replace with your email address
  //     pass: 'Jivitesh@201720172017' // Replace with your email password or app-specific password
  //   }
  // });


  // Compose email
  const mailOptions = {
    from: "mahtopankaj300@gmail.com",
    to: submitBookingData.emaiAndId.email, // Replace with the recipient's email address
    subject: `BOOKING IS CANCELLED-${submitBookingData.randomNumber}`,
    bcc: '',
    html: `
    <div style="background: #fff; font-size: 14px;">
		<div class="tem-section">
			<div style="background-color: #fff; padding: 10px; text-align:left;">
				<table width="100%" cellpadding="0" cellspacing="0">
					<tr>
						<td style="text-align: left; width: 50%;">
							<img src="https://www.farehold.com/media/images/logo.png" alt="" style="width: 130px;">
						</td>
						<td style="text-align: right; width: 50%; font-size: 16px;">
							<b>Booking Reference # ${submitBookingData.randomNumber}</b>
						</td>
					</tr>
				</table>
			</div>

			<div class="need" style="background: #048c9b;text-align: right;">
				<p style="color: #fff;font-size: 16px; padding:0.5rem">
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
			<div style="padding: 0rem 0.5rem; background: #048c9b;">
			<div class="need" style=";background: #048c9b;text-align: left;">
					<p style="color: #fff;font-size: 18px; padding:0.5rem">
          Traveler(s) Information
					</p>
				</div>
			</div>
			${userInformationHTML}
		</div>
		<div class="col-12">
			<div class="bg-secondary rounded h-100">
				<div class="need" style=";background: #048c9b;text-align: left;">
					<p style="color: #fff;font-size: 18px; padding:0.5rem">
						Flight Details
					</p>
				</div>
				<div class="table-responsive">
					<div style="overflow-x: auto;">

						<table width="100%" style="border-collapse: collapse; border: 1px solid #000; color: #000;">
							<thead>
								<tr style="background-color: #f1f1f1;text-align:left; " >
									<th style="padding: 8px; border: 1px solid #000; color: #000;">Airline</th>
									<th style="padding: 8px; border: 1px solid #000; color: #000;">Departure</th>
									<th style="padding: 8px; border: 1px solid #000; color: #000;">Arrival</th>
									<th style="padding: 8px; border: 1px solid #000; color: #000;">Flight Details</th>
									<th style="padding: 8px; border: 1px solid #000; color: #000;">Class</th>
									<th style="padding: 8px; border: 1px solid #000; color: #000;">Duration</th>
								</tr>
							</thead>
							${flightDataHTML}
						</table>
					</div>
				</div>
			</div>
		</div>
    <div>

    <div class="need" style=";background: #048c9b;text-align: left;">
      <p style="color: #fff;font-size: 18px; padding:0.5rem">
      Customer Contact
      </p>
    </div>
    <div style="width: 100%; overflow-x: auto;">
    <table style="width: 100%; border-collapse: collapse;">
      <thead style="background-color: #f2f2f2;">
        <tr style="text-align:left;">
          <th style="padding: 8px; border: 1px solid #000; color: #000;">Email Id	</th>
          <th style="padding: 8px; border: 1px solid #000; color: #000;">Customer Care</th>
        </tr>
      </thead>
      <tbody>
        <tr style="text-align:left;">
          <td style="padding: 8px; border: 1px solid #000; color: #000;">
          <a  style="color:#000;" >${submitBookingData.emaiAndId.email}</a>
          </td>
          <td style="padding: 8px; border: 1px solid #000; color: #000;">
          <a style="color:#000;" >${submitBookingData.emaiAndId.phone}</a>
          </td>
        </tr>
      </tbody>
    </table>
  </div>

    <div class="need" style=";background: #048c9b;text-align: left;">
      <p style="color: #fff;font-size: 18px; padding:0.5rem">
      Price Info
      </p>
    </div>
    <div style="width: 100%; overflow-x: auto;">
  <table style="width: 100%; border-collapse: collapse;">
    <thead style="background-color: #f2f2f2;">
      
    </thead>
    <tbody style="text-align:left;">
      <tr>
      <th style="padding: 8px; border: 1px solid #000; color: #000;">Base Amount</th>
        <td style="padding: 8px; border: 1px solid #000; color: #000;text-align:right;font-weight: bold;">
          USD ${submitBookingData.fareDetails.travelerDetails[0].totalAmount}
        </td>
      </tr>
      <tr>
      <th style="padding: 8px; border: 1px solid #000; color: #000;">Main Cabin</th>
      <td style="padding: 8px; border: 1px solid #000; color: #000;text-align:right;font-weight: bold;">
      ${submitBookingData.fareDetails.cabinAmount ? `USD ${submitBookingData.fareDetails.cabinAmount}` : "No"}
            </td>
      </tr>
      <th style="padding: 8px; border: 1px solid #000; color: #000;">Taxes and Fees</th>
      <td style="padding: 8px; border: 1px solid #000; color: #000;text-align:right;font-weight: bold;">
      USD ${submitBookingData.fareDetails.travelerDetails[0].taxAmount}
    </td>
      <tr>
      <th style="padding: 8px; border: 1px solid #000; color: #000;">Total Amount</th>
      <td style="padding: 8px; border: 1px solid #000; color: #000;text-align:right;font-weight: bold;">
      USD ${submitBookingData.fareDetails.totalAmount}
    </td>
      </tr>
    
    </tbody>
  </table>
</div>

<div class="need" style=";background: #048c9b;text-align: left;">
      <p style="color: #fff;font-size: 18px; padding:0.5rem">
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

    <div class="need" style=";background: #048c9b;text-align: left;">
      <p style="color: #fff;font-size: 18px; padding:0.5rem">
      Contact Info
      </p>
    </div>
    <div style="width: 100%; overflow-x: auto;">
    <table style="width: 100%; border-collapse: collapse;">
      <thead style="background-color: #f2f2f2;">
        <tr style="text-align:left;">
          <th style="padding: 8px; border: 1px solid #000; color: #000;">Agency Name</th>
          <th style="padding: 8px; border: 1px solid #000; color: #000;">Email Id	</th>
          <th style="padding: 8px; border: 1px solid #000; color: #000;">Customer Care</th>
        </tr>
      </thead>
      <tbody>
        <tr style="text-align:left;">
          <td style="padding: 8px; border: 1px solid #000; color: #000;">
            ${companyName}	
          </td>
          <td style="padding: 8px; border: 1px solid #000; color: #000;">
          <a  style="color:#000;" >${email}</a>
          </td>
          <td style="padding: 8px; border: 1px solid #000; color: #000;">
          <a style="color:#000;" >${phoneNumberweb}</a>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
  <div class="need" style=";background: #048c9b;text-align: left;">
      <p style="color: #fff;font-size: 18px; padding:0.5rem">
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
    <div class="need" style=";background: #048c9b;text-align: left;">
      <p style="color: #fff;font-size: 18px; padding:0.5rem">
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
          segmentIndex % 2 === 0 ? "#fff" : "#f9f9f9"
        };">
        <td style="padding: 8px; border: 1px solid #000; color: #000;">
        <img src="https://cmsrepository.com/static/flights/flight/airlinelogo-png/${itinerary.segments[0].carrierCode.toLowerCase()}.png" style="width:50px" /> <br/> ${fullCarrierName}</td>
          <td style="padding: 8px; border: 1px solid #000; color: #000;">
            <b>${segment.departure.iataCode}</b><br />
            ${formatDate(segment.departure.at)}<br />
          </td>
          <td style="padding: 8px; border: 1px solid #000; color: #000;">
            <b>${segment.arrival.iataCode}</b><br />
            ${formatDate(segment.arrival.at)}
          </td>
          <td style="padding: 8px; border: 1px solid #000; color: #000;">
            ${segment.carrierCode}&nbsp;${segment.number}<br />
          </td>
          <td style="padding: 8px; border: 1px solid #000; color: #000;">
            ${
              submitBookingData.flightData.data[0].travelerPricings[0]
                .fareDetailsBySegment[0].cabinAmount || ""
            }
          </td>
          <td style="padding: 8px; border: 1px solid #000; color: #000;">
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
            <tr style="background-color: #f1f1f1; text-align:left;">
              <th style="padding: 8px; border: 1px solid #000; color: #000;">Serial No.</th>
              <th style="padding: 8px; border: 1px solid #000; color: #000;">Traveller Type</th>
              <th style="padding: 8px; border: 1px solid #000; color: #000;">First Name</th>
              <th style="padding: 8px; border: 1px solid #000; color: #000;">Middle Name</th>
              <th style="padding: 8px; border: 1px solid #000; color: #000;">Last Name</th>
              <th style="padding: 8px; border: 1px solid #000; color: #000;">Gender</th>
              <th style="padding: 8px; border: 1px solid #000; color: #000;">Date</th>
            </tr>
          </thead>
          <tbody>
            ${keys
              .map(
                (key, index) =>
                  `<tr key=${key} style="text-align:left; background-color: ${
                    index % 2 === 0 ? "#fff" : "#f9f9f9"
                  };">
                <td style="padding: 8px; border: 1px solid #000; color: #000;">${
                  index + 1
                }</td>
                <td style="padding: 8px; border: 1px solid #000; color: #000;">${
                  key.startsWith("ADULT")
                    ? "ADT"
                    : key.startsWith("CHILD")
                    ? "CNN"
                    : key.startsWith("HELD_")
                    ? "INF"
                    : ""
                }</td>
                <td style="padding: 8px; border: 1px solid #000; color: #000;">${
                  userInformation[key].firstName
                    ? userInformation[key].firstName.charAt(0).toUpperCase() +
                      userInformation[key].firstName.slice(1)
                    : ""
                }</td>
                <td style="padding: 8px; border: 1px solid #000; color: #000;">${
                  userInformation[key].middleName
                    ? userInformation[key].middleName.charAt(0).toUpperCase() +
                      userInformation[key].middleName.slice(1)
                    : ""
                }</td>
                <td style="padding: 8px; border: 1px solid #000; color: #000;">${
                  userInformation[key].lastName
                    ? userInformation[key].lastName.charAt(0).toUpperCase() +
                      userInformation[key].lastName.slice(1)
                    : ""
                }</td>
                <td style="padding: 8px; border: 1px solid #000; color: #000;">${
                  userInformation[key].gender
                    ? userInformation[key].gender.charAt(0).toUpperCase() +
                      userInformation[key].gender.slice(1)
                    : ""
                }</td>
                <td style="padding: 8px; border: 1px solid #000; color: #000;">${
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
    service: "gmail",
    auth: {
      user: "mahtopankaj300@gmail.com", // Replace with your Gmail address
      pass: "putf rvsx tirx qrkc"
    },
  });
   // user: "support@zustravel.com", // Replace with your Gmail address
      // pass: "wvxf sqlj hxuw dqhe",

  // const transporter = nodemailer.createTransport({
  //   host: 'smtp.zustravel.com', // Replace with your SMTP  server
  //   port: 587, // Replace with your SMTP port
  //   secure: false, // Upgrade later with STARTTLS
  //   auth: {
  //     user: 'support@zustravel.com', // Replace with your email address
  //     pass: 'Jivitesh@201720172017' // Replace with your email password or app-specific password
  //   }
  // });


  // Compose email
  const mailOptions = {
    from: "mahtopankaj300@gmail.com",
    to: submitBookingData.emaiAndId.email, // Replace with the recipient's email address
    subject: `BOOKING IS ISSUED-${submitBookingData.randomNumber}`,
    bcc: '',
    html: `
    <div style="background: #fff; font-size: 14px;">
		<div class="tem-section">
			<div style="background-color: #fff; padding: 10px; text-align:left;">
				<table width="100%" cellpadding="0" cellspacing="0">
					<tr>
						<td style="text-align: left; width: 50%;">
							<img src="https://www.${companyName}.com/media/images/logo.png" alt="" style="width: 130px;">
						</td>
						<td style="text-align: right; width: 50%; font-size: 16px;">
							<b>Booking Reference # ${submitBookingData.randomNumber}</b>
						</td>
					</tr>
				</table>
			</div>

			<div class="need" style="background: #048c9b;text-align: right;">
				<p style="color: #fff;font-size: 16px; padding:0.5rem">
					Need help, Our 24x7 Toll Free Support: <a style="text-decoration: none;" ><b style="color:#fff;">${phoneNumberweb}</b></a> 
				</p>
			</div>
			<div class="book-para">
				<p>
					Your Booking is  <b>SuccesFully</b> with booking reference # <b>${submitBookingData.randomNumber}</b>
				</p>
				<p>
					If any query please contact our customer support at <a ><b style="color:#000;">${phoneNumberweb}</b></a> or send us an email at <a ><b style="color:#000;">${email}</b></a> and one of our travel expert will be pleased to assist you.In Such unlikely event, if your tickets cannot be processed for any reason you will be notified via email or by telephone and your payment will NOT be processed.
				</p>
			</div>
			<div style="padding: 0rem 0.5rem; background: #048c9b;">
			<div class="need" style=";background: #048c9b;text-align: left;">
					<p style="color: #fff;font-size: 18px; padding:0.5rem">
          Traveler(s) Information
					</p>
				</div>
			</div>
			${userInformationHTML}
		</div>
		<div class="col-12">
			<div class="bg-secondary rounded h-100">
				<div class="need" style=";background: #048c9b;text-align: left;">
					<p style="color: #fff;font-size: 18px; padding:0.5rem">
						Flight Details
					</p>
				</div>
				<div class="table-responsive">
					<div style="overflow-x: auto;">

						<table width="100%" style="border-collapse: collapse; border: 1px solid #000; color: #000;">
							<thead>
								<tr style="background-color: #f1f1f1;text-align:left; " >
									<th style="padding: 8px; border: 1px solid #000; color: #000;">Airline</th>
									<th style="padding: 8px; border: 1px solid #000; color: #000;">Departure</th>
									<th style="padding: 8px; border: 1px solid #000; color: #000;">Arrival</th>
									<th style="padding: 8px; border: 1px solid #000; color: #000;">Flight Details</th>
									<th style="padding: 8px; border: 1px solid #000; color: #000;">Class</th>
									<th style="padding: 8px; border: 1px solid #000; color: #000;">Duration</th>
								</tr>
							</thead>
							${flightDataHTML}
						</table>
					</div>
				</div>
			</div>
		</div>
    <div>

    <div class="need" style=";background: #048c9b;text-align: left;">
      <p style="color: #fff;font-size: 18px; padding:0.5rem">
      Customer Contact
      </p>
    </div>
    <div style="width: 100%; overflow-x: auto;">
    <table style="width: 100%; border-collapse: collapse;">
      <thead style="background-color: #f2f2f2;">
        <tr style="text-align:left;">
          <th style="padding: 8px; border: 1px solid #000; color: #000;">Email Id	</th>
          <th style="padding: 8px; border: 1px solid #000; color: #000;">Customer Care</th>
        </tr>
      </thead>
      <tbody>
        <tr style="text-align:left;">
          <td style="padding: 8px; border: 1px solid #000; color: #000;">
          <a  style="color:#000;" >${submitBookingData.emaiAndId.email}</a>
          </td>
          <td style="padding: 8px; border: 1px solid #000; color: #000;">
          <a style="color:#000;" >${submitBookingData.emaiAndId.phone}</a>
          </td>
        </tr>
      </tbody>
    </table>
  </div>

    <div class="need" style=";background: #048c9b;text-align: left;">
      <p style="color: #fff;font-size: 18px; padding:0.5rem">
      Price Info
      </p>
    </div>
    <div style="width: 100%; overflow-x: auto;">
  <table style="width: 100%; border-collapse: collapse;">
    <thead style="background-color: #f2f2f2;">
      
    </thead>
    <tbody style="text-align:left;">
      <tr>
      <th style="padding: 8px; border: 1px solid #000; color: #000;">Base Amount</th>
        <td style="padding: 8px; border: 1px solid #000; color: #000;text-align:right;font-weight: bold;">
          USD ${submitBookingData.fareDetails.travelerDetails[0].totalAmount}
        </td>
      </tr>
      <tr>
      <th style="padding: 8px; border: 1px solid #000; color: #000;">Main Cabin</th>
      <td style="padding: 8px; border: 1px solid #000; color: #000;text-align:right;font-weight: bold;">
        ${submitBookingData.fareDetails.cabinAmount ? `USD ${submitBookingData.fareDetails.cabinAmount}` : "No"}
      </td>
      </tr>
      <th style="padding: 8px; border: 1px solid #000; color: #000;">Taxes and Fees</th>
      <td style="padding: 8px; border: 1px solid #000; color: #000;text-align:right;font-weight: bold;">
      USD ${submitBookingData.fareDetails.travelerDetails[0].taxAmount}
    </td>
      <tr>
      <th style="padding: 8px; border: 1px solid #000; color: #000;">Total Amount</th>
      <td style="padding: 8px; border: 1px solid #000; color: #000;text-align:right;font-weight: bold;">
      USD ${submitBookingData.fareDetails.totalAmount}
    </td>
      </tr>
    
    </tbody>
  </table>
</div>

<div class="need" style=";background: #048c9b;text-align: left;">
      <p style="color: #fff;font-size: 18px; padding:0.5rem">
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

    <div class="need" style=";background: #048c9b;text-align: left;">
      <p style="color: #fff;font-size: 18px; padding:0.5rem">
      Contact Info
      </p>
    </div>
    <div style="width: 100%; overflow-x: auto;">
    <table style="width: 100%; border-collapse: collapse;">
      <thead style="background-color: #f2f2f2;">
        <tr style="text-align:left;">
          <th style="padding: 8px; border: 1px solid #000; color: #000;">Agency Name</th>
          <th style="padding: 8px; border: 1px solid #000; color: #000;">Email Id	</th>
          <th style="padding: 8px; border: 1px solid #000; color: #000;">Customer Care</th>
        </tr>
      </thead>
      <tbody>
        <tr style="text-align:left;">
          <td style="padding: 8px; border: 1px solid #000; color: #000;">
            ${companyName}	
          </td>
          <td style="padding: 8px; border: 1px solid #000; color: #000;">
          <a  style="color:#000;" >${email}</a>
          </td>
          <td style="padding: 8px; border: 1px solid #000; color: #000;">
          <a style="color:#000;" >${phoneNumberweb}</a>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
  <div class="need" style=";background: #048c9b;text-align: left;">
      <p style="color: #fff;font-size: 18px; padding:0.5rem">
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
    <div class="need" style=";background: #048c9b;text-align: left;">
      <p style="color: #fff;font-size: 18px; padding:0.5rem">
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
  Booking.find({ bookingColor: "red" }) // Retrieve only bookings with bookingColor as "yellow"
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
  Booking.find({ $or: [{ bookingColor: "green" }, { bookingColor: "" }] }) // Retrieve bookings with bookingColor as "green" or empty
    .sort({ _id: -1 })
    .then((data) => {
      res.json(data);
    })
    .catch((err) => {
      console.error(err);
      res.status(500).json({ error: "Failed to fetch data from MongoDB" });
    });
});



const port = process.env.PORT || 5000; // Use environment variable or default to port 5000
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});


