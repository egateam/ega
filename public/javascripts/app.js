'use strict';

var egaApp = angular.module("egaApp", ["ngResource", "ngAnimate", "mgcrea.ngStrap"]);

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

        var units = ['bytes', 'kB', 'MB', 'GB', 'TB', 'PB'],
            number = Math.floor(Math.log(bytes) / Math.log(1024)),
            val = (bytes / Math.pow(1024, Math.floor(number))).toFixed(precision);

        return (val.match(/\.0*$/) ? val.substr(0, val.indexOf('.')) : val) + ' ' + units[number];
    }
});

// Controller for the file list
egaApp.controller("FileListCtrl",
    function ($scope, $http, File) {
        $scope.files = File.index();

        $scope.types = [".fasta", ".fasta.gz", ".newick"];

        $scope.tooltip = {
            "upload": "Single file size limit: 20MB",
            "delete": "Delete this file.",
            "update": "Edit the type of this file."
        };

        $scope.updateFile = function (index) {
            File.update($scope.files[index]);
            $scope.files = File.index();
        };

        $scope.deleteFile = function (index) {
            $http.delete("/api/files/" + $scope.files[index]._id).success(function () {
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
            "delete":      "Delete this job.",
            "alignName":   "This name should be unique in your account and at least 4 chars.",
            "targetSeq":   "Select the most reliable/accurate one.",
            "querySeq":    "As you wish, one or more.",
            "alignLength": "we recommend a value larger than 100 bp.",
            "MAFFT":       "Recommended. Fast.",
            "ClustalW":    "Slow but more accurate.",
            "guideTree":   "In the absence of a guide tree, EGA will take a while to generate one."
        };

        $scope.deleteJob = function (index) {
            $http.delete("/api/jobs/" + $scope.jobs[index]._id).success(function () {
                $scope.jobs = Job.index();
            });
        };
    });

egaApp.controller("ProcessArgCtrl",
    function ($scope) {
        $scope.job;
        $scope.tooltip = {
            "finish": "Mark this job as \"Finished\"."
        }
    });

egaApp.controller("ProcessShCtrl",
    function ($scope, $http, socket, Job) {
        $scope.job;

        $scope.tooltip = {
            "delete":      "Delete this job.",
            "alignName":   "This name should be unique in your account and at least 4 chars.",
            "targetSeq":   "Select the most reliable/accurate one.",
            "querySeq":    "As you wish, one or more.",
            "alignLength": "we recommend a value larger than 100 bp.",
            "MAFFT":       "Recommended. Fast.",
            "ClustalW":    "Slow but more accurate.",
            "guideTree":   "In the absence of a guide tree, EGA will take a while to generate one."
        };

        socket.on('done', function (data) {
            console.dir(data);
            $scope.job = Job.show($scope.job._id);
        });
    });
