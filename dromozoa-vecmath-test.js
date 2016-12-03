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
  var console = root.console;
  var $ = root.jQuery;
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
    assert(new Tuple2(-1, -2).absolute().equals({ x: 1, y: 2 }));
    assert(new Vector2(0, 1).scale(2).length() === 2);
    assert(new Tuple2(1, 2).add({ x: 3, y: 4 }).equals({ x: 4, y: 6 }));
    assert(new Tuple2(1, 2).sub({ x: 3, y: 4 }).equals({ x: -2, y: -2 }));
    assert(new Tuple2(1, 2).interpolate(new Tuple2(5, 10), 0.25).equals(new Tuple2(2, 4)));

    var t1 = new Tuple2(1, 2);
    var t2 = t1.clone().scale(2);
    assert(!t1.equals(t2));
    assert(t2.equals({ x: 2, y: 4 }));

    assert(new Vector2(3, 4).length_squared() === 25);
    assert(new Vector2(3, 4).length() === 5);
    assert(new Vector2(1, 2).dot(new Vector2(3, 4)) === 11);
    assert(new Vector2(1, 1).angle(new Vector2(-1, 1)) === Math.PI / 2);
    assert(new Vector2(2, 0).normalize().equals(new Vector2(1, 0)));
    assert(new Vector2(0, 3).normalize().equals(new Vector2(0, 1)));
    assert(new Vector2(3, 4).clone().length() === 5);

    var m = new Matrix3(1, 2, 3, 4, 5, 6, 7, 8, 9);
    assert(m.m00 === 1);
    assert(m.m01 === 2);
    assert(m.m02 === 3);
    assert(m.m10 === 4);
    assert(m.m11 === 5);
    assert(m.m12 === 6);
    assert(m.m20 === 7);
    assert(m.m21 === 8);
    assert(m.m22 === 9);

  });
}(this.self));
