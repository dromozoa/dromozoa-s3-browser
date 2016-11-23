/*jslint this, white*/
(function (root) {
  "use strict";
  var $ = root.jQuery;
  var URI = root.URI;

  var unused = $.noop;

  var assert = function (result) {
    if (result) {
      return result;
    } else {
      if (root.bootbox) {
        root.bootbox.alert("assertion failed!");
      }
      throw new root.Error("assertion failed!");
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
    });
  };

  var list_bucket_result = function (doc) {
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
    return result;
  };

  var page_uri = new URI();
  var page_query = URI.parseQuery(page_uri.query());
  var page_key = path_to_key(page_uri.path(true));
  var page_prefix = path_to_key(page_uri.directory(true) + "/");

  var this_prefix;
  if (page_query.prefix) {
    this_prefix = page_query.prefix;
  } else {
    this_prefix = page_prefix;
  }

  var ignore_keys = {};
  ignore_keys[page_key] = true;
  ignore_keys[page_prefix] = true;
  ignore_keys[this_prefix] = true;

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
          .append($("<th>")
            .append($("<a>", { text: "Last Modified" }))
          )
          .append($("<th>")
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
      .append($("<td>", { text: item.last_modified }))
      .append($("<td>", { text: item.size }));
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
    list_bucket(root_uri, this_prefix, continuation_token).done(function (root) {
      var result = list_bucket_result(root);

      result.contents.filter(function (i, item) {
        unused(i);
        return !ignore_keys[item.key];
      }).each(function (i, item) {
        unused(i);
        $("tbody").append(create_tr(item));
      });

      result.common_prefixes.filter(function (i, item) {
        unused(i);
        return !ignore_keys[item.prefix];
      }).each(function (i, item) {
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
