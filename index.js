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
 * Escapes characters in the string that are not safe to use in a RegExp.
 * @param {*} s The string to escape. If not a string, it will be casted
 *     to one.
 * @return {string} A RegExp safe, escaped copy of {@code s}.
 * from https://github.com/google/closure-library/blob/master/closure/goog/string/string.js#L1148
 */
function regExpEscape (s) {
  return String(s)
      .replace(/([-()\[\]{}+?*.$\^|,:#<!\\])/g, '\\$1')
      .replace(/\x08/g, '\\x08');
}

function transformSearchFieldsInQuery (queryObject, options, fieldName) {
  utils.each(queryObject, (value, key) => {
    // Process current attribute or  recurse
    if (typeof value === 'object') {
      // Searchable field ?
      let fieldName = ''
      if (value.hasOwnProperty('$search')) {
        // Manage excluded fields
        if (Array.isArray(options.fields) && !options.fields.includes(key)) {
          throw new errors.BadRequest('You are not allowed to perform $search on field ' + key)
        } 
        if (Array.isArray(options.excludedFields) && options.excludedFields.includes(key)) {
          throw new errors.BadRequest('You are not allowed to perform $search on field ' + key)
        }
        fieldName = key
      }
      transformSearchFieldsInQuery(value, options, fieldName)
    } else if (key === '$search') {
      // Default to case insensitive if not given
      var caseSensitive = queryObject.caseSensitive
      // Sanitize when required
      if (options.escape) {
        if (!Array.isArray(options.escapedFields) || options.escapedFields.includes(fieldName)) {
          value = regExpEscape(value)
        }
      }
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
  // hook for full-text search or field-based search ?
  if (options.fields || options.excludedFields) {
    return function (hook) {
      transformSearchFieldsInQuery(hook.params.query, options)
    }
  } else {
    return function (hook) {
      if (hook.method === 'find' && hook.params.query && hook.params.query.$search) {
        hook.params.query.$text = {
          $search: options.escape ? escape(hook.params.query.$search) : hook.params.query.$search
        }
        delete hook.params.query.$search
        if (hook.params.query.$language) {
          hook.params.query.$text.$language = hook.params.query.$language
          delete hook.params.query.$language
        }
        if (hook.params.query.$caseSensitive) {
          hook.params.query.$text.$caseSensitive = hook.params.query.$caseSensitive
          delete hook.params.query.$caseSensitive
        }
        if (hook.params.query.$diacriticSensitive) {
          hook.params.query.$text.$diacriticSensitive = hook.params.query.$diacriticSensitive
          delete hook.params.query.$diacriticSensitive
        }
      }
      return hook
    }
  }
}

