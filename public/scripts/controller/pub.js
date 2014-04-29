/**
 * Service: Example
 *
 * Example service for providing data and controls to multiple scopes
 * throughout the application.
 *
 * Requirements
 * - nil
 */
tapthat.service('PubService', [function () {
    // Private
    var _current = null;
    // Public
    return {
        'setCurrent': function (current) {
            _current = current;
        },
        'getCurrent': function () {
            return _current;
        }
    };
}]);
