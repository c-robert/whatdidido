// app/models/event.js
var mongoose = require('mongoose');

// define the schema for our event model
var eventSchema = mongoose.Schema({
    // TODO Probably better to use the timestamps schema option
    start             : Date,   // First time this event was registered
    last              : Date,   // Last time the event was registered - not necessarily the end of the event
    user              : {type: mongoose.Schema.Types.ObjectId, ref: 'User'},
    category          : {type: mongoose.Schema.Types.ObjectId, ref: 'Category'},
});

module.exports = mongoose.model('Event', eventSchema);
