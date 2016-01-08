(function(document) {
    'use strict';

    // Grab a reference to our auto-binding template
    // and give it some initial binding values
    // Learn more about auto-binding templates at http://goo.gl/Dx1u2g
    var app = document.querySelector('#app');

    // Sets app default base URL
    app.baseUrl = '/';
    if (window.location.port === '') {  // if production
        // Uncomment app.baseURL below and
        // set app.baseURL to '/your-pathname/' if running from folder in production
        // app.baseUrl = '/polymer-starter-kit/';
    }

    // Listen for template bound event to know when bindings
    // have resolved and content has been stamped to the page
    app.addEventListener('dom-change', function() {
        console.log('Our app is ready to rock!');
    });

    window.addEventListener('resize', function() {
        distributionBarChange();
    });

    window.addEventListener('WebComponentsReady', function() {
        // imports are loaded and elements have been registered
        updateReportGrid();
        projectSelect();
        distributionBarChange(5, 12, 123);
    });


    /*
    //////////////////////////
    Functions
    /////////////////////////
     */
    var projectSelect = function projectSelect() {
        var element = document.getElementById('project_select');
        element.addEventListener('iron-select', function(){
            //console.log($(this).val());
        });
        //console.log(element);
    };

    var updateReportGrid = function updateReportGrid() {
        // Reference to the grid element
        var grid = document.querySelector("vaadin-grid");

        // Configure vaadin-grid to show data
        var ref = new Firebase("https://vaadin-bugrap.firebaseio.com/report");
        ref.on("value", function(response) {
            grid.items = response.val();
        }, function (errorObject) {
            console.log("The read failed: " + errorObject.code);
        });

        // Add a renderer for the index column
        grid.columns[0].renderer = function(cell) {
            cell.element.innerHTML = cell.row.index;
        };

        grid.addEventListener('sort-order-changed', function() {
            var sortOrder = grid.sortOrder[0];
            var sortProperty = grid.columns[sortOrder.column].name;
            var sortDirection = sortOrder.direction;
            console.log("sorted");
        });
    };

    var distributionBarChange = function distributionBarChange(closed, assigned, unassigned) {
        //TODO select distribution values from somewhere, now only static
        closed = 5;
        assigned = 12;
        unassigned = 123;




        var $distributionBarClosed = document.getElementById('distribution_bar_closed'),
            $distributionBarAssigned = document.getElementById('distribution_bar_assigned'),
            $distributionBarUnAssigned = document.getElementById('distribution_bar_unassigned');
        var total = closed + assigned + unassigned,
            closedRelation = closed / total,
            assignedRelation = assigned / total,
            unassignedRelation = unassigned / total,
            totalWidth = document.getElementById('distribution_bar').offsetWidth - 10,
            height = document.getElementById('distribution_bar').offsetHeight;
        $distributionBarClosed.setAttribute('style','width:'+(totalWidth*closedRelation)+'px; height:'+height+'px');
        $distributionBarAssigned.setAttribute('style','width:'+(totalWidth*assignedRelation)+'px; height:'+height+'px');
        $distributionBarUnAssigned.setAttribute('style','width:'+(totalWidth*unassignedRelation)+'px; height:'+height+'px');
        $distributionBarClosed.innerHTML = closed;
        $distributionBarAssigned.innerHTML = assigned;
        $distributionBarUnAssigned.innerHTML = unassigned;
    }

})(document);