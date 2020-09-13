[![npm version](https://badge.fury.io/js/feathers-mongodb-fuzzy-search.svg)](https://badge.fury.io/js/feathers-mongodb-fuzzy-search) [![Build Status](https://travis-ci.org/arve0/feathers-mongodb-fuzzy-search.svg?branch=master)](https://travis-ci.org/arve0/feathers-mongodb-fuzzy-search)

# feathers-mongodb-fuzzy-search
Add `$search` to mongodb `service.find`, `update`, `patch` and `remove` queries. Full-text search on documents with [stemming](https://en.wikipedia.org/wiki/Stemming) as well as pattern matching on individual fields.

For full-text search, be sure to index your text fields, as this plugin uses [mongodb $text](https://docs.mongodb.com/manual/reference/operator/query/text/).

For field pattern matching, [mongodb $regex](https://docs.mongodb.com/manual/reference/operator/query/regex/) is used.

## Install
```
npm install feathers-mongodb-fuzzy-search
```

## Usage
```js
const service = require('feathers-mongodb')
const search = require('feathers-mongodb-fuzzy-search')

app.use('/messages', service({
  Model: db.collection('messages'),
  whitelist: ['$text', '$search'], // fields used by feathers-mongodb-fuzzy-search
}))

// add search hook
// may also use service.hooks to apply it on individual services only
app.hooks({
  before: {
    all: [
      search(), // full text search on text indexes
      search({  // regex search on given fields
        fields: ['firstName', 'lastName']
      })
    ]
  }
})

// create a text index on title property, for full-text search
// you may add multiple fields to the text index
// see the mongodb documentation for more on $text
const messages = app.service('messages')

// If you're using MongoDB database adapter:
messages.Model.createIndex({ title: 'text' })
// or if you're using Mongoose database adapter:
// messages.Model.index({ title: 'text' })

// find documents with title containing 'cat'
// will find titles including 'cat', 'cats', etc. thanks to mongodb stemming
// note: you can only use await inside async functions
let catDocuments = await messages.find({ query: { $search: 'cat' } })

// find users with first name containing a 's' and last name containing 'art'
let userDocuments = await app.service('users').find({
  query: {
    firstName: { $search: 's' },
    lastName: { $search: 'art' }
  }
})
```

Complete example [here](./example.js).

## REST usage
Full text search for `qwerty` with mongodb $text:
```sh
curl http://localhost:3030/messages?$search=qwerty
```

Search for `qwerty` on field `firstName` with mongodb $regex:
```sh
curl http://localhost:3030/users?firstName[$search]=qwerty
```

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

### RegExp field search
Remember to allow `$regex` in the service:

```js
app.use('/messages', service({
  Model: db.collection('messages'),
  whitelist: ['$regex'], // field used by feathers-mongodb-fuzzy-search
}))
```

If not, you will get the error `BadRequest: Invalid query parameter $regex` on requests.


The `options` object given to `search(options)` supports the following:

- `fields`: Array of field names to allow searching in.
- `excludedFields`: Array of field names that *can't* be searched. If given, any field not in array can be searched.
- `fieldsNotEscaped`: Array of fields to be excluded from RegExp escape. As default any field not given are escaped to avoid [RegExp denial of service attacks](https://www.owasp.org/index.php/Regular_expression_Denial_of_Service_-_ReDoS).


```js
app.service('users').hooks({
  before: {
    find: search({
      // make all fields but 'fullName' are searchable
      excludedFields: ['fullName'],
      // do not escape RegExp special characters for the field 'firstName'
      fieldsNotEscaped: ['firstName']
    })
  }
})
```

### MongoDB options
You can pass MongoDB options for `$text`, like `$language`, `$caseSensitive` and `$diacriticSensitive` with your query. E.g. If you'd like to disable [stemming](https://en.wikipedia.org/wiki/Stemming) add `$language: 'none'` to your query parameters:

```js
users.find({
  query: {
    $search: 'cats',
    $language: 'none'
  }
})
```

**NOTE:** Remeber to allow the fields in your service:
```js
  app.use('/messages', service({
    Model: db.collection('messages'),
    // fields used by feathers-mongodb-fuzzy-search
    whitelist: ['$text', '$search', '$caseSensitive', '$language', '$diacriticSensitive'],
  }))
```

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
