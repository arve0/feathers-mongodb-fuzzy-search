[![npm version](https://badge.fury.io/js/feathers-mongodb-fuzzy-search.svg)](https://badge.fury.io/js/feathers-mongodb-fuzzy-search) [![Build Status](https://travis-ci.org/arve0/feathers-mongodb-fuzzy-search.svg?branch=master)](https://travis-ci.org/arve0/feathers-mongodb-fuzzy-search)

# feathers-mongodb-fuzzy-search
Add fuzzy `$search` to mongodb `service.find` queries: full-text search on documents with [stemming](https://en.wikipedia.org/wiki/Stemming) as well as pattern matching on individual fields.

For text search queries on string content be sure to text index your fields, as it uses mongodb $text: https://docs.mongodb.com/manual/reference/operator/query/text/.
For simple pattern matching on string fields https://docs.mongodb.com/manual/reference/operator/query/regex/ is used.

## Install
```
npm install feathers-mongodb-fuzzy-search
```

## Usage
```js
const search = require('feathers-mongodb-fuzzy-search')

// add fuzzy search hook, may also use service.hooks to apply it on individual services only
app.hooks({
  before: {
    find: [search(), search(fields: ['firstName', 'lastName'])]
  }
})

// Field matching
const users = app.service('users')
// find users with first name containing a 's' and last name containing 'art'
let userDocuments = await users.find({ query: { firstName: { $search: 's' }, lastName: { $search: 'art' } })

// Full-text search
const messages = app.service('messages')
// enable text index on title property, makes the title content searchable
messages.Model.createIndex({ title: 'text' })

// find documents with title talking about cats
let catDocuments = await messages.find({ query: { $search: 'cat' } })
// will find titles including 'cat', 'cats', etc. thanks to stemming
```

Complete example [here](./example.js)

## Notes

### Full-text search
As default `"` in `$search` is removed and `$search` is padded with `"`. E.g. `some " text` becomes `"some text"`. If you want to disable this behaviour and leverage the full MongoDB $text API, you can disable escaping like this:

```js
app.hooks({
  before: {
    find: search({ escape: false })
  }
})
```

Along with your query you can pass the standards MongoDB options for `$text`: `$language`, `$caseSensitive` and `$diacriticSensitive`. E.g. If you'd like to disable [stemming](https://en.wikipedia.org/wiki/Stemming) add `$language: 'none'` to your query parameters.
### Field search
The `options` object given to `search(options)` supports the following:
* `fields`: array of field names so that you can control server-side which fields can be searched
* `excludedFields`: array of field names that *can't* be searched so that all others can be
* `escape`: boolean indicating if regex patterns have to be escaped in search values to avoid [DOS](https://www.owasp.org/index.php/Regular_expression_Denial_of_Service_-_ReDoS) (default to `true`)
* `escapedFields`: list of field to be escaped when the previous option is `true`. If not given all fields will be escaped. Otherwise fields not included here will not be escaped as you might want to use the real power of regexp for some models/fields under your control on the server-side.

```js
app.service('users').hooks({
  before: {
    find: search({ excludedFields: ['fullName'], escapedFields: ['firstName'] })
  }
})
```

With no escape options all the fields will sanitized to prevent unexpected [DOS](https://www.owasp.org/index.php/Regular_expression_Denial_of_Service_-_ReDoS).
**Please not the user inputs should always be escaped to prevent attacks.**

### Additional information
This package is tested with MongoDB version 3.2. You will probably run into problems using older versions of MongoDB, for example version 2.4 does not support `$text` search.

See [mongodb documentation](https://docs.mongodb.com/manual/reference/operator/query/text/#search-field) for more details about `$text`.
See [mongodb documentation](https://docs.mongodb.com/manual/reference/operator/query/regex) for more details about `$regex`.

## Development
```
npm test  # runs mocha
```

## License
MIT © 2017 Arve Seljebu / Luc Claustres
