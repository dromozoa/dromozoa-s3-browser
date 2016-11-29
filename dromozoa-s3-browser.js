// Copyright (C) 2016 Tomoyuki Fujimori <moyu@dromozoa.com>
//
// This file is part of dromozoa-s3-browser.
//
// dromozoa-s3-browser is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.
//
// dromozoa-s3-browser is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU General Public License for more details.
//
// You should have received a copy of the GNU General Public License
// along with dromozoa-s3-browser.  If not, see <http://www.gnu.org/licenses/>.

/*jslint this, white*/
(function (root) {
  "use strict";
  var $ = root.jQuery;
  var unused = $.noop;
  var d3 = root.d3;

  var error = function (message) {
    if (root.bootbox) {
      root.bootbox.alert(message);
    }
    throw new root.Error(message);
  };

  var assert = function (result) {
    if (result) {
      return result;
    }
    error("assertion failed!");
  };

  var compare = function (a, b) {
    if (a < b) {
      return -1;
    } else if (a === b) {
      return 0;
    } else {
      return 1;
    }
  };

  var basename = function (path) {
    var result = /([^\/]+)\/*$/.exec(path);
    if (result) {
      return result[1];
    } else if (path === "//") {
      return "//";
    } else if (path.startsWith("/")) {
      return "/";
    } else {
      return ".";
    }
  };

  var dirname = function (path) {
    var result = /^(.*[^\/])\/+[^\/]+\/*/.exec(path);
    if (result) {
      return result[1];
    } else if (/^\/\/[^\/]/.exec(path) || path === "//") {
      return "//";
    } else if (path.startsWith("/")) {
      return "/";
    } else {
      return ".";
    }
  };

  var path_to_key = function (path) {
    assert(path.startsWith("/"));
    return path.substring(1);
  };

  var path_to_segments = function (path) {
    var result = [];
    while (path !== "/") {
      result.unshift({
        path: path,
        name: basename(path)
      });
      path = dirname(path);
      assert(path !== "//" && path !== ".");
      if (path === "/") {
        break;
      }
      path = path + "/";
    }
    return result;
  };

  var key_to_path = function (key) {
    assert(!key.startsWith("/"));
    return "/" + key;
  };

  var key_to_segments = function (key) {
    return path_to_segments(key_to_path(key));
  };

  var format_int = function (fill, width, value) {
    var result = value.toString();
    while (result.length < width) {
      result = fill + result;
    }
    return result;
  };

  var format_date = function (value) {
    if (value) {
      return format_int("0", 4, value.getFullYear())
        + "-" + format_int("0", 2, value.getMonth() + 1)
        + "-" + format_int("0", 2, value.getDate())
        + " " + format_int("0", 2, value.getHours())
        + ":" + format_int("0", 2, value.getMinutes())
        + ":" + format_int("0", 2, value.getSeconds());
    }
  };

  var format_size = function (value) {
    if (value) {
      var units = [ "", " KiB", " MiB", " GiB", " TiB", " PiB", " EiB", "ZiB", "YiB" ];
      var result = value.toFixed(0);
      $.each(units, function (i, unit) {
        unused(i);
        if (value < 1024) {
          if (value >= 100 || root.Math.abs(value - root.Math.round(value)) < 0.05) {
            result = value.toFixed(0) + unit;
          } else {
            result = value.toFixed(1) + unit;
          }
          return false;
        }
        value = value / 1024;
      });
      return result;
    }
  };

  var list_bucket_impl = function (uri, prefix, continuation_token) {
    return $.ajax(uri.toString(), {
      cache: false,
      dataType: "xml",
      data: {
        "max-keys": 2,
        delimiter: "/",
        prefix: prefix,
        "list-type": 2,
        "continuation-token": continuation_token
      }
    }).then(function (doc) {
      var $root = $(doc).children().first();
      var result = {
        name: $root.children("Name").text(),
        prefix: $root.children("Prefix").text(),
        key_count: root.parseInt($root.children("KeyCount").text()),
        max_keys: root.parseInt($root.children("MaxKeys").text()),
        delimiter: $root.children("Delimiter").text(),
        is_truncated: $root.children("IsTruncated").text() === "true",
        contents: $root.children("Contents").map(function (i, elem) {
          unused(i);
          var $elem = $(elem);
          return {
            key: $elem.children("Key").text(),
            last_modified: new root.Date(root.Date.parse($elem.children("LastModified").text())),
            etag: $elem.children("ETag").text(),
            size: root.parseInt($elem.children("Size").text()),
            storage_class: $elem.children("StorageClass").text()
          };
        }).toArray(),
        common_prefixes: $root.children("CommonPrefixes").map(function (i, elem) {
          unused(i);
          var $elem = $(elem);
          return {
            prefix: $elem.children("Prefix").text()
          };
        }).toArray()
      };
      if (result.is_truncated) {
        result.next_continuation_token = $root.children("NextContinuationToken").text();
      }
      return result;
    });
  };

  var list_bucket = function (uri, prefix) {
    var $deferred = new $.Deferred();
    var contents = [];
    var common_prefixes = [];

    var fail = function () {
      $deferred.reject();
    };

    var done;
    done = function (result) {
      root.Array.prototype.push.apply(contents, result.contents);
      root.Array.prototype.push.apply(common_prefixes, result.common_prefixes);
      if (result.is_truncated) {
        list_bucket_impl(uri, prefix, result.next_continuation_token).done(done).fail(fail);
      } else {
        $deferred.resolve({
          name: result.name,
          prefix: result.prefix,
          delimiter: result.delimiter,
          contents: contents,
          common_prefixes: common_prefixes
        });
      }
    };

    list_bucket_impl(uri, prefix).done(done).fail(fail);
    return $deferred.promise();
  };

  var get_uri = function () {
    return new root.URI().query("").hash("");
  };

  var get_origin_uri = function () {
    return get_uri().path("/");
  };

  var get_path_prefix = function () {
    return path_to_key(new root.URI().directory(true) + "/");
  };

  var get_prefix = function () {
    var query = root.URI.parseQuery(new root.URI().query());
    if (query.prefix) {
      return query.prefix;
    } else {
      return get_path_prefix();
    }
  };

  var get_mode = function () {
    var query = root.URI.parseQuery(new root.URI().query());
    if (query.mode) {
      return query.mode;
    } else {
      return "list";
    }
  };

  var create_navbar = function () {
    var $list_li = $("<li>");
    var $tree_li = $("<li>");
    if (get_mode() === "list") {
      $list_li.addClass("active");
    } else {
      $tree_li.addClass("active");
    }
    return $("<nav>", { "class": "navbar navbar-default navbar-fixed-top" })
      .append($("<div>", { "class": "container" })
        .append($("<div>", { "class": "navbar-header" })
          .append($("<button>", { type: "button", "class": "navbar-toggle collapsed", "data-toggle": "collapse", "data-target": "#dromozoa-s3-browser-navbar" })
            .append($("<span>", { "class": "sr-only" }))
            .append($("<span>", { "class": "icon-bar" }))
            .append($("<span>", { "class": "icon-bar" }))
            .append($("<span>", { "class": "icon-bar" }))
          )
        )
        .append($("<div>", { id: "dromozoa-s3-browser-navbar", "class": "navbar-collapse collapse" })
          .append($("<ul>", { "class": "nav navbar-nav" })
            .append($list_li
              .append($("<a>", { href: get_uri().toString(), text: "List" }))
            )
            .append($tree_li
              .append($("<a>", { href: get_uri().addQuery("mode", "tree").toString(), text: "Tree" }))
            )
          )
        )
      );
  };

  var module;
  module = function () {
    var impl = module[get_mode()];
    if (impl) {
      return impl();
    }
    error("invalid mode");
  };

  module.list = function () {
    var order_by = function (key, order) {
      if (order === "desc") {
        return function (a, b) {
          return compare($(b).data(key), $(a).data(key));
        };
      } else {
        return function (a, b) {
          return compare($(a).data(key), $(b).data(key));
        };
      }
    };

    var sort_definitions = {
      name: [
        { order: order_by("type", "asc"), icon: "glyphicon-sort-by-attributes" },
        { order: order_by("type", "desc"), icon: "glyphicon-sort-by-attributes-alt" },
        { order: order_by("name", "asc"), icon: "glyphicon-sort-by-alphabet" },
        { order: order_by("name", "desc"), icon: "glyphicon-sort-by-alphabet-alt" }
      ],
      mtime: [
        { order: order_by("mtime", "asc"), icon: "glyphicon-sort-by-attributes" },
        { order: order_by("mtime", "desc"), icon: "glyphicon-sort-by-attributes-alt" }
      ],
      size: [
        { order: order_by("size", "asc"), icon: "glyphicon-sort-by-attributes" },
        { order: order_by("size", "desc"), icon: "glyphicon-sort-by-attributes-alt" }
      ]
    };

    var sort = function (type) {
      var $thead = $(".dromozoa-s3-browser-list thead");
      var $tbody = $(".dromozoa-s3-browser-list tbody");
      var $th = $thead.find("th.sort-by-" + type);

      var defs = sort_definitions[type];
      var state = ($th.data("sort_state") + 1) % defs.length;
      var def = defs[state];

      $thead.find("th").data("sort_state", -1);
      $thead.find(".glyphicon").attr("class", "glyphicon");

      $th.data("sort_state", state);
      $th.find(".glyphicon").addClass(def.icon);

      $tbody.append($tbody.children("tr").detach().sort(def.order));
    };

    var sort_by = function (type) {
      return function (ev) {
        ev.preventDefault();
        sort(type);
      };
    };

    var create_breadcrumb = function () {
      var index = key_to_segments(get_path_prefix()).length - 1;
      return $("<ul>", { "class": "breadcrumb" })
        .append($.map(key_to_segments(get_prefix()), function (segment, i) {
          if (i < index) {
            return $("<li>", { text: segment.name });
          } else {
            var uri;
            if (i === index) {
              uri = get_uri();
            } else {
              uri = get_uri().addQuery("prefix", path_to_key(segment.path));
            }
            return $("<li>")
              .append($("<a>", { href: uri.toString(), text: segment.name }));
          }
        }));
    };

    var create_table = function () {
      return $("<table>", { "class": "table table-striped table-condensed" })
        .append($("<thead>")
          .append($("<tr>")
            .append($("<th>", { "class": "sort-by-name" })
              .append($("<a>", { href: "#sort-by-name", text: "Name", on: { click: sort_by("name") } }))
              .append($("<span>", { text: " " }))
              .append($("<span>", { "class": "glyphicon" }))
              .data("sort_state", -1)
            )
            .append($("<th>", { "class": "hidden-xs sort-by-mtime", css: { width: "12em" }})
              .append($("<a>", { href: "#sort-by-mtime", text: "Last Modified", on: { click: sort_by("mtime") } }))
              .append($("<span>", { text: " " }))
              .append($("<span>", { "class": "glyphicon" }))
              .data("sort_state", -1)
            )
            .append($("<th>", { "class": "sort-by-size", css: { width: "6em" }})
              .append($("<a>", { href: "#sort-by-size", text: "Size", on: { click: sort_by("size") }  }))
              .append($("<span>", { text: " " }))
              .append($("<span>", { "class": "glyphicon" }))
              .data("sort_state", -1)
            )
          )
        )
        .append($("<tbody>"));
    };

    var create_tr = function (item) {
      var key = item.key || item.prefix;
      var name = basename(key_to_path(key));
      var icon;
      var uri;
      var data = { name: name };
      if (key.endsWith("/")) {
        icon = "glyphicon-folder-close";
        uri = get_uri().addQuery("prefix", key);
        data.type = "0:" + name;
        data.mtime = -1;
        data.size = -1;
      } else {
        if (/\.(?:gif|jpeg|jpg|jpe|png)$/i.exec(key)) {
          icon = "glyphicon-picture";
        } else if (/\.(?:mp4|mp4v|mpg4)$/i.exec(key)) {
          icon = "glyphicon-film";
        } else {
          icon = "glyphicon-file";
        }
        uri = get_origin_uri().path(key_to_path(key));
        data.type = "1:" + name;
        data.mtime = item.last_modified.getTime();
        data.size = item.size;
      }
      return $("<tr>")
        .append($("<td>")
          .append($("<span>", { "class": "glyphicon " + icon }))
          .append($("<span>", { text: " " }))
          .append($("<a>", { href: uri.toString(), text: name }))
        )
        .append($("<td>", { "class": "hidden-xs", text: format_date(item.last_modified) }))
        .append($("<td>", { "class": "text-right", text: format_size(item.size) }))
        .data(data);
    };

    var load;
    load = function () {
      list_bucket(get_origin_uri(), get_prefix()).done(function (result) {
        $(".dromozoa-s3-browser-list tbody")
          .append($.map($.grep(result.contents, function (item) {
            return item.key !== result.prefix;
          }), function (item) {
            return create_tr(item);
          }))
          .append($.map(result.common_prefixes, function (item) {
            return create_tr(item);
          }));
        sort("name");
      }).fail(function () {
        error("could not load");
      });
    };

    load();
    return $("<div>", { "class": "dromozoa-s3-browser" })
      .append(create_navbar())
      .append($("<div>", { "class": "dromozoa-s3-browser-list" })
        .css({ "margin-top": "70px" })
        .append($("<div>", { "class": "container"})
          .append(create_breadcrumb())
          .append(create_table())
        )
      );
  };

  module.tree = function () {
    var layout = d3.tree();
    var dataset = {};

    var update = function () {
      unused(layout);
    };

    var load;
    load = function (prefix) {
      list_bucket(get_origin_uri(), prefix).done(function (result) {
        var data = [];
        root.Array.prototype.push.apply(data, result.contents);
        root.Array.prototype.push.apply(data, result.common_prefixes);
        data.sort(function (a, b) {
          return compare(a.key || a.prefix, b.key || b.prefx);
        });
        dataset[result.prefix] = data;
        update();
      }).fail(function () {
        error("could not load");
      });
    };

    var resize = function () {
      $(".dromozoa-s3-browser-tree").css({
        width: root.innerWidth + "px",
        height: (root.innerHeight - 50) + "px"
      });
    };

    $(root).on("resize", function () {
      resize();
    });

    $(function () {
      load(get_prefix());
    });

    return $("<div>", { "class": "dromozoa-s3-browser" })
      .append(create_navbar())
      .append($("<svg>", { "class": "dromozoa-s3-browser-tree" })
        .css({
          display: "block",
          "margin-top": "50px",
          width: root.innerWidth + "px",
          height: (root.innerHeight - 50) + "px"
        })
      );
  };

  if (!root.dromozoa) {
    root.dromozoa = {};
  }
  if (!root.dromozoa.s3) {
    root.dromozoa.s3 = {};
  }
  root.dromozoa.s3.browser = module;
}(this.self));
