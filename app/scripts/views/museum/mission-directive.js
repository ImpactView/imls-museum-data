(function () {
    'use strict';

    /* ngInject */
    function MissionController() {
        // Approx three lines of text in detail view
        var SHORT_CHAR_LIMIT = 350;
        var ctl = this;
        ctl.expanded = false;
        ctl.showMore = false;
        ctl.$onChanges = $onChanges;

        function $onChanges(changes) {
            var mission = changes.mission.currentValue;
            if (mission && mission.length) {
                ctl.shortMission = mission.substring(0, SHORT_CHAR_LIMIT);
                ctl.showMore = mission.length !== ctl.shortMission.length;
                if (ctl.showMore) {
                    ctl.shortMission = ctl.shortMission + '...';
                }
            }
        }
    }

    /* ngInject */
    function mission() {
        var module = {
            restrict: 'E',
            templateUrl: 'scripts/views/museum/mission-partial.html',
            controller: 'MissionController',
            controllerAs: 'ivm',
            scope: {
                mission: '<'
            },
            bindToController: true
        };
        return module;
    }

    angular.module('imls.views.museum')
    .controller('MissionController', MissionController)
    .directive('imlsMission', mission);

})();
