const config = require('./config/main.js')
const configDB = require('./config/database.js')
const mongoose = require('mongoose')
const express = require('express')
const logger = require('morgan')
const bodyParser = require('body-parser')
const app = express()
const router = require('./app/router')

// //////////////////////////////////////
// Configuration
// //////////////////////////////////////
mongoose.Promise = global.Promise
mongoose.connect(configDB.database) // connect to our database

// Start the server
const server = app.listen(config.port)

// Set up server middleware
app.use(logger('dev'))   // Log requests to API using morgan

// Enable CORS from client-side
app.use(function (req, res, next) {
  res.header('Access-Control-Allow-Origin', '*')
  res.header('Access-Control-Allow-Methods', 'PUT, GET, POST, DELETE, OPTIONS')
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization, Access-Control-Allow-Credentials')
  res.header('Access-Control-Allow-Credentials', 'true')
  next()
})

// Set up our body parser
app.use(bodyParser.urlencoded({extended: false}))
app.use(bodyParser.json())

router(app)

console.log('Server is running on port', config.port)
