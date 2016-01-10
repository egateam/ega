'use strict';

var egaApp = angular.module("egaApp", ["ngResource", "ngAnimate", "mgcrea.ngStrap", "angularUtils.directives.dirPagination"]);

egaApp.factory("File", function ($resource, $http) {
    var resource = $resource("/api/files/:id", {id: "@_id"},
        {
            //'create':  {method: 'POST'},
            'index':   {method: 'GET', isArray: true},
            'show':    {method: 'GET', isArray: false},
            'update':  {method: 'PUT'},
            'destroy': {method: 'DELETE'}
        }
    );

    return resource;
});

egaApp.factory("Job", function ($resource, $http) {
    var resource = $resource("/api/jobs/:id", {id: "@_id"},
        {
            //'create':  {method: 'POST'},
            'index':   {method: 'GET', isArray: true},
            'show':    {method: 'GET', isArray: false},
            'update':  {method: 'PUT'},
            'destroy': {method: 'DELETE'}
        }
    );

    return resource;
});

egaApp.factory('socket', function ($rootScope) {
    var socket = io.connect();
    return {
        on:   function (eventName, callback) {
            socket.on(eventName, function () {
                var args = arguments;
                $rootScope.$apply(function () {
                    callback.apply(socket, args);
                });
            });
        },
        emit: function (eventName, data, callback) {
            socket.emit(eventName, data, function () {
                var args = arguments;
                $rootScope.$apply(function () {
                    if (callback) {
                        callback.apply(socket, args);
                    }
                });
            })
        }
    };
});

// http://gist.github.com/thomseddon/3511330
egaApp.filter('bytes', function () {
    return function (bytes, precision) {
        if (bytes === 0) {
            return '0 bytes'
        }
        if (isNaN(parseFloat(bytes)) || !isFinite(bytes)) return '-';
        if (typeof precision === 'undefined') precision = 1;

        var units  = ['bytes', 'kB', 'MB', 'GB', 'TB', 'PB'],
            number = Math.floor(Math.log(bytes) / Math.log(1024)),
            val    = (bytes / Math.pow(1024, Math.floor(number))).toFixed(precision);

        return (val.match(/\.0*$/) ? val.substr(0, val.indexOf('.')) : val) + ' ' + units[number];
    }
});

// Controller for the file list
egaApp.controller("FileListCtrl",
    function ($scope, $http, File) {
        $scope.files = File.index();

        $scope.types = ['.fa/.fa.gz', '.newick'];

        $scope.tooltip = {
            "upload": "Single file size limit: 30MB",
            "delete": "Delete this file.",
            "update": "Change file type."
        };

        // for pagination
        $scope.currentPage       = 1;
        $scope.pageSize          = 20;
        $scope.number            = ($scope.$index + 1) + ($scope.currentPage - 1) * $scope.pageSize;
        $scope.pageChangeHandler = function (num) {
            $scope.currentPage = num;
        };

        $scope.updateFile = function (file) {
            File.update(file).success(function () {
                $scope.files = File.index();
            });
        };

        $scope.deleteFile = function (id) {
            $http.delete("/api/files/" + id).success(function () {
                $scope.files = File.index();
            });
        };
    });

// Controller for the job list
egaApp.controller("JobListCtrl",
    function ($scope, $http, File, Job) {
        $scope.files = File.index();

        $scope.jobs = Job.index();

        $scope.tooltip = {
            "delete":         "Delete this job.",
            "alignName":      "This name should be unique in your account and at least 4 chars.",
            "targetSeq":      "Select the most reliable/accurate one.",
            "querySeq":       "As you wish, one or more.",
            "MAFFT":          "Recommended. Fast.",
            "ClustalW":       "Slow but more accurate.",
            "None":           "Not recommended. Only if you want a crude result.",
            "selfAlignment":  "Self alignment will finding paralogous parts inside one genome.",
            "skipRepeatMask": "All sequences you selected are masked.",
            "guideTree":      "In the absence of a guide tree, EGA will take a while to generate one."
        };

        $scope.deleteJob = function (index) {
            $http.delete("/api/jobs/" + $scope.jobs[index]._id).success(function () {
                $scope.jobs = Job.index();
            });
        };
    });

egaApp.controller("ProcessShCtrl",
    function ($scope, $http, $alert, $timeout, Job, socket) {
        // initiated by express (process.jade: line 4)
        $scope.job;

        $scope.tooltip = {
            "finish":    "Mark this job as \"Finished\".",
            "operation": "Refresh operations in this job.",
            "showdir":   "List results."
        };

        // finish this job
        // Mark the job as finished and all sh files will not be able to be executed.
        $scope.finishOperation = function () {
            $http.get('/api/processes/' + $scope.job._id + '/finish').success(function (data) {
                $scope.job = data;
            });
        };

        // refresh status manually
        $scope.refreshOperation = function () {
            $http.get('/api/processes/' + $scope.job._id + '/refresh').success(function (data) {
                $scope.job = data;
            });

        };

        // run bash operation
        $scope.shOperation = function (filename) {
            var running_sh = _.find($scope.job.sh_files, {status: 'running'});
            var this_step  = _.find($scope.job.sh_files, {name: filename});
            var myAlert;

            console.dir(filename);

            // other operation running
            if (running_sh) {
                myAlert = $alert({
                    title:     running_sh.name + " is running",
                    type:      'danger',
                    container: "#alerts-container",
                    duration:  5
                });
                myAlert.$promise.then(function () {
                    myAlert.show();
                });
            }
            // can't find operation
            else if (!this_step) {
                myAlert = $alert({
                    title:     filename + " isn't available",
                    type:      'danger',
                    container: "#alerts-container",
                    duration:  5
                });
                myAlert.$promise.then(function () {
                    myAlert.show();
                });
            }
            else {
                if (this_step.need) {
                    //console.log("need step %s", this_step.need);
                    var needed_step = _.find($scope.job.sh_files, {name: this_step.need});

                    // need other operation
                    if (needed_step && needed_step.status != 'finished') {
                        //console.log("Operation [%s] needs [%s] be done first.", this_step.name, needed_step.name);

                        myAlert = $alert({
                            title:     filename + " needs " + needed_step.name + " be done first",
                            type:      'danger',
                            container: "#alerts-container",
                            duration:  5
                        });
                        myAlert.$promise.then(function () {
                            myAlert.show();
                        });

                        return;
                    }
                }

                myAlert = $alert({
                    title:     filename + " starts",
                    type:      'info',
                    container: "#alerts-container",
                    duration:  5
                });
                myAlert.$promise.then(function () {
                    myAlert.show();
                });

                $http.get('/api/processes/' + $scope.job._id + '/' + filename).success(function (data) {
                    $scope.job = data;
                });
            }
        };

        // get status from socket.io
        $http.get('/api/user').success(function (user) {
            socket.on(user.username + '-done', function (data) {
                console.log("Got done messages [%s].", data.name);
                $scope.job = data;
            });
        });

        // get messages from socket.io
        $scope.consoleMessages = "Welcome!\n";
        $http.get('/api/user').success(function (user) {
            socket.on(user.username, function (data) {
                //console.log("Got running messages [%s].", data.data);
                $scope.consoleMessages += data.data;

                // http://stackoverflow.com/a/33019516
                $timeout(function () {
                    var scrollDiv       = document.getElementById("consoleLog");
                    scrollDiv.scrollTop = scrollDiv.scrollHeight;
                }, 0, false);
            });
        });

        $scope.myDir;
        var extensionsMap = {
            ".zip":   "fa-file-archive-o",
            ".gz":    "fa-file-archive-o",
            ".bz2":   "fa-file-archive-o",
            ".tar":   "fa-file-archive-o",
            ".tgz":   "fa-file-archive-o",
            ".js":    "fa-file-code-o",
            ".csv":   "fa-file-excel-o",
            ".xls":   "fa-file-excel-o",
            ".xlsx":  "fa-file-excel-o",
            ".png":   "fa-file-image-o",
            ".jpg":   "fa-file-image-o",
            ".jpeg":  "fa-file-image-o",
            ".gif":   "fa-file-image-o",
            ".pdf":   "fa-file-pdf-o",
            ".txt":   "fa-file-text-o",
            ".log":   "fa-file-text-o",
            ".fa":    "fa-file-text-o",
            ".fas":   "fa-file-text-o",
            ".fasta": "fa-file-text-o"
        };

        function getFileIcon(ext) {
            return ( ext && extensionsMap[ext.toLowerCase()]) || 'fa-file-o';
        }

        $scope.showDir = function (path) {
            $http.get('/api/dir/' + $scope.job._id, {
                params: {path: path ? path : ''}
            }).success(function (data) {
                _(data).forEach(function (item) {
                    if (item.isDirectory) {
                        item.icon = "fa-folder-o";
                    }
                    else {
                        item.icon = getFileIcon(item.ext);
                    }
                });
                $scope.myDir = data;
            });
        };
    });
