var egaAppModule = angular.module("egaApp", ["mgcrea.ngStrap"]);

// Controller for the file list
egaAppModule.controller("FileListCtrl",
    function ($scope, $http) {
        $http.get("/upload/files").success(function (items) {
            $scope.files = items;
        });

        $scope.tooltip = {
            "upload": "Single file size limit: 20MB",
            "delete": "Delete this file."
        };

        $scope.deleteFile = function (index) {
            $http.post("/upload/files/delete/" + $scope.files[index]._id).success(function () {
                $http.get("/upload/files").success(function (files) {
                    $scope.files = files;
                });
            });
        };
    });

// Controller for the job list
egaAppModule.controller("JobListCtrl",
    function ($scope, $http, $alert) {
        $http.get("/upload/files").success(function (items) {
            $scope.files = items;
        });

        $http.get("/align/jobs").success(function (items) {
            $scope.jobs = items;
        });

        $scope.tooltip = {
            "delete":      "Delete this job.",
            "alignName":   "This name should be unique in your account and at least 4 chars.",
            "targetSeq":   "Select the most reliable/accurate one.",
            "querySeq":    "As you wish.",
            "alignLength": "we recommend a value larger than 100 bp.",
            "MAFFT":       "Recommended. Fast.",
            "ClustalW":    "Slow but more accurate."
        };

        $scope.opts = {
            alignName:         null,
            alignLength:       1000,
            reAlignmentMethod: "MAFFT"
        };

        $scope.deleteJob = function (index) {
            $http.post("/align/jobs/delete/" + $scope.jobs[index]._id)
                .success(function () {
                    $http.get("/align/jobs").success(function (items) {
                        $scope.jobs = items;
                    });
                });
        };
    });
