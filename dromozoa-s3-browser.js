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

  var key_to_path = function (key) {
    assert(!key.startsWith("/"));
    return "/" + key;
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

  // sort_by: type:name, name, mtime, size
  // type: 1, 2
  // sort_order: asc, desc

  // sort: { by: [ "type", "name" ], order: "asc" }

  var sort_by = function () {
    return function (ev) {
      ev.preventDefault();
    };
  };

  var page_uri = new root.URI();
  var page_query = root.URI.parseQuery(page_uri.query());
  var page_prefix = path_to_key(page_uri.directory(true) + "/");

  var this_prefix;
  if (page_query.prefix) {
    this_prefix = page_query.prefix;
  } else {
    this_prefix = page_prefix;
  }

  var root_uri = page_uri.clone().path("/").search("");

  var create_breadcrumb = function () {
    assert(this_prefix.startsWith(page_prefix));
    var index = path_to_segments(key_to_path(page_prefix)).length - 1;
    return $("<ul>", { "class": "breadcrumb" }).append(
      $.map(path_to_segments(key_to_path(this_prefix)), function (segment, i) {
        if (i < index) {
          return $("<li>", { text: segment.name });
        } else if (i === index) {
          return $("<li>").append($("<a>", {
            href: root_uri.clone().path(page_uri.path(true)),
            text: segment.name
          }));
        } else {
          return $("<li>").append($("<a>", {
            href: root_uri.clone().path(page_uri.path(true)).query({ prefix: path_to_key(segment.path) }).toString(),
            text: segment.name
          }));
        }
      })
    );
  };

  var create_table = function () {
    return $("<table>", { "class": "table table-striped table-condensed" })
      .append($("<thead>")
        .append($("<tr>")
          .append($("<th>")
            .append($("<a>", { href: "#sort-by-name", text: "Name", on: { click: sort_by("name") } }))
            .append($("<span>", { text: " " }))
            .append($("<span>", { "class": "glyphicon" }))
          )
          .append($("<th>", { "class": "hidden-xs", css: { width: "12em" }})
            .append($("<a>", { href: "#sort-by-mtime", text: "Last Modified", on: { click: sort_by("mtime") } }))
            .append($("<span>", { text: " " }))
            .append($("<span>", { "class": "glyphicon" }))
          )
          .append($("<th>", { css: { width: "6em" }})
            .append($("<a>", { href: "#sort-by-size", text: "Size", on: { click: sort_by("size") }  }))
            .append($("<span>", { text: " " }))
            .append($("<span>", { "class": "glyphicon" }))
          )
        )
      )
      .append($("<tbody>"));
  };

  var create_tr = function (item) {
    var key = item.key || item.prefix;

    var glyph;
    var href;
    var name = basename(key_to_path(key));

    if (key.endsWith("/")) {
      glyph = "glyphicon glyphicon-folder-close";
      href = page_uri.clone().search({ prefix: key }).toString();
    } else {
      glyph = "glyphicon glyphicon-file";
      href = root_uri.clone().pathname(key).toString();
    }

    return $("<tr>")
      .append($("<td>")
        .append($("<span>", { "class": glyph }))
        .append($("<span>", { text: " " }))
        .append($("<a>", { href: href, text: name }))
      )
      .append($("<td>", { "class": "hidden-xs", text: format_date(item.last_modified) }))
      .append($("<td>", { "class": "text-right", text: format_size(item.size) }))
      .data(item);
  };

  var module;
  module = function () {
    var table = create_table();
    module.list();
    return $("<div>")
      .append(create_breadcrumb())
      .append(table);
  };

  module.list = function (continuation_token) {
    list_bucket(root_uri, this_prefix, continuation_token).done(function (result) {
      $("tbody").append(
        result.contents.filter(function (i, item) {
          unused(i);
          return item.key !== result.prefix;
        }).map(function (i, item) {
          unused(i);
          return create_tr(item);
        }).toArray()
      ).append(
        result.common_prefixes.map(function (i, item) {
          unused(i);
          return create_tr(item);
        }).toArray()
      );
      if (result.is_truncated) {
        module.list(result.next_continuation_token);
      }
    });
  };

  if (!root.dromozoa) {
    root.dromozoa = {};
  }
  if (!root.dromozoa.s3) {
    root.dromozoa.s3 = {};
  }
  root.dromozoa.s3.browser = module;
}(this.self));
