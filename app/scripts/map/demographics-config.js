(function() {
    'use strict';

    /**
     * Configuration for demographics legends
     * @type {Object}
     */
    var config = [{
        title: 'Median Income ($)',
        show_title: true,
        type: 'choropleth',
        data: [
            { value: 0 },
            { value: 130000 },
            { name: '1', value: '#f7f7f7' },
            { name: '2', value: '#cccccc' },
            { name: '3', value: '#969696' },
            { name: '4', value: '#636363' },
            { name: '5', value: '#252525' }
        ]
    }, {
        title: 'Poverty Rate (%)',
        show_title: true,
        type: 'choropleth',
        data: [
            { value: 0 },
            { value: 74.4 },
            { name: '1', value: '#f7f7f7' },
            { name: '2', value: '#cccccc' },
            { name: '3', value: '#969696' },
            { name: '4', value: '#636363' },
            { name: '5', value: '#252525' }
        ]
    }, {
        title: 'Percent Children (%)',
        show_title: true,
        type: 'choropleth',
        data: [
            { value: 0 },
            { value: 41 },
            { name: '1', value: '#f7f7f7' },
            { name: '2', value: '#cccccc' },
            { name: '3', value: '#969696' },
            { name: '4', value: '#636363' },
            { name: '5', value: '#252525' }
        ]
    }, {
        title: 'Percent Adults without HS Diploma (%)',
        show_title: true,
        type: 'choropleth',
        data: [
            { value: 0 },
            { value: 100 },
            { name: '1', value: '#f7f7f7' },
            { name: '2', value: '#cccccc' },
            { name: '3', value: '#969696' },
            { name: '4', value: '#636363' },
            { name: '5', value: '#252525' }
        ]
    }];

    angular.module('imls.map')
    .constant('DemographicsConfig', config);

})();
