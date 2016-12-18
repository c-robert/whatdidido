const Event = require('../models/event')
const Category = require('../models/category')

/**
 * Submits an event to the system. This event may be consolidated into
 * a previously created event or a new event will be created. The request
 * will contain the following:
 * body: {
 *  timeout: Number (optional)
 *  category: mongoose.Schema.Types.ObjectId (optional)
 * }
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
