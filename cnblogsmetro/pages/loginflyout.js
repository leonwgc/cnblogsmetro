// For an introduction to the Page Control template, see the following documentation:
// http://go.microsoft.com/fwlink/?LinkId=232511
( function ()
{
    "use strict";

    var el;

    function loginHandler()
    {
        var empty = /^\s+|\s+$/g,
            userNameCtrl = el.querySelector( '#userName' ),
            pwdCtrl = el.querySelector( '#userPwd' ),
            userName = userNameCtrl.value.replace( empty, '' ),
            pwd = pwdCtrl.value.replace( empty, '' ),
            errorCtrl = el.querySelector( '#error' ),
            __EVENTTARGET = '',
            __EVENTARGUMENT = '',
            __VIEWSTATE = '',
            __EVENTVALIDATION = '',
            loginRing = el.querySelector( '#loginring' ),
            loginPanel = el.querySelector( '.win-settings-section' ),
            ok = el.querySelector( '#ok' );

        if ( userName === '' )
        {
            errorCtrl.innerText = '用户名不能为空.';
            return;
        }

        if ( pwd === '' )
        {
            errorCtrl.innerText = '密码不能为空.';
            return;
        }

        errorCtrl.innerText = '';

        if ( App.isInternetConnected() )
        {
            WinJS.Utilities.removeClass( loginRing, 'hidden' );

            App.Memebership.login( userName, pwd ).then( function ( e )
            {
                if ( e.success === true )
                {
                    errorCtrl.innerText = '';
                    ok.innerText = '登录成功!';

                    // hide login panel
                    WinJS.Utilities.addClass( loginPanel, 'hidden' );

                    // login success & save or update cookie
                    App.Memebership.saveUser( userName, /*pwd,*/ e.cookie );
                }
                else
                {
                    // name or pwd error 
                    errorCtrl.innerText = '用户名或密码错误!';
                }
            }
            ).done( function ()
            {
                WinJS.Utilities.addClass( loginRing, 'hidden' );
            }
            );
        }
        else
        {
            App.showErrorMessage( '网络连接不可用，无法完成此操作！' );
        }
    };

    WinJS.UI.Pages.define( "/pages/loginflyout.html", {
        ready: function ( element, options )
        {
            el = element;
            document.querySelector( '#loginbutton' ).addEventListener( 'click', loginHandler, false );
        },

        unload: function ()
        {
        },

        updateLayout: function ( element, viewState, lastViewState )
        {
        }
    } );
} )();
