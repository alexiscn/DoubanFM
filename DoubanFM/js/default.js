// For an introduction to the Blank template, see the following documentation:
// http://go.microsoft.com/fwlink/?LinkId=232509
(function () {
    "use strict";

    WinJS.Binding.optimizeBindingReferences = true;

    var app = WinJS.Application;
    var activation = Windows.ApplicationModel.Activation;
    var sessionState = WinJS.Application.sessionState;
    var ApplicationView = Windows.UI.ViewManagement.ApplicationView,
        ApplicationViewState = Windows.UI.ViewManagement.ApplicationViewState;

    app.onactivated = function (args) {
        if (args.detail.kind === activation.ActivationKind.launch) {
            if (args.detail.previousExecutionState !== activation.ApplicationExecutionState.terminated) {
                FM.init();
                // TODO: This application has been newly launched. Initialize
                // your application here.
            } else {
                // TODO: This application has been reactivated from suspension.
                // Restore application state here.                
            }
            args.setPromise(WinJS.UI.processAll());
            args.setPromise(WinJS.Resources.processAll());
        }
    };

    function initialize() {
        FM.attachEvent();
    };
    document.addEventListener('DOMContentLoaded', initialize, false);

    window.addEventListener('resize', function () {
        // Get view state
        var currentViewState = ApplicationView.value;

        if (currentViewState == ApplicationViewState.fullScreenLandscape) {
            // Full screen Landscape

        } else if (currentViewState == ApplicationViewState.fullScreenPortrait) {
            // Full screen Portrait

        } else if (currentViewState == ApplicationViewState.filled) {
            // Filled

        } else if (currentViewState == ApplicationViewState.snapped) {
            // Snapped
            updatePosition('#login');
        }
    }, false);

    function updatePosition(modalid, option) {
        if (!option) {
            option = {};
            option.top = 'auto';
        }
        $(modalid).css({
            'left': '50%',
            'top': parseInt(option.top) > -1 ? option.top + 'px' : 40 + '%',
            'margin-left': -($(modalid).outerWidth() / 2) + 'px',
            'margin-top': (parseInt(option.top) > -1 ? 0 : -($(modalid).outerHeight() / 2)) + 'px'
        });
    }

    Windows.UI.WebUI.WebUIApplication.addEventListener('resuming', function (e) {
        FM.resume(sessionState);
    });

    app.onloaded = function (args) {
        var manager = Windows.ApplicationModel.DataTransfer.DataTransferManager.getForCurrentView();
        manager.addEventListener('datarequested', shareHandler);
    };

    app.onunload = function (args) {
        var manager = Windows.ApplicationModel.DataTransfer.DataTransferManager.getForCurrentView();
        manager.removeEventListener('datarequested', shareHandler);
    };

    var shareHandler = function (e) {
        var request = e.request, song = FM.current(), title, text;
        //当前歌曲不为null
        if (song) {
            title = song.title;
            var cid = FM.getCurrentChannelId();
            var shareurl = 'http://douban.fm/?cid=' + cid + '&start=' + song.sid + 'g' + song.ssid + 'g' + cid;
            text = WinJS.Resources.getString('sharecontent').value.format(FM.currentChannel, song.artist, song.title, shareurl);
        }
        else {
            title = WinJS.Resources.getString('sharetitle').value;
            text = WinJS.Resources.getString('sharecontentdefault').value;
        }
        request.data.properties.title = title;
        request.data.properties.description = WinJS.Resources.getString('sharedesc').value;
        request.data.setText(text);
        if (song) {
            var deferral = request.getDeferral();
            var imgUrl = song.picture.replace('mpic', 'lpic');
            WinJS.xhr({ url: imgUrl, responseType: 'blob' }).done(function (res) {
                var input = res.response.msDetachStream();
                var stream = Windows.Storage.Streams.RandomAccessStreamReference.createFromStream(input);
                request.data.properties.thumbnail = stream;
                request.data.setBitmap(stream);
                deferral.complete();
                console.log('donwload image completed');
            }, function (error) {
                deferral.complete();
            });
        }

    }

    app.oncheckpoint = function (args) {
        // TODO: This application is about to be suspended. Save any state
        // that needs to persist across suspensions here. You might use the
        // WinJS.Application.sessionState object, which is automatically
        // saved and restored across suspension. If you need to complete an
        // asynchronous operation before your application is suspended, call
        // args.setPromise().
        FM.suspended(sessionState);
    };

    app.start();
})();
