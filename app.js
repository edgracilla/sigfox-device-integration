'use strict'

const async = require('async')
const reekoh = require('reekoh')
const get = require('lodash.get')
const isEmpty = require('lodash.isempty')

const _plugin = new reekoh.plugins.InventorySync()

let sigfox = require('./sigfox')

let syncDevices = (devices, callback) => {
  async.each(devices, (device, done) => {
    _plugin.syncDevice(device)
      .then(() => {
        done()
      }).catch((err) => {
        done(err)
      })
  }, callback)
}

_plugin.on('sync', () => {
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
                if (syncError) return _plugin.logException(syncError).then(cb)
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

_plugin.on('adddevice', (device) => {
  // no adddevice in old version
})

_plugin.on('updatedevice', (device) => {
  // no updatedevice in old version
})

_plugin.on('removedevice', (device) => {
  // no removedevice in old version
})

_plugin.once('ready', () => {
  sigfox.configure({
    username: _plugin.config.username,
    password: _plugin.config.password
  })

  _plugin.log('Device sync has been initialized.')
  process.send({ type: 'ready' })
})
