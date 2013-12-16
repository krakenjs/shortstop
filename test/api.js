/*global describe:false, it:false, before:false, beforeEach:false, after:false, afterEach:false*/
/*jshint node:true*/
'use strict';

var fs = require('fs'),
    path = require('path'),
    assert = require('chai').assert,
    shortstop = require('../index');



describe('shortstop', function () {

    var cwd;


    before(function () {
        cwd = process.cwd();
        process.chdir(__dirname);
    });


    after(function () {
        process.chdir(cwd);
    });




    function resolve(value) {
        return path.resolve(value);
    }

    function file(value) {
        return fs.readFileSync(value).toString();
    }


    function method(value) {
        var tuple, obj, _method;

        tuple = value.split('=>');
        obj = require(tuple[0]);
        _method = tuple[1];

        return obj[_method];
    }


    function buffer(value) {
        return new Buffer(value, 'base64');
    }



    describe('use', function () {


        function noop(value) {
            // noop impl
            return value;
        }


        it('should create a resolver', function () {
            var resolver = shortstop.create();
            assert.isObject(resolver);
            assert.isFunction(resolver.use);
            assert.isFunction(resolver.resolve);
            assert.isFunction(resolver.resolveFile);
            assert.isFunction(resolver.resolveFileSync);
        });


        it('should allows custom protocol handlers to be registered and unregistered', function () {
            var resolver, unuse;

            resolver = shortstop.create();
            unuse = resolver.use('bar', noop);

            // Child resolvers inherit parent handlers, so a child only technically has one.
            assert.isObject(resolver._handlers['bar']);
            assert.strictEqual(resolver._handlers['bar'].stack.length, 1);

            unuse();

            // Unuse should only be used once.
            assert.isUndefined(unuse());

            assert.isObject(resolver._handlers['bar']);
            assert.strictEqual(resolver._handlers['bar'].stack.length, 0);
        });

    });


    describe('resolve', function () {

        it('should only modify values with protocols', function () {
            var data, resolver, out;

            data = { foo: 'bar' };

            resolver = shortstop.create();
            out = resolver.resolve(data);

            assert.notStrictEqual(data, out);
            assert.strictEqual(data.foo, 'bar');
        });


        it('should use registered protocols', function () {
            var data, resolver, out;

            data = {
                foo: 'bar',
                foobar: 'foo:foo',
                file:   'file:' + __filename,
                method: 'method:fixtures/demo=>method',
                buffer: 'buffer:SGVsbG8sIHdvcmxkIQ=='
            };

            resolver = shortstop.create();
            resolver.use('file', file);

            // Example of chained handlers. `resolve` is called before `method`.
            resolver.use('method', resolve);
            resolver.use('method', method);

            resolver.use('buffer', buffer);
            resolver.use('foo', function (value) {
                return value + ' bar';
            });

            out = resolver.resolve(data);
            assert.notStrictEqual(data, out);
            assert.strictEqual(out.foo, 'bar');
            assert.strictEqual(out.foobar, 'foo bar');
            assert.isString(out.file);
            assert.isFunction(out.method);
            assert(Buffer.isBuffer(out.buffer));
            assert.strictEqual(out.buffer.toString(), 'Hello, world!');
        });




        it('should handle any valid json', function () {
            var data, resolver, out;

            data = {
                foo: 'bar',
                foobar: false,
                file:   {
                    name: 'myfile',
                    value: 'foo:myfile'
                },
                test: {
                    foo: 0,
                    bar: null
                },
                methods: [ 'foo:1', 'foo:2', '3', 'foo:4', 5 ],
                buffer: [ { file: 'foo:anotherfile' } ]
            };

            resolver = shortstop.create();
            resolver.use('foo', function (value) {
                return value + ' bar';
            });

            out = resolver.resolve(data);
            assert.notStrictEqual(data, out);
            assert.strictEqual(out.foo, 'bar');
            assert.strictEqual(out.foobar, false);

            assert.isObject(out.file);
            assert.strictEqual(out.file.name, 'myfile');
            assert.strictEqual(out.file.value, 'myfile bar');

            assert.isObject(out.test);
            assert.strictEqual(out.test.foo, 0);
            assert.strictEqual(out.test.bar, null);

            assert.isArray(out.methods);
            assert.strictEqual(out.methods[0], '1 bar');
            assert.strictEqual(out.methods[1], '2 bar');
            assert.strictEqual(out.methods[2], '3');
            assert.strictEqual(out.methods[3], '4 bar');
            assert.strictEqual(out.methods[4], 5);

            assert.isArray(out.buffer);
            assert.isObject(out.buffer[0]);
            assert.strictEqual(out.buffer[0].file, 'anotherfile bar');
        });

        it('should handle chained protocol values', function () {

            var data, resolver, out, seperator, expected, testFile;

            data = {
                foo: 'bar',
                foobar: false,
                chained: 'foo:bar|bar:buzz',
                file: 'foo:bar|bar:buzz|file:' + __filename,
                delimeter: 'foo:bar||bar:buzz',
                ignored: 'foo|:bar||bar:|buzz|file:' + __filename
            };

            expected = {
                chained: 'bar bar buzz bar',
                delimeter: 'bar| bar buzz bar',
                ignored: data.ignored
            };

            seperator = '<<~shortstop~>>';

            resolver = shortstop.create();

            resolver.use('foo', function (value, previous) {
                return value + ' bar';
            });

            resolver.use('bar', function (value, previous) {
                return previous + ' ' + value + ' bar';
            });

            resolver.use('file', function (value, previous) {

                value = fs.readFileSync(value).toString();

                return previous + seperator + value;

            });

            out = resolver.resolve(data);

            assert.notStrictEqual(data, out);

            assert.strictEqual(out.foo, 'bar');
            assert.strictEqual(out.foobar, false);

            // verify chaining works

            assert.isString(out.chained);
            assert.strictEqual(out.chained, expected.chained);

            // verify loading files still work

            testFile = out.file.split(seperator);
            assert.isString(out.file);
            assert.strictEqual(testFile.shift(), expected.chained);
            assert.strictEqual(testFile.join(seperator), file(__filename));

            // ensure protocol chain values can contain delimeters as values

            assert.isString(out.delimeter);
            assert.strictEqual(out.delimeter, expected.delimeter);

            // ensure protocol chains must start with a protocol

            assert.isString(out.ignored);
            assert.strictEqual(out.ignored, expected.ignored);

        });

    });

    describe('resolveFile', function () {

        it('should read json files', function (next) {
            var resolver;

            resolver = shortstop.create();
            resolver.use('file', function (value) {
                return __filename;
            });
            resolver.use('file', file);

            // Example of chained handlers. `resolve` is called before `method`.
            resolver.use('method', resolve);
            resolver.use('method', method);

            resolver.use('buffer', buffer);
            resolver.use('foo', function (value) {
                return value + ' bar';
            });

            resolver.resolveFile(path.join(process.cwd(), 'fixtures', 'data.json'), function (err, data) {
                assert.isObject(data);
                assert.strictEqual(data.foo, 'bar');
                assert.strictEqual(data.foobar, 'foo bar');
                assert.isString(data.file);
                assert.isFunction(data.method);
                assert(Buffer.isBuffer(data.buffer));
                assert.strictEqual(data.buffer.toString(), 'Hello, world!');
                next();
            });
        });

        it('should read txt files', function (next) {
            var resolver;

            resolver = shortstop.create();
            resolver.use('file', function (value) {
                return __filename;
            });
            resolver.use('file', file);

            // Example of chained handlers. `resolve` is called before `method`.
            resolver.use('method', resolve);
            resolver.use('method', method);

            resolver.use('buffer', buffer);
            resolver.use('foo', function (value) {
                return value + ' bar';
            });

            resolver.resolveFile(path.join(process.cwd(), 'fixtures', 'data.txt'), function (err, data) {
                assert.isObject(data);
                assert.strictEqual(data.foo, 'bar');
                assert.strictEqual(data.foobar, 'foo bar');
                assert.isString(data.file);
                assert.isFunction(data.method);
                assert(Buffer.isBuffer(data.buffer));
                assert.strictEqual(data.buffer.toString(), 'Hello, world!');
                next();
            });
        });

    });


    describe('resolveFileSync', function () {

        it('should read json files', function () {
            var resolver, out;

            resolver = shortstop.create();
            resolver.use('file', function (value) {
                return __filename;
            });
            resolver.use('file', file);

            // Example of chained handlers. `resolve` is called before `method`.
            resolver.use('method', resolve);
            resolver.use('method', method);

            resolver.use('buffer', buffer);
            resolver.use('foo', function (value) {
                return value + ' bar';
            });

            out = resolver.resolveFileSync(path.join(process.cwd(), 'fixtures', 'data.json'));
            assert.isObject(out);
            assert.strictEqual(out.foo, 'bar');
            assert.strictEqual(out.foobar, 'foo bar');
            assert.isString(out.file);
            assert.isFunction(out.method);
            assert(Buffer.isBuffer(out.buffer));
            assert.strictEqual(out.buffer.toString(), 'Hello, world!');
        });


        it('should read txt files', function () {
            var resolver, out;

            resolver = shortstop.create();
            resolver.use('file', function (value) {
                return __filename;
            });
            resolver.use('file', file);

            // Example of chained handlers. `resolve` is called before `method`.
            resolver.use('method', resolve);
            resolver.use('method', method);

            resolver.use('buffer', buffer);
            resolver.use('foo', function (value) {
                return value + ' bar';
            });

            out = resolver.resolveFileSync(path.join(process.cwd(), 'fixtures', 'data.txt'));
            assert.isObject(out);
            assert.strictEqual(out.foo, 'bar');
            assert.strictEqual(out.foobar, 'foo bar');
            assert.isString(out.file);
            assert.isFunction(out.method);
            assert(Buffer.isBuffer(out.buffer));
            assert.strictEqual(out.buffer.toString(), 'Hello, world!');
        });

    });


    describe('parent resolvers', function () {

        it('should include handlers registered with the parent when processing', function () {
            var json, parent, child, data;

            json = {
                'foo': 'foo:test'
            };

            function foo(value) {
                return value + ' foo';
            }

            function bar(value) {
                return 'bar ' + value;
            }


            parent = shortstop.create();
            parent.use('foo', foo);

            child = shortstop.create(parent);
            child.use('foo', bar);

            data = child.resolve(json);
            assert.strictEqual(data.foo, 'bar test foo');
        });

    });

});