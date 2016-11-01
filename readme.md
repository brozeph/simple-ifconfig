# simple-ifconfig

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

* `ifconfigPath` (optional, `String`) - defaults to `/sbin/ifconfig` when not provided; defines the path to the `ifconfig` executable
* `includeLoopback` (optional, `Boolean`) - defaults to `false` when not provided; when `true`, loopback adapters are included when interacting with various other module methods
* `includeIPv6` (optional, `Boolean`) - defaults to `true` when not provided; when `false`, IPv6 information for all adapters is excluded when interacting with various other module methods

```javascript
import {NetworkInfo} from 'simple-ifconfig';

const
  ifconfigPath = '/sbin/ifconfg',
  includeLoopback = false;

let networkInfo = new NetworkInfo({
  ifconfigPath,
  includeLoopback
});

// work with networkInfo...
```

### #listInterfaces

Lists available interfaces, optionally filtered according to [options](#options-optional) provided to the [constructor](#constructor).

`networkInfo.listInterfaces()`

```javascript
import { NetworkInfo } from 'simple-ifconfig';

let ipv4 = new NetworkInfo({ includeIPv6 : false });

ipv4.listInterfaces()
  .then(console.log)
  .catch(console.error);
```
