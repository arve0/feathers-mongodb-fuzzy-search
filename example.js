const feathers = require('@feathersjs/feathers')
const MongoClient = require('mongodb').MongoClient
const service = require('feathers-mongodb')
const search = require('feathers-mongodb-fuzzy-search')

// use async function for await syntax
async function testDatabase () {
  let client = await MongoClient.connect('mongodb://localhost:27017/')
  let db = client.db('feathers')

  let app = feathers()

  // setup messages service
  app.use('/messages', service({
    Model: db.collection('messages'),
    whitelist: ['$text', '$search'], // fields used by feathers-mongodb-fuzzy-search
  }))
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
  let documents = [
    { title: 'lorem ipsum' },
    { title: 'lorem asdf ipsum' },
    { title: 'hello world' },
    { title: 'qwerty qwerty qwerty qwerty world' },
    { title: 'cats are awesome.-animales' }
  ]
  for (let document of documents) {
    await messages.create(document)
  }
  // find documents
  let docs = await messages.find({ query: { $search: 'world' } })
  console.log(docs)
  // [ { _id: 595173771dab955e373ac721, title: 'qwerty qwerty qwerty qwerty world' },
  //   { _id: 595173771dab955e373ac720, title: 'hello world' } ]

  // remove all documents
  let allDocs = await messages.find()
  for (let doc of allDocs) {
    await messages.remove(doc._id)
  }

  client.close()  // close connection to mongodb and exit
}

testDatabase()
  .catch(e => console.error(e))
