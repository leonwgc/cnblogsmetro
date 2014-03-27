/// <reference path="//Microsoft.WinJS.1.0/js/base.js" />
( function ()
{
    "use strict";

    WinJS.Namespace.define( "Data",
    {
        DataProvider: WinJS.Class.mix( WinJS.Class.define
        (
            // Constructor
            function ( type, url, isPagedSource )
            {
                this.pageIndex = 1;
                this.pageSize = 30;
                this.type = type;
                this.url = url;
                this.isPagedSource = isPagedSource;
            },
            {
                bindableDataSource:
                {
                    get: function ()
                    {
                        return this._source;
                    }
                },
                bindDataSource: function ( dataWrapper )
                {
                    var virtualizedDataSource = new WinJS.Class.derive( WinJS.UI.VirtualizedDataSource,
                       function ( dataProvider )
                       {
                           this._baseDataSourceConstructor( new Data.DataSource( dataProvider, dataWrapper.data ) );
                       } );

                    this._source = new virtualizedDataSource( this );
                }
                ,
                initialize: function ()
                {
                    var that = this;

                    return this.loadMoreData().then( function ( dataWrapper )
                    {
                        that.bindDataSource( dataWrapper );
                    }
                    );
                },

                request: function ()
                {
                    var that = this,
                        url = this.url;

                    if ( this.isPagedSource === true )
                    {
                        // deal with format
                        url = App.Utilities.formatString( this.url, this.pageIndex, this.pageSize );
                    }
                    var action = that.type === 'blog' ? 'getBlogFeeds' : 'getNewsFeeds';

                    try
                    {
                        return WinRT.HttpHelper[action]( url ).then( function ( feeds )
                        {
                            if ( feeds )
                            {
                                that.pageIndex++;
                                var json = JSON.parse( feeds );

                                return json.data;
                            }
                            else
                            {
                                return [];
                            }
                        }, App.Utilities.errorHandler );
                    }
                    catch ( error )
                    {
                        App.Utilities.errorHandler( error );
                    }
                },
                loadMoreData: function ( requestIndex, lastItem )
                {
                    var that = this;

                    try
                    {
                        return this.request().then( function ( loadedData )
                        {
                            if ( loadedData )
                            {
                                var count = loadedData.length,
                                    items = [],
                                    dateFeed = ( new Date() ).getTime();

                                for ( var i = 0; i < count; i++ )
                                {
                                    items.push( { key: dateFeed++, data: loadedData[i] } );
                                }

                                return WinJS.Promise.wrap(
                                {
                                    data: items
                                } );
                            }
                            else
                            {
                                return WinJS.Promise.wrap( { data: [] } );
                            }
                        } );
                    }
                    catch ( error )
                    {
                        return WinJS.Promise.wrap( { data: [] } );
                    }

                }
            },
    {}
        ), WinJS.Utilities.eventMixin )
    } );
} )();