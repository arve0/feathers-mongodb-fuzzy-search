const feathers = require('feathers')
const hooks = require('feathers-hooks')
const MongoClient = require('mongodb').MongoClient;
const service = require('feathers-mongodb');
const search = require('./')
const assert = require('assert')

const documents = [
  { title: 'lorem ipsum' },
  { title: 'lorem asdf ipsum' },
  { title: 'hello world' },
  { title: 'qwerty qwerty qwerty qwerty world' },
  { title: 'cats are awesome.-animales' },
]

before(async function () {
  let db = await MongoClient.connect('mongodb://localhost:27017/feathers')
  app = feathers()
  app.configure(hooks())

  app.use('/test', service({ Model: db.collection('messages') }))
  app.service('test').Model.createIndex({ title: 'text' })

  app.hooks({
    before: {
      find: search()
    }
  })

  return app.service('test').create(documents)
})

after(function remove () {
  return app.service('test').remove(null)
})


it('should find 2 documents containing world', async function () {
  this.timeout(50)
  let docs = await app.service('test').find({ query: { $search: 'world' } })
  assert.equal(docs.length, 2)
})

it('should not use or when searching with space', async function () {
  let docs = await app.service('test').find({ query: { $search: 'lorem ipsum' } })
  assert.equal(docs.length, 1)
})

it('should not be able to quit " escape', async function () {
  let docs = await app.service('test').find({ query: { $search: 'lorem" "ipsum' } })
  // " are stripped, and we get match for { title: "lorem ipsum" }
  assert.equal(docs.length, 1)
})

it('should be able to search strings with .-"', async function () {
  let docs = await app.service('test').find({ query: { $search: 'awesome.-animales' } })
  assert.equal(docs.length, 1)
})
