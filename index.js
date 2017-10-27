const utils = require('feathers-commons')
const errors = require('feathers-errors')

/**
 * Adds " around `str` and removes any " in `str`.
 * @param {string} str
 */
function escape (str) {
  return '"' + str.replace(/"/g, '') + '"'
}

/**
 * Escapes characters in the string that are not safe to use in a RegExp.
 * @param {*} s The string to escape. If not a string,
 *              it will be casted to one.
 * @return {string} A RegExp safe, escaped copy of {@code s}.
 * from https://github.com/google/closure-library/blob/master/closure/goog/string/string.js#L1148
 */
function regExpEscape (s) {
  return String(s)
      .replace(/([-()\[\]{}+?*.$\^|,:#<!\\])/g, '\\$1')
      .replace(/\x08/g, '\\x08')
}

function transformSearchFieldsInQuery (query, options, fieldName) {
  utils.each(query, (value, key) => {
    if (key === '$text') {
      return
    }
    // Process current attribute or  recurse
    if (value && typeof value === 'object') {
      // Searchable field ?
      if (!value.hasOwnProperty('$search')) {
        return transformSearchFieldsInQuery(value, options, key)
      }
      // Field should either be included, or not excluded
      if ((options.fields.length && !options.fields.includes(key)) ||
          options.excludedFields.includes(key)) {
        throw new errors.BadRequest('You are not allowed to perform $search on field ' + key)
      }
      /**
       * {
       *   field: {
       *     $search: ''
       *   }
       * }
       */
      transformSearchFieldsInQuery(value, options, key)
    } else if (key === '$search') {
      // Default to case insensitive if not given
      // Sanitize when required
      if (!options.fieldsNotEscaped.includes(fieldName)) {
        value = regExpEscape(value)
      }
      // Update query
      query['$regex'] = query.$caseSensitive ? new RegExp(value) : new RegExp(value, 'i')
      // Delete unused field
      delete query['$search']
      delete query['$caseSensitive']
    }
  })
}

module.exports = function (opts = {}) {
  // if escape is undefined -> escape = true
  opts.escape = opts.escape !== false
  opts.fieldsNotEscaped = Array.isArray(opts.fieldsNotEscaped) ? opts.fieldsNotEscaped : []
  // hook for full-text search or field-based search ?
  if (Array.isArray(opts.fields) && opts.fields.length) {
    opts.excludedFields = []  // one should not both include and exclude fields
    return regexFieldSearch
  } else if (Array.isArray(opts.excludedFields) && opts.excludedFields.length) {
    opts.fields = []
    return regexFieldSearch
  }

  return fullTextSearch

  function regexFieldSearch (hook) {
    transformSearchFieldsInQuery(hook.params.query, opts)
  }

  function fullTextSearch (hook) {
    if (hook.id || !hook.params.query || !hook.params.query.$search) {
      return
    }
    let query = hook.params.query
    query.$text = {
      $search: opts.escape ? escape(query.$search) : query.$search
    }
    delete query.$search
    if (query.$language) {
      query.$text.$language = query.$language
      delete query.$language
    }
    if (query.$caseSensitive) {
      query.$text.$caseSensitive = query.$caseSensitive
      delete query.$caseSensitive
    }
    if (query.$diacriticSensitive) {
      query.$text.$diacriticSensitive = query.$diacriticSensitive
      delete query.$diacriticSensitive
    }
  }
}
