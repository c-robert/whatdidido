// app/models/category.js
var mongoose = require('mongoose')

// define the schema for our category model
var categorySchema = mongoose.Schema({
  name: String,
  user: {type: mongoose.Schema.Types.ObjectId, ref: 'User'},
  code: String,
  context: String,
  concurrent: Boolean, // Events associated with a concurrent category can show up at the same time
  timeout: Number      // Number of milliseconds before an instance of the event associated with this category is considered done
})

module.exports = mongoose.model('Category', categorySchema)
