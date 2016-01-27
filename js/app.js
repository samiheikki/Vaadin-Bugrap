(function(document) {
    'use strict';

    var app = document.querySelector('#app');

    var bugrap;

    app.addEventListener('dom-change', function() {
        console.log('App is ready to rock!');
    });

    window.addEventListener('WebComponentsReady', function() {
        bugrap = document.querySelector('vaadin-bugrap');
        events();
    });

    function events() {
        $('.tab_select').on('click', function(){
            bugrap.updateReportGrid();
        });
    }

})(document);