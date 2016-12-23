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
  var Math = root.Math;
  var $ = root.jQuery;
  var unused = $.noop;
  var d3 = root.d3;

  function error(message) {
    if (root.alert) {
      root.alert(message);
    }
    if (root.console && root.console.error) {
      root.console.error(message);
    }
    throw new root.Error(message);
  }

  function assert(result, message) {
    if (result) {
      return result;
    }
    if (!message) {
      message = "assertion failed!";
    }
    error(message);
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

  function path_to_info(path) {
    var result = {
      name: basename(path),
      type: "file",
      icon: "fa-file-o"
    };
    $.each(path_to_info.definitions, function (i, def) {
      unused(i);
      if (def.regexp.exec(path)) {
        if (def.type) {
          result.type = def.type;
        }
        result.icon = def.icon;
        return false;
      }
    });
    return result;
  }

  path_to_info.definitions = [
    {
      regexp: /\/$/,
      type: "folder",
      icon: "fa-folder-o"
    },
    {
      regexp: /\.(?:gif|jpeg|jpg|jpe|png)/i,
      icon: "fa-file-image-o"
    },
    {
      regexp: /\.(?:mp4|mp4v|mpg4)/i,
      icon: "fa-file-video-o"
    }
  ];

  function key_to_path(key) {
    assert(!key.startsWith("/"));
    return "/" + key;
  }

  function key_to_segments(key) {
    return path_to_segments(key_to_path(key));
  }

  function key_to_info(key) {
    return path_to_info(key_to_path(key));
  }

  function icon_to_code(icon) {
    return assert(icon_to_code.definitions[icon]);
  }

  icon_to_code.definitions = {
    "fa-folder-o": "\uf114",
    "fa-folder-open-o": "\uf115",
    "fa-file-o": "\uf016",
    "fa-file-image-o": "\uf1c5",
    "fa-file-video-o": "\uf1c8",
    "fa-spinner": "\uf110"
  };

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
          if (value >= 100 || Math.abs(value - Math.round(value)) < 0.05) {
            result = value.toFixed(0) + unit;
          } else {
            result = value.toFixed(1) + unit;
          }
          return false;
        }
        value /= 1024;
      });
      return result;
    }
  }

  function list_bucket_impl(uri, prefix, continuation_token) {
    return $.ajax(uri.toString(), {
      cache: false,
      dataType: "xml",
      data: {
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

    function fail() {
      $deferred.reject();
    }

    function done(result) {
      push(done.contents, result.contents);
      push(done.common_prefixes, result.common_prefixes);
      if (result.is_truncated) {
        list_bucket_impl(uri, prefix, result.next_continuation_token).done(done).fail(fail);
      } else {
        var items = [];
        push(items, done.contents);
        push(items, done.common_prefixes);
        $deferred.resolve({
          name: result.name,
          prefix: result.prefix,
          delimiter: result.delimiter,
          contents: done.contents,
          common_prefixes: done.common_prefixes,
          items: items
        });
      }
    }

    done.contents = [];
    done.common_prefixes = [];

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

  function get_zoom_x() {
    var query = root.URI.parseQuery(new root.URI().query());
    if (query.zoom_x) {
      return root.parseFloat(query.zoom_x);
    } else {
      return 0;
    }
  }

  function get_zoom_y() {
    var query = root.URI.parseQuery(new root.URI().query());
    if (query.zoom_y) {
      return root.parseFloat(query.zoom_y);
    } else {
      return 0;
    }
  }

  function get_zoom_scale() {
    var query = root.URI.parseQuery(new root.URI().query());
    if (query.zoom_scale) {
      return root.parseFloat(query.zoom_scale);
    } else {
      return 1;
    }
  }

  function create_navbar() {
    return $("<nav>")
      .addClass("navbar navbar-default navbar-fixed-top")
      .append($("<div>")
        .addClass("container")
        .append($("<div>")
          .addClass("navbar-header")
          .append($("<button>")
            .addClass("navbar-toggle collapsed")
            .attr("type", "button")
            .attr("data-toggle", "collapse")
            .attr("data-target", "#dromozoa-s3-browser-navbar")
            .append($("<span>")
              .addClass("sr-only"))
            .append($("<span>")
              .addClass("icon-bar"))
            .append($("<span>")
              .addClass("icon-bar"))
            .append($("<span>")
              .addClass("icon-bar"))))
        .append($("<div>")
          .addClass("navbar-collapse collapse")
          .attr("id", "dromozoa-s3-browser-navbar")
          .append($("<ul>")
            .addClass("nav navbar-nav")
            .append($("<li>")
              .addClass(get_mode() === "list" ? "active" : undefined)
              .append($("<a>")
                .attr("href", get_uri().toString())
                .text("List")))
            .append($("<li>")
              .addClass(get_mode() === "tree" ? "active" : undefined)
              .append($("<a>")
                .attr("href", get_uri().addQuery("mode", "tree").toString())
                .text("Tree"))))));
  }

  function module(selector) {
    if (!selector) {
      selector = "body";
    }
    $(selector)
      .append("<div>")
        .addClass("dromozoa-s3-browser")
        .append(create_navbar());
    return assert(module[get_mode()])();
  }

  module.list = function () {
    function order_by(key, order) {
      if (order === "desc") {
        return function (a, b) {
          return compare($(b).data(key), $(a).data(key));
        };
      } else {
        return function (a, b) {
          return compare($(a).data(key), $(b).data(key));
        };
      }
    }

    function sort(type) {
      var defs = sort.definitions[type];
      var $th = $(".dromozoa-s3-browser-list .sort-by-" + type);
      var state = ($th.data("sort_state") + 1) % defs.length;
      var def = defs[state];

      var $thead = $(".dromozoa-s3-browser-list thead");
      $thead.find("th").data("sort_state", -1);
      $thead.find(".fa").attr("class", "fa fa-fw");

      $th.data("sort_state", state);
      $th.find(".fa").addClass(def.icon);

      var $tbody = $(".dromozoa-s3-browser-list tbody");
      $tbody.append($tbody.children("tr").detach().sort(def.order));
    }

    sort.definitions = {
      name: [
        { order: order_by("type", "asc"), icon: "fa-sort-amount-asc" },
        { order: order_by("type", "desc"), icon: "fa-sort-amount-desc" },
        { order: order_by("name", "asc"), icon: "fa-sort-alpha-asc" },
        { order: order_by("name", "desc"), icon: "fa-sort-alpha-desc" }
      ],
      mtime: [
        { order: order_by("mtime", "asc"), icon: "fa-sort-numeric-asc" },
        { order: order_by("mtime", "desc"), icon: "fa-sort-numeric-desc" }
      ],
      size: [
        { order: order_by("size", "asc"), icon: "fa-sort-numeric-asc" },
        { order: order_by("size", "desc"), icon: "fa-sort-numeric-desc" }
      ]
    };

    function sort_by(type) {
      return function (ev) {
        ev.preventDefault();
        sort(type);
      };
    }

    function create_breadcrumb() {
      var index = key_to_segments(get_path_prefix()).length - 1;
      return $("<ul>")
        .addClass("breadcrumb")
        .append($.map(key_to_segments(get_prefix()), function (segment, i) {
          if (i < index) {
            return $("<li>")
              .text(segment.name);
          } else {
            var uri = get_uri();
            if (i !== index) {
              uri.addQuery("prefix", path_to_key(segment.path));
            }
            return $("<li>")
              .append($("<a>")
                .attr("href", uri.toString())
                .text(segment.name));
          }
        }));
    }

    function create_table() {
      return $("<table>")
        .addClass("table table-striped table-condensed")
        .append($("<thead>")
          .append($("<tr>")
            .append($("<th>")
              .addClass("sort-by-name")
              .append($("<a>")
                .attr("href", "#sort-by-name")
                .text("Name")
                .on("click", sort_by("name")))
              .append($("<span>")
                .addClass("fa fa-fw"))
              .data("sort_state", -1))
            .append($("<th>")
              .addClass("hidden-xs sort-by-mtime")
              .css("width", "12em")
              .append($("<a>")
                .attr("href", "#sort-by-mtime")
                .text("Last Modified")
                .on("click", sort_by("mtime")))
              .append($("<span>")
                .addClass("fa fa-fw"))
              .data("sort_state", -1))
            .append($("<th>")
              .addClass("sort-by-size")
              .css("width", "6em")
              .append($("<a>")
                .attr("href", "#sort-by-size")
                .text("Size")
                .on("click", sort_by("size")))
              .append($("<span>")
                .addClass("fa fa-fw"))
              .data("sort_state", -1))))
        .append($("<tbody>"));
    }

    function create_tr(item) {
      var key = item.key;
      var info = key_to_info(key);
      var uri;
      var data = { name: info.name };
      if (info.type === "folder") {
        uri = get_uri().addQuery("prefix", key);
        data.type = "0:" + info.name;
        data.mtime = -1;
        data.size = -1;
      } else {
        uri = get_origin_uri().path(key_to_path(key));
        data.type = "1:" + info.name;
        data.mtime = item.last_modified.getTime();
        data.size = item.size;
      }
      return $("<tr>")
        .append($("<td>")
          .append($("<span>")
            .addClass("fa fa-fw " + info.icon))
          .append($("<a>")
            .attr("href", uri.toString())
            .text(info.name)))
        .append($("<td>")
          .addClass("hidden-xs")
          .text(format_date(item.last_modified)))
        .append($("<td>")
          .addClass("text-right")
          .text(format_size(item.size)))
        .data(data);
    }

    function load() {
      list_bucket(get_origin_uri(), get_prefix()).done(function (result) {
        $(".dromozoa-s3-browser-list tbody")
          .append($.map(result.items, function (item) {
            return create_tr(item);
          }));
        sort("name");
      }).fail(function () {
        error("could not load");
      });
    }

    $(".dromozoa-s3-browser")
      .append($("<div>")
        .addClass("dromozoa-s3-browser-list")
        .css("margin-top", "70px")
        .append($("<div>")
          .addClass("container")
          .append(create_breadcrumb())
          .append(create_table())));
    load();
  };

  module.tree = function () {
    var initial_zoom_x = get_zoom_x();
    var initial_zoom_y = get_zoom_y();
    var initial_zoom_scale = get_zoom_scale();
    var zoom_x = initial_zoom_x;
    var zoom_y = initial_zoom_y;
    var zoom_scale = initial_zoom_scale;

    var font_awesome_fixed_width_em = 10 / 7;
    var name_x_em = font_awesome_fixed_width_em / 2;
    var icon_width_em = 0.5 + name_x_em;
    var node_height = 24;
    var node_radius = 12;
    var grid_x = 30;
    var grid_y = 40;
    var edge_control = 6;
    var edge_start_x_offset;
    var edge_start_y_offset;
    var edge_end_x_offset;
    var edge_end_y_offset;

    var data = {};
    var svg;

    var load;
    var update;

    function update_history() {
      if (root.history && root.history.replaceState) {
        if (!update_history.timer) {
          update_history.timer = root.setTimeout(function () {
            var uri = get_uri().addQuery("mode", "tree");
            if (zoom_x !== 0) {
              uri.addQuery("zoom_x", zoom_x);
            }
            if (zoom_y !== 0) {
              uri.addQuery("zoom_y", zoom_y);
            }
            if (zoom_scale !== 1) {
              uri.addQuery("zoom_scale", zoom_scale);
            }
            root.console.log(uri.toString());
            root.history.replaceState(null, null, uri.toString());
            delete update_history.timer;
          }, 500);
        }
      }
    }

    function layout(root_node) {
      var position = 0;
      root_node.eachBefore(function (node) {
        node.x = node.depth * grid_x;
        node.y = position * grid_y;
        position += 1;
      });
    }

    function update_node(node_group) {
      var bbox = node_group.select(".name").node().getBBox();
      var em = bbox.x / name_x_em;
      var x = (name_x_em - icon_width_em) * em - node_radius;
      var y = bbox.y - (node_height - bbox.height) * 0.5;
      var width = bbox.x * 2 + bbox.width + node_radius * 2;
      node_group.select("rect")
        .attr("x", x)
        .attr("y", y)
        .attr("width", width)
        .attr("height", node_height)
        .attr("rx", node_radius)
        .attr("ry", node_radius);
      if (edge_start_x_offset  === undefined) {
        edge_start_x_offset = 0;
        edge_start_y_offset = y + node_height;
        edge_end_x_offset = x;
        edge_end_y_offset = y + node_height * 0.5;
      }
    }

    function set_icon(node_group, icon) {
      node_group.select(".icon > text")
        .text(icon_to_code(icon));
    }

    function start_spin(node_group, icon) {
      set_icon(node_group, icon);
      var icon_group = node_group.select(".icon");
      var bbox = icon_group.node().getBBox();
      var x = bbox.x + bbox.width / 2;
      var y = bbox.y + bbox.height / 2;
      icon_group.append("animateTransform")
        .attr("attributeName", "transform")
        .attr("type", "rotate")
        .attr("from", "0 " + x + " " + y)
        .attr("to", "360 " + x + " " + y)
        .attr("dur", "2s")
        .attr("repeatDur", "indefinite");
    }

    function reset_spin(node_group, icon) {
      set_icon(node_group, icon);
      node_group.select("animateTransform")
        .remove();
    }

    function create_edge_path(parent_node, node) {
      if (!node) {
        node = parent_node;
      }
      var sx = parent_node.x;
      var sy = parent_node.y;
      var ex = node.x;
      var ey = node.y;
      if (edge_start_x_offset !== undefined) {
        sx += edge_start_x_offset;
        sy += edge_start_y_offset;
        ex += edge_end_x_offset;
        ey += edge_end_y_offset;
      }
      var c = Math.min(Math.abs(ex - sx), Math.abs(ey - sy), edge_control);
      var mx = sx < ex ? sx + c : sx - c;
      var my = sy < ey ? ey - c : ey + c;
      var path = d3.path();
      path.moveTo(sx, sy);
      path.lineTo(sx, my);
      path.quadraticCurveTo(sx, ey, mx, ey);
      path.lineTo(ex, ey);
      return path;
    }

    function create_node(node_group, d) {
      var info = key_to_info(d.data.key);
      node_group
        .on("click", function (d) {
          var key = d.data.key;
          if (key.endsWith("/")) {
            if (data[key]) {
              d.eachAfter(function (node) {
                if (node.data.key.endsWith("/")) {
                  data[node.data.key] = undefined;
                }
              });
              set_icon(node_group, "fa-folder-o");
              update();
            } else {
              load(key);
            }
          }
        });
      node_group.append("rect")
        .attr("fill", "white")
        .attr("stroke", "black");
      node_group.append("g")
        .classed("icon", true)
        .append("text")
          .style("font-family", "FontAwesome")
          .style("text-anchor", "middle")
          .text(icon_to_code(info.icon));
      var name_text = node_group.append("text")
        .classed("name", true)
        .attr("x", name_x_em + "em");
      if (info.type === "folder") {
        name_text.text(info.name);
      } else {
        name_text.append("a")
          .attr("xlink:href", get_origin_uri().path(key_to_path(d.data.key)))
          .text(info.name);
      }
      update_node(node_group);
    }

    function find_node(prefix) {
      return svg.select(".node[data-key='" + prefix + "']");
    }

    load = function (prefix) {
      var node_group = find_node(prefix);
      if (node_group) {
        start_spin(node_group, "fa-spinner");
      }
      list_bucket(get_origin_uri(), prefix).done(function (result) {
        if (node_group) {
          reset_spin(node_group, "fa-folder-open-o");
        }
        data[result.prefix] = result.items.sort(function (a, b) {
          return compare(a.key, b.key);
        });
        update();
      }).fail(function () {
        if (node_group) {
          reset_spin(node_group, key_to_info(prefix).icon);
        }
        error("could not load");
      });
    };

    update = function () {
      var root_node = d3.hierarchy({ key: get_prefix() }, function (d) {
        return data[d.key];
      });
      layout(root_node);

      var transition = d3.transition().duration(500);

      var edge_groups = svg.select(".edges")
        .selectAll(".edge")
        .data(root_node.descendants().slice(1), function (d) {
          return d.data.key;
        });

      edge_groups.enter().append("path")
        .classed("edge", true)
        .attr("fill", "none")
        .attr("stroke", "black")
        .attr("opacity", 0)
        .attr("d", function (d) {
          return create_edge_path(d.parent).toString();
        });

      edge_groups.exit()
        .classed("edge", false)
        .transition(transition)
        .attr("opacity", 0)
        .attr("d", function (d) {
          return create_edge_path(d.parent).toString();
        })
        .remove();

      svg.selectAll(".edge")
        .transition(transition)
        .attr("opacity", 1)
        .attr("d", function (d) {
          return create_edge_path(d.parent, d).toString();
        });

      var node_groups = svg.select(".nodes")
        .selectAll(".node")
        .data(root_node.descendants(), function (d) {
          return d.data.key;
        });

      node_groups.enter().insert("g", ":first-child")
        .classed("node", true)
        .each(function (d) {
          create_node(d3.select(this), d);
        })
        .attr("data-key", function (d) {
          return d.data.key;
        })
        .attr("opacity", 0)
        .attr("transform", function (d) {
          if (d.parent) {
            return "translate(" + d.parent.x + "," + d.parent.y + ")";
          }
        });

      node_groups.exit()
        .classed("node", false)
        .transition(transition)
        .attr("opacity", 0)
        .attr("transform", function (d) {
          if (d.parent) {
            return "translate(" + d.parent.x + "," + d.parent.y + ")";
          }
        })
        .remove();

      svg.selectAll(".node")
        .transition(transition)
        .attr("opacity", 1)
        .attr("transform", function (d) {
          return "translate(" + d.x + "," + d.y + ")";
        });
    };

    function resize() {
      var width = root.innerWidth;
      var height = root.innerHeight - 50;
      svg
        .attr("width", width)
        .attr("height", height);
      svg.select(".viewport > rect")
        .attr("width", width)
        .attr("height", height);
    }

    $(root).on("resize", resize);

    svg = d3.select(".dromozoa-s3-browser")
      .append("svg")
        .classed("dromozoa-s3-browser-tree", true)
        .style("display", "block")
        .style("margin-top", "50px");

    svg.append("g")
      .classed("viewport", true)
      .call(d3.zoom().on("zoom", function () {
        var transform = d3.event.transform
          .translate(initial_zoom_x, initial_zoom_y)
          .scale(initial_zoom_scale);
        zoom_x = transform.x;
        zoom_y = transform.y;
        zoom_scale = transform.k;
        svg.select(".view")
          .attr("transform", transform.toString());
        update_history();
      }))
      .append("rect")
        .attr("fill", "white");

    var model_group = svg.select(".viewport")
      .append("g")
        .classed("view", true)
        .attr("transform", function () {
          var transform = d3.zoomTransform(this)
            .translate(initial_zoom_x, initial_zoom_y)
            .scale(initial_zoom_scale);
          return transform.toString();
        })
        .append("g")
          .classed("model", true)
          .attr("transform", "translate(" + grid_x + "," + grid_y + ")");

    model_group.append("g")
      .classed("edges", true);
    model_group.append("g")
      .classed("nodes", true);

    resize();
    update();
    load(get_prefix());
  };

  if (!root.dromozoa) {
    root.dromozoa = {};
  }
  if (!root.dromozoa.s3) {
    root.dromozoa.s3 = {};
  }
  root.dromozoa.s3.browser = module;
}(this.self));
