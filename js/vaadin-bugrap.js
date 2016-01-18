Polymer({
    is: 'vaadin-bugrap',
    ready: function() {
        this.defaultValues();
        this.projectSelect();
        this.setEmployees();
        this.setTypes();
        this.events();
    },
    defaultValues: function() {
        this.currentProject = 0;
        this.projectVersions = [];
        this.distributionBarValues = {
            closed: 0,
            assigned: 0,
            unassigned: 0
        };
        this.projectSearchFilter = '';
        this.types = null;
        this.employees = null;
        this.grid = null;
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

        //TODO change without input blur
        document.getElementById('search_reports').addEventListener('change', function(){
            self.updateReportGrid();
        });
    },
    setTypes: function setTypes() {
        var self = this,
            ref = new Firebase("https://vaadin-bugrap.firebaseio.com/type");
        ref.once("value", function(response) {
            self.types = response.val();
            self.updateReportGrid();
        }, function (errorObject) {
            console.log("The read failed: " + errorObject.code);
        });
    },
    setEmployees: function setEmployees() {
        var self = this,
            ref = new Firebase("https://vaadin-bugrap.firebaseio.com/employee");
        ref.once("value", function(response) {
            self.employees = response.val();
            self.updateReportGrid();
        }, function (errorObject) {
            console.log("The read failed: " + errorObject.code);
        });
    },
    updateReportGrid: function updateReportGrid() {
        if (!this.employees || !this.types) {
            return;
        }


        // Reference to the grid element
        this.grid = document.querySelector("vaadin-grid");
        var self = this;
        var filterWithSearch = false;
        this.projectSearchFilter.trim();
        if (this.projectSearchFilter !== '') {
            filterWithSearch = true;
        }


        // Configure vaadin-grid to show data
        var ref = new Firebase("https://vaadin-bugrap.firebaseio.com/report");
        ref.on("value", function(response) {
            var items = [];
            response.val().forEach(function(element, index, array){
                if(element.project_id === self.currentProject) {
                    if (filterWithSearch) {
                        //TODO IMPLEMENT A BETTER SEARCH FILTER
                        if (element.meta.toLowerCase().indexOf(self.projectSearchFilter.toLowerCase()) > -1) {
                            items.push(element);
                        }
                    } else {
                        items.push(element);
                    }
                }
            });
            self.grid.items = items;
        }, function (errorObject) {
            console.log("The read failed: " + errorObject.code);
        });

        var renderers = {
            priority: function(cell) {
              var i,
                  innerHTML = '';
              for(i = 0; i < cell.data; i++ ) {
                  innerHTML += '<span class="priority_'+cell.data+'">|</span>';
              }
              cell.element.innerHTML = innerHTML;
            },
            type_id: function(cell) {
                cell.element.innerHTML = self.types[cell.data].name;
            },
            employee_id: function(cell) {
                cell.element.innerHTML = self.employees[cell.data].firstname + ' ' + self.employees[cell.data].lastname;
            },
            modifytime: function(cell) {
                var modifyTime = moment(cell.data);
                var nowTime = moment();
                var duration = moment.duration(nowTime.diff(modifyTime));
                cell.element.innerHTML = self.parseDuration(duration);
            },
            createtime: function(cell) {
                var modifyTime = moment(cell.data);
                var nowTime = moment();
                var duration = moment.duration(nowTime.diff(modifyTime));
                cell.element.innerHTML = self.parseDuration(duration);
            }

        };

        this.grid.columns.forEach(function(column) {
            if (renderers[column.name]) {
                column.renderer = renderers[column.name];
            }
        });

        this.grid.addEventListener('sort-order-changed', function() {
            var sortOrder = self.grid.sortOrder[0];
            var sortProperty = self.grid.columns[sortOrder.column].name;
            var sortDirection = sortOrder.direction;
        });

        this.grid.addEventListener("selected-items-changed", function() {
            self.updateModificationLayout();
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
    updateModificationLayout: function updateModificationLayout() {
        var self = this,
            lastIndex,
            totalSelections = 0;
        self.grid.selection.selected(function(index) {
            if (index !== null) {
                totalSelections++;
                lastIndex = index;
            }
        });
        if (lastIndex === null) { //nothing selected
            this.hideModificationLayout();
        }
        else if (totalSelections == 1) {
            this.showSingleReportEdit();
        } else {
            this.showMultiReportEdit();
        }
    },
    hideModificationLayout: function hideModificationLayout() {
        //TODO HIDE THE MODIFICATION LAYOUT
    },
    showSingleReportEdit: function showSingleReportEdit() {
        //TODO Show advanced editing
    },
    showMultiReportEdit: function showMultiReportEdit() {
        //TODO Show mass editing
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
    },
    parseDuration: function parseDuration(duration) {
        if (duration.asYears() >= 1) {
            return parseInt(duration.asYears()) + ' years ago';
        } else if (duration.asMonths() >= 1) {
            return parseInt(duration.asMonths()) + ' months ago';
        } else if (duration.asDays() >= 1) {
            return parseInt(duration.asDays()) + ' days ago';
        } else if (duration.asMinutes() >= 1) {
            return parseInt(duration.asMinutes()) + ' minutes ago';
        } else if (duration.asSeconds() >= 1) {
            return parseInt(duration.asSeconds()) + ' seconds ago';
        }
    }
});