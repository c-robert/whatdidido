// app/models/event.js
var mongoose = require('mongoose')

// define the schema for our event model
var eventSchema = mongoose.Schema({
  count: {
    type: Number,    // Count of how many times in a row this event has occurred.
    required: true
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  category: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category',
    required: true
  }
},
  {
    timestamps: true
  })

module.exports = mongoose.model('Event', eventSchema)
