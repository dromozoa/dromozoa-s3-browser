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
        if (value < 1024) {
          if (value >= 100 || root.Math.abs(value - root.Math.round(value)) < 0.05) {
            result = value.toFixed(0) + units[i];
          } else {
            result = value.toFixed(1) + units[i];
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
    var this_segs = path_to_segments(key_to_path(this_prefix));
    var page_segs = path_to_segments(key_to_path(page_prefix));

    var $ul = $("<ul>", { "class": "breadcrumb" });

    $.each(this_segs, function (i, seg) {
      if (i < page_segs.length - 1) {
        $ul.append($("<li>", { text: seg.name }));
      } else if (i === page_segs.length - 1) {
        $ul.append($("<li>")
          .append($("<a>", {
            href: root_uri.clone().path(page_uri.path(true)),
            text: seg.name
          }))
        );
      } else {
        $ul.append($("<li>")
          .append($("<a>", {
            href: root_uri.clone().path(page_uri.path(true)).query({ prefix: path_to_key(seg.path) }).toString(),
            text: seg.name
          }))
        );
      }
    });

    return $ul;
  };

  var create_table = function () {
    return $("<table>", { "class": "table table-striped table-condensed" })
      .append($("<thead>")
        .append($("<tr>")
          .append($("<th>")
            .append($("<a>", { text: "Name" }))
          )
          .append($("<th>", { "class": "hidden-xs", css: { width: "12em" }})
            .append($("<a>", { text: "Last Modified" }))
          )
          .append($("<th>", { css: { width: "6em" }})
            .append($("<a>", { text: "Size" }))
          )
        )
      )
      .append($("<tbody>"));
  };

  var create_tr = function (item) {
    var key = item.key || item.prefix;
    var uri = root_uri.clone().pathname(key_to_path(key));
    var segment = uri.segmentCoded();

    var glyph;
    var href;
    var name;

    if (key.endsWith("/")) {
      glyph = "glyphicon glyphicon-folder-close";
      href = page_uri.clone().search({ prefix: key }).toString();
      name = segment[segment.length - 2];
    } else {
      glyph = "glyphicon glyphicon-file";
      href = root_uri.clone().pathname(key).toString();
      name = segment[segment.length - 1];
    }

    return $("<tr>")
      .append($("<td>")
        .append($("<span>", { "class": glyph }))
        .append($("<span>", { text: " " }))
        .append($("<a>", { href: href, text: name }))
      )
      .append($("<td>", { "class": "hidden-xs", text: format_date(item.last_modified) }))
      .append($("<td>", { "class": "text-right", text: format_size(item.size) }));
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
      result.contents.filter(function (i, item) {
        unused(i);
        return item.key !== result.prefix;
      }).each(function (i, item) {
        unused(i);
        $("tbody").append(create_tr(item));
      });

      result.common_prefixes.each(function (i, item) {
        unused(i);
        $("tbody").append(create_tr(item));
      });

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
