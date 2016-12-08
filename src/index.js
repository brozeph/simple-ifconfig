'use strict';

import 'babel-polyfill';
import 'source-map-support/register';

import { spawn } from 'child_process';
import logger from 'debug';

const
	BASE_16 = 16,
	CHAR_ADVANCE = 2,
	debug = logger('simple-ifconfig'),
	DEFAULT_HARDWARE_ADDRESS = '00:00:00:00:00:00',
	DEFAULT_OPTIONS = {
		ifconfigPath : '/sbin/ifconfig',
		includeInactive : false,
		includeInternal : false
	},
	DEFAULT_METRIC = 99,
	RE_DELIM = /\ |\:/,
	// http://www-01.ibm.com/support/docview.wss?uid=isg3T1019709
	// http://docs.oracle.com/cd/E19253-01/816-5166/6mbb1kq31/#INTERFACE%20FLAGS
	RE_FLAGS = {
		addrconf : /(^|[\ \t\,]*)addrconf($|[\ \t\,]*)/i,
		allmulti : /(^|[\ \t\,]*)allmulti($|[\ \t\,]*)/i,
		anycast : /(^|[\ \t\,]*)anycast($|[\ \t\,]*)/i,
		broadcast : /(^|[\ \t\,]*)broadcast($|[\ \t\,]*)/i,
		cluif : /(^|[\ \t\,]*)cluif($|[\ \t\,]*)/i,
		cos : /(^|[\ \t\,]*)cos($|[\ \t\,]*)/i,
		debug : /(^|[\ \t\,]*)debug($|[\ \t\,]*)/i,
		deprecated : /(^|[\ \t\,]*)deprecated($|[\ \t\,]*)/i,
		dhcp : /(^|[\ \t\,]*)dhcp($|[\ \t\,]*)/i,
		duplicate : /(^|[\ \t\,]*)duplicate($|[\ \t\,]*)/i,
		failed : /(^|[\ \t\,]*)failed($|[\ \t\,]*)/i,
		fixedmtu : /(^|[\ \t\,]*)fixedmtu($|[\ \t\,]*)/i,
		grouprt : /(^|[\ \t\,]*)grouprt($|[\ \t\,]*)/i,
		inactive : /(^|[\ \t\,]*)inactive($|[\ \t\,]*)/i,
		loopback : /(^|[\ \t\,]*)loopback($|[\ \t\,]*)/i,
		mip : /(^|[\ \t\,]*)mip($|[\ \t\,]*)/i,
		multibcast : /(^|[\ \t\,]*)multi_bcast($|[\ \t\,]*)/i,
		multicast : /(^|[\ \t\,]*)multicast($|[\ \t\,]*)/i,
		multinet : /(^|[\ \t\,]*)multinet($|[\ \t\,]*)/i,
		noarp : /(^|[\ \t\,]*)noarp($|[\ \t\,]*)/i,
		nochecksum : /(^|[\ \t\,]*)nochecksum($|[\ \t\,]*)/i,
		nofailover : /(^|[\ \t\,]*)nofailover($|[\ \t\,]*)/i,
		nolocal : /(^|[\ \t\,]*)nolocal($|[\ \t\,]*)/i,
		nonud : /(^|[\ \t\,]*)nonud($|[\ \t\,]*)/i,
		nortexch : /(^|[\ \t\,]*)notexch($|[\ \t\,]*)/i,
		notrailers : /(^|[\ \t\,]*)notrailers($|[\ \t\,]*)/i,
		noxmit : /(^|[\ \t\,]*)noxmit($|[\ \t\,]*)/i,
		oactive : /(^|[\ \t\,]*)oactive($|[\ \t\,]*)/i,
		offline : /(^|[\ \t\,]*)offline($|[\ \t\,]*)/i,
		pfcopyall : /(^|[\ \t\,]*)pfcopyall($|[\ \t\,]*)/i,
		pointopoint : /(^|[\ \t\,]*)pointopoint($|[\ \t\,]*)/i,
		preferred : /(^|[\ \t\,]*)preferred($|[\ \t\,]*)/i,
		private : /(^|[\ \t\,]*)private($|[\ \t\,]*)/i,
		pseg : /(^|[\ \t\,]*)pseg($|[\ \t\,]*)/i,
		promisc : /(^|[\ \t\,]*)promisc($|[\ \t\,]*)/i,
		quorumloss : /(^|[\ \t\,]*)quorumloss($|[\ \t\,]*)/i,
		router : /(^|[\ \t\,]*)router($|[\ \t\,]*)/i,
		running : /(^|[\ \t\,]*)running($|[\ \t\,]*)/i,
		simplex : /(^|[\ \t\,]*)simplex($|[\ \t\,]*)/i,
		smart : /(^|[\ \t\,]*)smart($|[\ \t\,]*)/i,
		standby : /(^|[\ \t\,]*)standby($|[\ \t\,]*)/i,
		temporary : /(^|[\ \t\,]*)temporary($|[\ \t\,]*)/i,
		unnumbered : /(^|[\ \t\,]*)unnumbered($|[\ \t\,]*)/i,
		up : /(^|[\ \t\,]*)up($|[\ \t\,]*)/i,
		virtual : /(^|[\ \t\,]*)virtual($|[\ \t\,]*)/i,
		varmtu : /(^|[\ \t\,]*)var\_mtu($|[\ \t\,]*)/i,
		xresolv : /(^|[\ \t\,]*)xresolv($|[\ \t\,]*)/i
	},
	RE_HARDWARE_ADDRESS = /(ether|hwaddr)\ +(([0-9a-f]{2}[\:\-]{0,1}){6})/i,
	RE_IFCONFIG_FLAGS = /<?([a-z\,\ \t\_]*)\>?(([\ \t]*mtu[\:\ \t]+[0-9]+)|([\ \t]*metric[\:\ \t]+[0-9]+)|([\ \t]*index[\:\ \t]+[0-9]+))+/i,
	RE_IFCONFIG_IPV4 = /^\s*inet\s/,
	RE_IFCONFIG_IPV6 = /^\s*inet6\s/,
	RE_INDEX = /index[\ \:]+[0-9]+/i,
	RE_LINUX_ADDR = /^addr\:/i,
	RE_LINUX_BCAST = /^bcast\:/i,
	RE_LINUX_MASK = /^mask\:/i,
	RE_METRIC = /metric[\ \:]+[0-9]+/i,
	RE_MTU = /mtu[\ \:]+[0-9]+/i,
	RE_UNIX_ADDR = /^inet$/i,
	RE_UNIX_BCAST = /^broadcast$/i,
	RE_UNIX_IPV6_ADDR = /^inet6$/i,
	RE_UNIX_IPV6_PREFIX_LENGTH = /^prefixlen$/i,
	RE_UNIX_MASK = /^netmask$/i,
	RE_UNIX_STATUS = /^\s*status/i,
	RE_UNIX_STATUS_ACTIVE = /\ active$/i,
	VERBOSE = '-v';

function _ensureDefaultOptions () {
	Object
		.getOwnPropertyNames(DEFAULT_OPTIONS)
		.forEach((optionName) => {
			if (_isNullOrUndefined(this.options[optionName])) {
				debug(
					'setting option %s to %o',
					optionName,
					DEFAULT_OPTIONS[optionName]);

				this.options[optionName] = DEFAULT_OPTIONS[optionName];
			}
		});
}

function _ensureInterfaces () {
	if (this._interfaces.length) {
		return Promise.resolve(this._interfaces);
	}

	return new Promise((resolve, reject) => {
		return this::_ifconfig(VERBOSE)
			.then((result) => {
				this::_parseInterfaceInfo(result);

				return resolve(this._interfaces);
			})
			.catch(reject);
	});
}

function _ifconfig (...args) {
	return new Promise((resolve, reject) => {
		let
			ifconfig = spawn(this.options.ifconfigPath, args),
			stderr = [],
			stdout = [];

		// handle command exit
		ifconfig.on('close', (code) => {
			debug(
				'%s %s: command completed with code: %s',
				this.options.ifconfigPath,
				args.join(' '),
				code);

			if (code) {
				let err = new Error(stderr.join(''));
				err.code = code;
				err.command = `${this.options.ifconfigPath} ${args.join(' ')}`;

				return reject(err);
			}

			return resolve(stdout.join(''));
		});

		// handle errors while attempting to execute command
		ifconfig.on('error', (err) => {
			err.command = `${this.options.ifconfigPath} ${args.join(' ')}`;
			debug('%s: command failed: %s', err.command, err.message);

			return reject(err);
		});

		// capture command output
		ifconfig.stdout.on('data', (chunk) => stdout.push(chunk));
		ifconfig.stderr.on('data', (chunk) => stderr.push(chunk));
	});
}

function _isNullOrUndefined (value) {
	return value === null || typeof value === 'undefined';
}

function _parseInterfaceInfo (ifconfigResult) {
	let
		hardwareInterfaces = new Map(),
		iface;

	// ensure an entry for the default hardware address
	hardwareInterfaces.set(DEFAULT_HARDWARE_ADDRESS, []);

	// break the ifconfig command result into lines and parse them 1 by 1...
	ifconfigResult.split(/\r?\n/).forEach((line) => {
		let terms;

		// look for a new interface line
		if (!/\s/.test(line.charAt(0))) {
			// split the line on spaces (and optionally a colon)
			line = line.split(/\:?\ +/);

			// prior to creating a new iface, check to see if the previously parsed
			// one should be added to the map
			if (iface && iface.hardwareAddress === DEFAULT_HARDWARE_ADDRESS) {
				hardwareInterfaces.get(iface.hardwareAddress).push(iface);
			}

			// create new iface...
			iface = {
				hardwareAddress : DEFAULT_HARDWARE_ADDRESS,
				internal : true
			};

			// assign the name using the first term in the line
			iface.name = line[0];

			// ensure we properly parsed a name for the interface
			if (!iface.name) {
				return;
			}

			// rebuild the line minus the adapter name and continue processing
			line = line.slice(1).join(' ');
		}

		if (RE_HARDWARE_ADDRESS.test(line)) {
			terms = line.match(RE_HARDWARE_ADDRESS);
			debug(
				'hardware address of %s found for interface %s',
				terms[2],
				iface.name);
			iface.hardwareAddress = terms[2];
			iface.internal = false;

			if (hardwareInterfaces.has(iface.hardwareAddress)) {
				debug(
					'multiple interfaces found using hardware address %s',
					iface.hardwareAddress);

				hardwareInterfaces.get(iface.hardwareAddress).push(iface);
			} else {
				hardwareInterfaces.set(iface.hardwareAddress, [iface]);
			}
		}

		// look for flag information and process
		if (RE_IFCONFIG_FLAGS.test(line)) {
			debug('interface flags found for interface %s (%s)', iface.name, line);
			iface.flags = {};

			// map flags to the interface
			Object.keys(RE_FLAGS).forEach((flagName) => {
				if (RE_FLAGS[flagName].test(line)) {
					debug('flag %s found for interface %s', flagName, iface.name);
					iface.flags[flagName] = true;
				}
			});

			if (RE_INDEX.test(line)) {
				terms = line.match(RE_INDEX)[0].split(RE_DELIM);
				debug('index of %d found for interface %s', terms[1], iface.name);
				iface.index = parseInt(terms[1], 10);
			}

			if (RE_METRIC.test(line)) {
				terms = line.match(RE_METRIC)[0].split(RE_DELIM);
				debug('metric of %d found for interface %s', terms[1], iface.name);
				iface.metric = parseInt(terms[1], 10);
			}

			if (RE_MTU.test(line)) {
				terms = line.match(RE_MTU)[0].split(RE_DELIM);
				debug('mtu of %d found for interface %s', terms[1], iface.name);
				iface.mtu = parseInt(terms[1], 10);
			}

			return;
		}

		// look for IPv4 info...
		if (RE_IFCONFIG_IPV4.test(line)) {
			debug('IPv4 information found for interface %s', iface.name);


			iface.ipv4 = iface.ipv4 || {};
			terms = line.split(/\s+/);

			terms.forEach((term, i) => {
				// linux formatting - addr:10.0.2.15
				if (RE_LINUX_ADDR.test(term)) {
					iface.ipv4.address = term.split(RE_LINUX_ADDR)[1];
					return;
				}

				// linux formatting - Bcast:10.0.2.255
				if (RE_LINUX_BCAST.test(term)) {
					iface.ipv4.broadcast = term.split(RE_LINUX_BCAST)[1];
					return;
				}

				// linux formatting - Mask:255.255.255.0
				if (RE_LINUX_MASK.test(term)) {
					iface.ipv4.netmask = term.split(RE_LINUX_MASK)[1];
					return;
				}

				// unix formatting - address is 1st term
				if (RE_UNIX_ADDR.test(term)) {
					iface.ipv4.address = terms[i + 1];
					return;
				}

				// unix formatting - netmask 0xffffff00
				if (RE_UNIX_MASK.test(term)) {
					let netmask = terms[i + 1];

					// convert from hexidecimal if applicable
					if (/^0x/.test(netmask)) {
						// iterate 2 chars at a time converting from hex to decimal
						for (let i = CHAR_ADVANCE; i < netmask.length; i += CHAR_ADVANCE) {
							iface.ipv4.netmask = [
								iface.ipv4.netmask || '',
								iface.ipv4.netmask ? '.' : '',
								parseInt(
									['0x', netmask.slice(i, i + CHAR_ADVANCE)].join(''),
									BASE_16)].join('');
						}

						return;
					}

					// set netmask in teh event it is not in hexidecimal format
					iface.ipv4.netmask = netmask;
					return;
				}

				// unix formatting - broadcast 10.129.8.255
				if (RE_UNIX_BCAST.test(term)) {
					iface.ipv4.broadcast = terms[i + 1];
				}
			});
		}

		// look for IPv6 info
		if (RE_IFCONFIG_IPV6.test(line)) {
			debug('IPv6 information found for interface %s', iface.name);

			iface.ipv6 = iface.ipv6 || {};
			terms = line.split(/\ +/);

			terms.some((term, i) => {
				// check for linux address reference
				if (RE_LINUX_ADDR.test(term)) {
					terms = terms[i + 1].split(/\//);
					iface.ipv6.address = terms[0];
					iface.ipv6.prefixLength = terms[1]

					return true;
				}

				if (RE_UNIX_IPV6_ADDR.test(term.trim())) {
					iface.ipv6.address = terms[i + 1].split(/\%/)[0];
				}

				if (RE_UNIX_IPV6_PREFIX_LENGTH.test(term)) {
					iface.ipv6.prefixLength = parseInt(terms[i + 1], 10);

					return true;
				}

				return false;
			});
		}

		// look for status
		if (RE_UNIX_STATUS.test(line)) {
			terms = line.split(/\:/g);
			debug('interface %s is %s', iface.name, terms[1]);
			iface.active = RE_UNIX_STATUS_ACTIVE.test(terms[1]);
		}
	});

	// pick up any trailing interfaces where the hardware address was not defined
	if (iface && iface.hardwareAddress === DEFAULT_HARDWARE_ADDRESS) {
		hardwareInterfaces.get(iface.hardwareAddress).push(iface);
	}

	// populate the internal interfaces array
	hardwareInterfaces.forEach((interfaces) => {
		this._interfaces = this._interfaces
			.concat(interfaces
				// filter internal interfaces as applicable
				.filter((iface) => this.options.includeInternal || !iface.internal)
				// filter inactive interfaces as applicable
				.filter((iface) => this.options.includeInactive || iface.active));
	});

	this._interfaces.sort((a, b) => (
		(a.metric || a.index || DEFAULT_METRIC) - (b.metric || b.index || DEFAULT_METRIC)));

	return this._interfaces;
}

export class NetworkInfo {
	constructor (options) {
		debug('new NetworkInfo(%o)', options);

		this._interfaces = [];
		this._options = options || {};

		this::_ensureDefaultOptions();
	}

	async listInterfaces () {
		await this::_ensureInterfaces();

		return this._interfaces;
	}

	get options () {
		return this._options;
	}
}

export default { NetworkInfo }
