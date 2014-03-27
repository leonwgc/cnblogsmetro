
( function ()
{
    "use strict";

    WinJS.Binding.optimizeBindingReferences = true;

    var app = WinJS.Application,
    activation = Windows.ApplicationModel.Activation,
    nav = WinJS.Navigation,
    notifications = Windows.UI.Notifications,

    splash,
    networkInfo,
    isInternetConnected = true;

    // global variable
    WinJS.Namespace.define( "App",
    {
        isInternetConnected: function ()
        {
            return isInternetConnected
        },
        removeExtendSplashScreen: hideExtendSplashScreen,
        showProcessing: showProcessing,
        hideProcessing: hideProcessing,
        showErrorMessage: showErrorMessage,
        showLoginPanel: showLoginPanel,
        showNavigationBar: showNavigationBar,
        hideNavigationBar: hideNavigationBar
    } );

    function showLoginPanel()
    {
        WinJS.UI.SettingsFlyout.showSettings( 'loginflyout', '/pages/loginflyout.html' );
    };

    function updateSplashScreenImagePosition()
    {
        if ( splash )
        {
            var extendedSplashScreenImage = document.querySelector( '#extendedSplashScreenImage' );

            extendedSplashScreenImage.style.top = splash.imageLocation.y + "px";
            extendedSplashScreenImage.style.left = splash.imageLocation.x + "px";
            extendedSplashScreenImage.style.height = splash.imageLocation.height + "px";
            extendedSplashScreenImage.style.width = splash.imageLocation.width + "px";
        }
    };

    //function showExtendSplashScreen()
    //{
    //    if ( splash )
    //    {
    //        updateSplashScreenImagePosition();
    //        WinJS.Utilities.removeClass( document.querySelector( '.extendedSplashScreen' ), 'hidden' );
    //    }
    //};

    function hideExtendSplashScreen()
    {
        WinJS.Utilities.addClass( document.querySelector( '.extendedSplashScreen' ), 'hidden' );
    };

    function onSplashScreenDismissed()
    {
        // remove the event for extend splash screen
        window.removeEventListener( "resize", updateSplashScreenImagePosition, false );
    };

    // check whether connected to internet
    // return true:connected , false :not connected
    function setInternetConnectivity()
    {
        var internetProfile;
        isInternetConnected = networkInfo && ( internetProfile = networkInfo.getInternetConnectionProfile() ) && internetProfile.getNetworkConnectivityLevel() === 3
    };

    // internet status change event
    function onNetworkStatusChanged()
    {
        setInternetConnectivity();
    };

    function showProcessing( showBodyProgress )
    {
        var selector = showBodyProgress ? '#topProgress,#bodyProgress' : '#topProgress',
            loadings = document.querySelectorAll( selector ),
            length = loadings.length;

        for ( var i = length - 1; i >= 0; i-- )
        {
            WinJS.Utilities.removeClass( loadings[i], 'hidden' );
        }
    };

    function hideProcessing()
    {
        var loadings = document.querySelectorAll( '#topProgress,#bodyProgress' ),
           length = loadings.length;

        for ( var i = length - 1; i >= 0; i-- )
        {
            WinJS.Utilities.addClass( loadings[i], 'hidden' );
        }
    };

    //function initTileNotification()
    //{
    //    // create a string with the tile template xml
    //    var tileXmlString = "<tile>"
    //                          + "<visual>"
    //                          + "<binding template='TileWideText02'>"
    //                          + "<text id='1'>hello wgc 111</text>"
    //                          + "</binding>"
    //                          + "<binding template='TileSquareText02'>"
    //                          + "<text id='1'>hello wgc 111</text>"
    //                          + "</binding>"
    //                          + "</visual>"
    //                          + "</tile>";

    //    var tileDOM = new Windows.Data.Xml.Dom.XmlDocument();

    //    try
    //    {
    //        tileDOM.loadXml( tileXmlString );

    //        var tile = new Windows.UI.Notifications.TileNotification( tileDOM );
    //        Windows.UI.Notifications.TileUpdateManager.createTileUpdaterForApplication().update( tile );
    //    }
    //    catch ( e )
    //    {
    //        // invalid xml chars . 
    //    }
    //};

    // show an error message and fade out in 3 sec
    function showErrorMessage( msg )
    {
        var errorDiv = document.querySelector( '#errorMessage' );
        errorDiv.innerText = msg;
        WinJS.Utilities.removeClass( errorDiv, 'hidden' );

        WinJS.Promise.timeout( 3 * 1000 ).done( function ()
        {
            WinJS.Utilities.addClass( errorDiv, 'hidden' );
        }
        );
    };

    function hideErrorMessage()
    {
        var errorDiv = document.querySelector( '#errorMessage' );
        errorDiv.innerText = msg;
        WinJS.Utilities.addClass( errorDiv, 'hidden' );
    };

    function showNavigationBar()
    {
        var appbar = document.querySelector( '#navigationBar' ).winControl;
        appbar.show();
    };

    function hideNavigationBar()
    {
        var appbar = document.querySelector( '#navigationBar' ).winControl;
        appbar.hide();
    };


    // disable anchor click event
    function disableAnchorHandler( e )
    {
        var target = e.target.nodeName.toLowerCase();

        if ( target === 'a' || target === 'img' )
        {
            e.preventDefault();
        }
        //else if ( target === 'img' )
        //{
        //    e.cancelBubble = true;
        //}
    };

    app.onactivated = function ( args )
    {
        if ( args.detail.kind === activation.ActivationKind.launch )
        {
            if ( args.detail.previousExecutionState !== activation.ApplicationExecutionState.terminated )
            {
                // TODO: This application has been newly launched. Initialize
                // your application here.
            } else
            {
                // TODO: This application has been reactivated from suspension.
                // Restore application state here.
            }

            // net work 
            networkInfo = Windows.Networking.Connectivity.NetworkInformation;
            networkInfo.addEventListener( 'networkstatuschanged', onNetworkStatusChanged, false );
            setInternetConnectivity();

            // splash screen
            splash = args.detail.splashScreen;
            // showExtendSplashScreen();
            updateSplashScreenImagePosition();
            splash.addEventListener( "dismissed", onSplashScreenDismissed, false );
            window.addEventListener( "resize", updateSplashScreenImagePosition, false );

            args.setPromise( WinJS.UI.processAll().then( function ()
            {
                // todo: tile data 
                //initTileNotification();

                var contentHost = document.getElementById( 'homeHost' );
                WinJS.UI.Pages.render( '/pages/home.html', contentHost );

                // prevent link in detail page
                document.querySelector( '#detailHost' ).addEventListener( 'click', disableAnchorHandler, false );
            }
            ) );

        }
    };

    app.oncheckpoint = function ( args )
    {

    };

    function gotoPrivacy()
    {
        Windows.System.Launcher.launchUriAsync( new Windows.Foundation.Uri( "http://www.cnblogs.com/leonwang/archive/2013/06/07/privacy.html" ) );
    };

    // charm setting 
    WinJS.Application.onsettings = function ( e )
    {
        var cmds = {};

        if ( App.Memebership.isCookieValid() === false )
        {
            cmds['loginflyout'] = { title: "登 录", href: "/pages/loginflyout.html" };
        }
        else
        {
            var logoutCommand = new Windows.UI.ApplicationSettings.SettingsCommand( 'logout', '退出登录', App.Memebership.logout );
            e.detail.e.request.applicationCommands.append( logoutCommand );
        }

        cmds['aboutflyout'] = { title: "关 于", href: "/pages/about.html" };

        e.detail.applicationcommands = cmds;

        WinJS.UI.SettingsFlyout.populateSettings( e );

        var privacyCommand = new Windows.UI.ApplicationSettings.SettingsCommand( 'privacy', '隐私声明', gotoPrivacy );
        e.detail.e.request.applicationCommands.append( privacyCommand );
    };

    app.start();
} )();
