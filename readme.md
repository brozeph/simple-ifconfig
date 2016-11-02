# simple-ifconfig

This module aims to additional information beyond what the `os.networkInterfaces()` method returns (via Node) for each detected network interface.

## Requirements

* `Node.js`: >= `v4.x`
* `Platform`: `Darwin`, `Unix` or `Linux` (_Windows is not supported at this time_)

## Installation

_PENDING NPM PUBLISH_

```bash
npm install simple-ifconfig
```

## Usage

### Constructor

Creates a new instance of the `NetworkInfo` class that allows for interaction with the networking interfaces of the system.

`new NetworkInfo(options)`

#### Options (optional)

* `ifconfigPath` (_optional_, `String`) - defaults to `/sbin/ifconfig` when not provided; defines the path to the `ifconfig` executable
* `includeInternal` (_optional_, `Boolean`) - defaults to `false` when not provided; when `true`, loopback adapters are included when interacting with various other module methods

```javascript
import { NetworkInfo } from 'simple-ifconfig';

const
  ifconfigPath = '/sbin/ifconfg',
  includeInternal = false;

let networking = new NetworkInfo({
  ifconfigPath,
  includeInternal
});

// work with networking instance...
```

### #listInterfaces

Retrieves an array of available interfaces, optionally filtered according to [options](#options-optional) provided to the [constructor](#constructor).

`new NetworkInfo().listInterfaces()`

```javascript
import { NetworkInfo } from 'simple-ifconfig';

let networking = new NetworkInfo();

networking.listInterfaces()
  .then(console.log)
  .catch(console.error);
```

Example output:

```javascript
[ { hardwareAddress: 'a8:20:66:16:d4:9d',
    internal: false,
    name: 'en3',
    flags:
     { broadcast: true,
       multicast: true,
       running: true,
       simplex: true,
       smart: true,
       up: true },
    index: 4,
    mtu: 1500,
    ipv6: { address: 'fe80::c77:6296:f92e:9994', prefixLength: 64 },
    ipv4:
     { address: '10.129.4.111',
       netmask: '255.255.252.0',
       broadcast: '10.129.7.255' } },
  { hardwareAddress: '28:cf:e9:17:99:a9',
    internal: false,
    name: 'en0',
    flags:
     { broadcast: true,
       multicast: true,
       running: true,
       simplex: true,
       smart: true,
       up: true },
    index: 6,
    mtu: 1500,
    ipv6: { address: 'fe80::1074:afa6:c183:b4b8', prefixLength: 64 },
    ipv4:
     { address: '10.129.8.128',
       netmask: '255.255.255.0',
       broadcast: '10.129.8.255' } },
  { hardwareAddress: '32:00:12:54:34:a0',
    internal: false,
    name: 'en1',
    flags:
     { broadcast: true,
       promisc: true,
       running: true,
       simplex: true,
       smart: true,
       up: true },
    index: 7,
    mtu: 1500 },
  { hardwareAddress: '32:00:12:54:34:a1',
    internal: false,
    name: 'en2',
    flags:
     { broadcast: true,
       promisc: true,
       running: true,
       simplex: true,
       smart: true,
       up: true },
    index: 8,
    mtu: 1500 },
  { hardwareAddress: '0a:cf:e9:17:99:a9',
    internal: false,
    name: 'p2p0',
    flags:
     { broadcast: true,
       multicast: true,
       running: true,
       simplex: true,
       up: true },
    index: 9,
    mtu: 2304 },
  { hardwareAddress: '66:f3:72:2f:7b:95',
    internal: false,
    name: 'awdl0',
    flags:
     { broadcast: true,
       multicast: true,
       promisc: true,
       running: true,
       simplex: true,
       up: true },
    index: 10,
    mtu: 1484,
    ipv6: { address: 'fe80::64f3:72ff:fe2f:7b95', prefixLength: 64 } },
  { hardwareAddress: '32:00:12:54:34:a0',
    internal: false,
    name: 'bridge0',
    flags:
     { broadcast: true,
       multicast: true,
       running: true,
       simplex: true,
       smart: true,
       up: true },
    index: 11,
    mtu: 1500 },
  { hardwareAddress: '0a:00:27:00:00:00',
    internal: false,
    name: 'vboxnet0',
    flags:
     { broadcast: true,
       multicast: true,
       running: true,
       simplex: true,
       up: true },
    index: 15,
    mtu: 1500,
    ipv4:
     { address: '192.168.99.1',
       netmask: '255.255.255.0',
       broadcast: '192.168.99.255' } } ]
```

#### interface

Each interface returned is an object with the following properties:

* `flags` (_optional_, `String`)
  * `addrconf` (_optional_, `Boolean`)
  * `allmulti` (_optional_, `Boolean`)
  * `anycast` (_optional_, `Boolean`)
  * `broadcast` (_optional_, `Boolean`)
  * `cluif` (_optional_, `Boolean`)
  * `cos` (_optional_, `Boolean`)
  * `debug` (_optional_, `Boolean`)
  * `deprecated` (_optional_, `Boolean`)
  * `dhcp` (_optional_, `Boolean`)
  * `duplicate` (_optional_, `Boolean`)
  * `failed` (_optional_, `Boolean`)
  * `fixedmtu` (_optional_, `Boolean`)
  * `grouprt` (_optional_, `Boolean`)
  * `inactive` (_optional_, `Boolean`)
  * `loopback` (_optional_, `Boolean`)
  * `mip` (_optional_, `Boolean`)
  * `multibcast` (_optional_, `Boolean`)
  * `multicast` (_optional_, `Boolean`)
  * `multinet` (_optional_, `Boolean`)
  * `noarp` (_optional_, `Boolean`)
  * `nochecksum` (_optional_, `Boolean`)
  * `nofailover` (_optional_, `Boolean`)
  * `nolocal` (_optional_, `Boolean`)
  * `nonud` (_optional_, `Boolean`)
  * `nortexch` (_optional_, `Boolean`)
  * `notrailers` (_optional_, `Boolean`)
  * `noxmit` (_optional_, `Boolean`)
  * `oactive` (_optional_, `Boolean`)
  * `offline` (_optional_, `Boolean`)
  * `pfcopyall` (_optional_, `Boolean`)
  * `pointopoint` (_optional_, `Boolean`)
  * `preferred` (_optional_, `Boolean`)
  * `private` (_optional_, `Boolean`)
  * `pseg` (_optional_, `Boolean`)
  * `promisc` (_optional_, `Boolean`)
  * `quorumloss` (_optional_, `Boolean`)
  * `router` (_optional_, `Boolean`)
  * `running` (_optional_, `Boolean`)
  * `simplex` (_optional_, `Boolean`)
  * `smart` (_optional_, `Boolean`)
  * `standby` (_optional_, `Boolean`)
  * `temporary` (_optional_, `Boolean`)
  * `unnumbered` (_optional_, `Boolean`)
  * `up` (_optional_, `Boolean`)
  * `virtual` (_optional_, `Boolean`)
  * `varmtu` (_optional_, `Boolean`)
  * `xresolv` (_optional_, `Boolean`)
* `hardwareAddress` (_optional_, `String`)
* `index` (_optional_, `String`)
* `internal` (_required_, `Boolean`)
* `ipv4` (_optional_, `Object`)
  * `address` (_optional_, `String`)
  * `broadcast` (_optional_, `String`)
  * `netmask` (_optional_, `String`)
* `ipv6` (_optional_, `Object`)
  * `address` (_optional_, `String`)
  * `prefixLength` (_optional_, `Number`)
* `metric` (_optional_, `Number`)
* `mtu` (_optional_, `Number`)
* `name` (_required_, `String`)
