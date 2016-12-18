const AuthenticationController = require('./api/authentication')
const EventsController = require('./api/events')
const express = require('express')
require('../config/passport')
const passport = require('passport')

// Middleware to require login/auth
const requireAuth = passport.authenticate('jwt', { session: false })
const requireLogin = passport.authenticate('local', { session: false })

module.exports = function (app) {
  // Initializing route groups
  const apiRoutes = express.Router()
  const authRoutes = express.Router()
  const eventRoutes = express.Router()

  // =========================
  // Auth Routes
  // =========================

  // Set auth routes as subgroup/middleware to apiRoutes
  apiRoutes.use('/auth', authRoutes)

  // Registration route
  authRoutes.post('/register', AuthenticationController.register)

  // Login route
  authRoutes.post('/login', requireLogin, AuthenticationController.login)

  // =========================
  // Events Routes
  // =========================
  apiRoutes.use('/events', eventRoutes)

  // Submit event route
  eventRoutes.post('/submit', requireAuth, EventsController.submit)

  // Set url for API group routes
  app.use('/api', apiRoutes)
}
