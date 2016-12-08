const
	util = require('util'),

	ifconfig = require('./dist'),

	DEFAULT_DEPTH = 4;

module.export = (function () {
	'use strict';

	let network = new ifconfig.NetworkInfo({
		//active : false,
		//internal : true
	});

	network
		.listInterfaces()
		.then((result) => console.log(util.inspect(result, {
			colors : true,
			depth : DEFAULT_DEPTH
		})))
		.catch(console.error);
}());
