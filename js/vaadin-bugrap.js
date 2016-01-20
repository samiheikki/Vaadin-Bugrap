Polymer({
    is: 'vaadin-bugrap',
    ready: function() {
        this.defaultValues();
        this.setEmployees();
        this.setTypes();
        this.setStatues();
        this.events();
        this.setPriorities();
    },
    defaultValues: function defaultValues() {
        this.currentProject = 0;
        this.projectVersions = [];
        this.distributionBarValues = {
            closed: 0,
            assigned: 0,
            unassigned: 0
        };
        this.types = null;
        this.employees = null;
        this.grid = null;
        this.reportComments = null;
        this.selectedReportAmount = 0;
        this.selectedReportMeta = '';
        this.priorities = null;
        this.statuses = null;
        this.reportEditValues = {
            priority: null,
            type_id: null,
            status_id: null,
            employee_id: null,
            version_id: null
        };
        this.employee_id = 1; //TODO THIS IS STATIC. Change to dynamic.
        this.filters = {
            assignee: 'me',
            searchFilter: '',
            status: 'open',
            version: null
        };
        this.checkedCustomFilters = [1,2,3,4,5,6,7,8]; // TODO remove hardcoded

        this.firebaseReportData = []; //Temporary solution for not fetching same data from firebase when filters change
    },
    setPriorities: function setPriorities() {
        var i = 1,
            j = 0,
            priority,
            priorities = [];
        for(i = 1; i <= 5; i++ ) {
            priority = {};
            priority.number = i;
            priority.text = '';
            for(j = 0; j < i; j++) {
                priority.text += '|';
            }
            priorities.push(priority);
        }
        this.priorities = priorities;
    },
    events: function events() {
        var self = this;

        //Resize distribution bar when window size changes
        window.addEventListener('resize', function() {
            self.distributionBarChange();
        });

        //Update site when project is changed
        document.getElementById('project_select').addEventListener('iron-select', function(){
            self.projectSelect(this.selectedItem.value);
        });

        //Update grid when version changed
        document.getElementById('version_menu').addEventListener('iron-select', function(){
            self.updateReportGrid();
        });

        //TODO change without input blur
        document.getElementById('search_reports').addEventListener('change', function(){
            self.updateReportGrid();
        });

        $(document).on('click', function(event) {
            var statusDialog = $('.status-dialog');
            if(!$(event.target).closest('.status-dialog').length && !$(event.target).closest('#status-select').length) {
                if(statusDialog.is(":visible")) {
                    statusDialog.addClass('closed');
                    $('#status_select_down').show();
                    $('#status_select_up').hide();
                }
            }
        });

        $('.tab-select').on('click', function(){
            self.updateReportGrid();
        });

        $('#status-select').on('click', self.toggleStatusSelect);
    },
    toggleStatusSelect: function toggleStatusSelect() {
        var statusDialog = $('.status-dialog');
        if (statusDialog.hasClass('closed')) { //open
            statusDialog.removeClass('closed');
            $('#status_select_down').hide();
            $('#status_select_up').show();
        } else { //open
            statusDialog.addClass('closed');
            $('#status_select_down').show();
            $('#status_select_up').hide();
        }
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
    setStatues: function setStatues() {
        var self = this,
            ref = new Firebase("https://vaadin-bugrap.firebaseio.com/status");
        ref.once("value", function(response) {
            self.statuses = response.val();
            console.log(self.statuses);
        }, function (errorObject) {
            console.log("The read failed: " + errorObject.code);
        });
    },
    customStatusChanged: function customStatusChanged() {
        var name = event.target.name;
        var index = this.checkedCustomFilters.indexOf(name);
        if(event.target.checked) {
            if (index < 0) {
                this.checkedCustomFilters.push(name);
            }
        } else {
            this.checkedCustomFilters = $.grep(this.checkedCustomFilters, function(value) {
                return value != name;
            });
        }
        this.updateReportGrid();
    },
    getEmployeeWithId: function getEmployeeWithId(employee_id) {
        var employee = {};
        if (this.employees) {
            this.employees.forEach(function(element, index){
                if (element.employee_id === employee_id) {
                    employee = element;
                }
            });
        }
        return employee;
    },
    updateReportGrid: function updateReportGrid() {
        if (!this.employees || !this.types) {
            return;
        }


        // Reference to the grid element
        this.grid = document.querySelector("vaadin-grid");
        var self = this;
        var filterWithSearch = false;
        var items = [];

        if (self.firebaseReportData.length > 0) { //data already fetched
            self.firebaseReportData.forEach(function(element, index, array){
                if (self.elementMatchFilters(element)) {
                    items.push(element);
                }
            });
            self.grid.items = items;
        } else {
            var ref = new Firebase("https://vaadin-bugrap.firebaseio.com/report");
            ref.on("value", function(response) {
                self.firebaseReportData = response.val();
                response.val().forEach(function(element, index, array){
                    if (self.elementMatchFilters(element)) {
                        items.push(element);
                    }
                });
                self.grid.items = items;
            }, function (errorObject) {
                console.log("The read failed: " + errorObject.code);
            });
        }

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
                var type = {};
                self.types.forEach(function(element, index){
                   if (element.type_id === cell.data) {
                       type = element;
                   }
                });
                cell.element.innerHTML = type.name;
            },
            employee_id: function(cell) {
                var employee = self.getEmployeeWithId(cell.data);
                cell.element.innerHTML = employee.firstname + ' ' + employee.lastname;
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
    elementMatchFilters: function elementMatchFilters(element) {
        var self = this;
        var projectMatches = function projectMatches() {
            return element.project_id === self.currentProject;
        };
        var assigneeMatches = function assigneeMatches() {
            if(self.filters.assignee === 'everyone') {
                return true;
            } else { //only me
                return element.employee_id === self.employee_id;
            }
        };
        var statusMatches = function statusMatches() {
            if(self.filters.status === 'all_kind') {
                return true;
            } else if (self.filters.status === 'open') {
                return element.status_id === 1;
            } else { //custom filters
                return self.checkedCustomFilters.indexOf(element.status_id) > -1;
            }
        };
        var searchMatches = function searchMatches() {
            //TODO IMPLEMENT A BETTER SEARCH
            var searchFilter = $.trim(self.filters.searchFilter.toLowerCase());
            if (searchFilter !== '') {
                return element.meta.toLowerCase().indexOf(self.filters.searchFilter.toLowerCase()) > -1;
            }
            return true;
        };
        var versionMatches = function versionMatches() {
            if (self.filters.version == 'all') {
                return true;
            } else {
                return self.filters.version = element.version_id;
            }
        };
        return projectMatches() && assigneeMatches() && statusMatches() && searchMatches() && versionMatches();
    },
    projectSelect: function projectSelect(project_id) {
        var self = this;
        self.currentProject = project_id;
        self.updateVersionList();
        self.updateReportGrid();
        self.updateDistributionBarValues();
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
            if (items.length > 1) {
                var allItems = [];
                allItems.push({name: "All versions", project_id: self.currentProject, version_id: "all"});
                items.forEach(function(element){
                    allItems.push(element);
                });
                self.projectVersions = allItems;
            } else {
                self.projectVersions = items;
            }
            if (typeof self.projectVersions[0] !== 'undefined') {
                self.filters.version = self.projectVersions[0].version_id;
                document.getElementById('version_menu').select(self.filters.version);
            }
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
        this.nullReportEditValues();
        self.grid.selection.selected(function(index) {
            if (index !== null) {
                var gridRow = self.grid.items[index];
                totalSelections++;
                lastIndex = index;
                for (var k in self.reportEditValues) {
                    if (self.reportEditValues.hasOwnProperty(k)) {
                        if(self.reportEditValues[k] === null) {
                            self.reportEditValues[k] = ""+gridRow[k];
                        } else if (self.reportEditValues[k] !== ""+gridRow[k]) {
                            self.reportEditValues[k] = "false";
                        }
                    }
                }
            }
        });
        if (lastIndex === null) { //nothing selected
            this.hideModificationLayout();
        }
        else if (totalSelections == 1) {
            this.showSingleReportEdit(lastIndex);
            this.setReportEditValues();
        } else {
            this.selectedReportAmount = totalSelections;
            this.showMultiReportEdit();
            this.setReportEditValues();
        }
    },
    hideModificationLayout: function hideModificationLayout() {
        $('#report_edit').hide();
        $('#splitpanel').css('height','auto');
        $('#report-grid').css('height','auto');
        $('#splitpanel').split().destroy();
    },
    showSingleReportEdit: function showSingleReportEdit(gridIndex) {
        var report_id = this.grid.items[gridIndex].report_id;
        this.hideModificationLayout();
        var height = $(document).height() - $('vaadin-bugrap').height() + 90;
        this.getReportComments(report_id);
        this.selectedReportMeta = this.grid.items[gridIndex].meta;
        $('#report_edit_name').show();
        $('#report_edit_amount').hide();
        $('#report_edit').show();
        $('#report_comments').show();
        $('#splitpanel').width("100%").height(height).split({position:'50%'});
    },
    showMultiReportEdit: function showMultiReportEdit() {
        this.hideModificationLayout();
        var height = $(document).height() - $('vaadin-bugrap').height() + 90;
        $('#report_edit_name').hide();
        $('#report_edit_amount').show();
        $('#report_comments').hide();
        $('#report_edit').show();
        $('#splitpanel').width("100%").height(height).split({position:'50%'});
    },
    nullReportEditValues: function nullReportEditValues() {
        var self = this;
        for (var k in self.reportEditValues) {
            if (self.reportEditValues.hasOwnProperty(k)) {
                self.reportEditValues[k] = null;
            }
        }
    },
    setReportEditValues: function setReportEditValues() {
        var self = this;
        for (var k in self.reportEditValues) {
            if (self.reportEditValues.hasOwnProperty(k)) {
                document.getElementById('report_select_'+k).select(""+self.reportEditValues[k]);
            }
        }
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