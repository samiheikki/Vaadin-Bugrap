// The Web Components polyfill introduces a custom event we can
// use to determine when the custom elements are ready to be used
document.addEventListener("WebComponentsReady", function () {
    updateReportGrid();
    distributionBarChange(5, 12, 123);
});

function clearInput(e) {
    console.log(e);
    document.getElementById('inputWithButton').value = '';
}

function distributionBarChange(closed, assigned, unassigned) {
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

function updateReportGrid() {

    // Reference to the grid element
    var grid = document.querySelector("vaadin-grid");

    // Configure vaadin-grid to show data
    var ref = new Firebase("https://vaadin-bugrap.firebaseio.com/report");
    ref.on("value", function(response) {
        grid.items = response.val();
        console.log(grid.items);
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
        //restApi.setSortProperty(sortProperty, sortDirection);
    });
}

Polymer({

    is: 'bugrap-foo',

    ready: function() {
        console.log(this.$$('#distribution_bar'));
        this.$.name.textContent = this.tagName;
    }

});