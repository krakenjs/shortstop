shortstop
=========


Sometimes JSON just isn't enough for configuration needs. Occasionally it would be nice to use arbitrary types as values,
but JSON is necessarily a subset of all available JS types. `shortstop` enables the use of protocols and handlers to
enable identification and special handling of json values.


```json
{
    "secret": "buffer:SGVsbG8sIHdvcmxkIQ==",
    "ssl": {
        "pfx": "file:foo/bar",
        "key": "file:foo/baz.key",
    }
}
```

```javascript
var fs = require('fs'),
    shortstop = require('shortstop');


function buffer(value) {
    return new Buffer(value);
}


function file(value) {
    return fs.readFileSync(value);
}



var resolver, data;
resolver = shortstop.create();
resolver.use('buffer', buffer);
resolver.use('file', file);

data = resolver.resolve(json);

// {
//     "secret": <Buffer ... >,
//     "ssl" {
//         "pfx": <Buffer ... >,
//         "key": <Buffer ... >
//     }
// }

```
