'use strict';

var test = require('tape'),
    path = require('path'),
    shortstop = require('../');


test('shortstop', function (t) {

    function createHandler(name) {
        var fn = 'function $name(value, previous) {\n \
            return (previous || "$name") + "_" + value;\n \
        }';

        if (!/^[$_A-Za-z\xa0-\uffff][$_A-Za-z0-9\xa0-\uffff]*$/.test(name)) {
            throw new SyntaxError('Invalid identifier.');
        }

        return eval('(' + fn.replace(new RegExp('\\$name', 'g'), name) + ')');
    }

    function clone(json) {
        return JSON.parse(JSON.stringify(json));
    }


    t.test('resolver', function (t) {
        var resolver = shortstop.create();
        t.equal(typeof resolver, 'object');
        t.equal(typeof resolver.use, 'function');
        t.equal(typeof resolver.resolve, 'function');
        t.equal(typeof resolver.resolveFile, 'function');
        t.equal(typeof resolver.resolveFileSync, 'function');
        t.end();
    });


    t.test('use', function (t) {
        var handler, resolver;

        handler = 'custom';
        resolver = shortstop.create();
        resolver.use(handler, createHandler(handler));

        t.equal(typeof resolver._handlers[handler], 'object');
        t.equal(resolver._handlers[handler].stack.length, 1);
        t.end();
    });

    t.test('unuse', function (t) {
        var handlerA, handlerB, handlerC, resolver, unuseA, unuseB, unuseC;

        handlerA = 'customA';
        handlerB = 'customB';
        handlerC = 'customC';

        resolver = shortstop.create();
        unuseA = resolver.use(handlerA, createHandler(handlerA));
        unuseB = resolver.use(handlerB, createHandler(handlerB));
        unuseC = resolver.use(handlerC, createHandler(handlerC));

        t.equal(typeof unuseA, 'function');
        t.equal(typeof unuseB, 'function');
        t.equal(typeof unuseC, 'function');

        t.equal(typeof resolver._handlers[handlerA], 'object');
        t.equal(typeof resolver._handlers[handlerB], 'object');
        t.equal(typeof resolver._handlers[handlerC], 'object');

        t.equal(resolver._handlers[handlerA].stack.length, 1);
        t.equal(resolver._handlers[handlerB].stack.length, 1);
        t.equal(resolver._handlers[handlerC].stack.length, 1);

        unuseA();

        t.equal(resolver._handlers[handlerA].stack.length, 0);
        t.equal(resolver._handlers[handlerB].stack.length, 1);
        t.equal(resolver._handlers[handlerC].stack.length, 1);

        unuseC();

        t.equal(resolver._handlers[handlerA].stack.length, 0);
        t.equal(resolver._handlers[handlerB].stack.length, 1);
        t.equal(resolver._handlers[handlerC].stack.length, 0);

        unuseB();

        t.equal(resolver._handlers[handlerA].stack.length, 0);
        t.equal(resolver._handlers[handlerB].stack.length, 0);
        t.equal(resolver._handlers[handlerC].stack.length, 0);

        t.end();
    });


    t.test('unuse stack', function (t) {
        var name, handlerA, handlerB, handlerC, resolver, unuseA, unuseB, unuseC, removed;

        name = 'custom';
        handlerA = createHandler('customA');
        handlerB = createHandler('customB');
        handlerC = createHandler('customC');

        resolver = shortstop.create();
        unuseA = resolver.use(name, handlerA);
        unuseB = resolver.use(name, handlerB);
        unuseC = resolver.use(name, handlerC);

        t.equal(typeof unuseA, 'function');
        t.equal(typeof unuseB, 'function');
        t.equal(typeof unuseC, 'function');

        t.equal(typeof resolver._handlers[name], 'object');
        t.equal(resolver._handlers[name].stack.length, 3);

        removed = unuseA();
        t.strictEqual(removed, handlerA);
        t.equal(name + 'A', handlerA.name);
        t.equal(resolver._handlers[name].stack.length, 2);

        removed = unuseA();
        t.strictEqual(removed, undefined);

        removed = unuseB();
        t.strictEqual(removed, handlerB);
        t.equal(name + 'B', handlerB.name);
        t.equal(resolver._handlers[name].stack.length, 1);

        removed = unuseC();
        t.strictEqual(removed, handlerC);
        t.equal(name + 'C', handlerC.name);
        t.equal(resolver._handlers[name].stack.length, 0);

        t.end();
    });


    t.test('resolve', function (t) {
        var resolver, expected, actual;

        resolver = shortstop.create();
        resolver.use('me', createHandler('me'));

        expected = require('./fixtures/test');
        actual = resolver.resolve(clone(expected));

        t.equal(actual.foo,       expected.foo);
        t.equal(actual.truthy,    expected.truthy);
        t.equal(actual.falsy,     expected.falsy);
        t.equal(actual.numeric,   expected.numeric);
        t.equal(actual.call,      expected.call.replace(':', '_'));
        t.equal(actual.i.came,    expected.i.came.replace(':', '_'));
        t.equal(actual.i.like[0], expected.i.like[0].replace(':', '_'));
        t.equal(actual.i.like[1].wrecking, expected.i.like[1].wrecking.replace(':', '_'));
        t.end();
    });


    t.test('resolveFile', function (t) {
        var resolver, expected;

        resolver = shortstop.create();
        resolver.use('me', createHandler('me'));

        expected = require('./fixtures/test');
        resolver.resolveFile(path.resolve(__dirname, './fixtures/test'), function (err, actual) {
            t.error(err);
            t.equal(actual.foo,       expected.foo);
            t.equal(actual.truthy,    expected.truthy);
            t.equal(actual.falsy,     expected.falsy);
            t.equal(actual.numeric,   expected.numeric);
            t.equal(actual.call,      expected.call.replace(':', '_'));
            t.equal(actual.i.came,    expected.i.came.replace(':', '_'));
            t.equal(actual.i.like[0], expected.i.like[0].replace(':', '_'));
            t.equal(actual.i.like[1].wrecking, expected.i.like[1].wrecking.replace(':', '_'));
            t.end();
        });
    });


    t.test('resolveFile txt', function (t) {
        var resolver, expected;

        resolver = shortstop.create();
        resolver.use('me', createHandler('me'));

        expected = require('./fixtures/test');
        resolver.resolveFile(path.resolve(__dirname, './fixtures/test.txt'), function (err, actual) {
            t.error(err);
            t.equal(actual.foo,       expected.foo);
            t.equal(actual.truthy,    expected.truthy);
            t.equal(actual.falsy,     expected.falsy);
            t.equal(actual.numeric,   expected.numeric);
            t.equal(actual.call,      expected.call.replace(':', '_'));
            t.equal(actual.i.came,    expected.i.came.replace(':', '_'));
            t.equal(actual.i.like[0], expected.i.like[0].replace(':', '_'));
            t.equal(actual.i.like[1].wrecking, expected.i.like[1].wrecking.replace(':', '_'));
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


    t.test('resolveFileSync', function (t) {
        var resolver, expected, actual;

        resolver = shortstop.create();
        resolver.use('me', createHandler('me'));

        expected = require('./fixtures/test');
        actual = resolver.resolveFileSync(path.resolve(__dirname, './fixtures/test'));

        t.equal(actual.foo,       expected.foo);
        t.equal(actual.truthy,    expected.truthy);
        t.equal(actual.falsy,     expected.falsy);
        t.equal(actual.numeric,   expected.numeric);
        t.equal(actual.call,      expected.call.replace(':', '_'));
        t.equal(actual.i.came,    expected.i.came.replace(':', '_'));
        t.equal(actual.i.like[0], expected.i.like[0].replace(':', '_'));
        t.equal(actual.i.like[1].wrecking, expected.i.like[1].wrecking.replace(':', '_'));
        t.end();
    });


    t.test('resolveFileSync txt', function (t) {
        var resolver, expected, actual;

        resolver = shortstop.create();
        resolver.use('me', createHandler('me'));

        expected = require('./fixtures/test');
        actual = resolver.resolveFileSync(path.resolve(__dirname, './fixtures/test.txt'));

        t.equal(actual.foo,       expected.foo);
        t.equal(actual.truthy,    expected.truthy);
        t.equal(actual.falsy,     expected.falsy);
        t.equal(actual.numeric,   expected.numeric);
        t.equal(actual.call,      expected.call.replace(':', '_'));
        t.equal(actual.i.came,    expected.i.came.replace(':', '_'));
        t.equal(actual.i.like[0], expected.i.like[0].replace(':', '_'));
        t.equal(actual.i.like[1].wrecking, expected.i.like[1].wrecking.replace(':', '_'));
        t.end();
        t.end();
    });


    t.test('resolveFileSync error', function (t) {
        var resolver;

        resolver = shortstop.create();

        t.throws(function () {
            resolver.resolveFileSync('./notfound.txt');
        });

        t.throws(function () {
            resolver.resolveFileSync(path.resolve(__dirname, './fixtures/invalid.txt'));
        });

        t.end();
    });


    t.test('stack', function (t) {
        var parent, child, expected, actual;


        parent = shortstop.create();
        parent.use('me', createHandler('me'));

        expected = require('./fixtures/test');

        child = shortstop.create(parent);
        child.use('me', createHandler('me'));
        actual = child.resolve(clone(expected));

        t.equal(actual.call, 'me_me_maybe');
        t.equal(actual.i.came, 'me_me_in');
        t.equal(actual.i.like[0], 'me_me_a');
        t.equal(actual.i.like[1].wrecking, 'me_me_ball');
        t.end();
    });


    t.test('chained', function (t) {
        var resolver, expected, actual;

        resolver = shortstop.create();
        resolver.use('foo', createHandler('foo'));
        resolver.use('bar', createHandler('bar'));
        resolver.use('bam', createHandler('bam'));

        expected = require('./fixtures/chained');
        actual = resolver.resolve(clone(expected));

        t.equal(actual.foo, expected.foo);
        t.equal(actual.foobar, expected.foobar);
        t.equal(actual.chained, 'foo_bar_buzz');
        t.equal(actual.chained2, 'foo_bar_buzz_bang');
        t.equal(actual.delimeter, 'foo_bar|_buzz');
        t.equal(actual.ignored, expected.ignored);
        t.end();
    });

});
