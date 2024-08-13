shortstop
=========

Lead Maintainer: [Poornima Venkat](https://github.com/pvenkatakrishnan/)

[![Build Status](https://travis-ci.org/krakenjs/shortstop.svg?branch=master)](https://travis-ci.org/krakenjs/shortstop)  

Sometimes JSON just isn't enough for configuration needs. Occasionally it would be nice to use arbitrary types as values,
but JSON is necessarily a subset of all available JS types. `shortstop` enables the use of protocols and handlers to
enable identification and special handling of json values.

```javascript
var fs = require('fs');
var shortstop = require('shortstop');

function buffer(value) {
    return new Buffer(value);
}


var resolver, json;
resolver = shortstop.create();
resolver.use('buffer', buffer);
resolver.use('file', fs.readFile);

json = {
    "secret": "buffer:SGVsbG8sIHdvcmxkIQ==",
    "ssl": {
        "pfx": "file:foo/bar",
        "key": "file:foo/baz.key",
    }
};

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

## API
### shortstop.create([parent]);

* `parent` (*Object*, optional) - An optional shortstop resolver. Returns a resolver instance.


### resolver.use(protocol, handler);

* `protocol` (*String*) - The protocol used to identify a property to be processed, e.g. "file"
* `handler` (*Function*) - The implementation of the given protocol with signature `function (value, [callback])`

This method returns a function when invoked will remove the handler from the stack for this protocol.


### resolver.resolve(data, callback);

* `data` (*Object*) - The object, containing protocols in values, to be processed.
* `callback` (*Function*) - The callback invoked when the processing is complete with signature `function (err, result)`.


### resolver.resolveFile(path, callback);

* `path` (*String*) - The path to a file which is, or exports, JSON or a javascript object.
* `callback` (*Function*) - The callback invoked when the processing is complete with signature `function (err, result)`.


## Multiple handlers
Multiple handlers can be registered for a given protocol. They will be executed in the order registered and the output
of one handler will be the input of the next handler in the chain.

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


var resolver, json;
resolver = shortstop.create();
resolver.use('path', resolve);
resolver.use('file', resolve);
resolver.use('file', fs.readFile);

json = {
    "key": "file:foo/baz.key",
    "certs": "path:certs/myapp"
};

resolver.resolve(json, function (err, data) {
    console.log(data);
    // {
    //     "key": <Buffer ... >,
    //     "certs": "/path/to/my/certs/myapp"
    // }
});
```


## Removing Handlers

When registered, handlers return an `unregister` function you can call when you no longer want a handler in the chain.

```javascript
var path = require('path');
var shortstop = require('shortstop');


function resolve(value) {
    if (path.resolve(value) === value) {
        // Is absolute path already
        return value;
    }
    return path.join(process.cwd(), value);
}

var resolver, unuse, json;
resolver = shortstop.create();
unuse = resolver.use('path', resolve);
json = { "key": "path:foo/baz.key" };

resolver.resolve(json, function (err, data) {
    console.log(data);
    // {
    //     "key": "/path/to/my/foo/baz.key"
    // }

    unuse();

    resolver.resolve(json, function (err, data) {
        console.log(data);
        // {
        //     "key": "path:foo/baz.key"
        // }
    });
});
```
