Polymer({
    is: 'vaadin-bugrap',
    ready: function() {
        this.defaultValues();
        this.initSplitter('#splitpanel');
        this.projectSelect();
        this.setEmployees();
        this.setTypes();
        this.events();
    },
    defaultValues: function defaultValues() {
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
        this.reportComments = null;
        this.selectedReportAmount = 0;
        this.selectedReportMeta = '';
    },
    initSplitter: function initSplitter(panel) {
        //$(panel).width("100%").height(400).split({position:'100%'});
        //this.hideModificationLayout();
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
    getEmployeeWithId: function getEmployeeWithId(employee_id) {
        if (this.employees && this.employees[employee_id]) {
            return this.employees[employee_id];
        }
        return {};
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
                cell.element.innerHTML = self.parseDuration(cell.data);
            },
            createtime: function(cell) {
                cell.element.innerHTML = self.parseDuration(cell.data);
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
            lastIndex = null,
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
            this.showSingleReportEdit(lastIndex);
        } else {
            this.selectedReportAmount = totalSelections;
            this.showMultiReportEdit();
        }
    },
    hideModificationLayout: function hideModificationLayout() {
        $('#report_edit').hide();
        $('#splitpanel').split().destroy();
    },
    showSingleReportEdit: function showSingleReportEdit(report_id) {
        this.getReportComments(report_id);
        this.selectedReportMeta = this.grid.items[report_id].meta;
        $('#report_edit_name').show();
        $('#report_edit_amount').hide();
        $('#report_edit').show();
        $('#report_comments').show();
        $('#splitpanel').width("100%").height(400).split({position:'50%'});
    },
    showMultiReportEdit: function showMultiReportEdit() {
        $('#report_edit_name').hide();
        $('#report_edit_amount').show();
        $('#report_comments').hide();
        $('#report_edit').show();
        $('#splitpanel').width("100%").height(400).split({position:'50%'});
    },
    getReportComments: function getReportComments(report_id) {
        var self = this;
        var ref = new Firebase("https://vaadin-bugrap.firebaseio.com/comment");
        var employee;
        ref.on("value", function(response) {
            var items = [];
            response.val().forEach(function(element, index, array){
                if(element.report_id === report_id) {
                    employee = self.getEmployeeWithId(element.employee_id);
                    element.timestamp = self.parseDuration(element.timestamp);
                    element.employee = employee.firstname + ' ' + employee.lastname;
                    items.push(element);
                }
            });
            self.reportComments = items;
        }, function (errorObject) {
            console.log("The read failed: " + errorObject.code);
        });
    },
    distributionBarChange: function distributionBarChange() {
        var closed = this.distributionBarValues.closed;
        var assigned = this.distributionBarValues.assigned;
        var unassigned = this.distributionBarValues.unassigned;

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
    parseDuration: function parseDuration(timestamp) {
        var modifyTime = moment(timestamp);
        var nowTime = moment();
        var duration = moment.duration(nowTime.diff(modifyTime));
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