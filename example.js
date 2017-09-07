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
    { title: 'cats are awesome.-animales' }
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
