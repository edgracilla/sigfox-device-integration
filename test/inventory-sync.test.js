/* global describe, it, after, before */

'use strict'

const amqp = require('amqplib')
const assert = require('assert')

const PLUGIN_ID = 'demo.dev-sync'
const BROKER = 'amqp://guest:guest@127.0.0.1/'

let conf = {
  username: '577b580c50057436eb643762',
  password: '8211542d87e3764287c121a1b75b4b5c'
}

let _app = null
let _conn = null
let _channel = null

describe('Device-integration', function () {

  before('init', () => {
    process.env.BROKER = BROKER
    process.env.PLUGIN_ID = PLUGIN_ID
    process.env.CONFIG = JSON.stringify(conf)

    amqp.connect(BROKER).then((conn) => {
      _conn = conn
      return conn.createChannel()
    }).then((channel) => {
      _channel = channel
    }).catch((err) => {
      console.log(err)
    })
  })

  after('terminate', function () {
    _conn.close()
  })

  describe('#start', function () {
    it('should start the app', function (done) {
      this.timeout(10000)
      _app = require('../app')
      _app.once('init', done)
    })
  })

  describe('#sync', function () {
    it('should execute device sync', function (done) {
      this.timeout(10000)
      _channel.sendToQueue(PLUGIN_ID, new Buffer(JSON.stringify({ operation: 'sync' })))
      _app.on('syncDone', done)
    })
  })
})
