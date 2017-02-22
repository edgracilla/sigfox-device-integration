'use strict'

let request = require('request')

module.exports.credentials = {}

module.exports.getDeviceTypes = function (callback) {
  request.get({
    url: 'https://backend.sigfox.com/api/devicetypes',
    gzip: true,
    json: true,
    auth: this.credentials
  }, (error, response, body) => {
    callback(error, body)
  })
}

module.exports.getDevices = function (deviceType, callback) {
  request.get({
    url: `https://backend.sigfox.com/api/devicetypes/${deviceType}/devices`,
    gzip: true,
    json: true,
    auth: this.credentials
  }, (error, response, body) => {
    callback(error, body)
  })
}

module.exports.getMoreDevices = function (nextUrl, callback) {
  request.get({
    url: nextUrl,
    gzip: true,
    json: true,
    auth: this.credentials
  }, (error, response, body) => {
    callback(error, body)
  })
}

module.exports.configure = function (options) {
  this.credentials = options
}
