/// <reference path="//Microsoft.WinJS.1.0/js/base.js" />
/// <reference path="//Microsoft.WinJS.1.0/js/ui.js" />
( function ()
{
    "use strict";

    WinJS.Namespace.define( "Data",
    {
        DataSource: WinJS.Class.define
        (
            // constructor
            function ( dataProvider, initialData )
            {
                this._dataProvider = dataProvider;
                this._data = ( initialData && initialData instanceof Array ) ? initialData : [];
            },

            // instance members
            {
                dataProvider:
                {
                    get: function ()
                    {
                        return this._dataProvider;
                    }
                },

                data:
                {
                    get: function ()
                    {
                        return this._data;
                    },
                    set: function ( value )
                    {
                        this._data = value;
                    }
                },

                // WinJS.UI.VirtualizedDataSource members
                getCount: function ()
                {
                    var that = this;
                    return new WinJS.Promise( function ( oncomplete )
                    {
                        // return a random count of 100, the count returned should be higher
                        // then the items visible on the page (otherwise the list won't scroll)
                        //oncomplete( 100 );
                        oncomplete( that.data.length );
                    } );
                },

                itemsFromIndex: function ( requestIndex, countBefore, countAfter )
                {
                    var length = this.data.length;

                    // calculate requested start & end index, the first time items are loaded
                    // it will pass this twice, first to calculate the first item and second to calculate
                    // the items to show on screen. After the initial 2 pass, it will start loading items when scrolling
                    var start = Math.max( requestIndex - countBefore, 0 );
                    var end = Math.min( requestIndex + countAfter, length - 1 );

                    // were at the end, load more data if available and add that to our internal collection
                    if ( end + 1 == length )
                    {
                        // show progress
                        App.showProcessing();

                        var that = this;

                        that._loadingData = true;
                        try
                        {
                            return this.dataProvider.loadMoreData( length, this.data[end] ).then( function ( dataWrapper )
                            {
                                var count = dataWrapper.data.length;
                                for ( var i = 0; i < count; i++ )
                                    that.data.push( dataWrapper.data[i] );

                                var length = that.data.length;

                                var start = Math.max( requestIndex - countBefore, 0 );
                                that._loadingData = false;

                                // hide progress 
                                App.hideProcessing();

                                return WinJS.Promise.wrap
                                ( {
                                    items: that.data.slice( start, length ),
                                    offset: requestIndex - start,
                                    totalCount: length
                                } );
                            }, App.Utilities.errorHandler );
                        }
                        catch ( error )
                        {
                            App.Utilities.errorHandler( error );
                        }
                    }
                        // no data requested, just return stuff from our internal collection
                    else
                    {
                        return WinJS.Promise.wrap
                        ( {
                            items: this.data.slice( start, end + 1 ),
                            offset: requestIndex - start,
                            totalCount: length
                        } );
                    }
                },

                setNotificationHandler: function ( notificationHandler )
                {
                    this._notificationHandler = notificationHandler;
                },
            },

            // static members
            {}
        )
    } );
} )();