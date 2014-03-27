
( function ()
{
    "use strict";

    var dataUrls = {
        homeblog: 'http://wcf.open.cnblogs.com/blog/sitehome/paged/{0}/{1}',
        news: 'http://wcf.open.cnblogs.com/news/recent/paged/{0}/{1}',
        hours48blog: 'http://wcf.open.cnblogs.com/blog/48HoursTopViewPosts/100',
        days10blog: 'http://wcf.open.cnblogs.com/blog/TenDaysTopDiggPosts/100',
        hotnews: 'http://wcf.open.cnblogs.com/news/hot/100',
        recommendnews: 'http://wcf.open.cnblogs.com/news/recommend/paged/{0}/{1}'

    },
    categories = { homeblog: '首页博客', news: '新闻', hours48blog: '48小时阅读排行', days10blog: '10天内推荐排行', hotnews: '热门新闻', recommendnews: '推荐新闻' },
    currentCategory = 'homeblog';

    // navigate to specific category list page , if itemIndex sepcified , list start with the item, but not rebind.
    function navigate( categoryOrItemIndex )
    {
        var detailHost = document.getElementById( 'detailHost' ),
            homeHost = document.getElementById( 'homeHost' );

        // empty content
        WinJS.Utilities.empty( detailHost );

        WinJS.Utilities.addClass( detailHost, 'hidden' );
        WinJS.Utilities.removeClass( homeHost, 'hidden' );

        if ( typeof categoryOrItemIndex === 'string' )
        {
            // rebind list view 
            currentCategory = categoryOrItemIndex;
            document.querySelector( '#category' ).innerText = categories[currentCategory];
            bindListView();

            // hide app bar 
            App.hideNavigationBar();
        }
        else
        {
            // go back to list view 
            var listview = document.querySelector( '#listviewContainer' ).winControl;
            if ( listview )
            {
                listview.ensureVisible( categoryOrItemIndex );
            }
        }
    };

    function onListviewItemInvoked( e )
    {
        e.detail.itemPromise.done( function ( item )
        {
            var id = item.data.id,
                title = item.data.title,
                type = item.data.type,
                detailHost = document.getElementById( 'detailHost' ),
                homeHost = document.getElementById( 'homeHost' );

            WinJS.UI.Pages.render( '/pages/detail.html', detailHost,
                { title: title, itemIndex: item.index, type: type, id: id } ).then( function ()
                {
                    WinJS.Utilities.addClass( homeHost, 'hidden' );
                    WinJS.Utilities.removeClass( detailHost, 'hidden' );
                    WinJS.UI.Animation.enterPage( detailHost, null );
                } );
        }
        );
    };

    var isFirstTimeBindListView = true;

    // 0: image
    // 1: title
    // 2: summary
    // 3: postby
    // 4: publish date
    // 5 : comment
    //6 : views
    var itemFormat = "<div class='templateContainer'>" +
     "<div class='topsection'>" +
     "<img class='templateImg' />" +
     "<span class='ttitle'></span>" +
     "</div>" +
     "<p class='tsummary'></p>" +
     "<div class='tpost'>" +
     "<span class='author'></span>&nbsp;" +
     "<span class='publish'></span>&nbsp;&nbsp;" +
     "推荐 (<span class='digg'></span>)&nbsp;&nbsp;" +
     "评论 (<span class='comment'></span>)&nbsp;&nbsp;" +
     "阅读(<span class='read'></span>)" +
     "</div>" +
     "</div>";

    var div = document.createElement( 'div' );

    function shortString( str, length )
    {
        if ( typeof str === 'string' && str.length > length )
        {
            return str.substr( 0, length ) + '...';
        }

        return str;
    };

    function itemMultiStageRenderer( itemPromise )
    {
        div.innerHTML = itemFormat;
        var el = div.firstChild;

        return {
            element: el,
            renderComplete: itemPromise.then( function ( item )
            {
                el.querySelector( "span[class='ttitle']" ).innerText = shortString( item.data.title, 50 );
                el.querySelector( "p[class='tsummary']" ).innerText = item.data.summary;
                if ( item.data.author && item.data.author.name )
                {
                    el.querySelector( "span[class='author']" ).innerText = item.data.author.name;
                }
                else if ( item.data.sourceName )
                {
                    el.querySelector( "span[class='author']" ).innerText = item.data.sourceName;
                }
                el.querySelector( "span[class='publish']" ).innerText = item.data.published;
                el.querySelector( "span[class='digg']" ).innerText = item.data.diggs;
                el.querySelector( "span[class='comment']" ).innerText = item.data.comments;
                el.querySelector( "span[class='read']" ).innerText = item.data.views;

                // use item.ready to promise to delay more expensive work 
                return item.ready;
            }
            ).then( function ( item )
            {
                var img = el.querySelector( 'img' );
                return item.loadImage( item.data.image, img ).then( function ()
                {
                    return {
                        onscreen: item.isOnScreen(),
                        img: img
                    };
                } );
            }
            ).done( function ( result )
            {
                if ( !result.onscreen )
                {
                    result.img.style.opacity = 1;
                }
                else
                {
                    WinJS.UI.Animation.fadeIn( result.img );
                }
            }, App.Utilities.errorHandler )
        };
    };

    function processRandomaccessList( type, url, listviewContainer )
    {
        var action = type === 'blog' ? 'getBlogFeeds' : 'getNewsFeeds';

        return WinRT.HttpHelper[action]( url ).done( function ( feeds )
        {
            if ( feeds )
            {
                var json = JSON.parse( feeds ),
                    list = new WinJS.Binding.List( json.data );

                var listview = new WinJS.UI.ListView( listviewContainer, {
                    itemTemplate: itemMultiStageRenderer,
                    itemDataSource: list.dataSource,
                    loadingBehavior: 'randomaccess',
                    selectionMode: 'none',
                    tapBehavior: 'invokeOnly',
                    swipeBehavior: 'none',
                    layout: { type: WinJS.UI.GridLayout }
                } );

                listview.addEventListener( 'iteminvoked', onListviewItemInvoked, false );
            }

            App.hideProcessing();

        }, App.Utilities.errorHandler );
    };

    function processIncrementalList( type, url, isPagedSource, listviewContainer )
    {
        var dataProvider = new Data.DataProvider( type, url, isPagedSource );

        dataProvider.initialize().done( function ()
        {
            var listview = new WinJS.UI.ListView( listviewContainer, {
                itemTemplate: itemMultiStageRenderer,
                itemDataSource: dataProvider.bindableDataSource,
                loadingBehavior: 'incremental',
                automaticallyLoadPages: true,
                pagesToLoad: 3,
                pagesToLoadThreshold: 1,
                selectionMode: 'none',
                tapBehavior: 'invokeOnly',
                swipeBehavior: 'none',
                layout: { type: WinJS.UI.GridLayout }
            } );

            listview.addEventListener( 'iteminvoked', onListviewItemInvoked, false );

            App.hideProcessing();

        }, App.Utilities.errorHandler );
    };


    function bindListView()
    {
        if ( App.isInternetConnected() )
        {
            App.showProcessing( false );
            var type = currentCategory.indexOf( 'blog' ) > -1 ? 'blog' : 'news',
            url = dataUrls[currentCategory],
            isPagedSource = url.indexOf( '{0}' ) > -1;

            if ( isFirstTimeBindListView )
            {
                isFirstTimeBindListView = false;
                App.removeExtendSplashScreen();
            }

            var listviewContainer = document.querySelector( '#listviewContainer' );

            // remvoe event binding
            if ( listviewContainer.winControl )
            {
                listviewContainer.winControl.removeEventListener( 'iteminvoked', onListviewItemInvoked, false );
            }

            WinJS.Utilities.empty( listviewContainer );

            if ( isPagedSource )
            {
                processIncrementalList( type, url, isPagedSource, listviewContainer );
            }
            else
            {
                processRandomaccessList( type, url, listviewContainer );
            }

        }
        else
        {
            //  not connected 
            if ( isFirstTimeBindListView )
            {
                isFirstTimeBindListView = false;
                App.removeExtendSplashScreen();
            }

            App.showErrorMessage( '网络连接不可用，数据加载失败！' );
        }
    };

    var homePage = WinJS.UI.Pages.define( "/pages/home.html", {
        processed: bindListView,
        ready: function ( element, options )
        {
            element.querySelector( '.titleWrapper' ).addEventListener( 'click', App.showNavigationBar, false );

            document.querySelector( '#navigationBar' ).addEventListener( 'click', function ( e )
            {
                var category = e.target.getAttribute( 'data-category' );
                if ( category )
                {
                    navigate( category );
                }
            }, false );
        }
    } );

    WinJS.Namespace.define( "App", {
        navigate: navigate
    } );

} )();
