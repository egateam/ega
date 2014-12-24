var fileAppModule = angular.module('fileApp', ['mgcrea.ngStrap']);

// Controller for the file list
fileAppModule.controller('FileListCtrl',
    function ($scope, $http, $location) {
        $http.get('/upload/files').success(function (files, status, headers, config) {
            $scope.files = files;
        });

        $scope.tooltip = {
            "delete": "Delete this file."
        };

        $scope.modal = {
            "title": "Title",
            "content": "Hello Modal<br/>This is a multiline message!"
        };

        $scope.deleteFile = function (index) {
            $http.post('/upload/files/' + $scope.files[index]._id).success(function () {
                $http.get('/upload/files').success(function (files, status, headers, config) {
                    $scope.files = files;
                });
            });
        };
    });
