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
    }
});