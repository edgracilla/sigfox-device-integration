/* global describe, it, after, before */

'use strict'

const cp = require('child_process')
const assert = require('assert')
const amqp = require('amqplib')

let deviceIntegration
let _channel = {}
let _conn = null

describe('Device-integration', function () {
  this.slow(5000)

  before('init', () => {
    process.env.PLUGIN_ID = 'demo.dev-sync'
    process.env.BROKER = 'amqp://guest:guest@127.0.0.1/'

    process.env.SIGFOX_USERNAME = '577b580c50057436eb643762'
    process.env.SIGFOX_PASSWORD = '8211542d87e3764287c121a1b75b4b5c'

    amqp.connect(process.env.BROKER)
      .then((conn) => {
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
      deviceIntegration.kill('SIGKILL')
      done()
    }, 7000)
  })

  describe('#spawn', function () {
    it('should spawn a child process', function () {
      assert.ok(deviceIntegration = cp.fork(process.cwd()), 'Child process not spawned.')
    })
  })

  describe('#handShake', function () {
    it('should notify the parent process when ready within 5 seconds', function (done) {
      this.timeout(5000)

      deviceIntegration.on('message', function (message) {
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
      _channel.sendToQueue(process.env.PLUGIN_ID, new Buffer(JSON.stringify({ operation: 'sync' })))

      deviceIntegration.on('message', function (message) {
        if (message.type === 'syncDone') {
          done()
        }
      })
    })
  })
})
