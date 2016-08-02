'use strict';

var get      = require('lodash.get'),
	async    = require('async'),
	sigfox   = require('./sigfox'),
	isEmpty  = require('lodash.isempty'),
	platform = require('./platform');

let syncDevices = function (devices, callback) {
	async.each(devices, (device, done) => {
		platform.syncDevice(device, done);
	}, callback);
};

/**
 * Emitted when the platform issues a sync request. Means that the device integration should fetch updates from the
 * 3rd party service.
 */
platform.on('sync', function () {
	async.waterfall([
		(callback) => {
			sigfox.getDeviceTypes(callback);
		}
	], (error, deviceTypes) => {
		if (error) return platform.handleException(error);

		async.each(deviceTypes.data, (deviceType, done) => {
			let isInitial = true;
			let hasMoreResults = true;

			async.whilst(() => {
				return hasMoreResults;
			}, (cb) => {
				if (isInitial) {
					sigfox.getDevices(deviceType.id, (error, devices) => {
						if (error) {
							hasMoreResults = false;
							platform.handleException(error);
							return cb();
						}

						if (!isEmpty(devices)) {
							hasMoreResults = !isEmpty(get(devices, 'paging.next')) ? get(devices, 'paging.next') : false;
							syncDevices(get(devices, 'data'), (syncError) => {
								platform.handleException(syncError);
								cb();
							});
						}
						else {
							hasMoreResults = false;
							cb();
						}
					});
				}
				else {
					sigfox.getMoreDevices(hasMoreResults, (error, devices) => {
						if (error) {
							hasMoreResults = false;
							platform.handleException(error);
							return cb();
						}

						if (!isEmpty(devices)) {
							hasMoreResults = !isEmpty(get(devices, 'paging.next')) ? get(devices, 'paging.next') : false;
							syncDevices(get(devices, 'data'), (syncError) => {
								platform.handleException(syncError);
								cb();
							});
						}
						else {
							hasMoreResults = false;
							cb();
						}
					});
				}
			}, done);
		});
	});
});

/**
 * Emitted when the platform shuts down the plugin. The Device Integration should perform cleanup of the resources on this event.
 */
platform.once('close', function () {
	platform.notifyClose();
});

/**
 * Emitted when the platform bootstraps the plugin. The plugin should listen once and execute its init process.
 * Afterwards, platform.notifyReady() should be called to notify the platform that the init process is done.
 * @param {object} options The parameters or options. Specified through config.json.
 */
platform.once('ready', function (options) {
	sigfox.configure(options);

	platform.notifyReady();
	platform.log('Device integration has been initialized.');
});