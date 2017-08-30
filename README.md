[![npm version](https://badge.fury.io/js/feathers-mongodb-fuzzy-search.svg)](https://badge.fury.io/js/feathers-mongodb-fuzzy-search) [![Build Status](https://travis-ci.org/arve0/feathers-mongodb-fuzzy-search.svg?branch=master)](https://travis-ci.org/arve0/feathers-mongodb-fuzzy-search)

# feathers-mongodb-fuzzy-search
Add fuzzy `$search` to mongodb `service.find` queries: full-text search on documents as well as pattern matching on individual fields.

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
    find: search()
  }
})

// Field matching
const users = app.service('users')
// find users with first name containing a 's' and last name starting by 'art'
let userDocuments = await users.find({ query: { firstName: { $search: 's' }, lastName: { $search: '^art' } })

// Full-text search
const messages = app.service('messages')
// enable text index on title property, makes the title content searchable
messages.Model.createIndex({ title: 'text content talking about cats' })

// find documents with title talking about cats
let catDocuments = await messages.find({ query: { $search: 'cats' } })
```

Complete example:
```js
const feathers = require('feathers')
const hooks = require('feathers-hooks')
const MongoClient = require('mongodb').MongoClient
const service = require('feathers-mongodb')
const search = require('feathers-mongodb-fuzzy-search')

// use async function for await syntax
async function testDatabase () {
  let db = await MongoClient.connect('mongodb://localhost:27017/feathers')

  let app = feathers()
  app.configure(hooks())

  // setup messages service
  app.use('/messages', service({ Model: db.collection('messages') }))
  let messages = app.service('messages')
  // enable text index on title property
  messages.Model.createIndex({ title: 'text' })
  // add fuzzy search hook, may also use app.hooks for all services
  messages.hooks({
    before: {
      find: search()
    }
  })
  // add documents
  await messages.create([
    { title: 'lorem ipsum' },
    { title: 'lorem asdf ipsum' },
    { title: 'hello world' },
    { title: 'qwerty qwerty qwerty qwerty world' },
    { title: 'cats are awesome.-animales' },
  ])
  // find documents
  let docs = await messages.find({ query: { $search: 'world' } })
  console.log(docs)
  // [ { _id: 595173771dab955e373ac721, title: 'qwerty qwerty qwerty qwerty world' },
  //   { _id: 595173771dab955e373ac720, title: 'hello world' } ]

  // remove all documents
  await messages.remove(null)

  db.close()  // close connection to mongodb and exit
}

testDatabase()
  .catch(e => console.error(e))
```

## Notes
As default `"` in `$search` is removed and `$search` is padded with `"`. E.g. `some " text` becomes `"some text"`. If you want to disable this behaviour and leverage the full MongoDB $text API, you can disable escaping like this:

```js
app.hooks({
  before: {
    find: search({ escape: false })
  }
})
```

This package is tested with MongoDB version 3.2. You will probably run into problems using older versions of MongoDB, for example version 2.4 does not support `$text` search.

See [mongodb documentation](https://docs.mongodb.com/manual/reference/operator/query/text/#search-field) for more details about $text.
See [mongodb documentation](https://docs.mongodb.com/manual/reference/operator/query/regex) for more details about $regex.

## Development
```
npm test  # runs mocha
```

## License
MIT © 2017 Arve Seljebu / Luc Claustres
