
( function ()
{
    "use strict";

    var commentLoaded = false;

    function postComment( type, id )
    {
        var commentCtrl = document.querySelector( '#commentText' ),
            commentfailCtrl = document.querySelector( '#commentfail' ),
            commentsuccessCtrl = document.querySelector( '#commentsuccess' ),
            commentText = App.Utilities.trim( commentCtrl.value ),
            flyout = document.querySelector( '#flyoutInfo' ).winControl,
            tip = document.querySelector( '#tip' );

        var parentCommentId = 0;
        if ( commentCtrl.hasAttribute( 'replyId' ) )
        {
            parentCommentId = parseInt( commentCtrl.getAttribute( 'replyId' ) );
        }

        if ( commentText.length >= 3 )
        {
            if ( App.Memebership.isCookieValid() )
            {
                var cookie = App.Memebership.getCookie();
                var url = 'http://www.cnblogs.com/mvc/PostComment/New.aspx';
                if ( type === 'news' )
                {
                    url = 'http://news.cnblogs.com/mvcajax/news/InsertComment';
                }

                var data;
                if ( type === 'blog' )
                {
                    data = { ParentCommentID: parentCommentId, postId: id, Body: commentText };
                }
                else
                {
                    data = { parentCommentId: parentCommentId, ContentID: id, Content: commentText, strComment: '', title: '' };
                }


                WinRT.HttpHelper.postJson( url, JSON.stringify( data ), cookie ).then( function ( e )
                {
                    if ( type === 'blog' )
                    {
                        e = e && JSON.parse( e );

                        if ( e && e["IsSuccess"] === true )
                        {
                            // post comment successfully
                            tip.innerText = "评论提交成功!";
                            commentCtrl.value = '';
                            var item = { comment: commentText, author: "我", time: '刚刚' };
                            postSuccessHandler( item );
                        }
                        else
                        {
                            tip.innerText = e.Message ? '博客园说 : ' + e.Message : '提交失败';
                        }

                        flyout.show( commentCtrl, 'top', 'left' );
                    }
                    else
                    {
                        // news comment
                        if ( e )
                        {
                            tip.innerText = "评论提交成功!";
                            commentCtrl.value = '';
                            var item = { comment: commentText, author: "我", time: '刚刚' };

                            postSuccessHandler( item );
                            flyout.show( commentCtrl, 'top', 'left' );
                        }
                    }
                }, App.Utilities.errorHandler ).done( function ()
                {
                    if ( commentCtrl.hasAttribute( 'replyId' ) )
                    {
                        commentCtrl.removeAttribute( 'replyId' );
                    }
                } )
            }
            else
            {
                // open login 
                tip.innerText = '抱歉,博客园要求登录才可以评论.';
                flyout.show( commentCtrl );
                App.showLoginPanel();
            }
        }
        else
        {
            tip.innerText = '评论内容不能少于3个字';
            flyout.show( commentCtrl, 'top', 'left' );
        }
    };

    function renderItem( item )
    {
        var html = [];

        html.push( '<li>' );
        html.push( "<span class='name'>" );
        html.push( item.author );
        html.push( "</span>" );

        html.push( "<span class='date'>" );
        html.push( item.time );
        html.push( "</span>" );

        html.push( "<p class='detail'>" );
        html.push( item.comment );
        html.push( "</p>" );
        html.push( '</li>' );

        return html.join( '' );
    };

    function postSuccessHandler( item )
    {
        var ul = document.querySelector( '.comment_div ul' );
        WinJS.Utilities.setInnerHTML( ul, ul.innerHTML + renderItem( item ) );
    };

    function showComments( type, id )
    {
        var commentDiv = document.querySelector( '.comment_div' ),
            button = document.querySelector( '.showcoment' );

        if ( WinJS.Utilities.hasClass( commentDiv, 'comment_expand' ) )
        {
            button.innerText = '查看评论';
            WinJS.Utilities.removeClass( commentDiv, 'comment_expand' );
        }
        else
        {
            button.innerText = '隐藏评论';
            WinJS.Utilities.addClass( commentDiv, 'comment_expand' );

            if ( commentLoaded === false )
            {
                App.showProcessing( false );

                WinRT.HttpHelper.getComments( type, id ).done( function ( html )
                {
                    commentLoaded = true;
                    var ul = document.querySelector( '.comment_div ul' );
                    WinJS.Utilities.setInnerHTML( ul, toStaticHTML( html ) );
                    App.hideProcessing();

                }, App.Utilities.errorHandler );
            }
        }
    };

    function replyHandler( e )
    {
        if ( e.target.hasAttribute( 'data-cnblogsuser' )
            && e.target.hasAttribute( 'data-cnblogscommentid' ) )
        {
            var post = document.querySelector( '#commentText' ),
                user = e.target.getAttribute( 'data-cnblogsuser' ),
                replyCommentId = e.target.getAttribute( 'data-cnblogscommentid' ),
                length,
                commentContent;

            // set comment control the reply comment id, post comment , check this attr, and after comment posted , remove this attr.
            post.setAttribute( 'replyId', replyCommentId );

            commentContent = '@' + user + '\r\n' + post.value;
            length = commentContent.length;

            // last char is not new line : ascii 10 
            if ( commentContent.charCodeAt( length - 1 ) !== 10 )
            {
                commentContent += '\r\n';
            }
            post.value = commentContent;

            post.focus();
            var cursorPosition = commentContent.length - 1;
            post.setSelectionRange( cursorPosition, cursorPosition );
        }
    };

    WinJS.UI.Pages.define( "/pages/detail.html", {
        ready: function ( element, options )
        {
            App.showProcessing( true );
            commentLoaded = false;

            var id = options['id'],
                 type = options["type"],
                 title = options["title"],
                 itemIndex = parseInt( options['itemIndex'] ),
                 action = type === 'blog' ? 'getBlogContent' : 'getNewsContent',
                 actionUrl = type === 'blog' ? 'http://wcf.open.cnblogs.com/blog/post/body/' + id : 'http://wcf.open.cnblogs.com/news/item/' + id;

            //set reply handler
            document.querySelector( '.comment_div ul' ).addEventListener( 'click', replyHandler, false );

            element.querySelector( '#buttonback' ).addEventListener( 'click', function ()
            {
                App.navigate( itemIndex );
            }, false );

            element.querySelector( ".pagetitle" ).innerText = title;

            // post comment 
            element.querySelector( '#postComment' ).addEventListener( 'click', function ()
            {
                postComment( type, id );
            }, false );

            // show comment
            element.querySelector( '.showcoment' ).addEventListener( 'click', function ()
            {
                showComments( type, id );
            }, false );

            // get blog or news content
            WinRT.HttpHelper[action]( actionUrl ).done( function ( content )
            {
                if ( content )
                {
                    WinJS.Utilities.setInnerHTML( element.querySelector( '#item-content' ), toStaticHTML( content ) );
                }

                App.hideProcessing();

            }, function ( error )
            {
                App.showErrorMessage( '数据请求错误' );
                App.Utilities.errorHandler( error );
            } );
        },

        unload: function ()
        {

        },

        updateLayout: function ( element, viewState, lastViewState )
        {
            // TODO: Respond to changes in viewState.
        }
    } );
} )();
