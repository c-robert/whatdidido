const assert = require('assert')
const sinon = require('sinon')
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
app.get('/events/query', authorize, events.query)
app.delete('/events/remove', authorize, events.remove)
app.post('/events/insert', authorize, events.insert)
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

  describe('GET query', function () {
    beforeEach(function () {
      sinon.stub(console, 'error').returns(void 0)
    })

    afterEach(function () {
      console.error.restore()
    })

    it('should accept no parameters at all.', function (done) {
      const eventMock = sinon.mock(Event)
      eventMock
        .expects('find').withArgs()
        .chain('limit').withArgs(100)
        .chain('skip').withArgs(0)
        .chain('exec')
        .rejects('nothing there')
      request(app)
        .get('/events/query')
        .expect(422, {error: 'Error quering for events.'})
        .end(function () {
          eventMock.restore()
          assert.equal(console.error.getCall(0).args.length, 2)
          assert.equal(console.error.getCall(0).args[0], 'Database error finding events: ')
          assert.equal(console.error.getCall(0).args[1], 'nothing there')
          done()
        })
    })

    it('should accept a begin date.', function (done) {
      const conditions = {
        createdAt: {
          $gte: new Date('1972-04-09T01:02:03')
        },
        user: userId
      }
      const projections = {
        user: 0
      }
      const eventMock = sinon.mock(Event)
      eventMock
        .expects('find').withArgs(conditions, projections)
        .chain('limit').withArgs(100)
        .chain('skip').withArgs(0)
        .chain('exec')
        .rejects('nothing there')
      request(app)
        .get('/events/query')
        .query({begin: '1972-04-09T01:02:03'})
        .expect(422, {error: 'Error quering for events.'})
        .end(function () {
          eventMock.restore()
          assert.equal(console.error.getCall(0).args.length, 2)
          assert.equal(console.error.getCall(0).args[0], 'Database error finding events: ')
          assert.equal(console.error.getCall(0).args[1], 'nothing there')
          done()
        })
    })

    it('should accept an end date.', function (done) {
      const conditions = {
        createdAt: {
          $lte: new Date('1972-04-09T01:02:03')
        },
        user: userId
      }
      const projections = {
        user: 0
      }
      const eventMock = sinon.mock(Event)
      eventMock
        .expects('find').withArgs(conditions, projections)
        .chain('limit').withArgs(100)
        .chain('skip').withArgs(0)
        .chain('exec')
        .rejects('nothing there')
      request(app)
        .get('/events/query')
        .query({end: '1972-04-09T01:02:03'})
        .expect(422, {error: 'Error quering for events.'})
        .end(function () {
          eventMock.restore()
          assert.equal(console.error.getCall(0).args.length, 2)
          assert.equal(console.error.getCall(0).args[0], 'Database error finding events: ')
          assert.equal(console.error.getCall(0).args[1], 'nothing there')
          done()
        })
    })

    it('should accept both a begin and end date.', function (done) {
      const conditions = {
        $and: [
          {createdAt: {$gte: new Date('1972-04-09T01:02:03')}},
          {createdAt: {$lte: new Date('2017-01-14T09:08:07')}}
        ],
        user: userId
      }
      const projections = {
        user: 0
      }
      const eventMock = sinon.mock(Event)
      eventMock
        .expects('find').withArgs(conditions, projections)
        .chain('limit').withArgs(100)
        .chain('skip').withArgs(0)
        .chain('exec')
        .rejects('nothing there')
      request(app)
        .get('/events/query')
        .query({begin: '1972-04-09T01:02:03', end: '2017-01-14T09:08:07'})
        .expect(422, {error: 'Error quering for events.'})
        .end(function () {
          eventMock.restore()
          assert.equal(console.error.getCall(0).args.length, 2)
          assert.equal(console.error.getCall(0).args[0], 'Database error finding events: ')
          assert.equal(console.error.getCall(0).args[1], 'nothing there')
          done()
        })
    })

    it('should accept a list of categories.', function (done) {
      const category1 = mongoose.Types.ObjectId().toString()
      const category2 = mongoose.Types.ObjectId().toString()
      const conditions = {
        categories: [category1, category2],
        user: userId
      }
      const projections = {
        user: 0
      }
      const eventMock = sinon.mock(Event)
      eventMock
        .expects('find').withArgs(conditions, projections)
        .chain('limit').withArgs(100)
        .chain('skip').withArgs(0)
        .chain('exec')
        .rejects('nothing there')
      request(app)
        .get('/events/query')
        .query({categories: [category1, category2]})
        .expect(422, {error: 'Error quering for events.'})
        .end(function () {
          eventMock.restore()
          assert.equal(console.error.getCall(0).args.length, 2)
          assert.equal(console.error.getCall(0).args[0], 'Database error finding events: ')
          assert.equal(console.error.getCall(0).args[1], 'nothing there')
          done()
        })
    })

    it('should ignore an empty list of categories.', function (done) {
      const conditions = {
        user: userId
      }
      const projections = {
        user: 0
      }
      const eventMock = sinon.mock(Event)
      eventMock
        .expects('find').withArgs(conditions, projections)
        .chain('limit').withArgs(100)
        .chain('skip').withArgs(0)
        .chain('exec')
        .rejects('nothing there')
      request(app)
        .get('/events/query')
        .query({categories: []})
        .expect(422, {error: 'Error quering for events.'})
        .end(function () {
          eventMock.restore()
          assert.equal(console.error.getCall(0).args.length, 2)
          assert.equal(console.error.getCall(0).args[0], 'Database error finding events: ')
          assert.equal(console.error.getCall(0).args[1], 'nothing there')
          done()
        })
    })

    it('should should accept a page size.', function (done) {
      const pageSize = 123
      const conditions = {
        user: userId
      }
      const projections = {
        user: 0
      }
      const eventMock = sinon.mock(Event)
      eventMock
        .expects('find').withArgs(conditions, projections)
        .chain('limit').withArgs(pageSize)
        .chain('skip').withArgs(0)
        .chain('exec')
        .rejects('nothing there')
      request(app)
        .get('/events/query')
        .query({pageSize: pageSize})
        .expect(422, {error: 'Error quering for events.'})
        .end(function () {
          eventMock.restore()
          assert.equal(console.error.getCall(0).args.length, 2)
          assert.equal(console.error.getCall(0).args[0], 'Database error finding events: ')
          assert.equal(console.error.getCall(0).args[1], 'nothing there')
          done()
        })
    })

    it('should should accept a start index.', function (done) {
      const start = 123
      const conditions = {
        user: userId
      }
      const projections = {
        user: 0
      }
      const eventMock = sinon.mock(Event)
      eventMock
        .expects('find').withArgs(conditions, projections)
        .chain('limit').withArgs(100)
        .chain('skip').withArgs(start)
        .chain('exec')
        .rejects('nothing there')
      request(app)
        .get('/events/query')
        .query({start: start})
        .expect(422, {error: 'Error quering for events.'})
        .end(function () {
          eventMock.restore()
          assert.equal(console.error.getCall(0).args.length, 2)
          assert.equal(console.error.getCall(0).args[0], 'Database error finding events: ')
          assert.equal(console.error.getCall(0).args[1], 'nothing there')
          done()
        })
    })

    it('should should return event documents.', function (done) {
      const eventDocuments = [
        {doc: 'one'},
        {doc: 'two'},
        {doc: 'three'}
      ]
      const eventMock = sinon.mock(Event)
      eventMock
        .expects('find').withArgs()
        .chain('limit').withArgs(100)
        .chain('skip').withArgs(0)
        .chain('exec')
        .resolves(eventDocuments)
      request(app)
        .get('/events/query')
        .expect(200, eventDocuments)
        .end(function () {
          eventMock.restore()
          done()
        })
    })
  })

  describe('DELETE remove', function () {
    beforeEach(function () {
      sinon.stub(console, 'error').returns(void 0)
    })

    afterEach(function () {
      console.error.restore()
    })

    it('should fail if no parameters are specified.', function (done) {
      request(app)
        .delete('/events/remove')
        .expect(422, {error: 'You must include at least one of: begin, end, or events.'})
        .end(function () {
          done()
        })
    })

    it('should fail if a begin or end is specified with an array of events.', function (done) {
      request(app)
        .delete('/events/remove')
        .query({begin: new Date('1972-04-09T01:02:03'), events: ['test']})
        .expect(422, {error: 'A list of events must not be accompanied by a begin or end date.'})
        .end(function () {
          done()
        })
    })

    it('should report an error if there is a problem removing events.', function (done) {
      const events = ['test']
      const conditions = {
        _id: events,
        user: userId
      }
      const eventMock = sinon.mock(Event)
      eventMock
        .expects('remove').withArgs(conditions)
        .chain('exec')
        .rejects('unable to remove documents')
      request(app)
        .delete('/events/remove')
        .query({events: JSON.stringify(events)})
        .expect(422, {error: 'Error removing events.'})
        .end(function () {
          eventMock.restore()
          assert.equal(console.error.getCall(0).args.length, 2)
          assert.equal(console.error.getCall(0).args[0], 'Database error removing events: ')
          assert.equal(console.error.getCall(0).args[1], 'unable to remove documents')
          done()
        })
    })

    it('should remove events listed in the events array.', function (done) {
      const events = [1, 2]
      const conditions = {
        _id: events,
        user: userId
      }
      const eventMock = sinon.mock(Event)
      eventMock
        .expects('remove').withArgs(conditions)
        .chain('exec')
        .resolves()
      request(app)
        .delete('/events/remove')
        .query({events: JSON.stringify(events)})
        .expect(200, {success: 'Event(s) removed'})
        .end(function () {
          eventMock.restore()
          done()
        })
    })

    it('should remove events based on begin and end.', function (done) {
      const conditions = {
        $and: [
          {createdAt: {$gte: new Date('1972-04-09T01:02:03')}},
          {createdAt: {$lte: new Date('2017-01-14T09:08:07')}}
        ],
        user: userId
      }
      const eventMock = sinon.mock(Event)
      eventMock
        .expects('remove').withArgs(conditions)
        .chain('exec')
        .resolves()
      request(app)
        .delete('/events/remove')
        .query({events: JSON.stringify(events)})
        .expect(200, {success: 'Event(s) removed'})
        .end(function () {
          eventMock.restore()
          done()
        })
    })
  })

  describe('POST insert', function () {
    beforeEach(function () {
      sinon.stub(console, 'error').returns(void 0)
    })

    afterEach(function () {
      console.error.restore()
    })

    it('should fail if no time is specified.', function (done) {
      request(app)
        .post('/events/insert')
        .expect(422, {error: 'You must include an event time.'})
        .end(function () {
          done()
        })
    })

    it('should fail if no category is specified.', function (done) {
      request(app)
        .post('/events/insert')
        .send({time: new Date('1972-04-09T01:02:03')})
        .expect(422, {error: 'You must include an event category.'})
        .end(function () {
          done()
        })
    })

    it('should return an error if there is a problem creating the event.', function (done) {
      const category = mongoose.Types.ObjectId()
      const eventSaveStub = sinon.stub(Event.prototype, 'save')
      eventSaveStub
        .callsArgWith(0, {message: 'unable to save'})
      request(app)
        .post('/events/insert')
        .send({time: new Date('1972-04-09T01:02:03'), category: category})
        .expect(422, {error: 'Error creating event.'})
        .end(function () {
          eventSaveStub.restore()
          assert.equal(console.error.getCall(0).args.length, 2)
          assert.equal(console.error.getCall(0).args[0], 'Database error creating event: ')
          assert.equal(console.error.getCall(0).args[1], 'unable to save')
          done()
        })
    })

    it('should return an error if it can not update the createdAt property.', function (done) {
      const category = mongoose.Types.ObjectId()
      const eventSaveStub = sinon.stub(Event.prototype, 'save')
      const newEvent = {
        save: sinon.stub().rejects('unable to modify event')
      }
      eventSaveStub
        .callsArgWith(0, null, newEvent)
      request(app)
        .post('/events/insert')
        .send({time: new Date('1972-04-09T01:02:03'), category: category})
        .expect(422, {error: 'Error creating event.'})
        .end(function () {
          eventSaveStub.restore()
          assert.equal(console.error.getCall(0).args.length, 2)
          assert.equal(console.error.getCall(0).args[0], 'Database error creating event: ')
          assert.equal(console.error.getCall(0).args[1], 'unable to modify event')
          done()
        })
    })

    it('should succeed if it was able to create the event.', function (done) {
      const category = mongoose.Types.ObjectId()
      const eventSaveStub = sinon.stub(Event.prototype, 'save')
      const newEvent = {
        save: sinon.stub().resolves()
      }
      eventSaveStub
        .callsArgWith(0, null, newEvent)
      request(app)
        .post('/events/insert')
        .send({time: new Date('1972-04-09T01:02:03'), category: category})
        .expect(200, {success: 'Event recorded'})
        .end(function () {
          eventSaveStub.restore()
          assert.equal(newEvent.createdAt.toString(), new Date('1972-04-09T01:02:03').toString())
          done()
        })
    })
  })
})
