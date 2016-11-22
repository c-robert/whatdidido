const assert = require('assert')
const sinon = require('sinon')
const jwt = require('jsonwebtoken')
const config = require('../config/main')
const authentication = require('../app/api/authentication')

var mongoose = require('mongoose')
mongoose.Promise = global.Promise

const User = require('../app/models/user')

describe('Authentication', function () {
  describe('POST login', function () {
    it('should return a JWT', function () {
      var req = {
        user: {
          _id: '12345',
          displayName: 'Test User',
          local: {
            email: 'test@test.com'
          }
        }
      }
      var res = {}
      var json = { json: sinon.spy() }
      var statusStub = res.status = sinon.stub().returns(json)
      authentication.login(req, res)
      sinon.assert.calledWith(statusStub, 200)
      var tokenObject = json.json.args[0][0]
      assert(tokenObject)
      assert(tokenObject.token)
      assert(tokenObject.user)
      var tokenInfo = jwt.verify(tokenObject.token.substring(4), config.secret)
      assert.equal(tokenInfo._id, '12345')
      assert.equal(tokenInfo.displayName, 'Test User')
      assert.equal(tokenInfo.email, 'test@test.com')
    })
  })

  describe('POST register', function () {
    var req = {
      body: {
      }
    }
    var res = {}
    var send = { send: sinon.spy() }
    var statusStub = res.status = sinon.stub().returns(send)

    it('should fail if no email address', function () {
      send.send.reset()
      req.body = {}
      authentication.register(req, res)
      sinon.assert.calledWith(statusStub, 422)
      var error = send.send.args[0][0]
      assert(error.error.indexOf('email') > 0)
    })

    it('should fail if no display name', function () {
      send.send.reset()
      req.body = {
        email: 'test@test.com'
      }
      authentication.register(req, res)
      sinon.assert.calledWith(statusStub, 422)
      var error = send.send.args[0][0]
      assert(error.error.indexOf('display name') > 0)
    })

    it('should fail if no password', function () {
      send.send.reset()
      req.body = {
        email: 'test@test.com',
        displayName: 'Test User'
      }
      authentication.register(req, res)
      sinon.assert.calledWith(statusStub, 422)
      var error = send.send.args[0][0]
      assert(error.error.indexOf('password') > 0)
    })

    it('should fail if no time zone', function () {
      send.send.reset()
      req.body = {
        email: 'test@test.com',
        displayName: 'Test User',
        password: '12345'
      }
      authentication.register(req, res)
      sinon.assert.calledWith(statusStub, 422)
      var error = send.send.args[0][0]
      assert(error.error.indexOf('time zone') > 0)
    })

    it('should fail if there is an existing user', function () {
      send.send.reset()
      req.body = {
        email: 'test@test.com',
        displayName: 'Test User',
        password: '12345',
        timeZone: 'UTC'
      }
      var findOne = sinon.spy(User, 'findOne')
      authentication.register(req, res)
      // Call the callback function
      findOne.args[0][1](null, true)
      findOne.restore()
      sinon.assert.calledOnce(findOne)
      sinon.assert.calledWith(statusStub, 422)
      var error = send.send.args[0][0]
      assert(error.error.indexOf('already in use') > 0)
      findOne.restore()
    })

    it('should return a JWT for the newly created user', function (done) {
      send.send.reset()
      req.body = {
        email: 'test@test.com',
        displayName: 'Test User',
        password: '12345',
        timeZone: 'UTC'
      }

      // Set up some stubs
      var findOne = sinon.stub(User, 'findOne')
      findOne.callsArg(1)
      var save = sinon.stub(User.prototype, 'save')
      save.callsArgWith(0, null, {_id: '12345', displayName: 'Test User', local: {email: 'test@test.com'}})
      var json = {
        json: function (tokenObject) {
          assert(tokenObject)
          assert(tokenObject.token)
          assert(tokenObject.user)
          var tokenInfo = jwt.verify(tokenObject.token.substring(4), config.secret)
          assert.equal(tokenInfo._id, '12345')
          assert.equal(tokenInfo.displayName, 'Test User')
          assert.equal(tokenInfo.email, 'test@test.com')
          done()
        }
      }
      res.status = function (code) {
        // This isn't working, need to figure out why it's being called later
        sinon.assert.calledOnce(save)
        save.restore()
        assert(code === 201)
        return json
      }

      // Make the request
      authentication.register(req, res)
      sinon.assert.calledOnce(findOne)
      findOne.restore()
    })

    it('should return reject an existing user', function () {
      send.send.reset()
      req.body = {
        email: 'test@test.com',
        displayName: 'Test User',
        password: '12345',
        timeZone: 'UTC'
      }

      // Set up some stubs
      var findOne = sinon.stub(User, 'findOne')
      findOne.callsArgWith(1, null, {_id: '0123456789'})
      res.status = function (code) {
        // This isn't working, need to figure out why it's being called later
        assert(code === 422)

        return {
          send: function (json) {}
        }
      }

      // Make the request
      authentication.register(req, res)
      sinon.assert.calledOnce(findOne)
      findOne.restore()
    })

    it('should continue if there is an error finding an existing user', function () {
      send.send.reset()
      req.body = {
        email: 'test@test.com',
        displayName: 'Test User',
        password: '12345',
        timeZone: 'UTC'
      }

      // Set up some stubs
      var findOne = sinon.stub(User, 'findOne')
      findOne.callsArgWith(1, 'error', null)
      var nextStub = sinon.stub()

      // Make the request
      authentication.register(req, res, nextStub)
      sinon.assert.calledOnce(findOne)
      sinon.assert.calledOnce(nextStub)
      findOne.restore()
    })

    it('should continue if it failes to save a new user', function (done) {
      send.send.reset()
      req.body = {
        email: 'test@test.com',
        displayName: 'Test User',
        password: '12345',
        timeZone: 'UTC'
      }

      // Set up some stubs
      var findOne = sinon.stub(User, 'findOne')
      findOne.callsArg(1)
      var save = sinon.stub(User.prototype, 'save')
      save.callsArgWith(0, 'error', null)

      // Make the request
      authentication.register(req, res, function () {
        findOne.restore()
        save.restore()
        done()
      })
      sinon.assert.calledOnce(findOne)
    })
  })
})
