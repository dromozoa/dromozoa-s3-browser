/*jslint this, white*/
(function (root) {
  "use strict";
  var Date = root.Date;
  var Error = root.Error;
  var $ = root.jQuery;
  var URI = root.URI;

  var unused = $.noop;

  var assert = function (result) {
    if (result) {
      return result;
    } else {
      throw new Error("assertion failed!");
    }
  };

  var path_to_key = function (path) {
    assert(/^\//.exec(path));
    return path.substring(1);
  };

  var key_to_path = function (key) {
    assert(!(/^\//).exec(key));
    return "/" + key;
  };

  var basename = function (path) {
    var result = /([^\/]+)\/*$/.exec(path);
    if (result) {
      return result[1];
    } else if (path === "//") {
      return "//";
    } else if (/^\//.exec(path)) {
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
    } else if (/^\//.exec(path)) {
      return "/";
    } else {
      return ".";
    }
  };

  unused(basename, dirname);



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

  var create_item = function (key, last_modified, size) {
    if (ignore_keys[key]) {
      return;
    }
    return {
      key: key,
      uri: root_uri.clone().pathname(key_to_path(key)),
      last_modified: last_modified,
      size: size
    };
  };

  var create_item_from_content_node = function ($node) {
    return create_item(
        $node.find("Key").text(),
        new Date(Date.parse($node.find("LastModified").text())),
        root.parseInt($node.find("Size").text()));
  };

  var create_item_from_common_prefix_node = function ($node) {
    return create_item($node.find("Prefix").text());
  };

  var create_breadcrumb = function () {
    return $("<ul>", { "class": "breadcrumb" })
      .append($("<li>", { text: "foo" }))
      .append($("<li>", { text: "bar" }))
      .append($("<li>", { text: "baz" }));
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

  var module;
  module = function () {
    var table = create_table();
    module.list();
    return $("<div>")
      .append(create_breadcrumb())
      .append(table);
  };

  module.create_tr = function (item) {
    var glyph;
    var href;
    var name;
    var segment = item.uri.segmentCoded();

    if (/\/$/.exec(item.key)) {
      glyph = "glyphicon glyphicon-folder-close";
      href = page_uri.clone().search({ prefix: item.key }).toString();
      name = segment[segment.length - 2];
    } else {
      glyph = "glyphicon glyphicon-file";
      href = root_uri.clone().pathname(item.key).toString();
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

  module.list = function (continuation_token) {
    var query = {
      "list-type": 2,
      delimiter: "/",
      "max-keys": 100,
      "continuation-token": continuation_token,
      prefix: this_prefix
    };

    $.ajax(root_uri.toString(), {
      method: "GET",
      dataType: "xml",
      data: query,
      success: function (root) {
        var $root = $(root);
        $root.find("CommonPrefixes").each(function (i, node) {
          unused(i);
          var item = create_item_from_common_prefix_node($(node));
          if (item) {
            $("tbody").append(module.create_tr(item));
          }
        });
        $root.find("Contents").each(function (i, node) {
          unused(i);
          var item = create_item_from_content_node($(node));
          if (item) {
            $("tbody").append(module.create_tr(item));
          }
        });
        if ($root.find("IsTruncated").text() === "true") {
          module.list($root.find("NextContinuationToken").text());
        }
      },
      error: function (e) {
        $.noop(e);
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
