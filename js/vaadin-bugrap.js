Polymer({
    is: 'vaadin-bugrap',
    ready: function() {
        this.defaultValues();
        this.createFirebaseInstance();
        this.setEditResizeable();
        this.setEmployees();
        this.setTypes();
        this.setStatues();
        this.events();
        this.setPriorities();
        this.getMaxCommentId();
        this.getMaxAttachmentId();
    },
    defaultValues: function defaultValues() {
        var self = this;
        this.versions = [];
        this.versionsWithoutAll = [];
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
            project: parseInt(sessionStorage.getItem('project')) || 1,
            assignee: sessionStorage.getItem('assignee') || 'me',
            searchFilter: sessionStorage.getItem('searchFilter') || '',
            status: sessionStorage.getItem('status') || 'open',
            version: parseInt(sessionStorage.getItem('version')) || null,
            checkedCustomFilters: JSON.parse(sessionStorage.getItem('checkedCustomFilters')) || [1,2,3,4,5,6,7,8] // TODO remove hardcoded
        };
        this.maxcomment_id = 0;
        this.maxcommentindex = 0;
        this.commment_attachment = [];

        this.maxattachment_id = 0;

        this.firebase = {};

        this.firebaseReportData = []; //Temporary solution for not fetching same data from firebase when filters change
        this.editPanelResized = false;
    },
    createFirebaseInstance: function createFirebaseInstance(){
        this.firebase.ref = new Firebase("https://vaadin-bugrap.firebaseio.com/");
        this.firebase.comment = this.firebase.ref.child('comment');
        this.firebase.employee = this.firebase.ref.child('employee');
        this.firebase.project = this.firebase.ref.child('project');
        this.firebase.report = this.firebase.ref.child('report');
        this.firebase.status = this.firebase.ref.child('status');
        this.firebase.type = this.firebase.ref.child('type');
        this.firebase.version = this.firebase.ref.child('version');
        this.firebase.filetest = this.firebase.ref.child('filetest');
        this.firebase.comment_attachment = this.firebase.ref.child('comment_attachment');
        this.firebase.attachment = this.firebase.ref.child('attachment');
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
            self.setReportCommentHeight();
            self.editResizeableHeight();
        });

        $('#report_edit_container').on( "resize", function(event, ui) {
            self.setReportCommentHeight();
        });

        //Update site when project is changed
        document.getElementById('project_select').addEventListener('iron-select', function(){
            self.projectSelect(this.selectedItem.value);
        });

        //Update grid when version changed
        document.getElementById('version_menu').addEventListener('iron-select', function(){
            self.updateDistributionBarValues();
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

        //file-upload-events
        this.addEventListener('addComment', function(){
           self.addComment();
        });
        this.addEventListener('commentCancel', function(){
            self.commentCancel();
        });

        $('#report_edit_container').on('resize', function( event, ui ){
            self.editPanelResized = true;
        });
    },
    toggleStatusSelect: function toggleStatusSelect() {
        var statusDialog = $('.status-dialog');
        if (statusDialog.hasClass('closed')) { //open
            statusDialog.removeClass('closed');
            $('#status_select_down').hide();
            $('#status_select_up').show();
        } else { //close
            statusDialog.addClass('closed');
            $('#status_select_down').show();
            $('#status_select_up').hide();
        }
    },
    setTypes: function setTypes() {
        var self = this;
        this.firebase.type.once("value", function(response) {
            self.types = response.val();
            self.updateReportGrid();
        }, function (errorObject) {
            console.log("The read failed: " + errorObject.code);
        });
    },
    setEmployees: function setEmployees() {
        var self = this;
        this.firebase.employee.once("value", function(response) {
            self.employees = response.val();
            self.updateReportGrid();
        }, function (errorObject) {
            console.log("The read failed: " + errorObject.code);
        });
    },
    setStatues: function setStatues() {
        var self = this;
        this.firebase.status.once("value", function(response) {
            self.statuses = response.val();
            self.setFilterCheckBoxChecked();
        }, function (errorObject) {
            console.log("The read failed: " + errorObject.code);
        });
    },
    setFilterCheckBoxChecked: function setFilterCheckBoxChecked() {
        var self = this;
        this.async(function(){
            $('.custom_filter_checkbox').each(function(index, element){
                var name = element.name;
                if($.inArray(name, self.filters.checkedCustomFilters) !== -1) {
                    element.checked = true;
                }
            });
        }, 1);
    },
    customStatusChanged: function customStatusChanged() {
        var name = event.target.name;
        var index = this.filters.checkedCustomFilters.indexOf(name);
        if(event.target.checked) {
            if (index < 0) {
                this.filters.checkedCustomFilters.push(name);
            }
        } else {
            this.filters.checkedCustomFilters = $.grep(this.filters.checkedCustomFilters, function(value) {
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
    getVersionWithId: function getVersionWithId(version_id) {
        var version = {};
        if (this.versions) {
            this.versions.forEach(function(element, index){
                if (element.version_id === version_id) {
                    version = element;
                }
            });
        }
        return version;
    },
    getCommentWithId: function getCommentWithId(comment_id) {
        var comment = {};
        if (this.reportComments) {
            this.reportComments.forEach(function(element, index){
                if (element.comment_id === comment_id) {
                    comment = element;
                }
            });
        }
        return comment;
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
        var lesser = 1;
        var filter = 'priority';
        var showVersion = (self.filters.version === 'all' || self.filters.version === null);
        if (showVersion) {
            lesser = -1;
            filter = 'version_id';
        }

        if (self.firebaseReportData.length > 0) { //data already fetched
            self.firebaseReportData.forEach(function(element, index, array){
                if (self.elementMatchFilters(element)) {
                    items.push(element);
                }
            });
            self.grid.items = items;
        } else {
            this.firebase.report.once("value", function(response) {
                self.firebaseReportData = response.val();
                response.val().forEach(function(element, index, array){
                    if (self.elementMatchFilters(element)) {
                        items.push(element);
                    }
                });
                items.sort(function(a, b){
                    return (a[filter] < b[filter]) ? lesser : -lesser;
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
                if (Object.keys(employee).length === 0) {
                    employee.firstname = 'No';
                    employee.lastname = 'assignee';
                }
                cell.element.innerHTML = employee.firstname + ' ' + employee.lastname;
            },
            modifytime: function(cell) {
                cell.element.innerHTML = self.parseDuration(cell.data);
            },
            createtime: function(cell) {
                cell.element.innerHTML = self.parseDuration(cell.data);
            },
            version_id: function(cell) {
                var version = self.getVersionWithId(cell.data);
                cell.element.innerHTML = version.name;
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
            var lesser = self.grid.sortOrder[0].direction == 'asc' ? -1 : 1;
            items.sort(function(a, b){
                return (a[sortProperty] < b[sortProperty]) ? lesser : -lesser;
            });
        });

        //Show version if all selected
        this.grid.columns[0].hidden = !showVersion;
        if (showVersion) {
            this.grid.sortOrder = [{column: 0, direction: 'asc'}];
        } else {
            this.grid.sortOrder = [{column: 1, direction: 'desc'}];

        }

        this.grid.addEventListener("selected-items-changed", function() {
            self.updateModificationLayout();
        });

        this.setSessionStorageValues();
    },
    elementMatchFilters: function elementMatchFilters(element) {
        var self = this;
        var projectMatches = function projectMatches() {
            return element.project_id === self.filters.project;
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
                return self.filters.checkedCustomFilters.indexOf(element.status_id) > -1;
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
                return self.filters.version === element.version_id;
            }
        };
        return projectMatches() && assigneeMatches() && statusMatches() && searchMatches() && versionMatches();
    },
    projectSelect: function projectSelect(project_id) {
        var self = this;
        self.updateVersionList();
        self.updateReportGrid();
        self.updateDistributionBarValues();
    },
    updateVersionList: function updateVersionList() {
        //Get Project Versions
        var self = this;
        this.firebase.version.on("value", function(response) {
            var items = [];
            response.val().forEach(function(element, index, array){
                if(element.project_id === self.filters.project) {
                    items.push(element);
                }
            });
            if (items.length > 1) {
                var allItems = [];
                allItems.push({name: "All versions", project_id: self.filters.project, version_id: "all"});
                items.forEach(function(element){
                    allItems.push(element);
                });
                self.versions = allItems;
            } else {
                self.versions = items;
            }
            self.versionsWithoutAll = items;
            if (typeof self.versions[0] !== 'undefined') {
                self.filters.version = self.versions[0].version_id;
                document.getElementById('version_menu').select(self.filters.version);
            }
        }, function (errorObject) {
            console.log("The read failed: " + errorObject.code);
        });
    },
    updateDistributionBarValues: function updateDistributionBarValues() {
        //get Project report distribution
        var self = this;
        var closedIds = [2],
            assignedIds = [1,3,4,5,6,7,8];

        this.firebase.report.once("value", function(response) {
            self.distributionBarValues.closed = 0;
            self.distributionBarValues.assigned = 0;
            self.distributionBarValues.unassigned = 0;
            response.val().forEach(function(element, index, array){
                if(element.project_id === self.filters.project && (element.version_id === self.filters.version || self.filters.version === 'all')) {
                    if (closedIds.indexOf(element.status_id) > -1) {
                        self.distributionBarValues.closed++;
                    } else if (element.employee_id === 0) {
                        self.distributionBarValues.unassigned++;
                    } else if(assignedIds.indexOf(element.status_id) > -1) {
                        self.distributionBarValues.assigned++;
                    }
                }
            });
            console.log("here");
            console.log(self.distributionBarValues);
            self.$.distribution_bar_top.changeValues(
                self.distributionBarValues.closed,
                self.distributionBarValues.assigned,
                self.distributionBarValues.unassigned
            );
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
            if (index !== null && typeof self.grid.items[index] !== 'undefined') {
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
        var $reportEdit = $('#report_edit'),
            $reportEditContainer = $('#report_edit_container');

        $reportEdit.hide();
        $reportEditContainer.hide();
        $('#comment_add').hide();
    },
    showSingleReportEdit: function showSingleReportEdit(gridIndex) {
        var report_id = this.grid.items[gridIndex].report_id,
            $reportComments = $('#report_comments'),
            $reportEditContainer = $('#report_edit_container');
        this.hideModificationLayout();
        $reportComments.show();
        this.getReportComments(report_id);
        this.selectedReportMeta = this.grid.items[gridIndex].meta;
        $('#report_edit_name').show();
        $('#report_edit_amount').hide();
        $('#report_edit').show();
        $('#comment_button').removeAttr('disabled');
        $reportEditContainer.show();
    },
    showMultiReportEdit: function showMultiReportEdit() {
        this.hideModificationLayout();
        var $vaadinGrid = $('vaadin-grid'),
            $reportEditContainer = $('#report_edit_container');
        $('#report_edit_name').hide();
        $('#report_edit_amount').show();
        $('#report_comments').hide();
        $('#report_edit').show();
        $('#comment_button').attr('disabled', 'true');
        $reportEditContainer.show();
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
    getReportEditValues: function getReportEditValues() {
        var self = this,
            result = {};
        result.fields = {};
        result.validated = true;
        for (var k in self.reportEditValues) {
            if (self.reportEditValues.hasOwnProperty(k)) {
                result.fields[k] = parseInt(document.getElementById('report_select_'+k).selected);
                if (!result.fields[k] && k !== 'employee_id') { //allow no assignee for employee
                    result.validated = false;
                }
            }
        }
        return result;
    },
    getReportComments: function getReportComments(report_id) {
        var self = this;
        var employee;
        this.firebase.comment.once("value", function(response) {
            var items = [];
            for (var k in response.val()) {
                var element = response.val()[k];
                if(element.report_id === report_id) {
                    employee = self.getEmployeeWithId(element.employee_id);
                    element.timestamp = self.parseDuration(element.timestamp);
                    element.employee = employee.firstname + ' ' + employee.lastname;
                    element.attachment_ids = self.getCommentAttachmentIds(element.comment_id);
                    self.getCommentAttachments(element.comment_id);
                    items.push(element);
                }
            }
            items.reverse();
            self.reportComments = items;
            self.htmlEncodeReportComments();
        }, function (errorObject) {
            console.log("The read failed: " + errorObject.code);
        });
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
        } else if (duration.asHours() >= 1) {
            return parseInt(duration.asHours()) + ' hours ago';
        } else if (duration.asMinutes() >= 1) {
            return parseInt(duration.asMinutes()) + ' minutes ago';
        } else {
            return parseInt(duration.asSeconds()) + ' seconds ago';
        }
    },
    setSessionStorageValues: function setSessionStorageValues() {
        sessionStorage.setItem('project', this.filters.project);
        sessionStorage.setItem('version', this.filters.version);
        sessionStorage.setItem('assignee', this.filters.assignee);
        sessionStorage.setItem('status', this.filters.status);
        sessionStorage.setItem('checkedCustomFilters', JSON.stringify(this.filters.checkedCustomFilters));
        sessionStorage.setItem('searchFilter', this.filters.searchFilter);
    },
    updateReports: function updateReports() {
        var self = this;
        var values = this.getReportEditValues(),
            firebaseUpdate = {};
        if (values.validated) {
            this.grid.selection.selected(function(index) {
                if (index !== null) {
                    var gridRow = self.grid.items[index];
                    var firebaseIndex = gridRow.report_id - 1; //Stupid hack
                    firebaseUpdate[firebaseIndex] = {
                        createtime: gridRow.createtime,
                        employee_id: values.fields.employee_id,
                        meta: gridRow.meta,
                        modifytime: moment().format('YYYY-MM-DD HH:mm:ss'),
                        priority: values.fields.priority,
                        project_id: gridRow.project_id,
                        report_id: gridRow.report_id,
                        status_id: values.fields.status_id,
                        type_id: values.fields.type_id,
                        version_id: values.fields.version_id
                    };
                }
            });
            this.firebase.report.update(firebaseUpdate);
            this.firebaseReportData = [];
            self.updateReportGrid();
            self.updateDistributionBarValues();
            this.grid.selection.clear();
        } else {
            this.$.validation_error.show();
        }
    },
    discardReportsEdit: function discardReportsEdit() {
        this.grid.selection.clear();
    },
    setEditResizeable: function setEditResizeable() {
        var $reportEditContainer = $('#report_edit_container');
        var editToolBarHeight = 138; //TODO maybe change from hard coded
        $reportEditContainer.resizable({
            handles: {
                'n': '#handle'
            },
            maxHeight: $( window ).height()
        });

        $reportEditContainer.css('height', (editToolBarHeight)+'px');
        $reportEditContainer.css('top', ($( window ).height() - editToolBarHeight)+'px');
        this.editPanelResized = false;
        $('#handle').removeClass('visible-hidden');

    },
    editResizeableHeight: function editResizeableHeight() {
        var $reportEditContainer = $('#report_edit_container');
        var editToolBarHeight = 138; //TODO maybe change from hard coded
        $reportEditContainer.resizable( "option", "maxHeight", $( window ).height() );
        $reportEditContainer.css('height', (editToolBarHeight)+'px');
        $reportEditContainer.css('top', ($( window ).height() - editToolBarHeight)+'px');
        this.editPanelResized = false;
    },
    setReportCommentHeight: function setReportCommentHeight() {
        var $reportEdit = $('#report_edit'),
            $reportComments = $('#report_comments'),
            $reportEditContainer = $('#report_edit_container'),
            $reportEditName = $('#report_edit_name'),
            $reportEditFields = $('#report_edit_fields');
        if ($reportEdit.is(':visible') && $reportComments.is(':visible')) {
            $reportComments.height($reportEditContainer.height() - $reportEditName.height() - $reportEditFields.height() - 10);
        }
    },
    showCommentAdd: function showCommentAdd() {
        tinymce.init({
            selector:'textarea',
            height: 150,
            plugins: [
                'advlist autolink lists link image charmap print preview anchor',
                'searchreplace visualblocks code fullscreen',
                'insertdatetime media table contextmenu paste code'
            ],
            menubar: false,
            statusbar: false,
            toolbar: 'undo redo | bold italic | alignleft aligncenter alignright alignjustify | bullist numlist outdent indent'
        });
        $('#comment_add').show();
        if (!this.editPanelResized) { //resize for comment to show
            this.resizeEditForCommentAdd();
        }
    },
    resizeEditForCommentAdd: function resizeEditForCommentAdd() {
        var $reportEditContainer = $('#report_edit_container');
        var heightToAdd = $('#comment_add').height();
        var oldTopPosition = $(window).height() - $reportEditContainer.height();
        if (heightToAdd > oldTopPosition) {
            heightToAdd = oldTopPosition;
        }
        var newTopPosition = oldTopPosition - heightToAdd;

        $reportEditContainer.css('height', ($reportEditContainer.height()+heightToAdd)+'px');
        $reportEditContainer.css('top', (newTopPosition)+'px');
        this.editPanelResized = true;
    },
    addComment: function addComment() {
        var self = this,
            comment = tinyMCE.activeEditor.getContent(),
            comment_id = this.maxcomment_id+1,
            employee_id = this.employee_id,
            timestamp = moment().format('YYYY-MM-DD HH:mm:ss'),
            report_id,
            files = document.querySelector('file-upload').getFiles();

        this.grid.selection.selected(function(index) {
            report_id = self.grid.items[index].report_id;
        });
        if ($.trim(comment) !== '') {
            this.firebase.comment.push(
                {
                    comment_id: comment_id,
                    employee_id: employee_id,
                    report_id: report_id,
                    text: comment,
                    timestamp: timestamp
                }
            );
            files.forEach(function(element){
                var reader = new FileReader();
                reader.onload = (function(theFile) {
                    return function(e) {
                        var filePayload = e.target.result;
                        var attachment_id = self.maxattachment_id+1;
                        self.firebase.comment_attachment.push(
                            {
                                comment_id: comment_id,
                                attachment_id: attachment_id
                            }
                        );
                        self.firebase.attachment.push(
                            {
                                attachment_id: attachment_id,
                                attachment: filePayload,
                                name: theFile.name
                            }
                        );
                    };
                })(element);
                reader.readAsDataURL(element);
            });
            if(files.length) {
                setTimeout(function(){
                    self.getReportComments(report_id);
                }, 500);
            } else {
                self.getReportComments(report_id);
            }

            $('#comment_add').hide();
            tinyMCE.activeEditor.setContent('');
        } else {
            this.$.comment_validation_error.show();
        }
    },
    getMaxCommentId: function getMaxCommentId() {
        var self = this;
        this.firebase.comment.on("value", function(response) {
            for (var k in response.val()) {
                if (response.val()[k].comment_id > self.maxcomment_id) {
                    self.maxcomment_id = response.val()[k].comment_id;
                }
            }
        }, function (errorObject) {
            console.log("The read failed: " + errorObject.code);
        });
    },
    getMaxAttachmentId: function getMaxAttachmentId() {
        var self = this;
        this.firebase.comment_attachment.on("value", function(response) {
            self.commment_attachment = [];
            for (var k in response.val()) {
                self.commment_attachment.push(response.val()[k]);
                if (response.val()[k].attachment_id > self.maxattachment_id) {
                    self.maxattachment_id = response.val()[k].attachment_id;
                }
            }
        }, function (errorObject) {
            console.log("The read failed: " + errorObject.code);
        });
    },
    commentCancel: function commentCancel() {
        $('#comment_add').hide();
        tinyMCE.activeEditor.setContent('');
    },
    htmlEncodeReportComments: function htmlEncodeReportComments() {
        var self = this;
        setTimeout(function(){
            $('.report_comment').each(function(){
                var comment_id = parseInt($(this).parent().find('.report_comment_input').val());
                var report = self.getCommentWithId(comment_id);
                $(this).html(report.text);
            });
        }, 1);
    },
    getCommentAttachmentIds: function getCommentAttachmentIds(comment_id) {
        var self = this;
        var attachment_ids = [];
        self.commment_attachment.forEach(function(element){
            if (element.comment_id === comment_id) {
                attachment_ids.push(element.attachment_id);
            }
        });
        return attachment_ids;
    },
    getCommentAttachments: function getCommentAttachments(comment_id) {
        var self = this;
        var attachment_ids = this.getCommentAttachmentIds(comment_id);
        setTimeout(function(){
            var $parentElement = $('#comment_attachment_'+comment_id);
            $parentElement.empty();
            $parentElement.html('<paper-spinner alt="Loading attachments" active style="left: 50%"></paper-spinner>');
            self.firebase.attachment.once("value", function(response) {
                $parentElement.empty();
                for (var k in response.val()) {
                    if (attachment_ids.indexOf(response.val()[k].attachment_id) > -1) {
                        $parentElement.append(
                            '<paper-button raised><a href="'+response.val()[k].attachment+'" target="_blank">'+response.val()[k].name+'</a></paper-button>'
                        );
                    }
                }
            }, function (errorObject) {
                console.log("The read failed: " + errorObject.code);
            });
        }, 1);

    },
    showPlaceholderNotification: function showPlaceholderNotification() {
        this.$.placeholder_notification.show();
    }
});