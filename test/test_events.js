const assert = require('assert')
const sinon = require('sinon')
const config = require('../config/main')
const events = require('../app/api/events')

const express = require('express')
const bodyParser = require('body-parser')

const mongoose = require('mongoose')
mongoose.Promise = global.Promise

require('sinon-mongoose')
require('sinon-as-promised')

const Event = require('../app/models/event')
const Category = require('../app/models/category')

const userId = mongoose.Types.ObjectId()
function authorize (req, res, next) {
  req.user = {
    _id: userId
  }
  next()
}

var app = express()
app.use(bodyParser.json())
app.use(bodyParser.urlencoded({extended: true}))
app.post('/events/submit', authorize, events.submit)
const request = require('supertest')


describe('Events', function () {
  describe('POST submit', function () {
    beforeEach(function () {
      sinon.stub(console, 'error').returns(void 0)
    })

    afterEach(function () {
      console.error.restore()
    })

    it('should fail if no category was provided.', function () {
      var res = {}
      var send = { send: sinon.spy() }
      var statusStub = res.status = sinon.stub().returns(send)
      send.send.reset()
      events.submit({body: {}}, res)
      sinon.assert.calledWith(statusStub, 422)
      var error = send.send.args[0][0]
      assert(error.error.indexOf('event category') > 0)
    })

    it('should fail if the category is invalid.', function (done) {
      const categoryMock = sinon.mock(Category)
      categoryMock
        .expects('findOne').withArgs({_id: 'abc', user: userId})
        .chain('exec')
        .resolves(null)
      request(app)
        .post('/events/submit')
        .send({category: 'abc'})
        .expect(422, {error: 'Invalid category.'})
        .end(function () {
          categoryMock.restore()
          done()
        })
    })

    it('should create a new category if one does not exist.', function (done) {
      const categoryId = mongoose.Types.ObjectId()
      const eventSaveStub = sinon.stub(Event.prototype, 'save')
      eventSaveStub
        .callsArg(0)
      const categoryMock = sinon.mock(Category)
      categoryMock
        .expects('findOne').withArgs({_id: categoryId.toString(), user: userId})
        .chain('exec')
        .resolves({_id: categoryId})
      const eventMock = sinon.mock(Event)
      eventMock
        .expects('findOne').withArgs({user: userId})
        .chain('sort').withArgs({updatedAt: -1})
        .chain('exec')
        .resolves(undefined)
      request(app)
        .post('/events/submit')
        .send({category: categoryId})
        .expect(200, {success: 'Event recorded'})
        .end(function () {
          eventSaveStub.restore()
          categoryMock.restore()
          eventMock.restore()
          done()
        })
    })

    it('should create a new category if the last event is different.', function (done) {
      const categoryId = mongoose.Types.ObjectId()
      const eventSaveStub = sinon.stub(Event.prototype, 'save')
      eventSaveStub
        .callsArg(0)
      const categoryMock = sinon.mock(Category)
      categoryMock
        .expects('findOne').withArgs({_id: categoryId.toString(), user: userId})
        .chain('exec')
        .resolves({_id: categoryId})
      const eventMock = sinon.mock(Event)
      eventMock
        .expects('findOne').withArgs({user: userId})
        .chain('sort').withArgs({updatedAt: -1})
        .chain('exec')
        .resolves({category: mongoose.Types.ObjectId()})
      request(app)
        .post('/events/submit')
        .send({category: categoryId})
        .expect(200, {success: 'Event recorded'})
        .end(function () {
          eventSaveStub.restore()
          categoryMock.restore()
          eventMock.restore()
          done()
        })
    })

    it('should update an existing event if the last event is in the same category.', function (done) {
      const categoryId = mongoose.Types.ObjectId()
      const existingEvent = {
        count: 1,
        category: categoryId,
        save: sinon.stub().resolves()
      }
      const categoryMock = sinon.mock(Category)
      categoryMock
        .expects('findOne').withArgs({_id: categoryId.toString(), user: userId})
        .chain('exec')
        .resolves({_id: categoryId})
      const eventMock = sinon.mock(Event)
      eventMock
        .expects('findOne').withArgs({user: userId})
        .chain('sort').withArgs({updatedAt: -1})
        .chain('exec')
        .resolves(existingEvent)
      request(app)
        .post('/events/submit')
        .send({category: categoryId})
        .expect(200, {success: 'Event recorded'})
        .end(function () {
          categoryMock.restore()
          eventMock.restore()
          assert.equal(existingEvent.count, 2)
          done()
        })
    })

    it('should return an error on Category.findOne failure.', function (done) {
      const categoryMock = sinon.mock(Category)
      categoryMock
        .expects('findOne').withArgs({_id: 'abc', user: userId})
        .chain('exec')
        .rejects('Error looking up category')
      request(app)
        .post('/events/submit')
        .send({category: 'abc'})
        .expect(422, {error: 'Event creation error.'})
        .end(function () {
          categoryMock.restore()
          assert.equal(console.error.getCall(0).args.length, 2)
          assert.equal(console.error.getCall(0).args[0], 'Database error creating event: ')
          assert.equal(console.error.getCall(0).args[1], 'Error looking up category')
          done()
        })
    })

    it('should return an error on Event.findOne failure.', function (done) {
      const categoryId = mongoose.Types.ObjectId()
      const categoryMock = sinon.mock(Category)
      categoryMock
        .expects('findOne').withArgs({_id: categoryId.toString(), user: userId})
        .chain('exec')
        .resolves({_id: categoryId})
      const eventMock = sinon.mock(Event)
      eventMock
        .expects('findOne').withArgs({user: userId})
        .chain('sort').withArgs({updatedAt: -1})
        .chain('exec')
        .rejects('Error looking up event')
      request(app)
        .post('/events/submit')
        .send({category: categoryId})
        .expect(422, {success: 'Event creation error.'})
        .end(function () {
          categoryMock.restore()
          eventMock.restore()
          assert.equal(console.error.getCall(0).args.length, 2)
          assert.equal(console.error.getCall(0).args[0], 'Database error creating event: ')
          assert.equal(console.error.getCall(0).args[1], 'Error looking up event')
          done()
        })
    })

    it('should return an error on event.save failure.', function (done) {
      const categoryId = mongoose.Types.ObjectId()
      const existingEvent = {
        count: 1,
        category: categoryId,
        save: sinon.stub().rejects('Error saving event')
      }
      const categoryMock = sinon.mock(Category)
      categoryMock
        .expects('findOne').withArgs({_id: categoryId.toString(), user: userId})
        .chain('exec')
        .resolves({_id: categoryId})
      const eventMock = sinon.mock(Event)
      eventMock
        .expects('findOne').withArgs({user: userId})
        .chain('sort').withArgs({updatedAt: -1})
        .chain('exec')
        .resolves(existingEvent)
      request(app)
        .post('/events/submit')
        .send({category: categoryId})
        .expect(200, {success: 'Event recorded'})
        .end(function () {
          categoryMock.restore()
          eventMock.restore()
          assert.equal(existingEvent.count, 2)
          assert.equal(console.error.getCall(0).args.length, 2)
          assert.equal(console.error.getCall(0).args[0], 'Database error creating event: ')
          assert.equal(console.error.getCall(0).args[1], 'Error saving event')
          done()
        })
    })
  })
})
