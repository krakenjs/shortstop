shortstop
=========


Sometimes JSON just isn't enough for configuration needs. Occasionally it would be nice to use arbitrary types as values,
but JSON is necessarily a subset of all available JS types. `shortstop` enables the use of protocols and handlers to
enable identification and special handling of json values.

#### The Basics

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
var fs = require('fs');
var shortstop = require('shortstop');


function buffer(value) {
    return new Buffer(value);
}


function file(value, cb) {
    return fs.readFile(value, cb);
}


var resolver = shortstop.create();
resolver.use('buffer', buffer);
resolver.use('file', file);

resolver.resolve(json, function (err, data) {
    console.log(data);
    // {
    //     "secret": <Buffer ... >,
    //     "ssl" {
    //         "pfx": <Buffer ... >,
    //         "key": <Buffer ... >
    //     }
    // }
});



```


#### Multiple handlers
Multiple handlers can be registered for a given protocol. They will be executed in the order registered and the output
of one handler will be the input of the next handler in the chain.

```json
{
    "key": "file:foo/baz.key",
    "certs": "path:certs/myapp"
}
```

```javascript
var fs = require('fs'),
var path = require('path'),
var shortstop = require('shortstop');


function resolve(value) {
    if (path.resolve(value) === value) {
        // Is absolute path already
        return value;
    }
    return path.join(process.cwd(), value);
}


var resolver, data;
resolver = shortstop.create();
resolver.use('path', resolve);

resolver.use('file', resolve);
resolver.use('file', fs.readFile);

resolver.resolve(json, function (err, data) {
    console.log(data);
    // {
    //     "key": <Buffer ... >,
    //     "certs": "/path/to/my/certs/myapp"
    // }
});


```


#### Removing Handlers

When registered, handlers return an `unregister` function you can call when you no longer want a handler in the chain.


```js
// json1
{
    "key": "path:foo/baz.key"
}
```


```javascript
var fs = require('fs');
var path = require('path');
var shortstop = require('shortstop');


function resolve(value) {
    if (path.resolve(value) === value) {
        // Is absolute path already
        return value;
    }
    return path.join(process.cwd(), value;
}

var resolver, unuse, data;

resolver = shortstop.create();
unuse = resolver.use('path', resolve);
resolver.resolve(json, function (err, data) {
    console.log(data);
    // {
    //     "key": "/path/to/my/foo/baz.key"
    // }
});



unuse();

resolver.resolve(json, function (err, data) {
    console.log(data);
    // {
    //     "key": "path:foo/baz.key"
    // }
});


```