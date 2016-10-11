# [safe-request](https://www.npmjs.com/package/safe-request)

Drop-in replacemnet for [`request`](https://github.com/request/request) to protect from SSRF and similar attacks. It's like sanitizing user input, but for URIs.

``` bash
npm install safe-request
```

``` js
const request = require('safe-request');

request('http://example.org/terabyte-of-zeroes.gzip', (error, response, body) => {
  console.log(error);
  // Error: PayloadTooBig
});
```

## API

If you are fine with default restrictions (only http(s) requests to public networks not bigger than 1 MiB), you can pretty much use this the same way as `request` with callback interface. The differences are:

  - `gzip` support is enabled by default;
  - `timeout` is set to 20 seconds;
  - `error`s are wrapped with original accessible via `error.reason`.

``` js
const request = require('safe-request');

request('https://example.com/?something=interesting', (err, res, body) => {/*…*/});
```

To specify your own restrictions, provide optional first argument.

``` js
// Require a function.
const request = require('safe-request');

// Set-up restrictions.
const restrictions = {
  checkUri: (uri) => uri.protocol === 'https:', // HTTPs requests only
  checkAddress: (addr) => addr === '127.0.0.1', // to localhost and nowhere else
  networkLimit: 20 * (2 << 20),                 // with up to 20 MiB of HTTP traffic
  decodedLimit: 128 * (2 << 20)                 // where payload is no bigger than 128 MiB.
};

// Pass that in as first argument.
request(
  restrictions,
  {
    method: 'post',
    uri: '/create',
    qs: {admin: true},
    formData: {
      json: require('fs').createReadStream(__dirname + '/blob.bin')
    },
    timeout: 60e3
  },
  (err, res, body) => {/*…*/}
);

// Or bind it and use much like `request`, with automatic validation.
const boundRequest = request.bind(null, restrictions);
boundRequest('https://localhost:443/path?and=query', (err, res, body) => {/*…*/});
```

### Customizing Restrictions

#### Limits

These are approximate tresholds, and not exact numbers. Exceeding any of those will abort the request and return `PayloadTooBig` error.

Defaults are 1 MiB (1048576 bytes).

- `networkLimit` — maximum number bytes to read from sockets;
- `encodedLimit` — maximum size of encoded payload, in bytes (e.g. gzipped);
- `decodedLimit` — maximum size of decoded payload, in bytes (e.g. un-gzipped).

In addition to the above, [Node's HTTP parser](https://github.com/nodejs/http-parser) has a [hard limit](https://github.com/nodejs/http-parser/search?utf8=%E2%9C%93&q=HPE_HEADER_OVERFLOW) on headers size of 80 KiB, exceeding it will result in `PayloadTooBig` error with `reason.code === 'HPE_HEADER_OVERFLOW'`.

#### URI and Address Validation

You can specify your own validation for hostnames and URIs by providing synchronous functions that return `true` in case request should proceed, or anything else to end it with an appropriate error. It is possible to disable any check by providing `false` instead of a function.

By default, any of `http` and `https` requests are allowed, except for [Private Networks](https://en.wikipedia.org/wiki/Private_network).

- `checkUri` — receives single argument, [URL object](https://nodejs.org/dist/latest/docs/api/url.html); invoked to validate starting URI, and before every redirect;
- `checkAddress` — receives last 3 arguments from [Socket#lookup event](https://nodejs.org/dist/latest/docs/api/net.html#net_event_lookup) (`address`, `family`, `host`) and invoked after every successful hostname resolution.

## Testing

Unfortunately, you can't just run `npm test` for now. The workaround is to add something like `127.0.0.1 my-pc` to your `/etc/hosts` and run tests with

``` bash
HOST=my-pc npm test
```
