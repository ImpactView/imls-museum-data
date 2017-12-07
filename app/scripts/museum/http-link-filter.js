
(function() {
    'use strict';

    /**
     * Turn a string into an absolute url
     *
     * Basically, if it doesn't start with "http", prefix the http protocol and return new string
     *
     * This cheat allows us to safely account for site links that don't have the protocol prefix,
     * but will also respect sites that do, e.g. if a site link is something like
     * https://foo.com
     */
    /* ngInject */
    function HttpLinkFilter() {
        return function (input) {
            var inputAsStr = input.toString().trim();
            // we're lucky no phone number in the US begins with a 0
            if (inputAsStr.indexOf('http') !== 0) {
                inputAsStr = 'http://' + inputAsStr;
            }
            return inputAsStr;
        };
    }

    angular.module('imls.museum')
    .filter('httpLink', HttpLinkFilter);

})();
