const ifconfig = require('./dist');

module.export = (function () {
	'use strict';

	let network = new ifconfig.NetworkInfo();

	network
		.listInterfaces()
		.then(console.log)
		.catch(console.error);
}());
