/**
 * Control to allow the user to select or draw custom ACS analysis areas on the cartodb-vis map
 *
 * Events:
 * imls:area-analysis-control:radius:changed Triggered when the radius is changed in the
 *                                           control select dropdown
 *     {Number} radius The radius selected in meters
 *
 * imls:area-analysis-control:draw:start Triggered when the user clicks on any of the custom
 *                                       draw buttons
 *     {String} drawType The button selected, currently one of 'circle'|'polygon'
 *
 * imls:area-analysis-control:draw:complete Triggered when the user finishes drawing a custom shape
 *     {Event} drawEvent The event fired by the L.Draw control, passed through
 *
 * imls:area-analysis-control:draw:cancel Listened for on scope, trigger elsewhere to clear the
 *                                        draw handler and reset the control
 *
 */

(function () {
    'use strict';

    /** @ngInject */
    function FilterController($scope, Config) {
        var layer = null;
        var filterColumn = 'ntee_org_type_new';
        var noneName = 'None';
        var noneValue = {name: noneName, value: null};
        var table = Config.cartodb.tableName;

        var ctl = this;
        initialize();

        function initialize() {
            var options = _.cloneDeep(Config.cartodb.legend.data);
            options.splice(0, 0, noneValue);
            ctl.options = options;
            ctl.filterValue = noneValue;

            ctl.onFilterOptionChanged = onFilterOptionChanged;

            $scope.$on('imls:vis:ready', function (event, viz) {
                layer = viz.getLayers()[1];
            });
        }

        function vizSqlForValue(value) {
            if (value === noneName) {
                return 'SELECT * FROM ' + table;
            } else {
                return 'SELECT * FROM ' + table + ' ' +
                    'WHERE ' + filterColumn + '=\'' + value + '\'';
            }
        }

        function onFilterOptionChanged() {
            setFilterValue(ctl.filterValue.name);
        }

        function setFilterValue(value) {
            var sql = vizSqlForValue(value);
            layer.setQuery(sql);
        }
    }

    /** @ngInject */
    function filterControl() {
        var module = {
            restrict: 'A',
            templateUrl: 'scripts/map/filter-control-partial.html',
            scope: true,
            controller: 'FilterController',
            controllerAs: 'fc',
            bindToController: true
        };
        return module;
    }

    angular.module('imls.map')
    .controller('FilterController', FilterController)
    .directive('vizFilterControl', filterControl);

})();
