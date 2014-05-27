/**
 * Routes: Pub
 *
 * CRUD based routes to handle user interaction of
 * TapThat pub listings.
 */

var async = require('async');
var Pub = require('../models/pub');
var places = require('../lib/places')

var LIMIT = 10;
var SEARCH_RADIUS = 1500;

// CRUD routes

module.exports.param = function (req, res, next, pub_id) {
    Pub.findById(pub_id)
        .populate('boozes')
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
    Pub.find().populate('boozes').limit(LIMIT).exec(function (err, pubs) {
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
    // Mongo only supports list of IDs so clear the cruft
    req.body.boozes = req.body.boozes.map(function (booze) {
        return booze._id;
    });
    Pub.findByIdAndUpdate(req.node._id, _sanatizeForUpdate(req.body), function (err, data) {
        if (err) {
            console.error(err);
        }
        res.json({ err: err });
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
        pubs = terms.map(function (term) {
            return term.obj;
        });
        if (!pubs.length) {
            return listByLocationFoursquare(req, res);
        }
        res.json(pubs);
    });
};

var listByLocationFoursquare = function (req, res) {
    var ll = req.query.ll.split(',').map(Number);
    places.nearLocation(ll[0], ll[1], function (err, places) {
        async.each(places, function (pub, next) {
            pub.save(function (err, result) {
                if (err) {
                    next(err);
                }
                next();
            });
        }, function (err) {
            if (err) {
                console.error(err);
                process.exit(1);
            }
            res.json(places);
        });
    });
}
