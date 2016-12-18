// app/models/category.js
var mongoose = require('mongoose')

// define the schema for our category model
var categorySchema = mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  start: {
    type: Boolean,    // Set as 'true' if events from this category are 'start' events and 'false' if they are 'stop' events.
    required: true,
    default: true
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    ref: 'User'
  },
  code: {             // User assignable data associating a code with the event.
    type: String,
    required: false
  },
  context: {          // User assignable data associating a context with the event.
    type: String,
    required: false
  }
})

module.exports = mongoose.model('Category', categorySchema)
