// The Web Components polyfill introduces a custom event we can
// use to determine when the custom elements are ready to be used
document.addEventListener("WebComponentsReady", function () {

    // Configure vaadin-grid to show data

    // Reference to the grid element
    var grid = document.querySelector("vaadin-grid");

    // Fetch some JSON data from a URL
    var xhr = new XMLHttpRequest();
    xhr.onreadystatechange = function() {
        if (xhr.readyState == XMLHttpRequest.DONE) {
            if (xhr.status == 200) {
                var json = JSON.parse(xhr.responseText);

                // Use the returned data array directly as the data source
                // (keeping all the data source items in the browser's memory)
                grid.items = json.results;
            }
        }
    };
    xhr.open("GET", "http://api.randomuser.me/?results=100", true);
    xhr.send();

    // Add a renderer for the index column
    grid.columns[0].renderer = function(cell) {
        cell.element.innerHTML = cell.row.index;
    };

    // Add a renderer for the picture column
    grid.columns[1].renderer = function(cell) {
        cell.element.innerHTML = '<img src="' + cell.data + '" style="width: 24px;">';
    };
    distributionBarChange(5, 12, 123);
    fireBaseTesting();
});

function clearInput(e) {
    console.log(e);
    document.getElementById('inputWithButton').value = '';
}

function distributionBarChange(closed, assigned, unassigned) {
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
}

function fireBaseTesting() {
    var ref = new Firebase("https://vaadin-bugrap.firebaseio.com/project");
    ref.on("value", function(snapshot) {
        console.log(snapshot.val());
    }, function (errorObject) {
        console.log("The read failed: " + errorObject.code);
    })
}

Polymer({

    is: 'bugrap-foo',

    ready: function() {
        console.log(this.$$('#distribution_bar'));
        this.$.name.textContent = this.tagName;
    }

});