
(function() {
    'use strict';

    /**
     * Controller for the imls app home view
     */
    /* ngInject */
    function HomeController($log, $q, $scope, $timeout,
                            $state, Config, Geocoder, Museum, StateAbbrev) {
        var ctl = this;
        var mapDfd = $q.defer();

        initialize();

        function initialize() {
            ctl.list = [];
            ctl.mapExpanded = false;
            ctl.safeList = [];
            ctl.states = {
                DISCOVER: 0,
                LIST: 1,
                LOADING: 2,
                ERROR: -1
            };

            ctl.search = search;
            ctl.onSearchClicked = onSearchClicked;
            ctl.onTypeaheadSelected = onTypeaheadSelected;
            ctl.getMap = getMap;

            $scope.$on('imls:vis:ready', function (e, vis, newMap) {
                mapDfd.resolve(newMap);
            });
        }

        function getMap() {
            return mapDfd.promise;
        }

        function onSearchClicked() {
            search(ctl.searchText);
        }

        function search(text) {
            ctl.loadingSearch = true;
            return $q.all([Museum.suggest(text), Geocoder.search(text)]).then(function (results) {
                $log.debug(results);
                var museums = results[0];
                var features = _.filter(results[1], function (f) {
                    // Remove county results from geocoder response
                    /* jshint camelcase:false */
                    return f.attributes.Addr_type !== 'SubAdmin';
                    /* jshint camelcase:true */
                });
                angular.forEach(features, function (f) {
                    /* jshint camelcase:false */
                    var addressType = f.attributes.Addr_type;
                    f.name = f.address;
                    /* jshint camelcase:true */
                    // Clean up name if this is a city feature, shorten state name
                    //  and display county in parenthesis
                    if (addressType === 'Locality') {
                        var subregion = f.attributes.Subregion;
                        var city = f.attributes.City;
                        var state = f.attributes.Region;
                        if (state) {
                            state = StateAbbrev[state.toLowerCase()] || state;
                        }
                        f.name = city + ', ' + state;
                        if (city && subregion && subregion.toLowerCase() !== city.toLowerCase()) {
                            f.address += ' (' + subregion + ')';
                        }
                    }
                });
                return museums.concat(features);
            }).catch(function (error) {
                ctl.pageState = ctl.states.ERROR;
                $log.error(error);
            }).finally(function () {
                ctl.loadingSearch = false;
            });
        }

        function onTypeaheadSelected(item) {
            if (item.ismuseum) {
                $state.go('museum', {museum: item.id});
            } else if (item.address) {
                requestNearbyMuseums(item);
            } else {
                $log.error('No valid handlers for typeahead item:', item);
                ctl.pageState = ctl.states.ERROR;
            }
        }

        function requestNearbyMuseums(feature) {
            var attributes = { 'city': 'City', 'state': 'Region', 'zip': 'Postal' };
            attributes = _.mapValues(attributes, function (v) {
                // Explicitly set undefined for missing attributes, as this resets the $stateParam
                return feature.attributes[v] || undefined;
            });
            if (feature.location && feature.location.x && feature.location.y) {
                attributes.lat = feature.location.y;
                attributes.lon = feature.location.x;
            }
            $state.go('search', attributes);
        }
    }

    angular.module('imls.views.home')
    .controller('HomeController', HomeController);
})();
