/**
 * Add $search to `service.find` query. For text search queries on string content be sure to text index your fields,
 * as it uses mongodb $text: https://docs.mongodb.com/manual/reference/operator/query/text/.
 * For simple fuzzy match on a string field https://docs.mongodb.com/manual/reference/operator/query/regex/ is used.
 *
 * Usage:
 * ```
 * const fuzzySearch = require('feathers-mongodb-fuzzy-search')
 *
 * // ensure we have a text index
 * app.service('messages').Model.createIndex({ title: 'text content' })
 * // to search in fields using regexp this is not required
 * app.service('users')
 *
 * app.service('something').hooks({
 *   before: {
 *     find: [ fuzzySearch() ]
 *   }
 * })
 *
 * app.service('messages').find({
 *  query: {
 *    $search: 'text string to search for in titles'
 *  }
 * })
 * app.service('users').find({
 *  query: {
 *    name: { $search: 'pattern to search for in names' }
 *  }
 * })
 * ```
 *
 * @param {object} options
 */

 var utils = require('feathers-commons')

 function transformSearchFieldsInQuery (queryObject) {
  utils.each(queryObject, (value, key) => {
    // Process current attribute or  recurse
    if (typeof value === 'object') {
      transformSearchFieldsInQuery(value)
    } else if (key === '$search') {
      // Default to case insensitive if not given
      var caseSensitive = queryObject.caseSensitive
      // Update query
      queryObject['$regex'] = caseSensitive ? new RegExp(value) : new RegExp(value, 'i')
      // Delete unused field
      delete queryObject['$search']
      delete queryObject.caseSensitive
    }
  })
}

module.exports = function (options = {}) {
  // if escape is undefined -> escape = true
  options.escape = options.escape === false ? false : true
  return function (hook) {
    if (hook.method === 'find' && hook.params.query && hook.params.query.$search) {
      hook.params.query.$text = {
        $search: options.escape ? escape(hook.params.query.$search) : hook.params.query.$search
      }
      delete hook.params.query.$search
    } else {
      transformSearchFieldsInQuery(hook.params.query)
    }
    return hook
  }
}

/**
 * Adds " around `str` and removes any " in `str`.
 * @param {string} str
 */
function escape (str) {
  return '"' + str.replace(/"/g, '') + '"'
}
