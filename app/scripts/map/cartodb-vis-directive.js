/**
 * Directive for displaying IMLS cartodb visualizations
 * To show demographic data on the map, add the attribute `demographics="true"`
 * See directive definition for other scope vars/attrs
 */
(function () {
    'use strict';

    var orgPopupTemplate = [
        '<div class="popup">',
        '<div ng-if="loading" class="spinner">Loading...</div>',
        '<div ng-if="!loading">',
        '<div ng-if="rows && rows.length && rows.length > 1" class="popup-header">',
        '<p>Found {{ rows.length }} results:</p>',
        '</div>',
        '<div class="popup-content">',
        '<div class="popup-content-row" ng-repeat="row in rows">',
        '<span class="org-type" style="background-color: {{ row.orgTypeColor }};"></span>',
        '<a href="/#/museum/{{row.ein_new}}/">{{ row.organization_new }}</a>',
        '</div>',
        '</div>',
        '</div>',
        '</div>'
    ].join('');

    var orgPopoverTemplate = [
        '<div>',
        '<p class="org-name">{{ orgName }}</p>',
        '<p ng-if="resultCount === 2" class="additional-orgs">1 additional organization at this location</p>',
        '<p ng-if="resultCount > 2" class="additional-orgs">{{ resultCount - 1 }} additional organizations at this location</p>',
        '</div>'
    ].join('');

    /* ngInject */
    function VisController($attrs, $log, $compile, $q, $scope, $timeout,
                           Config, DemographicsConfig, OrgCountService) {

        var MAP_SLIDE_TRANSITION_MS = 400;

        var defaultOptions = {
            /* jshint camelcase:false */
            cartodb_logo: false,
            /* jshint camelcase:true */
            fullscreen: false,
            https: true,
            legends: false,
            scrollwheel: false,
            search: false,
            shareable: false,
            tooltip: true
        };
        var ctl = this;
        var url;
        var map;
        var mapDomId = 'map';
        var demographicsVisible = false;
        var $popover;

        initialize();

        function initialize() {
            ctl.demographics = !!($scope.$eval($attrs.demographics));
            ctl.demographicsConfig = DemographicsConfig;
            ctl.drawControl = !!($scope.$eval($attrs.drawControl));
            ctl.filterControl = !!($scope.$eval($attrs.filterControl));
            ctl.visFullscreenClass = $attrs.visFullscreenClass || 'map-expanded';
            ctl.sublayers = [];
            ctl.radio = '-1';
            ctl.layersVisible = false;
            ctl.visId = ctl.visId || Config.cartodb.visId;
            ctl.visOptions = ctl.visOptions || defaultOptions;
            ctl.visAccount = ctl.visAccount || Config.cartodb.account;
            url = 'https://' + ctl.visAccount + '.carto.com/api/v2/viz/' + ctl.visId + '/viz.json';
            cartodb.createVis(mapDomId, url, ctl.visOptions).done(onVisReady);

            ctl.onFullscreenClicked = onFullscreenClicked;
            ctl.onSublayerChange = onSublayerChange;

            $scope.$watch(function () { return ctl.visFullscreen; }, onVisFullscreenChanged);
        }

        function onSublayerChange(sublayer) {
            angular.forEach(ctl.sublayers, function (s) {
                s.hide();
                //s.legend.set('visible', false);
            });
            demographicsVisible = !!(sublayer);
            if (sublayer) {
                sublayer.show();
                // sublayer.legend.set('visible', true);
            } else {
                // Hide the sticky tooltip by clearing block styling...weee this is messy
                $('div.cartodb-tooltip .tooltip-tracts').parent().css('display', 'none');
            }
        }

        function onVisReady(vis) {
            map = vis.getNativeMap();
            var layers = vis.getLayers();

            if (Config.cartodb.legend) {
                var legend = new cdb.geo.ui.Legend.Category(Config.cartodb.legend);
                  $('#' + mapDomId + ' .leaflet-container').append(legend.render().el);
            }
            // Pretty hacky, but simpler than other options:
            //  If one of the demographics layers are visible, then we want to find the
            //  tooltip-points tooltip and re-hide it as cartodbjs attempts to display it on
            //  feature over
            // Also have a check here to ensure we're listening to the points layer
            if (layers[1].getSubLayers) {
                var dataLayer = layers[1];

                // Setup custom popup
                dataLayer.setInteraction(true);
                dataLayer.setInteractivity('cartodb_id,organization_new,latitude,longitude,ntee_org_type_new');
                dataLayer.on('featureClick', onPointsLayerClicked);
                dataLayer.on('mouseover', function () {
                    $('.leaflet-container').css('cursor', 'pointer');
                });
                dataLayer.on('mouseout', function () {
                    $('.leaflet-container').css('cursor', 'auto');
                });

                // Setup custom popover
                $popover = $('#vis-popover');
                dataLayer.on('featureOver', onPointsLayerFeatureOver);
                dataLayer.on('featureOut', onPointsLayerFeatureOut);

                // Setup demographics hover interactivity
                if (layers.length >= 2) {
                    dataLayer.on('featureOver', onPointsLayerFeatureOverForDemographics);
                }
            } else {
                $log.error('vis.getLayers()[1] is not the points layer!');
            }
            if (ctl.demographics) {
                var demographicsOptions = angular.extend({}, defaultOptions, {});
                cartodb.createLayer(map, Config.cartodb.demographicVisUrl, demographicsOptions)
                .addTo(map).done(function (layer) {
                    $('div.cartodb-legend').filter(':first').css('bottom', '150px');
                    ctl.sublayers = layer.getSubLayers();
                    angular.forEach(ctl.sublayers, function (sublayer) {
                        sublayer.setInteraction(true);
                        sublayer.setInteractivity(Config.cartodb.demographicVisColumns || '');
                    });
                    ctl.onSublayerChange(ctl.sublayers[-1]);
                    $scope.$apply();

                    layer.on('featureOver', onDemographicsLayerFeatureOver);
                    // Need to slide demographics control up if both draw/demographics are active
                    if (ctl.drawControl) {
                        $('div.vis-layer-selector').css('bottom', '140px');
                    }
                });
            }

            // Force museum points back to the top
            // Always layer one of the main visualization (basemap is layer zero)
            var visLayers = vis.getLayers();
            if (visLayers && visLayers.length > 1) {
                visLayers[1].setZIndex(9999);
            }

            $scope.$emit('imls:vis:ready', vis, map);
            $scope.$broadcast('imls:vis:ready', vis, map);
        }

        function onFullscreenClicked() {
            ctl.visFullscreen = !ctl.visFullscreen;
        }

        function onVisFullscreenChanged(newValue) {
            var isOpen = !!(newValue);
            // Toggle class on body:
            //  Putting the 'overflow: hidden' on the body automatically hides scrollbars
            // Yes this is ugly but it keeps everything in the controller
            $('body').toggleClass(ctl.visFullscreenClass, isOpen);
            $timeout(function () {
                if (map) {
                    map.invalidateSize();
                }
                if (ctl.visFullscreenOnToggle()) {
                    ctl.visFullscreenOnToggle()(isOpen);
                }
            }, MAP_SLIDE_TRANSITION_MS * 1.2);
        }

        function onPointsLayerFeatureOverForDemographics() {
            if (demographicsVisible) {
                $('div.cartodb-tooltip .tooltip-points').parent().css('display', 'none');
            }
        }

        function onDemographicsLayerFeatureOver() {
            if (demographicsVisible) {
                $('div.cartodb-tooltip .tooltip-tracts').parent().css('display', 'block');
            }
        }

        function onPointsLayerClicked(event, latLng, pos, data) {
            var popupScope = $scope.$new(true);
            popupScope.loading = true;
            makePopupAtLatLng(popupScope, latLng);
            var client = new cartodb.SQL({user: Config.cartodb.account});
            var sql = 'SELECT {{ fields }} FROM {{table}} ' +
                'WHERE ST_Within(' +
                    'ST_Transform(the_geom, 4326), ' +
                    'ST_Buffer(ST_SetSRID(ST_MakePoint({{ x }}, {{ y }}),4326), {{ tolerance }})' +
                ')';
            client.execute(sql, {
                table: Config.cartodb.tableName,
                x: data.longitude,
                y: data.latitude,
                fields: ['ein_new', 'organization_new', 'ntee_org_type_new'].join(','),
                tolerance: 0.0001
            }).done(function (data) {
                _.forEach(data.rows, function (row) {
                    /* jshint camelcase:false */
                    row.orgTypeColor = colorForOrg(row.ntee_org_type_new);
                    /* jshint camelcase:true */
                });
                popupScope.rows = data.rows;
                popupScope.loading = false;
                makePopupAtLatLng(popupScope, latLng);
            });

            function colorForOrg(orgType) {
                var legendData = Config.cartodb.legend.data;
                var result = _.find(legendData, function (legendItem) {
                    return legendItem.name === orgType;
                });
                return result ? result.value : '#fff';
            }
        }

        function onPointsLayerFeatureOver(event, latLng, pos, data) {
            var popoverScope = $scope.$new(true);
            /* jshint camelcase:false */
            popoverScope.orgName = data.organization_new;
            /* jshint camelcase:true */
            popoverScope.resultCount = OrgCountService.atLatLng(data.latitude, data.longitude);
            var popoverHtml = $compile(orgPopoverTemplate)(popoverScope);
            popoverScope.$apply();
            $popover.html(popoverHtml[0]);
            $popover.css({
                top: pos.y + 5,
                left: pos.x + 5
            });
            $popover.addClass('visible');
        }

        function onPointsLayerFeatureOut() {
            $popover.removeClass('visible');
        }

        function makePopupAtLatLng(scope, latLng) {
            var popupHtml = $compile(orgPopupTemplate)(scope);
            scope.$apply();
            L.popup({maxWidth: 400})
                .setLatLng(latLng)
                .setContent(popupHtml[0])
                .openOn(map);
        }

    }

    /* ngInject */
    function CartoDBVis() {

        var module = {
            restrict: 'E',
            scope: {
                visId: '@',
                visAccount: '@',
                visOptions: '=',
                visFullscreen: '=',
                visFullscreenOnToggle: '&'
                // attrs
                // visFullscreenClass: 'string', class to use for the fullscreen map class
                //                     default: 'map-expanded'
                // demographics: bool, should the demographics layers be shown on the map
                //                     default: false
                // drawControl: bool, should the area analysis draw control be shown on the map
                //                     default: false
                // filterControl: bool, should the vis filter control be shown on the map
                //                     default: false
            },
            templateUrl: 'scripts/map/cartodb-vis-partial.html',
            controller: 'VisController',
            controllerAs: 'vis',
            bindToController: true
        };
        return module;
    }

    angular.module('imls.map')
    .controller('VisController', VisController)
    .directive('cartodbVis', CartoDBVis);

})();
