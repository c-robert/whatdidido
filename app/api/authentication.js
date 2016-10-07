const jwt         = require('jsonwebtoken');  
const crypto      = require('crypto');
const User        = require('../models/user');
const config      = require('../../config/main');

function generateToken(user) {  
  return jwt.sign(user, config.secret, {
    expiresIn: 10080 // in seconds
  });
}

// Set user info from request
function setUserInfo(request) {  
  return {
    _id: request._id,
    displayName: request.displayName,
    email: request.local.email
  };
}

function generateCode() {
  let code = 0;
  for (var i = 0; i < 6; i++) {
    code = (code * 10) + (Math.random() % 10);
  }
  return code;
}

//========================================
// Login Route
//========================================
exports.login = function(req, res, next) {
  let userInfo = setUserInfo(req.user);

  res.status(200).json({
    token: 'JWT ' + generateToken(userInfo),
    user: userInfo
  });
}

//========================================
// Registration Route
//========================================
exports.register = function(req, res, next) {  
  // Check for registration errors
  const email = req.body.email;
  const displayName = req.body.displayName;
  const password = req.body.password;
  const timeZone = req.body.timeZone;

  // Return error if no email provided
  if (!email) {
    return res.status(422).send({ error: 'You must enter an email address.'});
  }

  // Return error if full name not provided
  if (!displayName) {
    return res.status(422).send({ error: 'You must enter a display name.'});
  }

  // Return error if no password provided
  if (!password) {
    return res.status(422).send({ error: 'You must enter a password.' });
  }

  // Return error if no time zone provided
  if (!timeZone) {
    return res.status(422).send({ error: 'You must enter a time zone.'});
  }

  User.findOne({ 'local.email': email }, function(err, existingUser) {
      if (err) { return next(err); }

      // If user is not unique, return error
      if (existingUser) {
        return res.status(422).send({ error: 'That email address is already in use.' });
      }

      // If email is unique and password was provided, create account
      let user = new User({
        displayName: displayName,
        timeZone: timeZone,
        local: {
          email: email, 
          password: password, 
          verified: false, 
          code: generateCode()
        }
      });

      user.save(function(err, user) {
        if (err) { return next(err); }

        // Respond with JWT if user was created
        let userInfo = setUserInfo(user);

        res.status(201).json({
          token: 'JWT ' + generateToken(userInfo),
          user: userInfo
        });
      });
  });
}