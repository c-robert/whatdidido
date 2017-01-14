const Event = require('../models/event')
const Category = require('../models/category')
const config = require('../../config/main')

/**
 * POST
 * Submits an event to the system. This event may be consolidated into
 * a previously created event or a new event will be created. The request
 * will contain the following:
 * body: {
 *  category: mongoose.Schema.Types.ObjectId
 * }
 * The category must be specified so that the event can be properly
 * classified.
 * @param req
 * @param res
 * @param next
 */
exports.submit = function (req, res, next) {
  // Requires a valid JWT - how do I retrieve and validate it?
  const category = req.body.category

  // Return error if no category provided
  if (!category) {
    return res.status(422).send({error: 'You must include an event category.'})
  }

  /**
   * Ensure a valid category.
   * Query to get the most recent event. If there are no events or the
   * existing event does not have the same category, create a new event.
   * Otherwise, update the count on the event.
   * Save the new or modified event.
   */

  Category.findOne({_id: category, user: req.user._id}).exec()
    .then(function (validCategory) {
      if (!validCategory) {
        res.status(422).send({error: 'Invalid category.'})
      } else {
        return Event.findOne({user: req.user._id}).sort({updatedAt: -1}).exec()
      }
    })
    .then(function (event) {
      if (!event || !event.category.equals(category)) {
        // Create a new event
        event = new Event({
          count: 1,
          user: req.user._id,
          category: category
        })
      } else {
        // Update the returned event.
        event.count++
      }
      return event.save()
    })
    .then(function () {
      // Saved the event
      res.status(200).send({success: 'Event recorded'})
    })
    .catch(function (err) {
      // Ran into some sort of problem
      res.status(422).send({error: 'Event creation error'})
      console.error('Database error creating event: ', err.message)
    })
}

/**
 * POST
 * This method allows one to insert an event with a specific start
 * time. The following are required parameters:
 * body: {
 *  time: Date,
 *  category: mongoose.Schema.Types.ObjectId
 * }
 */
exports.insert = function (req, res, next) {
}

/**
 * DELETE
 * This method allows one to remove the specified events. You must
 * use specific criteria to specify one or more events.
 * query: {
 *  begin: Date,
 *  end: Date,
 *  events: [mongoose.Schema.Types.ObjectId]
 * }
 */
exports.remove = function (req, res, next) {

}

/**
 * GET
 * Queries for a list of events matching specific criteria.
 * Query parameters are as follows:
 * query: {
 *  begin: Date, (optional)
 *  end: Date, (optional)
 *  categories: [mongoose.Schema.Types.ObjectId], (optional)
 *  start: Number, (optional)
 *  pageSize: Number (optional)
 * }
 * Each query is optional. If no parameters are specified then
 * all events for the currently authenticated user will be returned.
 * There is a default page size and at most that number of
 * events will be returned. You may specify a different page size.
 * Also, you can specify a start index of events so that you can
 * retrieve multiple pages. Dates are specified as a string value
 * that can be parsed by the Date object.
 * The 'begin' parameter specifies the start date and time for the
 * query. If not specified then all events prior to the end date will
 * be returned.
 * The 'end' parameter specifies the last valid date and time for the
 * query. If not specified then all events newer than the begin date
 * will be returned.
 * The 'categories' parameter specifies the specific categories to which
 * the event must belong. If no category is specified then events will
 * not be restricted to any category.
 * The 'start' parameter specifies the start index of the event list
 * to begin the return parge.
 * The 'pageSize' parameter specifies the size of the pages to be
 * returned.
 * @param req
 * @param res
 * @param next
 */
exports.query = function (req, res, next) {
  const begin = req.query.begin ? new Date(req.query.begin) : undefined
  const end = req.query.end ? new Date(req.query.end) : undefined
  const eventQuery = { user: req.user._id }

  if (begin && !end) {
    eventQuery.createdAt = { $gte: begin }
  } else if (!begin && end) {
    eventQuery.createdAt = { $lte: end }
  } else if (begin && end) {
    eventQuery.$and = [
      { createdAt: { $gte: begin } },
      { createdAt: { $lte: end } }
    ]
  }

  if (req.query.categories && (req.query.categories.length > 0)) {
    eventQuery.categories = req.query.categories
  }

  const skip = parseInt(req.query.start || 0)
  const limit = parseInt(req.query.pageSize || config.defaultPageSize)

  // Find all the matching events and return the documents excluding
  // the 'user' field.
  Event.find(eventQuery, { user: 0 }).limit(limit).skip(skip).exec()
    .then(function (events) {
      res.status(200).send(events)
    })
    .catch(function (err) {
      // Ran into some sort of problem
      res.status(422).send({error: 'Error quering for events.'})
      console.error('Database error finding events: ', err.message)
    })
}
