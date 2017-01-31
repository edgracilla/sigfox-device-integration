'use strict'

const async = require('async')
const get = require('lodash.get')
const isEmpty = require('lodash.isempty')

const reekoh = require('demo-reekoh-node')
const _plugin = new reekoh.plugins.DeviceSync()

let sigfox = require('./sigfox')

let _options = {
  username: '577b580c50057436eb643762',
  password: '8211542d87e3764287c121a1b75b4b5c'
}

let syncDevices = function (devices, callback) {
  async.each(devices, (device, done) => {
    _plugin.syncDevice(device)
      .then(() => {
        done()
      }).catch((err) => {
        done(err)
      })
  }, callback)
}

_plugin.once('ready', function () {
  sigfox.configure(_options)

  _plugin.log('Device sync has been initialized.')
  setImmediate(() => { process.send({ type: 'ready' }) })
})

_plugin.on('sync', function () {
  async.waterfall([
    (callback) => {
      sigfox.getDeviceTypes(callback)
    }
  ], (error, deviceTypes) => {
    if (error) return _plugin.logException(error)
    if (isEmpty(deviceTypes.data)) return _plugin.logException(new Error('No devices types found.'))

    async.each(deviceTypes.data, (deviceType, done) => {
      let isInitial = true
      let hasMoreResults = true

      async.whilst(() => {
        return hasMoreResults
      }, (cb) => {
        if (isInitial) {
          sigfox.getDevices(deviceType.id, (error, devices) => {
            if (error) {
              hasMoreResults = false
              return _plugin.logException(error)
                .then(cb)
            }

            if (!isEmpty(devices)) {
              hasMoreResults = !isEmpty(get(devices, 'paging.next')) ? get(devices, 'paging.next') : false
              syncDevices(get(devices, 'data'), (syncError) => {
                if (syncError) return _plugin.logException(syncError) .then(cb)
              })
            } else {
              hasMoreResults = false
              cb()
            }
          })
        } else {
          sigfox.getMoreDevices(hasMoreResults, (error, devices) => {
            if (error) {
              hasMoreResults = false
              return _plugin.logException(error)
                .then(cb)
            }

            if (!isEmpty(devices)) {
              hasMoreResults = !isEmpty(get(devices, 'paging.next')) ? get(devices, 'paging.next') : false
              syncDevices(get(devices, 'data'), (syncError) => {
                return _plugin.logException(syncError)
                  .then(cb)
              })
            } else {
              hasMoreResults = false
              cb()
            }
          })
        }
      }, (err) => {
        if (err) return _plugin.logException(err)
        process.send({ type: 'syncDone' })
      })
    })

    process.send({ type: 'syncDone' })
  })
})

_plugin.on('adddevice', function (device) {
  // no adddevice in old version
})

_plugin.on('updatedevice', function (device) {
  // no updatedevice in old version
})

_plugin.on('removedevice', function (device) {
  // no removedevice in old version
})
