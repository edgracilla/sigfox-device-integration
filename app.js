'use strict'

const async = require('async')
const reekoh = require('reekoh')
const get = require('lodash.get')
const isEmpty = require('lodash.isempty')

const plugin = new reekoh.plugins.InventorySync()

let sigfox = require('./sigfox')

let syncDevices = (devices, callback) => {
  async.each(devices, (device, done) => {
    plugin.syncDevice(device)
      .then(() => {
        done()
      }).catch((err) => {
        done(err)
      })
  }, callback)
}

plugin.on('sync', () => {
  async.waterfall([
    (callback) => {
      sigfox.getDeviceTypes(callback)
    }
  ], (error, deviceTypes) => {
    if (error) return plugin.logException(error)
    if (isEmpty(deviceTypes.data)) return plugin.logException(new Error('No devices types found.'))

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
              return plugin.logException(error)
                .then(cb)
            }

            if (!isEmpty(devices)) {
              hasMoreResults = !isEmpty(get(devices, 'paging.next')) ? get(devices, 'paging.next') : false
              syncDevices(get(devices, 'data'), (syncError) => {
                if (syncError) return plugin.logException(syncError).then(cb)
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
              return plugin.logException(error)
                .then(cb)
            }

            if (!isEmpty(devices)) {
              hasMoreResults = !isEmpty(get(devices, 'paging.next')) ? get(devices, 'paging.next') : false
              syncDevices(get(devices, 'data'), (syncError) => {
                return plugin.logException(syncError)
                  .then(cb)
              })
            } else {
              hasMoreResults = false
              cb()
            }
          })
        }
      }, (err) => {
        if (err) return plugin.logException(err)
        plugin.emit('syncDone')
      })
    })

    plugin.emit('syncDone')
  })
})

plugin.on('adddevice', (device) => {
  // no adddevice in old version
})

plugin.on('updatedevice', (device) => {
  // no updatedevice in old version
})

plugin.on('removedevice', (device) => {
  // no removedevice in old version
})

plugin.once('ready', () => {
  sigfox.configure({
    username: plugin.config.username,
    password: plugin.config.password
  })

  plugin.log('Device sync has been initialized.')
  plugin.emit('init')
})

module.exports = plugin
