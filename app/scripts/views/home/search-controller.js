(function () {
    'use strict';

    /** @ngInject */
    function SearchController($log, $q, $scope, $timeout, $uibModal, $stateParams,
                              Config, Geo, Museum) {
        var LOADING_TIMEOUT_MS = 300;

        var ctl = this;
        var homeCtl = $scope.home;
        initialize();

        function initialize() {
            // A bit hacky, but the easiest/fastest way to split these out for now
            //  and have them share the intialized map
            if (!homeCtl) {
                throw 'SearchController must be a child of HomeController';
            }

            ctl.rowsPerPage = 10;
            ctl.onDownloadRowClicked = onDownloadRowClicked;
            homeCtl.pageState = homeCtl.states.LOADING;

            var city = $stateParams.city || '';
            var state = $stateParams.state || '';
            var zip = $stateParams.zip || '';
            ctl.nearText = zip || city || state;

            if ($stateParams.lat && $stateParams.lon) {
                homeCtl.getMap().then(function (map) {
                    addLocationMarker(map, {
                        x: $stateParams.lon,
                        y: $stateParams.lat
                    });
                });
            }

            if (city || state || zip) {
                requestNearbyMuseums(Museum.listByCity, {
                    city: city,
                    state: state,
                    zip: zip
                });
            } else {
                setErrorState();
            }
        }

        function addLocationMarker(map, position) {
            var icon = L.icon({
                iconUrl: 'images/map-marker-icon.png',
                iconSize: [25, 41],
                iconAnchor: [12, 41]
            });
            var marker = L.marker([position.y, position.x], {
                clickable: false,
                keyboard: false,
                icon: icon
            });
            marker.addTo(map);
        }

        function onDownloadRowClicked() {
            if (!ctl.list.length) {
                return;
            }
            $uibModal.open({
                templateUrl: 'scripts/views/download/download-partial.html',
                controller: 'DownloadController',
                controllerAs: 'dl',
                bindToController: true,
                size: 'sm',
                resolve: {
                    datalist: function () {
                        return ctl.list;
                    }
                }
            });
        }

        function requestNearbyMuseums(func, params) {
            var timeoutId = $timeout(function () {
                homeCtl.pageState = homeCtl.states.LOADING;
            }, LOADING_TIMEOUT_MS);
            func(params).then(function (rows) {
                if (rows.length) {
                    ctl.list = rows;
                    var extent = Geo.extent(ctl.list);
                    homeCtl.getMap().then(function (map) {
                        map.fitBounds(extent);
                    });
                    homeCtl.pageState = homeCtl.states.LIST;
                } else {
                    setErrorState();
                }
            }).catch(function (error) {
                setErrorState(error);
            }).finally(function () {
                $timeout.cancel(timeoutId);
            });
        }

        function setErrorState(error) {
            homeCtl.pageState = homeCtl.states.ERROR;
            if (error) {
                $log.error(error);
            }
            homeCtl.getMap().then(function (map) {
                map.setView(Config.homeCenter, Config.homeZoom);
            });
        }

    }

    angular.module('imls.views.home')
    .controller('SearchController', SearchController);

})();
