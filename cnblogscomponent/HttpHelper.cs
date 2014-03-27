using System;
using System.Net.Http;
using System.Net.Http.Headers;
using Windows.Foundation;
using System.Net;
using System.Text;
using System.IO;
using System.Threading.Tasks;
using System.Linq;
using System.Xml.Linq;
using Newtonsoft.Json;
using System.Xml;
using System.Collections.Generic;

namespace WinRT
{
    public sealed class HttpHelper
    {
        private static HttpClient client;

        static HttpHelper()
        {
            client = new HttpClient();
        }

        /// <summary>
        /// login and get cookie from cnblogs
        /// </summary>
        /// <param name="data"></param>
        /// <returns></returns>
        public static IAsyncOperation<string> GetCookie(string data)
        {
            HttpClientHandler handler = new HttpClientHandler();
            handler.AllowAutoRedirect = false;
            HttpClient client = new HttpClient(handler);

            HttpContent httpContent = new StringContent(data);
            httpContent.Headers.ContentType.MediaType = "application/x-www-form-urlencoded";

            var task = client.PostAsync("http://passport.cnblogs.com/login.aspx", httpContent);

            return task.ContinueWith<string>(t =>
             {
                 string headerString = t.Result.Headers.ToString();

                 string result = string.Empty;
                 if (!string.IsNullOrWhiteSpace(headerString) && headerString.IndexOf("Set-Cookie") > -1)
                 {
                     var i = headerString.IndexOf(".DottextCookie=") + ".DottextCookie=".Length;
                     result = headerString.Substring(i);
                     // cookie value
                     result = result.Split(';')[0];
                 }

                 return result;

             }).AsAsyncOperation();
        }

        // post 
        public static IAsyncOperation<string> Request(string url, string data)
        {
            HttpClientHandler handler = new HttpClientHandler();
            handler.AllowAutoRedirect = false;

            HttpClient client = new HttpClient(handler);

            HttpContent httpContent = new StringContent(data);
            httpContent.Headers.ContentType = new MediaTypeHeaderValue("application/x-www-form-urlencoded");

            var task = client.PostAsync(url, httpContent).ContinueWith(t =>
            {
                return t.Result.Content.ReadAsStringAsync();
            }).ContinueWith(t =>
                {
                    return t.Result.Result;
                });

            return task.AsAsyncOperation();
        }

        /// <summary>
        /// post with cookie
        /// </summary>
        /// <param name="url"></param>
        /// <param name="data"></param>
        /// <param name="cookieValue"></param>
        /// <returns></returns>
        public static IAsyncOperation<string> PostJson(string url, string data, string cookieValue)
        {
            HttpClientHandler handler = new HttpClientHandler();

            CookieContainer cc = new CookieContainer();
            Cookie cookie = new Cookie(".DottextCookie", cookieValue);
            cc.Add(new Uri(url), cookie);
            handler.CookieContainer = cc;

            HttpClient client = new HttpClient(handler);

            HttpContent httpContent = new StringContent(data, Encoding.UTF8, "application/json");
            httpContent.Headers.ContentType.MediaType = "application/json";

            var task = client.PostAsync(url, httpContent).ContinueWith(t =>
            {
                return t.Result.Content.ReadAsStringAsync();
            }).ContinueWith(t =>
            {
                return t.Result.Result;
            }
            );

            return task.AsAsyncOperation();
        }

        public static IAsyncOperation<string> GetBlogFeeds(string url)
        {
            if (string.IsNullOrWhiteSpace(url))
            {
                throw new ArgumentException("url");
            }

            return client.GetStringAsync(url).ContinueWith(t =>
                {
                    string json = string.Empty;

                    XElement xe = XElement.Parse(t.Result);
                    XNamespace ns = XNamespace.Get("http://www.w3.org/2005/Atom");
                    var entries = xe.Elements(ns + "entry");

                    if (entries != null && entries.Any())
                    {
                        var array = entries.Select(item =>
                             {
                                 return new
                                 {
                                     id = item.Element(ns + "id").Value,
                                     title = item.Element(ns + "title").Value,
                                     summary = item.Element(ns + "summary").Value,
                                     published = FormatDate(DateTime.Parse(item.Element(ns + "published").Value)),
                                     author = new
                                     {
                                         name = item.Element(ns + "author").Element(ns + "name").Value,
                                         uri = item.Element(ns + "author").Element(ns + "uri").Value,
                                         // for some feed,  this field may not exist
                                         avatar = getAvatar(item),
                                     },
                                     link = item.Element(ns + "link").Attribute("href").Value,
                                     // for some feed, this field may not exist
                                     blogapp = getBlogApp(item),
                                     diggs = item.Element(ns + "diggs").Value,
                                     views = item.Element(ns + "views").Value,
                                     comments = item.Element(ns + "comments").Value,
                                     // extend 
                                     image = getAvatar(item),
                                     type = "blog"
                                 };
                             });

                        json = JsonConvert.SerializeObject(new
                        {
                            data = array
                        });
                    }

                    return json;
                }).AsAsyncOperation();
        }

        public static IAsyncOperation<string> GetBlogContent(string url)
        {
            if (string.IsNullOrWhiteSpace(url))
            {
                throw new ArgumentException("url");
            }

            return client.GetStringAsync(url).ContinueWith(t =>
                {
                    XElement xe = XElement.Parse(t.Result);
                    return xe.Value;

                }).AsAsyncOperation();
        }

        public static IAsyncOperation<string> GetNewsContent(string url)
        {
            if (string.IsNullOrWhiteSpace(url))
            {
                throw new ArgumentException("url");
            }

            return client.GetStringAsync(url).ContinueWith(t =>
            {
                XElement xe = XElement.Parse(t.Result);
                return xe.Element("Content").Value;

            }).AsAsyncOperation();
        }

        /// <summary>
        /// get all comments of a blog or news
        /// </summary>
        /// <param name="type">blog or news</param>
        /// <param name="id">id of entry</param>
        /// <returns></returns>
        public static IAsyncOperation<string> GetComments(string type, string id)
        {
            return Task<string>.Run(() =>
                 {
                     // news and 
                     string format = "http://wcf.open.cnblogs.com/blog/post/{0}/comments/{1}/50";
                     if (type == "news")
                     {
                         format = "http://wcf.open.cnblogs.com/news/item/{0}/comments/{1}/50";
                     }

                     XNamespace ns = XNamespace.Get("http://www.w3.org/2005/Atom");
                     IEnumerable<XElement> allEntrys = Enumerable.Empty<XElement>();
                     int pageIndex = 1;

                     while (true)
                     {
                         using (var reader = XmlReader.Create(string.Format(format, id, pageIndex)))
                         {
                             var element = XElement.Load(reader);
                             var entrys = element.Elements(ns + "entry");

                             if (entrys.Any())
                             {
                                 allEntrys = allEntrys.Concat(entrys);
                                 pageIndex++;
                             }
                             else
                             {
                                 break;
                             }
                         }
                     }

                     var html = new StringBuilder();

                     if (allEntrys.Any())
                     {
                         foreach (var entry in allEntrys)
                         {
                             html.Append("<li>");
                             html.Append("<span class='name'>").Append(entry.Element(ns + "author").Element(ns + "name").Value).Append("</span>");
                             html.Append("<span class='date'>").Append(FormatDate(DateTime.Parse(entry.Element(ns + "published").Value))).Append("</span>");
                             html.Append("<p class='detail'>").Append(entry.Element(ns + "content").Value).Append("</p>");
                             html.AppendFormat(" <div class='bottom'><span class='myreply' data-cnblogsuser='{0}' data-cnblogscommentid='{1}'>回复</span></div>", entry.Element(ns + "author").Element(ns + "name").Value, entry.Element(ns + "id").Value);
                             html.Append("</li>");
                         }
                     }

                     return html.ToString();
                 }).AsAsyncOperation();
        }

        public static IAsyncOperation<string> GetNewsFeeds(string url)
        {
            if (string.IsNullOrWhiteSpace(url))
            {
                throw new ArgumentException("url");
            }

            return client.GetStringAsync(url).ContinueWith(t =>
            {
                string json = string.Empty;

                XElement xe = XElement.Parse(t.Result);
                XNamespace ns = XNamespace.Get("http://www.w3.org/2005/Atom");
                var entries = xe.Elements(ns + "entry");

                if (entries != null && entries.Any())
                {
                    var array = entries.Select(item =>
                    {
                        return new
                        {
                            id = item.Element(ns + "id").Value,
                            title = item.Element(ns + "title").Value,
                            summary = item.Element(ns + "summary").Value,
                            published = FormatDate(DateTime.Parse(item.Element(ns + "published").Value)),
                            link = item.Element(ns + "link").Attribute("href").Value,
                            diggs = item.Element(ns + "diggs").Value,
                            views = item.Element(ns + "views").Value,
                            comments = item.Element(ns + "comments").Value,
                            topic = item.Element(ns + "topic").Value,
                            topicIcon = item.Element(ns + "topicIcon").Value,
                            sourceName = item.Element(ns + "sourceName").Value,
                            // extend 
                            image = formatAvatar(item.Element(ns + "topicIcon").Value),
                            type = "news"
                        };
                    });

                    json = JsonConvert.SerializeObject(new
                    {
                        data = array
                    });
                }

                return json;
            }).AsAsyncOperation();
        }

        private static string FormatDate(DateTime dt)
        {
            DateTime now = DateTime.Now;
            TimeSpan ts = now.Subtract(dt);

            if (ts.TotalDays >= 365)
            {
                return string.Format("{0}年前", (int)ts.TotalDays / 365);
            }

            if (ts.TotalDays > 30)
            {
                return string.Format("{0}个月前", (int)ts.TotalDays / 30);
            }

            if (ts.TotalDays >= 1)
            {
                return string.Format("{0}天前", (int)ts.TotalDays);
            }

            if (ts.TotalHours >= 1)
            {
                return string.Format("{0}小时前", (int)ts.TotalHours);
            }

            if (ts.TotalMinutes >= 1)
            {
                return string.Format("{0}分钟前", (int)ts.TotalMinutes);
            }

            return string.Format("{0}秒前", (int)ts.TotalSeconds);
        }

        private static string formatAvatar(string avatar)
        {
            if (string.IsNullOrWhiteSpace(avatar))
            {
                return "images/cnblogs.png";
            }

            return avatar;
        }

        private static string getAvatar(XElement element)
        {
            string avatar = string.Empty;
            XNamespace ns = XNamespace.Get("http://www.w3.org/2005/Atom");
            var e = element.Element(ns + "author").Element(ns + "avatar");

            if (e != null)
            {
                avatar = e.Value;
            }

            return formatAvatar(avatar);
        }

        private static string getBlogApp(XElement element)
        {
            string blogapp = string.Empty;
            XNamespace ns = XNamespace.Get("http://www.w3.org/2005/Atom");
            var e = element.Element(ns + "blogapp");

            if (e != null)
            {
                blogapp = e.Value;
            }

            return blogapp;
        }
    }
}
