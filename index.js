/**
 * Add $search to `service.find` query. Be sure to text index your fields,
 * as it uses mongodb $text: https://docs.mongodb.com/manual/reference/operator/query/text/
 *
 * Usage:
 * ```
 * const fuzzySearch = require('feathers-mongodb-fuzzy-search')
 *
 * // ensure we have a text index
 * app.service('test').Model.createIndex({ title: 'text' })
 *
 * app.service('something').hooks({
 *   before: {
 *     find: [ fuzzySearch() ]
 *   }
 * })
 *
 * app.service('something').find({
 *  query: {
 *    $search: 'text string to search for'
 *  }
 * })
 * ```
 *
 * @param {object} options
 */
module.exports = function (options = {}) {
  // if escape is undefined -> escape = true
  options.escape = options.escape === false ? false : true
  return function (hook) {
    if (hook.method === 'find' && hook.params.query && hook.params.query.$search) {
      hook.params.query.$text = {
        $search: options.escape ? escape(hook.params.query.$search) : hook.params.query.$search
      }
      delete hook.params.query.$search
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
