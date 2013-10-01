/*global describe:false, it:false, before:false, beforeEach:false, after:false, afterEach:false*/
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
        var tuple, obj, method;

        tuple = value.split('=>');
        obj = require(tuple[0]);
        method = tuple[1];

        return obj[method];
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

            assert.strictEqual(data, out);
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
            assert.strictEqual(data, out);
            assert.strictEqual(data.foo, 'bar');
            assert.strictEqual(data.foobar, 'foo bar');
            assert.isString(data.file);
            assert.isFunction(data.method);
            assert(Buffer.isBuffer(data.buffer));
            assert.strictEqual(data.buffer.toString(), 'Hello, world!');
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
            assert.strictEqual(data, out);
            assert.strictEqual(data.foo, 'bar');
            assert.strictEqual(data.foobar, false);

            assert.isObject(data.file);
            assert.strictEqual(data.file.name, 'myfile');
            assert.strictEqual(data.file.value, 'myfile bar');

            assert.isObject(data.test);
            assert.strictEqual(data.test.foo, 0);
            assert.strictEqual(data.test.bar, null);

            assert.isArray(data.methods);
            assert.strictEqual(data.methods[0], '1 bar');
            assert.strictEqual(data.methods[1], '2 bar');
            assert.strictEqual(data.methods[2], '3');
            assert.strictEqual(data.methods[3], '4 bar');
            assert.strictEqual(data.methods[4], 5);

            assert.isArray(data.buffer);
            assert.isObject(data.buffer[0]);
            assert.strictEqual(data.buffer[0].file, 'anotherfile bar');
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
            var resolver, data;

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

            data = resolver.resolveFileSync(path.join(process.cwd(), 'fixtures', 'data.json'));
            assert.isObject(data);
            assert.strictEqual(data.foo, 'bar');
            assert.strictEqual(data.foobar, 'foo bar');
            assert.isString(data.file);
            assert.isFunction(data.method);
            assert(Buffer.isBuffer(data.buffer));
            assert.strictEqual(data.buffer.toString(), 'Hello, world!');
        });

        it('should read txt files', function () {
            var resolver, data;

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

            data = resolver.resolveFileSync(path.join(process.cwd(), 'fixtures', 'data.txt'));
            assert.isObject(data);
            assert.strictEqual(data.foo, 'bar');
            assert.strictEqual(data.foobar, 'foo bar');
            assert.isString(data.file);
            assert.isFunction(data.method);
            assert(Buffer.isBuffer(data.buffer));
            assert.strictEqual(data.buffer.toString(), 'Hello, world!');
        });

    });

});