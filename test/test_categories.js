const config = require('../config/main')
const assert = require('assert')
const sinon = require('sinon')
const categories = require('../app/api/categories')

const express = require('express')
const bodyParser = require('body-parser')

const mongoose = require('mongoose')
mongoose.Promise = global.Promise

require('sinon-mongoose')
require('sinon-as-promised')

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
app.post('/categories/add', authorize, categories.add)
app.delete('/categories/remove', authorize, categories.remove)
app.put('/categories/modify', authorize, categories.modify)
app.get('/categories/list', authorize, categories.list)
const request = require('supertest')

describe('Categories', function () {
  describe('POST add', function () {
    beforeEach(function () {
      sinon.stub(console, 'error').returns(void 0)
    })

    afterEach(function () {
      console.error.restore()
    })

    it('fails if no category name has been provided.', function () {
      request(app)
        .post('/categories/add')
        .expect(422, {error: 'You must enter a category name.'})
        .end()
    })

    it('defaults the start field to false if not provided.', function (done) {
      const categorytSaveStub = sinon.stub(Category.prototype, 'save')
      categorytSaveStub
        .callsArgWith(0, {message: 'unable to save'})
      request(app)
        .post('/categories/add')
        .send({name: 'Test'})
        .expect(422, {error: 'Category creation error'})
        .end(function (err, res) {
          categorytSaveStub.restore()
          assert.equal(console.error.getCall(0).args.length, 2)
          assert.equal(console.error.getCall(0).args[0], 'Database error creating category: ')
          assert.equal(console.error.getCall(0).args[1], 'unable to save')
          if (err) return done(err)
          done()
        })
    })

    it('creates a category with only a name.', function (done) {
      const categorytSaveStub = sinon.stub(Category.prototype, 'save')
      const newCategory = {
        save: sinon.stub().resolves()
      }
      categorytSaveStub
        .callsArgWith(0, null, newCategory)
      request(app)
        .post('/categories/add')
        .send({name: 'Test'})
        .expect(200, {success: 'Category created'})
        .end(function (err, res) {
          categorytSaveStub.restore()
          if (err) return done(err)
          done()
        })
    })

    it('adds the code field if provided.', function (done) {
      const categorytSaveStub = sinon.stub(Category.prototype, 'save')
      const newCategory = {
        save: sinon.stub().resolves()
      }
      categorytSaveStub
        .callsArgWith(0, null, newCategory)
      request(app)
        .post('/categories/add')
        .send({name: 'Test', code: 'Code'})
        .expect(200, {success: 'Category created'})
        .end(function (err, res) {
          categorytSaveStub.restore()
          if (err) return done(err)
          done()
        })
    })

    it('adds the context field if provided.', function (done) {
      const categorySaveStub = sinon.stub(Category.prototype, 'save')
      const newCategory = {
        save: sinon.stub().resolves()
      }
      categorySaveStub
        .callsArgWith(0, null, newCategory)
      request(app)
        .post('/categories/add')
        .send({name: 'Test', contex: 'Context'})
        .expect(200, {success: 'Category created'})
        .end(function (err, res) {
          categorySaveStub.restore()
          if (err) return done(err)
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

    it('fails if no category id has been provided.', function (done) {
      request(app)
        .delete('/categories/remove')
        .expect(422, {error: 'No category specified.'})
        .end(function (err, res) {
          if (err) return done(err)
          done()
        })
    })

    it('fails if it was unable to remove the category.', function (done) {
      request(app)
        .delete('/categories/remove')
        .send({categoryId: null})
        .expect(422, {error: 'Category removal error.'})
        .end(function (err, res) {
          if (err) return done(err)
          done()
        })
    })

    it('should succeed if the categoryId is found', function (done) {
      const categoryId = mongoose.Types.ObjectId()
      const category = {
        _id: categoryId,
        user: userId
      }
      const categoryMock = sinon.mock(Category)
      categoryMock
        .expects('remove').withArgs(category)
        .chain('exec')
        .resolves()
      request(app)
        .delete('/categories/remove')
        .send({id: categoryId})
        .expect(200, {success: 'Category removed'})
        .end(function (err, res) {
          if (err) return done(err)
          done()
        })
    })
  })

  // modify
  describe('PUT modify', function () {
    beforeEach(function () {
      sinon.stub(console, 'error').returns(void 0)
    })

    afterEach(function () {
      console.error.restore()
    })

    it('fails if no category id is provided', function (done) {
      request(app)
        .put('/categories/modify')
        .expect(422, {error: 'No category specified.'})
        .end(function (err, res) {
          if (err) return done(err)
          done()
        })
    })

    it('fails if no parameters are specified.', function (done) {
      const categoryId = mongoose.Types.ObjectId()
      request(app)
        .put('/categories/modify')
        .send({id: categoryId})
        .expect(422, {error: 'No parameters specified.'})
        .end(function (err, res) {
          if (err) return done(err)
          done()
        })
    })

    it('fails if no modified parameters are specified.', function (done) {
      const categoryId = mongoose.Types.ObjectId()
      const categoryMock = sinon.mock(Category)
      categoryMock
        .expects('findOne').withArgs({_id: categoryId.toString(), user: userId})
        .chain('exec')
        .resolves({
          _id: categoryId,
          user: userId,
          name: 'Test',
          start: true,
          code: 'abc',
          context: '123'
        })
      request(app)
        .put('/categories/modify')
        .send({
          id: categoryId,
          name: 'Test',
          start: true,
          code: 'abc',
          context: '123'
        })
        .expect(422, {error: 'No modified parameters specified.'})
        .end(function (err, res) {
          categoryMock.restore()
          if (err) return done(err)
          done()
        })
    })

    it('fails if the category is not found.', function (done) {
      const categoryId = mongoose.Types.ObjectId()
      const categoryMock = sinon.mock(Category)
      categoryMock
        .expects('findOne').withArgs({_id: categoryId.toString(), user: userId})
        .chain('exec')
        .rejects('Unable to find category!')
      request(app)
        .put('/categories/modify')
        .send({
          id: categoryId,
          name: 'Test',
          start: true,
          code: 'abc',
          context: '123'
        })
        .expect(422, {error: 'Category modification error'})
        .end(function (err, res) {
          categoryMock.restore()
          assert.equal(console.error.getCall(0).args.length, 2)
          assert.equal(console.error.getCall(0).args[0], 'Database error modifying category: ')
          assert.equal(console.error.getCall(0).args[1], 'Unable to find category!')
          if (err) return done(err)
          done()
        })
    })

    it('succeeds if the cateogry has been modified.', function (done) {
      const categoryId = mongoose.Types.ObjectId()
      const categoryMock = sinon.mock(Category)
      categoryMock
        .expects('findOne').withArgs({_id: categoryId.toString(), user: userId})
        .chain('exec')
        .resolves({
          _id: categoryId,
          user: userId,
          name: 'Test',
          start: true,
          code: 'abc',
          context: '123',
          save: sinon.stub().resolves()
        })
      request(app)
        .put('/categories/modify')
        .send({
          id: categoryId,
          name: 'Test Too'
        })
        .expect(200, {success: 'Category modified'})
        .end(function (err, res) {
          if (err) return done(err)
          done()
        })
    })
  })

  // list
  describe('Get list', function () {
    beforeEach(function () {
      sinon.stub(console, 'error').returns(void 0)
    })

    afterEach(function () {
      console.error.restore()
    })

    it('fails if unable to query for categories.', function (done) {
      const categoryMock = sinon.mock(Category)
      categoryMock
        .expects('find').withArgs({user: userId})
        .chain('limit').withArgs(config.defaultPageSize)
        .chain('skip').withArgs(0)
        .chain('exec')
        .rejects('Error listing categories!')
      request(app)
        .get('/categories/list')
        .expect(422, {error: 'Error quering for categories.'})
        .end(function (err, res) {
          categoryMock.restore()
          assert.equal(console.error.getCall(0).args.length, 2)
          assert.equal(console.error.getCall(0).args[0], 'Database error finding categories: ')
          assert.equal(console.error.getCall(0).args[1], 'Error listing categories!')
          if (err) return done(err)
          done()
        })
    })

    it('succeeds with no parameters.', function (done) {
      const categories = [1, 2, 3]
      const categoryMock = sinon.mock(Category)
      categoryMock
        .expects('find').withArgs({user: userId})
        .chain('limit').withArgs(config.defaultPageSize)
        .chain('skip').withArgs(0)
        .chain('exec')
        .resolves(categories)
      request(app)
        .get('/categories/list')
        .expect(200, categories)
        .end(function (err, res) {
          categoryMock.restore()
          if (err) return done(err)
          done()
        })
    })

    it('succeeds with parameters.', function (done) {
      const categories = [1, 2, 3]
      const categoryMock = sinon.mock(Category)
      categoryMock
        .expects('find').withArgs({user: userId})
        .chain('limit').withArgs(20)
        .chain('skip').withArgs(10)
        .chain('exec')
        .resolves(categories)
      request(app)
        .get('/categories/list')
        .query({start: 10, pageSize: 20})
        .expect(200, categories)
        .end(function (err, res) {
          categoryMock.restore()
          if (err) return done(err)
          done()
        })
    })
  })
})
