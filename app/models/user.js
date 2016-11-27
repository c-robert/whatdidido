// app/models/user.js
const mongoose = require('mongoose')
const bcrypt = require('bcrypt-nodejs')

// define the schema for our user model
const userSchema = mongoose.Schema({
  displayName: String,
  timeZone: String,
  local: {
    email: {
      type: String,
      lowercase: true,
      unique: true,
      required: true
    },
    password: {
      type: String,
      required: true
    },
    verified: Boolean,
    code: Number
  }
},
  {
    timestamps: true
  })

// Pre-save of user to database, hash password if password is modified or new
userSchema.pre('save', function (next) {
  const user = this
  const SALT_FACTOR = 8

  if (!user.isModified('local.password')) return next()

  bcrypt.genSalt(SALT_FACTOR, function (err, salt) {
    if (err) return next(err)

    bcrypt.hash(user.local.password, salt, null, function (err, hash) {
      if (err) return next(err)
      user.local.password = hash
      next()
    })
  })
})

// checking if password is valid
// Method to compare password for login
userSchema.methods.comparePassword = function (candidatePassword, cb) {
  bcrypt.compare(candidatePassword, this.local.password, function (err, isMatch) {
    if (err) { return cb(err) }

    cb(null, isMatch)
  })
}

module.exports = mongoose.model('User', userSchema)
