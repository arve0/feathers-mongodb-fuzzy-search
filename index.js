 var utils = require('feathers-commons')
 var errors = require('feathers-errors')

/**
 * Adds " around `str` and removes any " in `str`.
 * @param {string} str
 */
function escape (str) {
  return '"' + str.replace(/"/g, '') + '"'
}

/**
 * Removes characters in a string that are coming from a RegExp to avoid https://www.owasp.org/index.php/Regular_expression_Denial_of_Service_-_ReDoS.
 * Inspired from https://github.com/google/closure-library/blob/master/closure/goog/string/string.js#L1148
 */
function sanitizeRegExp (str) {
  return str.replace(/([-()\[\]{}+?*.$\^|,:#<!\\])/g, '').
      replace(/\x08/g, '\\x08');
}

function transformSearchFieldsInQuery (queryObject, options, fieldName) {
  utils.each(queryObject, (value, key) => {
    // Process current attribute or  recurse
    if (typeof value === 'object') {
      // Searchable field ?
      let fieldName = ''
      if (value.hasOwnProperty('$search')) {
        // Manage excluded fields
        if (options && Array.isArray(options.fieldNames) && !options.fieldNames.includes(key)) {
          throw new errors.BadRequest('You are not allowed to perform $search on field ' + key)
        } 
        if (options && Array.isArray(options.excludedFieldNames) && options.excludedFieldNames.includes(key)) {
          throw new errors.BadRequest('You are not allowed to perform $search on field ' + key)
        }
        fieldName = key
      }
      transformSearchFieldsInQuery(value, options, fieldName)
    } else if (key === '$search') {
      // Default to case insensitive if not given
      var caseSensitive = queryObject.caseSensitive
      // Sanitize when required and by default
      if (!options || !Array.isArray(options.sanitizedFieldNames) || options.sanitizedFieldNames.includes(fieldName)) {
        value = sanitizeRegExp(value)
      }
      // Update query
      queryObject['$regex'] = caseSensitive ? new RegExp(value) : new RegExp(value, 'i')
      // Delete unused field
      delete queryObject['$search']
      delete queryObject.caseSensitive
    }
  })
}

module.exports = {
  fullTextSearch: function (options = {}) {
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
  },
  fieldSearch: function (options = {}) {
    return function (hook) {
      transformSearchFieldsInQuery(hook.params.query, options)
    }
  }
}

