'use strict';

var fs = require('fs'),
    path = require('path'),
    resolver = require('./lib/resolver');


var JS_LIKE = /\.js(on)?$/;


exports.create = function (parent) {


    return Object.create(resolver.create(parent), {

        resolveFile: {
            value: function (file, callback) {
                var self, ext;

                self = this;
                function done(err, data) {
                    if (err) {
                        callback(err);
                        return;
                    }
                    callback(null, self.resolve(data));
                }

                // Short circuit file types node can handle natively.
                ext = path.extname(file);
                if (ext === '' || JS_LIKE.test(ext)) {
                    process.nextTick(done.bind(undefined, null, require(file)));
                    return;
                }

                fs.readFile(file, 'utf8', function (err, data) {
                    if (err) {
                        done(err);
                        return;
                    }
                    try {
                        done(null, JSON.parse(data));
                    } catch (err) {
                        done(err);
                    }
                });
            }
        },

        resolveFileSync: {
            value: function (file) {
                var data;

                if (JS_LIKE.test(path.extname(file))) {
                    return this.resolve(require(file))
                }

                data = fs.readFileSync(file, 'utf8');
                data = JSON.parse(data);
                return this.resolve(data);
            }
        }

    });

};