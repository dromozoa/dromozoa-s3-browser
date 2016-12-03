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
  var console = root.console;
  var vecmath = root.dromozoa.vecmath;

  function assert(result, message) {
    if (result) {
      return result;
    }
    if (!message) {
      message = "assertion failed!";
    }
    var e = new root.Error(message);
    console.log(e, e.stack);
    throw e;
  }

  var Tuple2 = assert(vecmath.Tuple2);
  var Vector2 = assert(vecmath.Vector2);
  var Matrix3 = assert(vecmath.Matrix3);

  $(function () {
    var t = new Tuple2(1, 0);
    var v = new Vector2(0, 1);

    t.scale(2);
    v.scale(3);

    assert(v.length() == 3);

  });
}(this.self));
