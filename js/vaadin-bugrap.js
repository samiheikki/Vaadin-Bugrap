Polymer({
    is: 'vaadin-bugrap',
    ready: function() {
        this.defaultValues();
        this.projectSelect();

        this.events();
    },
    defaultValues: function() {
        this.currentProject = 0;
        this.projectVersions = [];
        this.distributionBarValues = {
            closed: 0,
            assigned: 0,
            unassigned: 0
        }
    },
    events: function events() {
        var self = this;

        //Resize distribution bar when window size changes
        window.addEventListener('resize', function() {
            self.distributionBarChange();
        });

        //Update site when project is changed
        document.getElementById('project_select').addEventListener('iron-select', function(){
            self.projectSelect();
        });
    },
    updateReportGrid: function updateReportGrid() {
        // Reference to the grid element
        var grid = document.querySelector("vaadin-grid");
        var self = this;


        // Configure vaadin-grid to show data
        var ref = new Firebase("https://vaadin-bugrap.firebaseio.com/report");
        ref.on("value", function(response) {
            var items = [];
            response.val().forEach(function(element, index, array){
                if(element.project_id === self.currentProject) {
                    items.push(element);
                }
            });
            grid.items = items;
        }, function (errorObject) {
            console.log("The read failed: " + errorObject.code);
        });

        // Add a renderer for the index column
        /*grid.columns[0].renderer = function(cell) {
         cell.element.innerHTML = cell.row.index;
         };*/

        grid.addEventListener('sort-order-changed', function() {
            var sortOrder = grid.sortOrder[0];
            var sortProperty = grid.columns[sortOrder.column].name;
            var sortDirection = sortOrder.direction;
            console.log("sorted");
        });
    },
    projectSelect: function projectSelect() {
        var self = this;
        if(typeof this.$.project_select.selectedItem !== 'undefined') {
            self.currentProject = this.$.project_select.selectedItem.value;
            self.updateReportGrid();
            self.updateDistributionBarValues();
            self.updateVersionList();
        }
    },
    updateVersionList: function updateVersionList() {
        //Get Project Versions
        var self = this;
        var ref = new Firebase("https://vaadin-bugrap.firebaseio.com/version");
        ref.on("value", function(response) {
            var items = [];
            response.val().forEach(function(element, index, array){
                if(element.project_id === self.currentProject) {
                    items.push(element);
                }
            });
            self.projectVersions = items;
        }, function (errorObject) {
            console.log("The read failed: " + errorObject.code);
        });
    },
    updateDistributionBarValues: function updateDistributionBarValues() {
        //get Project report distribution
        var self = this;
        this.distributionBarValues.closed = 0;
        this.distributionBarValues.assigned = 0;
        this.distributionBarValues.unassigned = 0;
        var closed = 0,
            assigned = 0,
            unassigned = 0;
        var closedIds = [1],
            assignedIds = [2,3,4,5,6,7],
            unassignedIds = [0];
        var ref = new Firebase("https://vaadin-bugrap.firebaseio.com/report");
        ref.on("value", function(response) {
            response.val().forEach(function(element, index, array){
                if(element.project_id === self.currentProject) {
                    if (closedIds.indexOf(element.status_id) > -1) {
                        self.distributionBarValues.closed++;

                    } else if(assignedIds.indexOf(element.status_id) > -1) {
                        self.distributionBarValues.assigned++;

                    } else if(unassignedIds.indexOf(element.status_id) > -1) {
                        self.distributionBarValues.unassigned++;
                    }
                }
            });
            self.distributionBarChange();
        }, function (errorObject) {
            console.log("The read failed: " + errorObject.code);
        });
    },
    distributionBarChange: function distributionBarChange() {
        //TODO REMOVE +1
        var closed = this.distributionBarValues.closed+1;
        var assigned = this.distributionBarValues.assigned+1;
        var unassigned = this.distributionBarValues.unassigned+1;

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
});