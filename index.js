'use strict';

var fs = require('fs'),
    path = require('path'),
    resolver = require('./lib/resolver');


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
                if (ext === '' || require.extensions.hasOwnProperty(ext)) {
                    process.nextTick(done.bind(undefined, null, require(file)));
                    return;
                }

                fs.readFile(file, 'utf8', function (err, data) {
                    var json, error;

                    if (err) {
                        done(err);
                        return;
                    }

                    try {
                        json = JSON.parse(data);
                        error = null;
                    } catch (err) {
                        json = undefined;
                        error = err;
                    } finally {
                        done(error, json);
                    }

                });
            }
        },

        resolveFileSync: {
            value: function (file) {
                var data, ext;

                ext = path.extname(file);
                if (ext === '' || require.extensions.hasOwnProperty(ext)) {
                    return this.resolve(require(file));
                }

                data = fs.readFileSync(file, 'utf8');
                data = JSON.parse(data);
                return this.resolve(data);
            }
        }

    });

};