/* global describe, it, after, before */

'use strict'

const amqp = require('amqplib')
const assert = require('assert')
const cp = require('child_process')

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
  this.slow(5000)

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

  after('terminate child process', function (done) {
    this.timeout(8000)

    setTimeout(() => {
      _conn.close()
      _app.kill('SIGKILL')
      done()
    }, 7000)
  })

  describe('#spawn', function () {
    it('should spawn a child process', function () {
      assert.ok(_app = cp.fork(process.cwd()), 'Child process not spawned.')
    })
  })

  describe('#handShake', function () {
    it('should notify the parent process when ready within 5 seconds', function (done) {
      this.timeout(8000)

      _app.on('message', function (message) {
        if (message.type === 'ready') {
          done()
        } else if (message.type === 'upsertdevice') {
          console.log('Upsert Device', message.data) // ??
        }
      })
    })
  })

  describe('#sync', function () {
    it('should execute device sync', function (done) {
      this.timeout(8000)

      _channel.sendToQueue(process.env.PLUGIN_ID, new Buffer(JSON.stringify({ operation: 'sync' })))

      _app.on('message', function (message) {
        if (message.type === 'syncDone') {
          done()
        }
      })
    })
  })
})
