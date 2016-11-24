/*jslint this, white*/
(function (root) {
  "use strict";
  var $ = root.jQuery;
  var unused = $.noop;

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

  var list_bucket = function (uri, prefix, continuation_token) {
    return $.ajax(uri.toString(), {
      cache: false,
      dataType: "xml",
      data: {
        "max-keys": 1000,
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
        }),
        common_prefixes: $root.children("CommonPrefixes").map(function (i, elem) {
          unused(i);
          var $elem = $(elem);
          return {
            prefix: $elem.children("Prefix").text()
          };
        })
      };
      if (result.is_truncated) {
        result.next_continuation_token = $root.children("NextContinuationToken").text();
      }
      return new $.Deferred().resolve(result).promise();
    });
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

  // sort_by: type, name, mtime, size
  // type: 1, 2
  // sort_order: asc, desc

  // sort: { by: [ "type", "name" ], order: "asc" }

  var compare = function (a, b) {
    if (a < b) {
      return -1;
    } else if (a == b) {
      return 0;
    } else {
      return 1;
    }
  }

  var comparator = function (key, order) {
    if (order == "asc") {
      return function (a, b) {
        return compare($(a).data(key), $(b).data(key));
      };
    } else {
      return function (a, b) {
        return compare($(b).data(key), $(a).data(key));
      };
    }
  };

  var sort_definitions = {
    name: [
      { compare: comparator("type", "asc"), icon: "glyphicon-sort-by-attributes" },
      { compare: comparator("type", "desc"), icon: "glyphicon-sort-by-attributes-alt" },
      { compare: comparator("name", "asc"), icon: "glyphicon-sort-by-alphabet" },
      { compare: comparator("name", "desc"), icon: "glyphicon-sort-by-alphabet-alt" }
    ],
    mtime: [
      { compare: comparator("mtime", "asc"), icon: "glyphicon-sort-by-attributes" },
      { compare: comparator("mtime", "desc"), icon: "glyphicon-sort-by-attributes-alt" }
    ],
    size: [
      { compare: comparator("type", "asc"), icon: "glyphicon-sort-by-attributes" },
      { compare: comparator("type", "desc"), icon: "glyphicon-sort-by-attributes-alt" }
    ]
  };

  var sort = function (sort_by) {
    var $th = $("table.dromozoa-s3-browser thead th.sort-by-" + sort_by);
    var $thead = $("table.dromozoa-s3-browser thead");
    var $tbody = $("table.dromozoa-s3-browser tbody");
    var definitions = sort_definitions[sort_by];
    var state = $th.data("sort_state");
    if (state === undefined) {
      state = 0;
    } else {
      state = (state + 1) % definitions.length;
    }
    var definition = definitions[state];

    $thead.find(".glyphicon").attr("class", "glyphicon");
    $th.find(".glyphicon").addClass(definition.icon);

    $th.data("sort_state", state);

    $tbody.append($tbody.children("tr").detach().sort(definition.compare));
  }

  var sorter = function (ev) {
    ev.preventDefault();
    sort($(this).closest("th").data("sort_by"));
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
    return $("<table>", { "class": "table table-striped table-condensed dromozoa-s3-browser" })
      .append($("<thead>")
        .append($("<tr>")
          .append($("<th>", { "class": "sort-by-name" })
            .append($("<a>", { href: "#sort-by-name", text: "Name", on: { click: sorter } }))
            .append($("<span>", { text: " " }))
            .append($("<span>", { "class": "glyphicon" }))
            .data({ sort_by: "name" })
          )
          .append($("<th>", { "class": "hidden-xs sort-by-mtime", css: { width: "12em" }})
            .append($("<a>", { href: "#sort-by-mtime", text: "Last Modified", on: { click: sorter } }))
            .append($("<span>", { text: " " }))
            .append($("<span>", { "class": "glyphicon" }))
            .data({ sort_by: "mtime" })
          )
          .append($("<th>", { "class": "sort-by-size", css: { width: "6em" }})
            .append($("<a>", { href: "#sort-by-size", text: "Size", on: { click: sorter }  }))
            .append($("<span>", { text: " " }))
            .append($("<span>", { "class": "glyphicon" }))
            .data({ sort_by: "size" })
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
      icon = "glyphicon-file";
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

  var list;
  list = function (continuation_token) {
    list_bucket(get_origin_uri(), get_prefix(), continuation_token).done(function (result) {
      $("table.dromozoa-s3-browser tbody")
        .append(result.contents.filter(function (i, item) {
          unused(i);
          return item.key !== result.prefix;
        }).map(function (i, item) {
          unused(i);
          return create_tr(item);
        }).toArray())
        .append(result.common_prefixes.map(function (i, item) {
          unused(i);
          return create_tr(item);
        }).toArray());
      if (result.is_truncated) {
        list(result.next_continuation_token);
      } else {
        sort("name");
      }
    });
  };

  if (!root.dromozoa) {
    root.dromozoa = {};
  }
  if (!root.dromozoa.s3) {
    root.dromozoa.s3 = {};
  }
  root.dromozoa.s3.browser = function () {
    list();
    return $("<div>")
      .append(create_breadcrumb())
      .append(create_table());
  };
}(this.self));
