/**
 * Category management:
 * * add
 *   - name
 *   - start
 *   - code
 *   - context
 * * remove
 *   - id [in]
 * * modify
 *   - id
 *   - name
 *   - start
 *   - code
 *   - context
 * * list (no parameters)
 *
 * All query management functions are based on user.
 */
const Category = require('../models/category')
const config = require('../../config/main')

/**
 * POST
 */
exports.add = function (req, res, next) {
  const name = req.body.name
  const start = req.body.start || false
  const code = req.body.code
  const context = req.body.context

  // Return error if no name provided
  if (!name) {
    return res.status(422).send({error: 'You must enter a category name.'})
  }

  var newCategory = new Category({
    name: name,
    start: start,
    user: req.user._id
  })

  if (code) {
    newCategory.code = code
  }

  if (context) {
    newCategory.context = context
  }

  newCategory.save()
    .then(function () {
      res.status(200).send({success: 'Category created'})
    })
    .catch(function (err) {
      res.status(422).send({error: 'Category creation error'})
      console.error('Database error creating category: ', err.message)
    })
}

/**
 * DELETE
 */
exports.remove = function (req, res, next) {
  const categoryId = req.query.id

  // Return error if no categoryId provided
  if (!categoryId) {
    return res.status(422).send({error: 'No category specified.'})
  }

  Category.remove({_id: categoryId, user: req.user._id}).exec()
    .then(function () {
      res.status(200).send({success: 'Category removed'})
    })
    .catch(function (err) {
      res.status(422).send({error: 'Category removal error'})
      console.error('Database error removing category: ', err.message)
    })
}

/**
 * PUT
 */
exports.modify = function (req, res, next) {
  const categoryId = req.body.id
  const name = req.body.name
  const start = req.body.start
  const code = req.body.code
  const context = req.body.context

  // Return error if no category provided
  if (!categoryId) {
    return res.status(422).send({error: 'No category specified.'})
  }

  // If no modified parameters are specified return an error
  if (!name && !start && !code && !context) {
    return res.status(422).send({error: 'No parameters specified.'})
  }

  Category.findOne({_id: categoryId, user: req.user._id}).exec()
    .then(function (category) {
      var modified = false
      if (name && (category.name !== name)) {
        category.name = name
        modified = true
      }
      if (start && (category.start !== start)) {
        category.start = start
        modified = true
      }
      if (code && (category.code !== code)) {
        category.code = code
        modified = true
      }
      if (context && (category.context !== context)) {
        category.context = context
        modified = true
      }
      if (modified === false) {
        res.status(422).send({error: 'No modified parameters specified.'})
      } else {
        return category.save()
      }
    })
    .then(function () {
      res.status(200).send({success: 'Category modified'})
    })
    .catch(function (err) {
      res.status(422).send({error: 'Category modification error'})
      console.error('Database error modifying category: ', err.message)
    })
}

/**
 * GET
 */
exports.list = function (req, res, next) {
  const skip = parseInt(req.query.start || 0)
  const limit = parseInt(req.query.pageSize || config.defaultPageSize)

  Category.find({user: req.user._id}).limit(limit).skip(skip).exec()
    .then(function (categories) {
      res.status(200).send(categories)
    })
    .catch(function (err) {
      // Ran into some sort of problem
      res.status(422).send({error: 'Error quering for categories.'})
      console.error('Database error finding categories: ', err.message)
    })
}
