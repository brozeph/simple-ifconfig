/* eslint no-magic-numbers: 0 */
/* eslint no-unused-expressions: 0 */

import chai from 'chai';
import childProcess from 'child_process';
import lib from '../src';
import mockSpawn from 'mock-spawn';

const should = chai.should();

describe('unit tests for simple-ifconfig', function () {
	let
		commandsCalled = [],
		ifconfigMock = mockSpawn(),
		mockErr = '',
		mockExitCode = 0,
		mockOutput = '';

		// override the child process to mock calls to spawn
		childProcess.spawn = ifconfigMock;
		/* eslint no-invalid-this: 0 */
		ifconfigMock.setStrategy((command, args, opts) => {
			// if error is the command, cause an exception
			if (/error/.test(command)) {
				return function () {
					this.emit('error', new Error('test error'));
				};
			}

			// let non ifconfig commands pass through
			if (!/ifconfig/.test(command)) {
				return null;
			}

			// track what was called
			commandsCalled.push({
				args,
				command,
				opts
			});

			// handle response
			return function (done) {
				if (mockErr) {
					this.stderr.write(mockErr);
				} else {
					this.stdout.write(mockOutput);
				}

				return done(mockExitCode);
			};
		});

	beforeEach(function () {
		// reset mock outputs
		commandsCalled = [];
		mockErr = '';
		mockExitCode = 0;
		mockOutput = '';
	});

	describe('#', () => {
		it('should default options when not provided', () => {
			let client = new lib.NetworkInfo();

			should.exist(client);
			should.exist(client.listInterfaces);
			should.exist(client.options);

			should.exist(client.options.ifconfigPath);
			client.options.ifconfigPath.should.equal('/sbin/ifconfig');
			should.exist(client.options.active);
			client.options.active.should.be.true;
			should.exist(client.options.internal);
			client.options.internal.should.be.false;
		});

		it('should override options when specified', () => {
			let client = new lib.NetworkInfo({
				active : false,
				ifconfigPath : '/usr/local/bin/ifconfig',
				internal : true
			});

			should.exist(client);
			should.exist(client.listInterfaces);
			should.exist(client.options);

			should.exist(client.options.ifconfigPath);
			client.options.ifconfigPath.should.equal('/usr/local/bin/ifconfig');
			should.exist(client.options.active);
			client.options.active.should.be.false;
			should.exist(client.options.internal);
			client.options.internal.should.be.true;
		});

		it('should call the supplied ifconfig command', (done) => {
			let client = new lib.NetworkInfo({
				ifconfigPath : '/usr/local/bin/ifconfig'
			});

			should.exist(client);

			client
				.listInterfaces()
				.then(() => {
					should.exist(commandsCalled);
					commandsCalled.should.have.length(1);
					commandsCalled[0].command.should.equal('/usr/local/bin/ifconfig');

					return done();
				})
				.catch(done);
		});
	});

	describe('#applySettings', () => {
		let client;

		beforeEach(() => {
			client = new lib.NetworkInfo();

			mockOutput = `
em0: flags=8843<UP,BROADCAST,RUNNING,SIMPLEX,MULTICAST> metric 0 mtu 1500
	options=9b<RXCSUM,TXCSUM,VLAN_MTU,VLAN_HWTAGGING,VLAN_HWCSUM>
	ether 08:00:27:35:48:46
	inet6 fe80::a00:27ff:fe35:4846%em0 prefixlen 64 scopeid 0x1
	inet 10.0.2.4 netmask 0xffffff00 broadcast 10.0.2.255
	nd6 options=23<PERFORMNUD,ACCEPT_RTADV,AUTO_LINKLOCAL>
	media: Ethernet autoselect (1000baseT <full-duplex>)
	status: active
lo0: flags=8049<UP,LOOPBACK,RUNNING,MULTICAST> metric 0 mtu 16384
	options=600003<RXCSUM,TXCSUM,RXCSUM_IPV6,TXCSUM_IPV6>
	inet6 ::1 prefixlen 128
	inet6 fe80::1%lo0 prefixlen 64 scopeid 0x2
	inet 127.0.0.1 netmask 0xff000000
	nd6 options=21<PERFORMNUD,AUTO_LINKLOCAL>
	groups: lo
`;
		});

		it('should properly validate interface name', (done) => {
			client
				.applySettings()
				.then(() => done(new Error('should properly validate interface name')))
				.catch((err) => {
					should.exist(err);
					err.message.should.contain('interface name is required');

					return done();
				});
		});

		it('should properly validate settings', (done) => {
			client
				.applySettings('en0')
				.then(() => done(new Error('should properly validate interface name')))
				.catch((err) => {
					should.exist(err);
					err.message.should.contain('settings are required');

					return done();
				});
		});

		it('should attempt to bring interface down when active is false', (done) => {
			client
				.applySettings('en0', { active : false })
				.then((result) => {
					should.exist(result);
					should.exist(commandsCalled);
					commandsCalled.should.have.length(3);
					commandsCalled[1].args.should.have.length(2);
					commandsCalled[1].args[0].should.equal('en0');
					commandsCalled[1].args[1].should.equal('down');

					return done();
				})
				.catch(done);
		});

		it('should attempt to bring interface up when active is true', (done) => {
			client
				.applySettings('en0', { active : true })
				.then(() => {
					should.exist(commandsCalled);
					commandsCalled.should.have.length(3);
					commandsCalled[1].args.should.have.length(2);
					commandsCalled[1].args[0].should.equal('en0');
					commandsCalled[1].args[1].should.equal('up');

					return done();
				})
				.catch(done);
		});

		it('should attempt to set hardware address when provided', (done) => {
			client
				.applySettings('en0', { hardwareAddress : '00:00:00:00:00:00' })
				.then(() => {
					should.exist(commandsCalled);
					commandsCalled.should.have.length(3);
					commandsCalled[1].args.should.have.length(4);
					commandsCalled[1].args[3].should.equal('00:00:00:00:00:00');

					return done();
				})
				.catch(done);
		});

		it('should not attempt to apply ipv4 settings when no address, broadcast or netmask is provided', (done) => {
			client
				.applySettings('en0', { ipv4 : {
					address : null,
					broadcast : null,
					netmask : null
				} })
				.then(() => {
					should.exist(commandsCalled);
					commandsCalled.should.have.length(2);

					return done();
				})
				.catch(done);
		});

		it('should attempt to apply ipv4 settings when provided', (done) => {
			client
				.applySettings('en0', { ipv4 : {
					address : '127.0.0.1',
					broadcast : '127.0.0.0',
					netmask : '255.255.0.0'
				} })
				.then(() => {
					should.exist(commandsCalled);
					commandsCalled.should.have.length(3);
					commandsCalled[1].args[0].should.equal('en0');
					commandsCalled[1].args[1].should.equal('127.0.0.1');
					commandsCalled[1].args[2].should.equal('broadcast');
					commandsCalled[1].args[3].should.equal('127.0.0.0');
					commandsCalled[1].args[4].should.equal('netmask');
					commandsCalled[1].args[5].should.equal('255.255.0.0');

					return done();
				})
				.catch(done);
		});

		it('should attempt to set mtu when provided', (done) => {
			client
				.applySettings('en0', { mtu : 1500 })
				.then(() => {
					should.exist(commandsCalled);
					commandsCalled.should.have.length(3);
					commandsCalled[1].args.should.have.length(3);
					commandsCalled[1].args[2].should.equal(1500);

					return done();
				})
				.catch(done);
		});
	});

	describe('#listInterfaces', () => {
		it('should properly handle command error response', (done) => {
			let client = new lib.NetworkInfo();

			mockErr = 'test error';
			mockExitCode = 100;

			client
				.listInterfaces()
				.then(() => done(new Error('command error response')))
				.catch((err) => {
					should.exist(err);
					err.message.should.equal('test error');

					return done();
				});
		});

		it('should properly handle command execution error', (done) => {
			let client = new lib.NetworkInfo({
				ifconfigPath : 'error'
			});

			client
				.listInterfaces()
				.then(() => done(new Error('command execution error')))
				.catch((err) => {
					should.exist(err);
					err.message.should.equal('test error');

					return done();
				});
		});

		it('should properly omit verbose when false', (done) => {
			let client = new lib.NetworkInfo({ verbose : false });

			client
				.listInterfaces()
				.then(() => {
					should.exist(commandsCalled);
					should.exist(commandsCalled[0]);
					commandsCalled[0].args.should.have.length(0);

					return done();
				})
				.catch(done);
		});
	});

	describe('#listInterfaces (bsd)', () => {
		beforeEach(() => {
			mockOutput = `
em0: flags=8843<UP,BROADCAST,RUNNING,SIMPLEX,MULTICAST> metric 0 mtu 1500
	options=9b<RXCSUM,TXCSUM,VLAN_MTU,VLAN_HWTAGGING,VLAN_HWCSUM>
	ether 08:00:27:35:48:46
	inet6 fe80::a00:27ff:fe35:4846%em0 prefixlen 64 scopeid 0x1
	inet 10.0.2.4 netmask 0xffffff00 broadcast 10.0.2.255
	nd6 options=23<PERFORMNUD,ACCEPT_RTADV,AUTO_LINKLOCAL>
	media: Ethernet autoselect (1000baseT <full-duplex>)
	status: active
lo0: flags=8049<UP,LOOPBACK,RUNNING,MULTICAST> metric 0 mtu 16384
	options=600003<RXCSUM,TXCSUM,RXCSUM_IPV6,TXCSUM_IPV6>
	inet6 ::1 prefixlen 128
	inet6 fe80::1%lo0 prefixlen 64 scopeid 0x2
	inet 127.0.0.1 netmask 0xff000000
	nd6 options=21<PERFORMNUD,AUTO_LINKLOCAL>
	groups: lo
`;
		});

		it('should properly parse bsd ifconfig output (defaults)', (done) => {
			let client = new lib.NetworkInfo();

			client
				.listInterfaces()
				.then((interfaces) => {
					should.exist(interfaces);
					interfaces.should.be.an('array');
					interfaces.should.have.length(1);

					interfaces[0].hardwareAddress.should.equal('08:00:27:35:48:46');
					interfaces[0].active.should.equal(true);
					interfaces[0].name.should.equal('em0');
					interfaces[0].ipv4.should.be.an('array');
					interfaces[0].ipv4.should.have.length(1);
					interfaces[0].ipv4[0].address.should.equal('10.0.2.4');
					interfaces[0].ipv4[0].broadcast.should.equal('10.0.2.255');
					interfaces[0].ipv4[0].netmask.should.equal('255.255.255.0');
					interfaces[0].ipv6.should.be.an('array');
					interfaces[0].ipv6.should.have.length(1);
					interfaces[0].ipv6[0].address.should.equal('fe80::a00:27ff:fe35:4846');
					interfaces[0].ipv6[0].prefixLength.should.equal(64);
					should.exist(interfaces[0].flags);
					interfaces[0].flags.broadcast.should.be.true;
					interfaces[0].flags.multicast.should.be.true;
					interfaces[0].flags.running.should.be.true;
					interfaces[0].flags.up.should.be.true;
					interfaces[0].metric.should.equal(0);
					interfaces[0].mtu.should.equal(1500);

					return done();
				})
				.catch(done);
		});

		it('should properly include internal and inactive adapters', (done) => {
			let client = new lib.NetworkInfo({
				active : false,
				internal : true
			});

			client
				.listInterfaces()
				.then((interfaces) => {
					should.exist(interfaces);
					interfaces.should.be.an('array');
					interfaces.should.have.length(2);

					return done();
				})
				.catch(done);
		});

		it('should properly parse non-hexidecimal formatted netmask values', (done) => {
			let client = new lib.NetworkInfo();

			mockOutput = `
em0: flags=8843<UP,BROADCAST,RUNNING,SIMPLEX,MULTICAST> metric 0 mtu 1500
	options=9b<RXCSUM,TXCSUM,VLAN_MTU,VLAN_HWTAGGING,VLAN_HWCSUM>
	ether 08:00:27:35:48:46
	inet6 fe80::a00:27ff:fe35:4846%em0 prefixlen 64 scopeid 0x1
	inet 10.0.2.4 netmask 255.255.255.0 broadcast 10.0.2.255
	nd6 options=23<PERFORMNUD,ACCEPT_RTADV,AUTO_LINKLOCAL>
	media: Ethernet autoselect (1000baseT <full-duplex>)
	status: active
lo0: flags=8049<UP,LOOPBACK,RUNNING,MULTICAST> metric 0 mtu 16384
	options=600003<RXCSUM,TXCSUM,RXCSUM_IPV6,TXCSUM_IPV6>
	inet6 ::1 prefixlen 128
	inet6 fe80::1%lo0 prefixlen 64 scopeid 0x2
	inet 127.0.0.1 netmask 0xff000000
	nd6 options=21<PERFORMNUD,AUTO_LINKLOCAL>
	groups: lo
`;

			client
				.listInterfaces()
				.then((interfaces) => {
						should.exist(interfaces);
						interfaces[0].ipv4[0].netmask.should.equal('255.255.255.0');

						return done();
				})
				.catch(done);
		});
	});

	describe('#listInterfaces (linux)', () => {
		beforeEach(() => {
			mockOutput = `
enp2s0f0  Link encap:Ethernet  HWaddr a8:20:66:19:79:fe
          UP BROADCAST MULTICAST  MTU:1500  Metric:1
          RX packets:0 errors:0 dropped:0 overruns:0 frame:0
          TX packets:0 errors:0 dropped:0 overruns:0 carrier:0
          collisions:0 txqueuelen:1000
          RX bytes:0 (0.0 B)  TX bytes:0 (0.0 B)
          Interrupt:16

lo        Link encap:Local Loopback
          inet addr:127.0.0.1  Mask:255.0.0.0
          inet6 addr: ::1/128 Scope:Host
          UP LOOPBACK RUNNING  MTU:65536  Metric:1
          RX packets:389 errors:0 dropped:0 overruns:0 frame:0
          TX packets:389 errors:0 dropped:0 overruns:0 carrier:0
          collisions:0 txqueuelen:1
          RX bytes:34039 (34.0 KB)  TX bytes:34039 (34.0 KB)

wlp3s0b1  Link encap:Ethernet  HWaddr 20:c9:d0:c6:bd:5b
          inet addr:10.129.41.182  Bcast:10.129.41.255  Mask:255.255.255.0
          inet6 addr: fe80::15a:a71:f50c:c2ef/64 Scope:Link
          UP BROADCAST RUNNING MULTICAST  MTU:1500  Metric:1
          RX packets:2605 errors:0 dropped:0 overruns:0 frame:0
          TX packets:1416 errors:0 dropped:0 overruns:0 carrier:0
          collisions:0 txqueuelen:1000
          RX bytes:1593582 (1.5 MB)  TX bytes:283859 (283.8 KB)

enp1s0    Link encap:Ethernet  HWaddr 84:39:be:63:cd:85
          inet addr:10.129.41.81  Bcast:10.129.41.255  Mask:255.255.255.0
          inet6 addr: fe80::8639:beff:fe63:cd85/64 Scope:Link
          UP BROADCAST RUNNING MULTICAST  MTU:1500  Metric:1
          RX packets:2799568 errors:0 dropped:423 overruns:0 frame:0
          TX packets:1137373 errors:0 dropped:0 overruns:0 carrier:0
          collisions:0 txqueuelen:1000
          RX bytes:1047078290 (1.0 GB)  TX bytes:152740398 (152.7 MB)
`;
		});

		it('should properly parse linux ifconfig output (defaults)', (done) => {
			let client = new lib.NetworkInfo();

			client
				.listInterfaces()
				.then((interfaces) => {
					should.exist(interfaces);
					interfaces.should.be.an('array');
					interfaces.should.have.length(2);

					interfaces[0].hardwareAddress.should.equal('20:c9:d0:c6:bd:5b');
					interfaces[0].active.should.equal(true);
					interfaces[0].name.should.equal('wlp3s0b1');
					interfaces[0].ipv4.should.be.an('array');
					interfaces[0].ipv4.should.have.length(1);
					interfaces[0].ipv4[0].address.should.equal('10.129.41.182');
					interfaces[0].ipv4[0].broadcast.should.equal('10.129.41.255');
					interfaces[0].ipv4[0].netmask.should.equal('255.255.255.0');
					interfaces[0].ipv6.should.be.an('array');
					interfaces[0].ipv6.should.have.length(1);
					interfaces[0].ipv6[0].address.should.equal('fe80::15a:a71:f50c:c2ef');
					interfaces[0].ipv6[0].prefixLength.should.equal(64);
					should.exist(interfaces[0].flags);
					interfaces[0].flags.broadcast.should.be.true;
					interfaces[0].flags.multicast.should.be.true;
					interfaces[0].flags.running.should.be.true;
					interfaces[0].flags.up.should.be.true;
					interfaces[0].metric.should.equal(1);
					interfaces[0].mtu.should.equal(1500);

					return done();
				})
				.catch(done);
		});

		it('should properly include internal and inactive adapters', (done) => {
			let client = new lib.NetworkInfo({
				active : false,
				internal : true
			});

			client
				.listInterfaces()
				.then((interfaces) => {
					should.exist(interfaces);
					interfaces.should.be.an('array');
					interfaces.should.have.length(4);

					return done();
				})
				.catch(done);
		});
	});

	describe('#listInterfaces (darwin)', () => {
		beforeEach(() => {
			mockOutput = `
lo0: flags=8049<UP,LOOPBACK,RUNNING,MULTICAST> mtu 16384 index 1
	eflags=11000000<ECN_ENABLE,SENDLIST>
	options=1203<RXCSUM,TXCSUM,TXSTATUS,SW_TIMESTAMP>
	inet 127.0.0.1 netmask 0xff000000
	inet6 ::1 prefixlen 128
	inet6 fe80::1%lo0 prefixlen 64 scopeid 0x1
	nd6 options=201<PERFORMNUD,DAD>
	link quality: 100 (good)
	state availability: 0 (true)
	timestamp: disabled
	qosmarking enabled: no mode: none
gif0: flags=8010<POINTOPOINT,MULTICAST> mtu 1280 index 2
	eflags=1000000<ECN_ENABLE>
	state availability: 0 (true)
	qosmarking enabled: no mode: none
stf0: flags=0<> mtu 1280 index 3
	eflags=1000000<ECN_ENABLE>
	state availability: 0 (true)
	qosmarking enabled: no mode: none
en0: flags=8863<UP,BROADCAST,SMART,RUNNING,SIMPLEX,MULTICAST> mtu 1500 index 4
	eflags=12000c0<ACCEPT_RTADV,TXSTART,NOACKPRI,ECN_ENABLE>
	ether 28:cf:e9:17:99:a9
	inet6 fe80::8f0:d3fc:39a2:bb9d%en0 prefixlen 64 secured scopeid 0x4
	inet 10.129.14.60 netmask 0xffffff00 broadcast 10.129.14.255
	nd6 options=201<PERFORMNUD,DAD>
	media: autoselect
	status: active
	type: Wi-Fi
	link quality: 100 (good)
	state availability: 0 (true)
	scheduler: TCQ (driver managed)
	uplink rate: 20.09 Mbps [eff] / 21.60 Mbps
	downlink rate: 20.09 Mbps [eff] / 21.60 Mbps [max]
	qosmarking enabled: no mode: none
en1: flags=963<UP,BROADCAST,SMART,RUNNING,PROMISC,SIMPLEX> mtu 1500 index 6
	eflags=1000080<TXSTART,ECN_ENABLE>
	options=60<TSO4,TSO6>
	ether 32:00:12:54:34:a0
	media: autoselect <full-duplex>
	status: inactive
	type: Ethernet
	state availability: 0 (true)
	scheduler: QFQ
	qosmarking enabled: no mode: none
en2: flags=963<UP,BROADCAST,SMART,RUNNING,PROMISC,SIMPLEX> mtu 1500 index 7
	eflags=1000080<TXSTART,ECN_ENABLE>
	options=60<TSO4,TSO6>
	ether 32:00:12:54:34:a1
	media: autoselect <full-duplex>
	status: inactive
	type: Ethernet
	state availability: 0 (true)
	scheduler: QFQ
	qosmarking enabled: no mode: none
p2p0: flags=8843<UP,BROADCAST,RUNNING,SIMPLEX,MULTICAST> mtu 2304 index 10
	eflags=1000080<TXSTART,ECN_ENABLE>
	ether 0a:cf:e9:17:99:a9
	media: autoselect
	status: inactive
	type: Wi-Fi
	state availability: 0 (true)
	scheduler: TCQ (driver managed)
	link rate: 10.00 Mbps
	qosmarking enabled: no mode: none
awdl0: flags=8943<UP,BROADCAST,RUNNING,PROMISC,SIMPLEX,MULTICAST> mtu 1484 index 11
	eflags=13e0080<TXSTART,LOCALNET_PRIVATE,ND6ALT,RESTRICTED_RECV,AWDL,NOACKPRI,ECN_ENABLE>
	ether 4e:98:56:5b:36:97
	inet6 fe80::4c98:56ff:fe5b:3697%awdl0 prefixlen 64 scopeid 0xb
	nd6 options=201<PERFORMNUD,DAD>
	media: autoselect
	status: active
	type: Wi-Fi
	state availability: 0 (true)
	scheduler: TCQ (driver managed)
	link rate: 10.00 Mbps
	qosmarking enabled: no mode: none
bridge0: flags=8863<UP,BROADCAST,SMART,RUNNING,SIMPLEX,MULTICAST> mtu 1500 index 12
	eflags=1000000<ECN_ENABLE>
	options=63<RXCSUM,TXCSUM,TSO4,TSO6>
	ether 32:00:12:54:34:a0
	Configuration:
		id 0:0:0:0:0:0 priority 0 hellotime 0 fwddelay 0
		maxage 0 holdcnt 0 proto stp maxaddr 100 timeout 1200
		root id 0:0:0:0:0:0 priority 0 ifcost 0 port 0
		ipfilter disabled flags 0x2
	member: en1 flags=3<LEARNING,DISCOVER>
	        ifmaxaddr 0 port 6 priority 0 path cost 0
	        hostfilter 0 hw: 0:0:0:0:0:0 ip: 0.0.0.0
	member: en2 flags=3<LEARNING,DISCOVER>
	        ifmaxaddr 0 port 7 priority 0 path cost 0
	        hostfilter 0 hw: 0:0:0:0:0:0 ip: 0.0.0.0
	nd6 options=201<PERFORMNUD,DAD>
	media: <unknown type>
	status: inactive
	state availability: 0 (true)
	qosmarking enabled: no mode: none
utun0: flags=8051<UP,POINTOPOINT,RUNNING,MULTICAST> mtu 2000 index 13
	eflags=1002080<TXSTART,NOAUTOIPV6LL,ECN_ENABLE>
	inet6 fe80::b32:282a:9d29:e146%utun0 prefixlen 64 scopeid 0xd
	nd6 options=201<PERFORMNUD,DAD>
	agent domain:ids501 type:clientchannel flags:0x83 desc:"IDSNexusAgent ids501 : clientchannel"
	state availability: 0 (true)
	scheduler: QFQ
	qosmarking enabled: no mode: none
vboxnet0: flags=8842<BROADCAST,RUNNING,SIMPLEX,MULTICAST> mtu 1500 index 15
	eflags=1000000<ECN_ENABLE>
	ether 0a:00:27:00:00:00
	type: Ethernet
	state availability: 0 (true)
	qosmarking enabled: no mode: none
utun1: flags=8051<UP,POINTOPOINT,RUNNING,MULTICAST> mtu 1380 index 14
	eflags=1002080<TXSTART,NOAUTOIPV6LL,ECN_ENABLE>
	inet6 fe80::1c8b:d5e5:5bce:76c4%utun1 prefixlen 64 scopeid 0xe
	nd6 options=201<PERFORMNUD,DAD>
	state availability: 1 (false)
	scheduler: QFQ
	qosmarking enabled: no mode: none
fw0: flags=8863<UP,BROADCAST,SMART,RUNNING,SIMPLEX,MULTICAST> mtu 4078 index 5
	eflags=1000000<ECN_ENABLE>
	lladdr 00:0a:27:02:00:4b:13:fb
	nd6 options=201<PERFORMNUD,DAD>
	media: autoselect <full-duplex>
	status: inactive
	type: IP over FireWire
	state availability: 0 (true)
	link rate: 10.00 Mbps
	qosmarking enabled: no mode: none
en3: flags=8863<UP,BROADCAST,SMART,RUNNING,SIMPLEX,MULTICAST> mtu 1500 index 8
	eflags=10001c0<ACCEPT_RTADV,TXSTART,RXPOLL,ECN_ENABLE>
	options=10b<RXCSUM,TXCSUM,VLAN_HWTAGGING,AV>
	ether a8:20:66:16:d4:9d
	inet6 fe80::48e:ceba:32c2:923c%en3 prefixlen 64 secured scopeid 0x8
	inet 10.129.41.23 netmask 0xffffff00 broadcast 10.129.41.255
	nd6 options=201<PERFORMNUD,DAD>
	media: autoselect (1000baseT <full-duplex>)
	status: active
	type: Ethernet
	link quality: 100 (good)
	state availability: 0 (true)
	scheduler: QFQ
	link rate: 1.00 Gbps
	qosmarking enabled: no mode: none
`;
		});

		it('should properly parse linux ifconfig output (defaults)', (done) => {
			let client = new lib.NetworkInfo();

			client
				.listInterfaces()
				.then((interfaces) => {
					should.exist(interfaces);
					interfaces.should.be.an('array');
					interfaces.should.have.length(3);

					interfaces[0].hardwareAddress.should.equal('28:cf:e9:17:99:a9');
					interfaces[0].active.should.equal(true);
					interfaces[0].index.should.equal(4);
					interfaces[0].name.should.equal('en0');
					interfaces[0].ipv4.should.be.an('array');
					interfaces[0].ipv4.should.have.length(1);
					interfaces[0].ipv4[0].address.should.equal('10.129.14.60');
					interfaces[0].ipv4[0].broadcast.should.equal('10.129.14.255');
					interfaces[0].ipv4[0].netmask.should.equal('255.255.255.0');
					interfaces[0].ipv6.should.be.an('array');
					interfaces[0].ipv6.should.have.length(1);
					interfaces[0].ipv6[0].address.should.equal('fe80::8f0:d3fc:39a2:bb9d');
					interfaces[0].ipv6[0].prefixLength.should.equal(64);
					should.exist(interfaces[0].flags);
					interfaces[0].flags.broadcast.should.be.true;
					interfaces[0].flags.multicast.should.be.true;
					interfaces[0].flags.running.should.be.true;
					interfaces[0].flags.smart.should.be.true;
					interfaces[0].flags.up.should.be.true;
					interfaces[0].mtu.should.equal(1500);

					return done();
				})
				.catch(done);
		});

		it('should properly include internal and inactive adapters', (done) => {
			let client = new lib.NetworkInfo({
				active : false,
				internal : true
			});

			client
				.listInterfaces()
				.then((interfaces) => {
					should.exist(interfaces);
					interfaces.should.be.an('array');
					interfaces.should.have.length(14);

					return done();
				})
				.catch(done);
		});
	});
});
