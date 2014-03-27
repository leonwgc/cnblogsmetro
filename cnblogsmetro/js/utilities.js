/// <reference path="//Microsoft.WinJS.1.0/js/base.js" />

( function ()
{
    "use strict";

    var trimRegex = /^\s+|\s+$/g;

    WinJS.Namespace.define( "App",
        {
            Utilities:
                {
                    // make http form data
                    getFormData: function ( json )
                    {
                        var r = [];

                        for ( var i in json )
                        {
                            r.push( i + '=' + encodeURIComponent( json[i] ) );
                        }

                        return r.join( '&' );
                    },
                    trim: function ( str )
                    {
                        if ( typeof str === 'string' )
                        {
                            return str.replace( trimRegex, '' );
                        }

                        return str;
                    },
                    clone: function ( obj )
                    {
                        if ( obj )
                        {
                            var cloned = {};

                            for ( var i in obj )
                            {
                                cloned[i] = obj[i];
                            }

                            return cloned;
                        }
                    }
                    ,
                    errorHandler: function ( e )
                    {
                        //  generic error handler 

                        // hide processing 
                        if ( App.hideProcessing )
                        {
                            App.hideProcessing();
                        }

                        return true;
                    },
                    placeholderFunction: function ()
                    {
                        // nothing to do
                    },
                    nop: function ()
                    {
                        // nothing to do 
                    },
                    formatString: function ()
                    {
                        var length = arguments.length;

                        if ( length < 2 )
                        {
                            return arguments[0];
                        }

                        var str = arguments[0];

                        if ( typeof str === 'string' )
                        {
                            var pattern;

                            for ( var i = 1; i < length; i++ )
                            {
                                pattern = new RegExp( '\\{' + ( i - 1 ) + '\\}', 'g' );
                                str = str.replace( pattern, arguments[i] );
                            }
                        }

                        return str;
                    }
                },
            Memebership:
                {
                    login: function ( name, pwd )
                    {
                        // this function result promise with argumet result 
                        var result = { success: false, error: '' };

                        var name = App.Utilities.trim( name ),
                            pwd = App.Utilities.trim( pwd );

                        if ( name && pwd )
                        {
                            return WinJS.xhr( { type: 'GET', url: 'http://passport.cnblogs.com/login.aspx' } ).then( function ( request )
                            {
                                var html = request.responseText;

                                if ( html )
                                {
                                    html = toStaticHTML( html );
                                    var div = document.createElement( 'div' );

                                    WinJS.Utilities.setInnerHTML( div, html );

                                    var data = {
                                        tbUserName: name,
                                        tbPassword: pwd,
                                        chkRemember: 'on', btnLogin: '登  录',
                                        txtReturnUrl: 'http://passport.cnblogs.com/login.aspx',
                                        __EVENTTARGET: div.querySelector( '#__EVENTTARGET' ).value,
                                        __EVENTARGUMENT: div.querySelector( '#__EVENTARGUMENT' ).value,
                                        __VIEWSTATE: div.querySelector( '#__VIEWSTATE' ).value,
                                        __EVENTVALIDATION: div.querySelector( '#__EVENTVALIDATION' ).value
                                    };

                                    // gc div 
                                    div = null;

                                    var dataStr = App.Utilities.getFormData( data );

                                    return dataStr;
                                }
                                else
                                {
                                    var er = App.Utilities.clone( result );
                                    er.error = "failed to get login page";

                                    return er;
                                }
                            }, App.Utilities.errorHandler ).then( function ( data )
                            {
                                return WinRT.HttpHelper.getCookie( data );
                            } ).then( function ( cookie )
                            {
                                if ( cookie )
                                {
                                    var r = App.Utilities.clone( result );
                                    r.success = true;
                                    r.cookie = cookie;
                                    return WinJS.Promise.wrap( r );
                                }
                                else
                                {
                                    var er = App.Utilities.clone( result );
                                    er.error = "failed to get cookie";
                                    return WinJS.Promise.wrap( er );
                                }

                            }, App.Utilities.errorHandler );
                        } // end if 
                        else
                        {
                            result.error = "name and password can't be empty.";
                            return WinJS.Promise.wrap( result );
                        }
                    },
                    getCookie: function ()
                    {
                        var localSettings = Windows.Storage.ApplicationData.current.localSettings;
                        return localSettings.values['cookie'];
                    },
                    saveUser: function ( userName,/* pwd*/cookie )
                    {
                        var localSettings = Windows.Storage.ApplicationData.current.localSettings;
                        localSettings.values['cookie'] = cookie;
                        localSettings.values['userName'] = userName;
                        localSettings.values['cookieDate'] = new Date();

                        //var vault = new Windows.Security.Credentials.PasswordVault();
                        //var credential = new Windows.Security.Credentials.PasswordCredential( "cnblogs-leonwang", userName, pwd );
                        //vault.add( credential );
                    },
                    //getUser: function ()
                    //{
                    //    var localSettings = Windows.Storage.ApplicationData.current.localSettings;
                    //    var userName = localSettings.values['userName'];

                    //    if ( userName )
                    //    {
                    //        var vault = new Windows.Security.Credentials.PasswordVault();
                    //        return vault.retrieve( "cnblogs-leonwang", userName );
                    //    }
                    //},
                    isCookieValid: function ()
                    {
                        var valid = false;

                        var localSettings = Windows.Storage.ApplicationData.current.localSettings;
                        var cookieCreatedDate = localSettings.values['cookieDate'];
                        var cookie = localSettings.values['cookie'];
                        var now = new Date();

                        if ( cookieCreatedDate && cookie )
                        {
                            var t = now - cookieCreatedDate;

                            var daySpan = t / ( 1000 * 60 * 60 * 24 );

                            if ( daySpan < 28 )
                            {
                                valid = true;
                            }
                        }

                        return valid;
                    },
                    logout: function ()
                    {
                        var localSettings = Windows.Storage.ApplicationData.current.localSettings;
                        //var userName = localSettings.values['userName'];

                        // clear vault 
                        //var vault = new Windows.Security.Credentials.PasswordVault();
                        //var credential = vault.retrieve( 'cnblogs-leonwang', userName );
                        //if ( credential )
                        //{
                        //    vault.remove( credential );
                        //}

                        // clear local setting 
                        localSettings.values.remove( 'cookie' );
                        localSettings.values.remove( 'userName' );
                        localSettings.values.remove( 'cookieDate' );
                    }
                }
        } );
} )();