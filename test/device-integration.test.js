'use strict';

const USERNAME = '577b580c50057436eb643762',
	  PASSWORD = '8211542d87e3764287c121a1b75b4b5c';

var cp     = require('child_process'),
	assert = require('assert'),
	deviceIntegration;

describe('Device-integration', function () {
	this.slow(5000);

	after('terminate child process', function (done) {
		this.timeout(8000);

		setTimeout(() => {
			deviceIntegration.kill('SIGKILL');
			done();
		}, 7000);
	});

	describe('#spawn', function () {
		it('should spawn a child process', function () {
			assert.ok(deviceIntegration = cp.fork(process.cwd()), 'Child process not spawned.');
		});
	});

	describe('#handShake', function () {
		it('should notify the parent process when ready within 5 seconds', function (done) {
			this.timeout(5000);

			deviceIntegration.on('message', function (message) {
				if (message.type === 'ready')
					done();
				else if (message.type === 'upsertdevice')
					console.log('Upsert Device', message.data);
			});

			deviceIntegration.send({
				type: 'ready',
				data: {
					options: {
						username: USERNAME,
						password: PASSWORD
					}
				}
			}, function (error) {
				assert.ifError(error);
			});
		});
	});

	describe('#sync', function () {
		it('should execute device sync', function (done) {
			deviceIntegration.send({
				type: 'sync',
				data: {
					last_sync_dt: (new Date())
				}
			}, done);
		});
	});
});