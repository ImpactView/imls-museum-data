(function () {
    'use strict';

    /* ngInject */
    function OrgCount($q, Config) {

        var countData = {};
        getCounts();

        var module = {
            atLatLng: atLatLng
        };
        return module;

        function atLatLng(latitude, longitude) {
            var key = makeKey(latitude, longitude);
            // Assume only one point at location if no result for the requested lat/lng combination
            return countData[key] || 1;
        }

        function makeKey(latitude, longitude) {
            return latitude.toString() + ',' + longitude.toString();
        }

        function getCounts() {
            var client = new cartodb.SQL({user: Config.cartodb.account});
            var sql = 'select latitude, longitude, count(*) as num_results ' +
                'FROM {{ table }} WHERE latitude is not null AND longitude is not null ' +
                'GROUP BY latitude, longitude';
            client.execute(sql, {table: Config.cartodb.tableName}).done(function (data) {
                _.forEach(data.rows, function (d) {
                    var key = makeKey(d.latitude, d.longitude);
                    /* jshint camelcase:false */
                    countData[key] = d.num_results;
                    /* jshint camelcase:true */
                });
            });
        }
    }

    angular.module('imls.map')
    .service('OrgCountService', OrgCount);

})();
