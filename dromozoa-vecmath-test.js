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
  var epsilon = 2.22044604925031e-16;

  function assert(result, message) {
    if (result) {
      assert.count += 1;
      return result;
    }
    if (!message) {
      message = "assertion failed!";
    }
    var e = new root.Error(message);
    console.log(e, e.stack);
    throw e;
  }

  assert.count = 0;

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

    assert(new Tuple2(1, -2).negate().equals(new Tuple2(-1, 2)));
    assert(new Tuple2(1, 42).clamp(17, 23).equals(new Tuple2(17, 23)));
    assert(new Tuple2(1, 2).scale_add(2, { x: 4, y: 1 }).equals(new Tuple2(6, 5)));

    assert(new Vector2(3, 4).length_squared() === 25);
    assert(new Vector2(3, 4).length() === 5);
    assert(new Vector2(1, 2).dot(new Vector2(3, 4)) === 11);
    assert(new Vector2(1, 1).angle(new Vector2(-1, 1)) === Math.PI / 2);
    assert(new Vector2(2, 0).normalize().equals(new Vector2(1, 0)));
    assert(new Vector2(0, 3).normalize().equals(new Vector2(0, 1)));
    assert(new Vector2(3, 4).clone().length() === 5);

    var m = new Matrix3(1, 2, 3, 4, 5, 6, 7, 8, 9);
    assert(m.m00 === 1 && m.m01 === 2 && m.m02 === 3);
    assert(m.m10 === 4 && m.m11 === 5 && m.m12 === 6);
    assert(m.m20 === 7 && m.m21 === 8 && m.m22 === 9);

    m = m.clone();
    assert(m.m00 === 1 && m.m01 === 2 && m.m02 === 3);
    assert(m.m10 === 4 && m.m11 === 5 && m.m12 === 6);
    assert(m.m20 === 7 && m.m21 === 8 && m.m22 === 9);

    assert(m.equals(m.clone()));
    assert(new Matrix3().set_zero().equals(new Matrix3(0, 0, 0, 0, 0, 0, 0, 0, 0)));
    assert(new Matrix3().set_identity().equals(new Matrix3(1, 0, 0, 0, 1, 0, 0, 0, 1)));
    assert(m.clone().set_row(0, 11, 12, 13).equals(new Matrix3(11, 12, 13, 4, 5, 6, 7, 8, 9)));
    assert(m.clone().set_row(1, 14, 15, 16).equals(new Matrix3(1, 2, 3, 14, 15, 16, 7, 8, 9)));
    assert(m.clone().set_row(2, 17, 18, 19).equals(new Matrix3(1, 2, 3, 4, 5, 6, 17, 18, 19)));
    assert(m.clone().set_col(0, 11, 14, 17).equals(new Matrix3(11, 2, 3, 14, 5, 6, 17, 8, 9)));
    assert(m.clone().set_col(1, 12, 15, 18).equals(new Matrix3(1, 12, 3, 4, 15, 6, 7, 18, 9)));
    assert(m.clone().set_col(2, 13, 16, 19).equals(new Matrix3(1, 2, 13, 4, 5, 16, 7, 8, 19)));
    assert(m.clone().transpose().equals(new Matrix3(1, 4, 7, 2, 5, 8, 3, 6, 9)));

    m = new Matrix3(1, 2, 1, 2, 1, 0, 1, 1, 2);
    assert(m.determinant() === -5);
    m.invert();
    assert(m.m00 === -0.4 && m.m01 ===  0.6 && m.m02 ===  0.2);
    assert(m.m10 ===  0.8 && m.m11 === -0.2 && m.m12 === -0.4);
    assert(m.m20 === -0.2 && m.m21 === -0.2 && m.m22 ===  0.6);

    var v = new Matrix3().set_identity().rot_z(Math.PI / 4).transform(new Vector2(1, 1).normalize());
    assert(v.epsilon_equals(new Vector2(0, 1), epsilon));

    $("body")
      .append($("<div>")
        .text(assert.count + " assertions are passed"));
  });
}(this.self));
