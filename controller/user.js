const userModel = require('../models/user.js')
// const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer')

const bcrypt = require('bcrypt');

const jwt = require('jsonwebtoken');

const secretKey = 'your-secret-key'; 

const saltRounds = 10; // This determines the strength of the hashing

// const ApiFeatures = require('../untils/apifeature.js')




module.exports.signup = async (req, res) => {
  try {
    // Check if the user already exists
    const existingUser = await userModel.findOne({
      $or: [
        { name: { $regex: new RegExp(req.body.name, "i") } },
        { email: { $regex: new RegExp(req.body.email, "i") } },
      ],
    });

    if (existingUser) {
      // User already exists
      return res.status(400).json({
        code: 400,
        message: "User already exists",
      });
    }

    if (req.body.role.toLowerCase() === 'superadmin') {
            const superAdminExists = await userModel.exists({ role: 'superadmin' });
            if (superAdminExists) {
              return res.status(400).json({
                code: 400,
                message: "Superadmin already exists",
              });
            }
          }

    // User does not exist, so proceed with registration
    const hashedPassword = await bcrypt.hash(req.body.password, saltRounds);

    const newUser = new userModel({
      name: req.body.name,
      email: req.body.email,
      password: hashedPassword, // Save the hashed password
      role: req.body.role,
    });

    await newUser.save();

    return res.status(200).json({ code: 200, message: "Signup success" });
  } catch (error) {
    return res.status(500).json({ code: 500, message: "Signup failed", error: error.message });
  }
};







module.exports.login = async (req, res) => {
  try {
    const { name, password } = req.body;

    // Find a user by name in the userModel
    const user = await userModel.findOne({ name });

    if (!user) {
      return res.status(404).json({ code: 404, message: 'User Not Found' });
    }

    // Compare the provided password with the hashed password in the database
    const passwordMatch = await bcrypt.compare(password, user.password);

    if (!passwordMatch) {
      return res.status(404).json({ code: 404, message: 'Password Wrong' });
    }

    // Passwords match, generate JWT token
    const token = jwt.sign({ userId: user._id, name: user.name }, secretKey, { expiresIn: '1h' });

    return res.status(200).json({
      code: 200,
      message: 'Login successful',
      token,
      name: user.name,
      role: user.role,
      email: user.email,
      // password: user.password, 
    });
  } catch (error) {
    return res.status(500).json({ code: 500, message: 'Server Error', error: error.message });
  }
};




// module.exports.sendotp = (req,res)=>{
//   console.log(req.body);
//   // const otpGenerator=require('generate-otp');
//   // const OTP_LENGTH=6;
//   // const otp=otpGenerator.generateOTP(OTP_LENGTH,{digitsOnly : true});
//   // console.log("Otp is "+otp);
//   const otp = '1234'
//   userModel.findOne({email:req.body.email}).then(result =>{
//     res.send({code:200,message:'OTP Send'})
//   }).catch(err=>{
//     res.send({code:500, message: 'User Not Found'})
// })
  
// }




module.exports.sendotp = async (req, res) => {
  console.log(req.body)
  const _otp = Math.floor(100000 + Math.random() * 900000)
  console.log(_otp)
  let user = await userModel.findOne({ email: req.body.email })
  // send to user mail
  if (!user) {
      res.send({ code: 500, message: 'user not found' })
  }

  let testAccount = await nodemailer.createTestAccount()

  let transporter = nodemailer.createTransport({
      host: "smtp.ethereal.email",
      port: 587,
      secure: false,
      auth: {
          user: testAccount.user,
          pass: testAccount.pass
      }
  })


  


  let info = await transporter.sendMail({
      from: 'mahtopankaj300@gmail.com',
      to: req.body.email, // list of receivers
      subject: "OTP", // Subject line
      text: String(_otp),
      html: `<html>
          < body >
          Hello and welcome
      </ >
     </html > `,
  })

  if (info.messageId) {

      console.log(info, 84)
      userModel.updateOne({ email: req.body.email }, { otp: _otp })
          .then(result => {
              res.send({ code: 200, message: 'otp send' })
          })
          .catch(err => {
              res.send({ code: 500, message: 'Server err' })

          })

  } else {
      res.send({ code: 500, message: 'Server err' })
  }
}




module.exports.submitotp = (req, res) => {
  console.log(req.body)


  userModel.findOne({ otp: req.body.otp }).then(result => {

      //  update the password 

      userModel.updateOne({ email: result.email }, { password: req.body.password })
          .then(result => {
              res.send({ code: 200, message: 'Password updated' })
          })
          .catch(err => {
              res.send({ code: 500, message: 'Server err' })

          })


  }).catch(err => {
      res.send({ code: 500, message: 'otp is wrong' })

  })


}


exports.getAllUsers = async (req, res) => {
  try {
    const users = await userModel.find(); // Fetch all users from the database
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching users' });
  }
};

exports.agents = async (req, res) => {
  try {
    const resultPerPage = 20;
    const page = req.query.page || 1;
    const searchKeyword = req.query.search || '';

    // Apply search logic to your MongoDB query
    const query = userModel.find({ name: { $regex: searchKeyword, $options: 'i' } });

    // Get total count of all data that matches the search
    const totalCount = await userModel.countDocuments({ name: { $regex: searchKeyword, $options: 'i' } });

    // Apply pagination
    const users = await query.skip((page - 1) * resultPerPage).limit(resultPerPage).exec();

    // Calculate total pages
    const totalPages = Math.ceil(totalCount / resultPerPage);

    res.json({
      users,
      totalPages,
      totalCount
    });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching users', error: error.message });
  }
};




exports.updateUserById = async (req, res) => {
  try {
    const userId = req.params.id; // Get the user ID from the request parameters
    const { name, email, password } = req.body; // Get the updated data from the request body

    // Find the user to be updated
    const userToUpdate = await userModel.findById(userId);

    if (!userToUpdate) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Check if the name or email already exists for another user
    const existingUserWithEmail = await userModel.findOne({ email: email, _id: { $ne: userId } });
    const existingUserWithName = await userModel.findOne({ name: name, _id: { $ne: userId } });

    if (existingUserWithEmail || existingUserWithName) {
      return res.status(400).json({ message: 'Name or Email already exists for another user' });
    }

    // Update the user data if the provided name and email are unique
    const updatedUserData = {};

    if (name) {
      updatedUserData.name = name;
    }
    if (email) {
      updatedUserData.email = email;
    }
    if (password) {
      const hashedPassword = await bcrypt.hash(password, saltRounds);
      updatedUserData.password = hashedPassword;
    }

    const updatedUser = await userModel.findByIdAndUpdate(userId, updatedUserData, { new: true });

    res.json(updatedUser); // Send the updated user data as JSON
  } catch (error) {
    res.status(500).json({ message: 'Error updating user', error: error.message });
  }
};

exports.getUserById = async (req, res) => {
  try {
    const userId = req.params.id; // Get the user ID from the request parameters
    const user = await userModel.findById(userId);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json(user); // Send the user data as JSON
  } catch (error) {
    res.status(500).json({ message: 'Error finding user', error: error.message });
  }
};









// put  code
// exports.updateAgentById = async (req, res) => {
//   try {
//     const agentId = req.params.id; // Get the agent ID from the request parameters
//     const { name, email, password } = req.body; // Get the updated data from the request body

//     const hashedPassword = await bcrypt.hash(password, saltRounds);

//     const updatedAgentData = {
//       name: name,
//       email: email,
//       password: hashedPassword,
//     };

//     const updatedAgent = await userModel.findByIdAndUpdate(agentId, updatedAgentData, { new: true });

//     if (!updatedAgent) {
//       return res.status(404).json({ message: 'Agent not found' });
//     }

//     res.json(updatedAgent); // Send the updated agent data as JSON
//   } catch (error) {
//     res.status(500).json({ message: 'Error updating agent', error: error.message });
//   }
// };


exports.updateAgentById = async (req, res) => {
  try {
    const agentId = req.params.id; // Get the agent ID from the request parameters
    const { name, email, password, role } = req.body; // Get the updated data from the request body

    const hashedPassword = await bcrypt.hash(password, saltRounds);

    const updatedAgentData = {
      name: name,
      email: email,
      password: hashedPassword,
      role: role, // Include the 'role' field in the update
    };

    const updatedAgent = await userModel.findByIdAndUpdate(agentId, updatedAgentData, { new: true });

    if (!updatedAgent) {
      return res.status(404).json({ message: 'Agent not found' });
    }

    res.json(updatedAgent); // Send the updated agent data as JSON
  } catch (error) {
    res.status(500).json({ message: 'Error updating agent', error: error.message });
  }
};






exports.deleteAgentById = async (req, res) => {
  try {
    const userId = req.params.id; // Get the user ID from the request parameters

    // Find the user by ID and delete
    const deletedUser = await userModel.findByIdAndDelete(userId);

    if (!deletedUser) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.status(200).json({ message: 'User deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting user', error: error.message });
  }
};

