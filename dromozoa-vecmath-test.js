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
  var vecmath = root.dromozoa.vecmath;
  var Tuple2 = vecmath.Tuple2;
  var Vector2 = vecmath.Vector2;
  var Matrix3 = vecmath.Matrix3;
  var epsilon = 2.22044604925031e-16;

  function test(result) {
    if (root.console && root.console.assert) {
      root.console.assert(result);
    }
    test.count += 1;
    if (result) {
      test.passed += 1;
      root.console.log("test " + test.count + " is passed");
    } else {
      test.failed += 1;
      root.console.log("test " + test.count + " is failed");
    }
  }

  test.count = 0;
  test.passed = 0;
  test.failed = 0;

  $(function () {
    $("body")
      .append($("<div>")
        .addClass("container dromozoa-vecmath")
        .css("margin-top", "10px"));

    test(new Tuple2(-1, -2).absolute().equals({ x: 1, y: 2 }));
    test(new Vector2(0, 1).scale(2).length() === 2);
    test(new Tuple2(1, 2).add({ x: 3, y: 4 }).equals({ x: 4, y: 6 }));
    test(new Tuple2(1, 2).sub({ x: 3, y: 4 }).equals({ x: -2, y: -2 }));
    test(new Tuple2(1, 2).interpolate(new Tuple2(5, 10), 0.25).equals(new Tuple2(2, 4)));

    var t1 = new Tuple2(1, 2);
    var t2 = t1.clone().scale(2);
    test(!t1.equals(t2));
    test(t2.equals({ x: 2, y: 4 }));

    test(new Tuple2(1, -2).negate().equals(new Tuple2(-1, 2)));
    test(new Tuple2(1, 42).clamp(17, 23).equals(new Tuple2(17, 23)));
    test(new Tuple2(1, 2).scale_add(2, { x: 4, y: 1 }).equals(new Tuple2(6, 5)));
    test(new Tuple2().equals(new Tuple2(0, 0)));

    test(new Vector2(3, 4).length_squared() === 25);
    test(new Vector2(3, 4).length() === 5);
    test(new Vector2(1, 2).dot(new Vector2(3, 4)) === 11);
    test(new Vector2(1, 1).angle(new Vector2(-1, 1)) === Math.PI / 2);
    test(new Vector2(2, 0).normalize().equals(new Vector2(1, 0)));
    test(new Vector2(0, 3).normalize().equals(new Vector2(0, 1)));
    test(new Vector2(3, 4).clone().length() === 5);

    var m = new Matrix3(1, 2, 3, 4, 5, 6, 7, 8, 9);
    test(m.m00 === 1 && m.m01 === 2 && m.m02 === 3);
    test(m.m10 === 4 && m.m11 === 5 && m.m12 === 6);
    test(m.m20 === 7 && m.m21 === 8 && m.m22 === 9);

    m = m.clone();
    test(m.m00 === 1 && m.m01 === 2 && m.m02 === 3);
    test(m.m10 === 4 && m.m11 === 5 && m.m12 === 6);
    test(m.m20 === 7 && m.m21 === 8 && m.m22 === 9);

    test(m.equals(m.clone()));
    test(new Matrix3().set_zero().equals(new Matrix3(0, 0, 0, 0, 0, 0, 0, 0, 0)));
    test(new Matrix3().set_identity().equals(new Matrix3(1, 0, 0, 0, 1, 0, 0, 0, 1)));
    test(m.clone().set_row(0, 11, 12, 13).equals(new Matrix3(11, 12, 13, 4, 5, 6, 7, 8, 9)));
    test(m.clone().set_row(1, 14, 15, 16).equals(new Matrix3(1, 2, 3, 14, 15, 16, 7, 8, 9)));
    test(m.clone().set_row(2, 17, 18, 19).equals(new Matrix3(1, 2, 3, 4, 5, 6, 17, 18, 19)));
    test(m.clone().set_column(0, 11, 14, 17).equals(new Matrix3(11, 2, 3, 14, 5, 6, 17, 8, 9)));
    test(m.clone().set_column(1, 12, 15, 18).equals(new Matrix3(1, 12, 3, 4, 15, 6, 7, 18, 9)));
    test(m.clone().set_column(2, 13, 16, 19).equals(new Matrix3(1, 2, 13, 4, 5, 16, 7, 8, 19)));
    test(m.clone().transpose().equals(new Matrix3(1, 4, 7, 2, 5, 8, 3, 6, 9)));

    m = new Matrix3(1, 2, 1, 2, 1, 0, 1, 1, 2);
    test(m.determinant() === -5);
    m.invert();
    test(m.m00 === -0.4 && m.m01 ===  0.6 && m.m02 ===  0.2);
    test(m.m10 ===  0.8 && m.m11 === -0.2 && m.m12 === -0.4);
    test(m.m20 === -0.2 && m.m21 === -0.2 && m.m22 ===  0.6);

    var v = new Matrix3().set_identity().rot_z(Math.PI / 4).transform(new Vector2(1, 1).normalize());
    test(v.epsilon_equals(new Vector2(0, 1), epsilon));

    test(new Matrix3().equals(new Matrix3(0, 0, 0, 0, 0, 0, 0, 0, 0)));

    test(new Matrix3(1, 2, 3, 4, 5, 6, 7, 8, 9)
      .add(new Matrix3(9, 8, 7, 6, 5, 4, 3, 2, 1))
      .equals(new Matrix3(10, 10, 10, 10, 10, 10, 10, 10, 10)));
    test(new Matrix3(1, 2, 3, 4, 5, 6, 7, 8, 9)
      .sub(new Matrix3(9, 8, 7, 6, 5, 4, 3, 2, 1))
      .equals(new Matrix3(-8, -6, -4, -2, 0, 2, 4, 6, 8)));
    test(new Matrix3(1, 2, 3, 4, 5, 6, 7, 8, 9)
      .mul(new Matrix3(9, 8, 7, 6, 5, 4, 3, 2, 1))
      .equals(new Matrix3(30, 24, 18, 84, 69, 54, 138, 114, 90)));

    m = new Matrix3().rot_z(Math.PI / 4);
    m = m.mul(m);
    test(m.epsilon_equals(new Matrix3().rot_z(Math.PI / 2), epsilon));

    test(new Matrix3(1, 2, 3, 4, 5, 6, 7, 8, 9)
      .negate()
      .equals(new Matrix3(-1, -2, -3, -4, -5, -6, -7, -8, -9)));

    root.console.log(test.passed + " tests are passed");
    if (test.failed > 0) {
      root.console.log(test.failed + " tests are failed");
    }
  });
}(this.self));
