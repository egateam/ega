'use strict';

var egaAppModule = angular.module("egaApp", ["ngResource", "mgcrea.ngStrap"]);

egaAppModule.factory("File", function ($resource, $http) {
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

egaAppModule.factory("Job", function ($resource, $http) {
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

// Controller for the file list
egaAppModule.controller("FileListCtrl",
    function ($scope, $http, File) {
        $scope.files = File.index();

        $scope.tooltip = {
            "upload": "Single file size limit: 20MB",
            "delete": "Delete this file."
        };

        $scope.deleteFile = function (index) {
            $http.delete("/api/files/" + $scope.files[index]._id).success(function () {
                $scope.files = File.index();
            });
        };
    });

// Controller for the job list
egaAppModule.controller("JobListCtrl",
    function ($scope, $http, File, Job) {
        $scope.files = File.index();

        $scope.jobs = Job.index();

        $scope.tooltip = {
            "delete":      "Delete this job.",
            "alignName":   "This name should be unique in your account and at least 4 chars.",
            "targetSeq":   "Select the most reliable/accurate one.",
            "querySeq":    "As you wish.",
            "alignLength": "we recommend a value larger than 100 bp.",
            "MAFFT":       "Recommended. Fast.",
            "ClustalW":    "Slow but more accurate."
        };

        //$scope.opts = {
        //    alignName:         null,
        //    alignLength:       1000,
        //    reAlignmentMethod: "MAFFT"
        //};

        $scope.deleteJob = function (index) {
            $http.delete("/api/jobs/" + $scope.jobs[index]._id).success(function () {
                $scope.jobs = Job.index();
            });
        };
    });
