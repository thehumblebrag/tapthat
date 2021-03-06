/**
 * Routes: Pub
 *
 * CRUD based routes to handle user interaction of
 * pourclub pub listings.
 */

var async = require('async');
var foursquare = require('../lib/foursquare');
var Pub = require('../models/pub');

var LIMIT = 10;
var SEARCH_RADIUS = 1500;

// CRUD routes

module.exports.param = function (req, res, next, pub_id) {
    Pub.findById(pub_id)
        .populate('drinks')
        .exec(function (err, pub) {
            if (err) {
                return console.error(err);
            }
            req.node = pub;
            next();
        });
};

module.exports.list = function (req, res, next) {
    if (req.query.ll) {
        return listByLocation(req, res);
    }
    Pub.find().populate('drinks').limit(LIMIT).exec(function (err, pubs) {
        if (err) {
            return console.error(err);
        }
        res.json(pubs);
    });
};

module.exports.get = function (req, res, next) {
    res.json(req.node);
};

module.exports.save = function (req, res) {
    res.json({ err: false });
};

module.exports.delete = function (req, res, next) {
    req.node.remove();
};

module.exports.update = function (req, res, next) {
    // Convert JS/JSON object to an array of IDs and remove duplicates
    req.body.drinks = req.body.drinks
        .map(function (drink) {
            return drink._id;
        }).filter(function (drink, pos, self) {
            return self.indexOf(drink) === pos;
        });
    Pub.findByIdAndUpdate(req.node._id, _sanatizeForUpdate(req.body))
        .populate('drinks')
        .exec(function (err, data) {
            if (err) {
                console.error(err, data);
                res.json({ err: err });
            }
            res.json(data);
    });
};

// Helper methods

var _sanatizeForUpdate = function (doc) {
    delete doc._id;
    delete doc.id;
    delete doc.__v;
    return doc;
};

var listByLocation = function (req, res) {
    var ll = req.query.ll.split(',').map(Number);
    var radius = req.query.r || SEARCH_RADIUS;
    var point = {
        type: 'Point',
        coordinates: ll.reverse()
    };
    var options = {
        spherical: true,
        maxDistance: radius / 6378137,
        distanceMultiplier: 6378137
    };
    Pub.geoNear(point, options, function (err, terms) {
        async.map(terms,
            function (term, next) {
                term.obj.populate('drinks',  function (err, pub) {
                    async.each(pub.drinks, function (drink, done) {
                        drink.populate('creator', done);
                    }, function (err) {
                        next(err, pub);
                    });
                });
            }, function (err, pubs) {
                if (!pubs.length) {
                    return listByLocationFoursquare(req, res);
                }
                res.json(pubs);
            });
    });
};

var listByLocationFoursquare = function (req, res) {
    var ll = req.query.ll.split(',').map(Number);
    foursquare.nearLocation(ll[0], ll[1], function (err, places) {
        async.each(places, function (pub, next) {
            pub.save(function (err, result) {
                if (err && err.code === 11000) {
                    return next();
                }
                else if (err) {
                    return next(err);
                }
                next();
            });
        }, function (err) {
            if (err) {
                console.error(err);
            }
            res.json(places);
        });
    });
};
