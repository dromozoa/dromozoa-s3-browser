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

  function Tuple2(x, y) {
    this.x = x;
    this.y = y;
  }

  Tuple2.prototype.absolute = function () {
    this.x = root.Math.abs(this.x);
    this.x = root.Math.abs(this.x);
    return this;
  };

  Tuple2.prototype.scale = function (s) {
    this.x *= s;
    this.y *= s;
    return this;
  };

  Tuple2.prototype.add = function (that) {
    this.x += that.x;
    this.y += that.y;
    return this;
  };

  Tuple2.prototype.sub = function (that) {
    this.x -= that.x;
    this.y -= that.y;
    return this;
  };

  Tuple2.prototype.interpolate = function (that, alpha) {
    var beta = 1 - alpha;
    this.x = this.x * beta + that.x * alpha;
    this.y = this.y * beta + that.y * alpha;
    return this;
  };

  Tuple2.prototype.clone = function () {
    return new Tuple2(this.x, this.y);
  };

  Tuple2.prototype.toString = function () {
    return "[" + this.x + "," + this.y + "]";
  };

  function Vector2(x, y) {
    this.x = x;
    this.y = y;
  }

  Vector2.prototype = $.extend(Vector2.prototype, Tuple2.prototype);

  Vector2.prototype.length_squared = function () {
    var x = this.x;
    var y = this.y;
    return x * x + y * y;
  };

  Vector2.prototype.length = function () {
    return root.Math.sqrt(this.length_squared());
  };

  Vector2.prototype.dot = function (that) {
    return this.x * that.x + this.y * that.y;
  };

  Vector2.prototype.angle = function (that) {
    return root.Math.abs(root.Math.atan2(this.x * that.y - this.y * that.x, this.dot(that)));
  };

  Vector2.prototype.normalize = function () {
    return this.scale(1 / this.length());
  };

  function Matrix3(m00, m01, m02, m10, m11, m12, m20, m21, m22) {
    this.m00 = m00; this.m01 = m01; this.m02 = m02;
    this.m10 = m10; this.m11 = m11; this.m12 = m12;
    this.m20 = m20; this.m21 = m21; this.m22 = m22;
  }

  Matrix3.prototype.determinant = function () {
    var m00 = this.m00; var m01 = this.m01; var m02 = this.m02;
    var m10 = this.m10; var m11 = this.m11; var m12 = this.m12;
    var m20 = this.m20; var m21 = this.m21; var m22 = this.m22;
    return m00 * (m11 * m22 - m21 * m12)
        - m01 * (m10 * m22 - m20 * m12)
        + m02 * (m10 * m21 - m20 * m11);
  };

  Matrix3.prototype.set_zero = function () {
    this.m00 = 0; this.m01 = 0; this.m02 = 0;
    this.m10 = 0; this.m11 = 0; this.m12 = 0;
    this.m20 = 0; this.m21 = 0; this.m22 = 0;
    return this;
  };

  Matrix3.prototype.set_identity = function () {
    this.m00 = 1; this.m01 = 0; this.m02 = 0;
    this.m10 = 0; this.m11 = 1; this.m12 = 0;
    this.m20 = 0; this.m21 = 0; this.m22 = 1;
    return this;
  };

  Matrix3.prototype.set_row = function (row, x, y, z) {
    if (row === 0) {
      this.m00 = x; this.m01 = y; this.m02 = z;
    } else if (row === 1) {
      this.m10 = x; this.m11 = y; this.m12 = z;
    } else if (row === 2) {
      this.m20 = x; this.m21 = y; this.m22 = z;
    }
    return this;
  };

  Matrix3.prototype.set_col = function (col, x, y, z) {
    if (col === 0) {
      this.m00 = x; this.m10 = y; this.m20 = z;
    } else if (col === 1) {
      this.m01 = x; this.m11 = y; this.m21 = z;
    } else if (col === 2) {
      this.m02 = x; this.m12 = y; this.m22 = z;
    }
    return this;
  };

  Matrix3.prototype.transpose = function () {
    var m01 = this.m01; this.m01 = this.m10; this.m10 = m01;
    var m02 = this.m02; this.m02 = this.m20; this.m20 = m02;
    var m12 = this.m12; this.m12 = this.m21; this.m21 = m12;
    return this;
  };

  Matrix3.prototype.invert = function () {
    var m00 = this.m00; var m01 = this.m01; var m02 = this.m02;
    var m10 = this.m10; var m11 = this.m11; var m12 = this.m12;
    var m20 = this.m20; var m21 = this.m21; var m22 = this.m22;
    var d = this.determinant();
    this.m00 = (m11 * m22 - m12 * m21) / d;
    this.m01 = (m02 * m21 - m01 * m22) / d;
    this.m02 = (m01 * m12 - m02 * m11) / d;
    this.m10 = (m12 * m20 - m10 * m22) / d;
    this.m11 = (m00 * m22 - m02 * m20) / d;
    this.m12 = (m02 * m10 - m00 * m12) / d;
    this.m20 = (m10 * m21 - m11 * m20) / d;
    this.m21 = (m01 * m20 - m00 * m21) / d;
    this.m22 = (m00 * m11 - m01 * m10) / d;
    return this;
  };

  Matrix3.prototype.rot_x = function (angle) {
    var c = root.Math.cos(angle);
    var s = root.Math.sin(angle);
    this.m00 = 1; this.m01 = 0; this.m02 =  0;
    this.m10 = 0; this.m11 = c; this.m12 = -s;
    this.m20 = 0; this.m21 = s; this.m22 =  c;
    return this;
  };

  Matrix3.prototype.rot_y = function (angle) {
    var c = root.Math.cos(angle);
    var s = root.Math.sin(angle);
    this.m00 =  c; this.m01 = 0; this.m02 = s;
    this.m10 =  0; this.m11 = 1; this.m12 = 0;
    this.m20 = -s; this.m21 = 0; this.m22 = c;
    return this;
  };

  Matrix3.prototype.rot_z = function (angle) {
    var c = root.Math.cos(angle);
    var s = root.Math.sin(angle);
    this.m00 = c; this.m01 = -s; this.m02 = 0;
    this.m10 = s; this.m11 =  c; this.m12 = 0;
    this.m20 = 0; this.m21 =  0; this.m22 = 1;
    return this;
  };

  Matrix3.prototype.transform = function (that, result) {
    var x = that.x; var y = that.y; var z = that.z;
    if (!result) {
      result = that;
    }
    if (z) {
      result.x = this.m00 * x + this.m01 * y + this.m02 * z;
      result.y = this.m10 * x + this.m11 * y + this.m12 * z;
      result.z = this.m20 * x + this.m21 * y + this.m22 * z;
    } else {
      result.x = this.m00 * x + this.m01 * y + this.m02;
      result.y = this.m10 * x + this.m11 * y + this.m12;
    }
    return result;
  };

  Matrix3.prototype.clone = function () {
    return new Matrix3(
        this.m00, this.m01, this.m02,
        this.m10, this.m11, this.m12,
        this.m20, this.m21, this.m22);
  };

  Matrix3.prototype.toString = function () {
    return "[[" + this.m00 + "," + this.m01 + "," + this.m02
      + "],[" + this.m10 + "," + this.m11 + "," + this.m12
      + "],[" + this.m20 + "," + this.m21 + "," + this.m22 + "]]";
  };

  function error(message) {
    if (root.bootbox) {
      root.bootbox.alert(message);
    }
    throw new root.Error(message);
  }

  function assert(result) {
    if (result) {
      return result;
    }
    error("assertion failed!");
  }

  function push(a, b) {
    root.Array.prototype.push.apply(a, b);
  }

  function compare(a, b) {
    if (a < b) {
      return -1;
    } else if (a === b) {
      return 0;
    } else {
      return 1;
    }
  }

  function basename(path) {
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
  }

  function dirname(path) {
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
  }

  function path_to_key(path) {
    assert(path.startsWith("/"));
    return path.substring(1);
  }

  function path_to_segments(path) {
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
      path += "/";
    }
    return result;
  }

  function key_to_path(key) {
    assert(!key.startsWith("/"));
    return "/" + key;
  }

  function key_to_segments(key) {
    return path_to_segments(key_to_path(key));
  }

  function format_int(fill, width, value) {
    var result = value.toString();
    while (result.length < width) {
      result = fill + result;
    }
    return result;
  }

  function format_date(value) {
    if (value) {
      return format_int("0", 4, value.getFullYear())
        + "-" + format_int("0", 2, value.getMonth() + 1)
        + "-" + format_int("0", 2, value.getDate())
        + " " + format_int("0", 2, value.getHours())
        + ":" + format_int("0", 2, value.getMinutes())
        + ":" + format_int("0", 2, value.getSeconds());
    }
  }

  function format_size(value) {
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
  }

  function list_bucket_impl(uri, prefix, continuation_token) {
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
        }).filter(function (i, item) {
          unused(i);
          return item.key !== prefix;
        }).toArray(),
        common_prefixes: $root.children("CommonPrefixes").map(function (i, elem) {
          unused(i);
          var $elem = $(elem);
          var key = $elem.children("Prefix").text();
          return {
            key: key,
            prefix: key
          };
        }).toArray()
      };
      if (result.is_truncated) {
        result.next_continuation_token = $root.children("NextContinuationToken").text();
      }
      return result;
    });
  }

  function list_bucket(uri, prefix) {
    var $deferred = new $.Deferred();
    var contents = [];
    var common_prefixes = [];

    var fail = function () {
      $deferred.reject();
    };

    var done;
    done = function (result) {
      push(contents, result.contents);
      push(common_prefixes, result.common_prefixes);
      if (result.is_truncated) {
        list_bucket_impl(uri, prefix, result.next_continuation_token).done(done).fail(fail);
      } else {
        var items = [];
        push(items, contents);
        push(items, common_prefixes);
        $deferred.resolve({
          name: result.name,
          prefix: result.prefix,
          delimiter: result.delimiter,
          contents: contents,
          common_prefixes: common_prefixes,
          items: items
        });
      }
    };

    list_bucket_impl(uri, prefix).done(done).fail(fail);
    return $deferred.promise();
  }

  function get_uri() {
    return new root.URI().query("").hash("");
  }

  function get_origin_uri() {
    return get_uri().path("/");
  }

  function get_path_prefix() {
    return path_to_key(new root.URI().directory(true) + "/");
  }

  function get_prefix() {
    var query = root.URI.parseQuery(new root.URI().query());
    if (query.prefix) {
      return query.prefix;
    } else {
      return get_path_prefix();
    }
  }

  function get_mode() {
    var query = root.URI.parseQuery(new root.URI().query());
    if (query.mode) {
      return query.mode;
    } else {
      return "list";
    }
  }

  function create_navbar() {
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
  }

  function module(selector) {
    var impl = module[get_mode()];
    if (impl) {
      return impl(selector);
    }
    error("invalid mode");
  }

  module.list = function (selector) {
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
      var key = item.key;
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
          .append($.map(result.items, function (item) {
            return create_tr(item);
          }));
        sort("name");
      }).fail(function () {
        error("could not load");
      });
    };

    $(selector)
      .append($("<div>", { "class": "dromozoa-s3-browser" })
        .append(create_navbar())
        .append($("<div>", { "class": "dromozoa-s3-browser-list" })
          .css({ "margin-top": "70px" })
          .append($("<div>", { "class": "container"})
            .append(create_breadcrumb())
            .append(create_table())
          )
        )
      );
    load();
  };

  module.tree = function (selector) {
    var tree = d3.tree();
    var itemset = {};
    var identifiers = {};
    var identifier_count = 0;

    function key_to_identifier(key) {
      var identifier = identifiers[key];
      if (identifier) {
        return identifier;
      }
      var count = identifier_count + 1;
      identifier = "dromozoa-s3-browser-tree-" + count;
      identifiers[key] = identifier;
      identifier_count = count;
      return identifier;
    }

    function stratify(key) {
      var name = basename(key_to_path(key));
      if (key.endsWith("/")) {
        if (itemset[key]) {
          var children = [];
          $.each(itemset[key], function (i, item) {
            unused(i);
            children.push(stratify(item.key));
          });
          return {
            id: key_to_identifier(key),
            name: name,
            children: children
          };
        }
        return {
          id: key_to_identifier(key),
          name: name
        };
      } else {
        return {
          id: key_to_identifier(key),
          name: name
        };
      }
    }

    function update() {
      var svg = d3.select(".dromozoa-s3-browser-tree");
      var width = root.parseInt(svg.attr("width"), 10);
      var height = root.parseInt(svg.attr("height"), 10);

      var root_group = d3.select(".dromozoa-s3-browser-tree > g");
      var root_node = d3.hierarchy(stratify(get_prefix()));

      tree.size([ width - 50, height - 50 ]);
      tree(root_node);

      root_group.selectAll(".node")
        .data(root_node.descendants())
        .enter()
        .append("g")
          .attr("id", function (d) {
            return d.data.id;
          })
          .attr("class", "node")
          .attr("transform", function (d) {
            return "translate(" + d.x + "," + d.y + ")";
          })
          .append("circle")
            .attr("cx", 0)
            .attr("cy", 0)
            .attr("r", 4)
            .attr("fill", "black");
    }

    function load(prefix) {
      list_bucket(get_origin_uri(), prefix).done(function (result) {
        itemset[result.prefix] = result.items.sort(function (a, b) {
          return compare(a.key, b.key);
        });
        update();
      }).fail(function () {
        error("could not load");
      });
    }

    function resize() {
      d3.select(".dromozoa-s3-browser-tree")
        .attr("width", root.innerWidth)
        .attr("height", root.innerHeight - 50);
    }

    $(root).on("resize", function () {
      resize();
      update();
    });

    $(function () {
      load(get_prefix());
    });

    $(selector)
      .append("<div>")
        .addClass("dromozoa-s3-browser")
        .append(create_navbar());
    d3.select(".dromozoa-s3-browser")
      .append("svg")
        .attr("class", "dromozoa-s3-browser-tree")
        .style("display", "block")
        .style("margin-top", "50px")
        .append("g");
    resize();
  };

  if (!root.dromozoa) {
    root.dromozoa = {};
  }
  if (!root.dromozoa.s3) {
    root.dromozoa.s3 = {};
  }
  root.dromozoa.s3.browser = module;
}(this.self));
