'use strict';

var test = require('tape');
var path = require('path');
var shortstop = require('../');


test('shortstop', function (t) {


    function foo(input) {
        return input + '_foo';
    }

    function bar(input, cb) {
        setImmediate(cb.bind(null, null, input + '_bar'));
    }


    t.test('resolver', function (t) {
        var resolver = shortstop.create();
        t.equal(typeof resolver, 'object');
        t.equal(typeof resolver.use, 'function');
        t.equal(typeof resolver.resolve, 'function');
        t.equal(typeof resolver.resolveFile, 'function');
        t.end();
    });


    t.test('use', function (t) {
        var resolver;

        resolver = shortstop.create();
        resolver.use('foo', foo);

        t.equal(typeof resolver._handlers['foo'], 'object');
        t.equal(resolver._handlers['foo'].stack.length, 1);
        t.end();
    });


    t.test('unuse', function (t) {
        var resolver, unuseA, unuseB, unuseC;

        function handlerA() {
            // noop
        }

        function handlerB() {
            // noop
        }

        function handlerC() {
            // noop
        }

        resolver = shortstop.create();
        unuseA = resolver.use('handlerA', handlerA);
        unuseB = resolver.use('handlerB', handlerB);
        unuseC = resolver.use('handlerC', handlerC);

        t.equal(typeof unuseA, 'function');
        t.equal(typeof unuseB, 'function');
        t.equal(typeof unuseC, 'function');

        t.equal(typeof resolver._handlers['handlerA'], 'object');
        t.equal(typeof resolver._handlers['handlerB'], 'object');
        t.equal(typeof resolver._handlers['handlerC'], 'object');

        t.equal(resolver._handlers['handlerA'].stack.length, 1);
        t.equal(resolver._handlers['handlerB'].stack.length, 1);
        t.equal(resolver._handlers['handlerC'].stack.length, 1);

        unuseA();

        t.equal(resolver._handlers['handlerA'].stack.length, 0);
        t.equal(resolver._handlers['handlerB'].stack.length, 1);
        t.equal(resolver._handlers['handlerC'].stack.length, 1);

        unuseC();

        t.equal(resolver._handlers['handlerA'].stack.length, 0);
        t.equal(resolver._handlers['handlerB'].stack.length, 1);
        t.equal(resolver._handlers['handlerC'].stack.length, 0);

        unuseB();

        t.equal(resolver._handlers['handlerA'].stack.length, 0);
        t.equal(resolver._handlers['handlerB'].stack.length, 0);
        t.equal(resolver._handlers['handlerC'].stack.length, 0);

        t.end();
    });


    t.test('unuse stack', function (t) {
        var name, resolver, unuseA, unuseB, unuseC, removed;

        name = 'custom';
        function customA() {
            // noop
        }

        function customB() {
            // noop
        }

        function customC() {
            // noop
        }

        resolver = shortstop.create();
        unuseA = resolver.use(name, customA);
        unuseB = resolver.use(name, customB);
        unuseC = resolver.use(name, customC);

        t.equal(typeof unuseA, 'function');
        t.equal(typeof unuseB, 'function');
        t.equal(typeof unuseC, 'function');

        t.equal(typeof resolver._handlers[name], 'object');
        t.equal(resolver._handlers[name].stack.length, 3);

        removed = unuseA();
        t.strictEqual(removed, customA);
        t.equal(name + 'A', customA.name);
        t.equal(resolver._handlers[name].stack.length, 2);

        removed = unuseA();
        t.strictEqual(removed, undefined);

        removed = unuseB();
        t.strictEqual(removed, customB);
        t.equal(name + 'B', customB.name);
        t.equal(resolver._handlers[name].stack.length, 1);

        removed = unuseC();
        t.strictEqual(removed, customC);
        t.equal(name + 'C', customC.name);
        t.equal(resolver._handlers[name].stack.length, 0);

        t.end();
    });


    t.test('resolve', function (t) {
        var resolver, expected;

        resolver = shortstop.create();
        resolver.use('foo', foo);
        resolver.use('bar', bar);

        expected = { foo: 'foo:foo', bar: 'bar:bar', baz: false };
        resolver.resolve(expected, function  resolve(err, actual) {
            t.error(err);
            t.equal(actual.foo, 'foo_foo');
            t.equal(actual.bar, 'bar_bar');
            t.equal(actual.baz, false);
            t.notEqual(actual, expected);
            t.end();
        });
    });


    t.test('resolve with filename', function (t) {
        var resolver, expected;

        resolver = shortstop.create();
        resolver.use('foo', foo);
        resolver.use('bar', function(data, file, cb) {
            cb(null, file+data);
        });

        expected = { foo: 'foo:foo', bar: 'bar:bar', baz: false };
        resolver.resolve(expected, __filename, function  resolve(err, actual) {
            t.error(err);
            t.equal(actual.foo, 'foo_foo');
            t.equal(actual.bar, __filename + 'bar');
            t.equal(actual.baz, false);
            t.notEqual(actual, expected);
            t.end();
        });
    });


    t.test('nested resolve', function (t) {
        var resolver, expected;

        resolver = shortstop.create();
        resolver.use('foo', foo);
        resolver.use('bar', bar);

        expected = {
            foo: 'bar',
            truthy: true,
            falsy: false,
            numeric: 10,
            call: 'foo:maybe',
            i: {
                came: 'bar:in',
                like: [ 'foo:a', { wrecking : 'bar:ball' } ]
            }
        };

        resolver.resolve(expected, function resolve(err, actual) {
            t.error(err);
            t.notEqual(actual, expected);
            t.equal(actual.foo,       expected.foo);
            t.equal(actual.truthy,    expected.truthy);
            t.equal(actual.falsy,     expected.falsy);
            t.equal(actual.numeric,   expected.numeric);
            t.equal(actual.call,      'maybe_foo');
            t.equal(actual.i.came,    'in_bar');
            t.equal(actual.i.like[0], 'a_foo');
            t.equal(actual.i.like[1].wrecking, 'ball_bar');
            t.end();
        });
    });


    t.test('async resolve error', function (t) {
        var resolver, expected;

        resolver = shortstop.create();
        resolver.use('foo', function err(input, cb) {
            cb(new Error('fail'));
        });

        expected = { foo: 'foo:foo', bar: false };
        resolver.resolve(expected, function  resolve(err, actual) {
            t.ok(err);
            t.equal(err.message, 'fail');
            t.notOk(actual);
            t.end();
        });
    });


    t.test('sync resolve uncaught error', function (t) {
        var resolver, expected;

        resolver = shortstop.create();
        resolver.use('test', function err(input) {
            throw new Error('fail');
        });

        expected = { foo: 'test:foo', bar: false };
        resolver.resolve(expected, function  resolve(err, actual) {
            t.ok(err);
            t.equal(err.message, 'fail');
            t.notOk(actual);
            t.end();
        });
    });


    t.test('resolveFile', function (t) {
        var resolver, expected;

        resolver = shortstop.create();
        resolver.use('foo', foo);
        resolver.use('bar', bar);

        expected = require('./fixtures/test');
        resolver.resolveFile(path.resolve(__dirname, './fixtures/test'), function resolve(err, actual) {
            t.error(err);
            t.equal(actual.foo,       expected.foo);
            t.equal(actual.truthy,    expected.truthy);
            t.equal(actual.falsy,     expected.falsy);
            t.equal(actual.numeric,   expected.numeric);
            t.equal(actual.call,      'maybe_foo');
            t.equal(actual.i.came,    'in_bar');
            t.equal(actual.i.like[0], 'a_foo');
            t.equal(actual.i.like[1].wrecking, 'ball_bar');
            t.end();
        });
    });


    t.test('resolveFile txt', function (t) {
        var resolver, expected;

        resolver = shortstop.create();
        resolver.use('foo', foo);
        resolver.use('bar', bar);

        expected = require('./fixtures/test');
        resolver.resolveFile(path.resolve(__dirname, './fixtures/test.txt'), function (err, actual) {
            t.error(err);
            t.equal(actual.foo,       expected.foo);
            t.equal(actual.truthy,    expected.truthy);
            t.equal(actual.falsy,     expected.falsy);
            t.equal(actual.numeric,   expected.numeric);
            t.equal(actual.call,      'maybe_foo');
            t.equal(actual.i.came,    'in_bar');
            t.equal(actual.i.like[0], 'a_foo');
            t.equal(actual.i.like[1].wrecking, 'ball_bar');
            t.end();
        });
    });


    t.test('resolveFile error', function (t) {
        var resolver;

        resolver = shortstop.create();
        resolver.resolveFile('./notfound.txt', function (err, actual) {
            t.ok(err);
            t.notOk(actual);

            resolver.resolveFile(path.resolve(__dirname, './fixtures/invalid.txt'), function (err, actual) {
                t.ok(err);
                t.notOk(actual);
                t.end();
            });
        });
    });


    t.test('stack', function (t) {
        var parent, child, expected;

        parent = shortstop.create();
        parent.use('foo', foo);
        parent.use('bar', bar);

        child = shortstop.create(parent);

        expected = require('./fixtures/test');
        child.resolve(expected, function (err, actual) {
            t.error(err);
            t.notEqual(actual, expected);
            t.equal(actual.call, 'maybe_foo');
            t.equal(actual.i.came, 'in_bar');
            t.equal(actual.i.like[0], 'a_foo');
            t.equal(actual.i.like[1].wrecking, 'ball_bar');

            child.use('foo', foo);
            child.use('bar', bar);

            child.resolve(expected, function (err, actual) {
                t.error(err);
                t.equal(actual.call, 'maybe_foo_foo');
                t.equal(actual.i.came, 'in_bar_bar');
                t.equal(actual.i.like[0], 'a_foo_foo');
                t.equal(actual.i.like[1].wrecking, 'ball_bar_bar');
                t.end();
            });
        });
    });


    t.test('preserve types', function (t) {

        t.test('Buffer', function (t) {
            var resolver;

            resolver = shortstop.create();
            resolver.resolve({ buffer: new Buffer(0) }, function (err, data) {
                t.error(err);
                t.ok(data);
                t.ok(data.buffer);
                t.ok(Buffer.isBuffer(data.buffer));
                t.end()
            });
        });


        t.test('Date', function (t) {
            var resolver;

            resolver = shortstop.create();
            resolver.resolve({ date: new Date() }, function (err, data) {
                t.error(err);
                t.ok(data);
                t.ok(data.date);
                t.ok(data.date.constructor === Date);
                t.ok(Object.getPrototypeOf(data.date) !== Object.prototype);
                t.end()
            });
        });


        t.test('RegExp', function (t) {
            var resolver;

            resolver = shortstop.create();
            resolver.resolve({ regexp: new RegExp('.') }, function (err, data) {
                t.error(err);
                t.ok(data);
                t.ok(data.regexp);
                t.ok(data.regexp.constructor === RegExp);
                t.ok(Object.getPrototypeOf(data.regexp) !== Object.prototype);
                t.end()
            });
        });

    });


});
