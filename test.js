const feathers = require('@feathersjs/feathers')
const express = require('@feathersjs/express')
const rest = require('@feathersjs/express/rest')
const request = require('superagent')
const MongoClient = require('mongodb').MongoClient
const service = require('feathers-mongodb')
const search = require('./')
const assert = require('assert')

const messageDocuments = [
  { title: 'lorem ipsum' },
  { title: 'lorem asdf ipsum' },
  { title: 'hello different world' },
  { title: 'qwerty qwerty qwerty qwerty World' },
  { title: 'cats are awesome.-animales' }
]
const userDocuments = [
  { firstName: 'John', lastName: 'Doe', fullName: 'John Doe' },
  { firstName: 'Maya', lastName: 'White', fullName: 'Maya White' },
  { firstName: 'Maya', lastName: 'Black', fullName: 'Maya Black' },
  { firstName: 'Steve', lastName: 'Martins', fullName: 'Steve Martins' },
  { firstName: 'Steve', lastName: 'Artins', fullName: 'Steve Martins' }
]

let app
before(async function () {
  let client = await MongoClient.connect('mongodb://localhost:27017/')
  let db = client.db('feathers')
  app = express(feathers())
  app.configure(rest())

  let serviceOptions = {
    whitelist: ['$search', '$caseSensitive', '$text', '$regex'], // allow these mongodb fields
    multi: true, // allow inserting multiple documents at once
  }

  app.use('/messages', service({
    Model: db.collection('messages'),
    ...serviceOptions
  }))
  app.service('messages').Model.createIndex({ title: 'text' })
  app.service('messages').hooks({
    before: {
      all: search()  // full text search
    }
  })

  app.use('/users', service({
    Model: db.collection('users'),
    ...serviceOptions
  }))
  app.service('users').hooks({
    before: {
      all: search({
        excludedFields: ['fullName'],  // regex search
        fieldsNotEscaped: ['lastName']
      })
    }
  })

  app.use('/both', service({
    Model: db.collection('both'),
    ...serviceOptions
  }))
  app.service('both').Model.createIndex({ title: 'text' })
  app.service('both').hooks({
    before: {
      all: [
        search(),  // full text search
        search({   // regex search
          fields: ['title']
        })
      ]
    }
  })

  await app.service('messages').create(messageDocuments)
  await app.service('users').create(userDocuments)
  await app.service('both').create(messageDocuments)
})

after(async function remove () {
  await app.service('messages').remove(null)
  await app.service('users').remove(null)
  await app.service('both').remove(null)
})

it('should find 2 documents with title containing World when case insensitive', async function () {
  let docs = await app.service('messages').find({ query: { $search: 'World' } })
  assert.equal(docs.length, 2)
})

it('should patch 1 document with title containing World when case sensitive', async function () {
  let docs = await app.service('messages').patch(null, { patched: true }, { query: { $search: 'World', $caseSensitive: true } })
  assert.equal(docs.length, 1)
})

it('should find 1 document with title containing World when case sensitive', async function () {
  let docs = await app.service('messages').find({ query: { $search: 'World', $caseSensitive: true } })
  assert.equal(docs.length, 1)
})

it('should find 1 document with cat/differ due to stemming', async function () {
  let docs = await app.service('messages').find({ query: { $search: 'cat' } })
  assert.equal(docs.length, 1)
  docs = await app.service('messages').find({ query: { $search: 'differ' } })
  assert.equal(docs.length, 1)
})

it('should patch 1 document with title containing World when case sensitive', async function () {
  let docs = await app.service('messages').patch(null, { patched: true }, { query: { $search: 'World', $caseSensitive: true } })
  assert.equal(docs.length, 1)
})

it('should not use or when searching with space', async function () {
  let docs = await app.service('messages').find({ query: { $search: 'lorem ipsum' } })
  assert.equal(docs.length, 1)
})

it('should not be able to quit " escape', async function () {
  let docs = await app.service('messages').find({ query: { $search: 'lorem" "ipsum' } })
  // " are stripped, and we get match for { title: "lorem ipsum" }
  assert.equal(docs.length, 1)
})

it('should be able to search strings with .-"', async function () {
  let docs = await app.service('messages').find({ query: { $search: 'awesome.-animales' } })
  assert.equal(docs.length, 1)
})

it('should not allow search request based on excluded field', async function () {
  try {
    await app.service('users').find({ query: { fullName: { $search: 'a' } } })
    assert.fail('should have raised error')
  } catch (error) {
    assert.ok(error)
  }
})

it('should find 2 users with first name field containing "ay"', async function () {
  let docs = await app.service('users').find({ query: { firstName: { $search: 'ay' } } })
  assert.equal(docs.length, 2)
})

it('should find 2 users with last name field containing "art"', async function () {
  let docs = await app.service('users').find({ query: { lastName: { $search: 'art' } } })
  assert.equal(docs.length, 2)
})

it('should find 1 user with first name field containing "ay" and last name field containing "b" (case insensitive)', async function () {
  let docs = await app.service('users').find({ query: { firstName: { $search: 'ay' }, lastName: { $search: 'b' } } })
  assert.equal(docs.length, 1)
})

it('should not find user with first name field containing "ay" and last name field containing "b" (case sensitive)', async function () {
  let docs = await app.service('users').find({ query: { firstName: { $search: 'ay' }, lastName: { $search: 'b', caseSensitive: true } } })
  assert.equal(docs.length, 0)
})

it('should find 1 user with last name field starting with "art" using a regex', async function () {
  let docs = await app.service('users').find({ query: { lastName: { $search: '^art' } } })
  assert.equal(docs.length, 1)
})

it('should sanitize search request based on regex on escaped field', async function () {
  let docs = await app.service('users').find({ query: { firstName: { $search: '^a' } } })
  assert.equal(docs.length, 0)
})

it('should manage field matching with complex operators', async function () {
  let docs = await app.service('users').find({ query: { $or: [ { firstName: { $search: 'ay' } }, { lastName: { $search: 'm' } } ] } })
  assert.equal(docs.length, 3)
})

it('should work with both full text search and regex search', async function () {
  let ft = await app.service('both').find({ query: { $search: 'World' } })
  let reg = await app.service('both').find({ query: { title: { $search: 'World' } } })
  assert.equal(ft.length, 2)
  assert.equal(reg.length, 2)
})

it('should find 2 documents with title containing World when case insensitive using REST API', function (done) {
  let server = app.listen(3030)
  server.once('listening', async _ => {
    try {
      let response = await request.get('http://localhost:3030/messages').query({ $search: 'World' })
      assert.equal(response.body.length, 2)
      done()
    } catch (error) {
      done(error)
    }
  })
})

it('should find 2 users with first name field containing "ay" using REST API', async function () {
  let response = await request.get('http://localhost:3030/users').query({ firstName: { $search: 'ay' } })
  assert.equal(response.body.length, 2)
})

