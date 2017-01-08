const Event = require('../models/event')
const Category = require('../models/category')

/**
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
 * This method allows one to insert an event with a specific start
 * time. The following are required parameters:
 * body: {
 *  time: Date
 *  category: mongoose.Schema.Types.ObjectId
 * }
 */
exports.insert = function (req, res, next) {
}

/**
 * This method allows one to remove the specified events. You must
 * use specific criteria to specify one or more events.
 * body: {
 *  begin: Date
 *  end: Date
 *  events: [mongoose.Schema.Types.ObjectId]
 * }
 */
exports.remove = function (req, res, next) {

}

/**
 * Queries for a list of events matching specific criteria.
 * Query parameters are as follows:
 * body: {
 *  begin: Date
 *  end: Date
 *  category: mongoose.Schema.Types.ObjectId
 * }
 * Each query is optional. If no parameters are specified then
 * all events for the currently authenticated user will be returned.
 * The 'begin' parameter specifies the start date and time for the
 * query.
 * The 'end' parameter specifies the last valid date and time for the
 * query.
 * The 'category' parameter specifies the specific category to which
 * the event must belong.
 * @param req
 * @param res
 * @param next
 */
exports.query = function (req, res, next) {
}
