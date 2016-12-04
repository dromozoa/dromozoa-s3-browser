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
  var abs = Math.abs;

  function Tuple2(x, y) {
    this.x = x;
    this.y = y;
  }

  Tuple2.prototype.absolute = function () {
    this.x = abs(this.x);
    this.y = abs(this.y);
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

  Tuple2.prototype.equals = function (that) {
    return this.x === that.x && this.y === that.y;
  };

  Tuple2.prototype.epsilon_equals = function (that, epsilon) {
    return abs(this.x - that.x) <= epsilon && abs(this.y - that.y) <= epsilon;
  };

  Tuple2.prototype.clone = function () {
    return new Tuple2(this.x, this.y);
  };

  Tuple2.prototype.toString = function () {
    return "[" + this.x + "," + this.y + "]";
  };

  function Vector2(x, y) {
    Tuple2.call(this, x, y);
  }

  Vector2.prototype = root.Object.create(Tuple2.prototype);

  Vector2.prototype.length_squared = function () {
    var x = this.x;
    var y = this.y;
    return x * x + y * y;
  };

  Vector2.prototype.length = function () {
    return Math.sqrt(this.length_squared());
  };

  Vector2.prototype.dot = function (that) {
    return this.x * that.x + this.y * that.y;
  };

  Vector2.prototype.angle = function (that) {
    return Math.abs(Math.atan2(this.x * that.y - this.y * that.x, this.dot(that)));
  };

  Vector2.prototype.normalize = function () {
    return this.scale(1 / this.length());
  };

  Vector2.prototype.clone = function () {
    return new Vector2(this.x, this.y);
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
    var c = Math.cos(angle);
    var s = Math.sin(angle);
    this.m00 = 1; this.m01 = 0; this.m02 =  0;
    this.m10 = 0; this.m11 = c; this.m12 = -s;
    this.m20 = 0; this.m21 = s; this.m22 =  c;
    return this;
  };

  Matrix3.prototype.rot_y = function (angle) {
    var c = Math.cos(angle);
    var s = Math.sin(angle);
    this.m00 =  c; this.m01 = 0; this.m02 = s;
    this.m10 =  0; this.m11 = 1; this.m12 = 0;
    this.m20 = -s; this.m21 = 0; this.m22 = c;
    return this;
  };

  Matrix3.prototype.rot_z = function (angle) {
    var c = Math.cos(angle);
    var s = Math.sin(angle);
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

  Matrix3.prototype.equals = function (that) {
    return this.m00 === that.m00 && this.m01 === that.m01 && this.m02 === that.m02
      && this.m10 === that.m10 && this.m11 === that.m11 && this.m12 === that.m12
      && this.m20 === that.m20 && this.m21 === that.m21 && this.m22 === that.m22;
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

  if (!root.dromozoa) {
    root.dromozoa = {};
  }
  root.dromozoa.vecmath = {
    Tuple2: Tuple2,
    Vector2: Vector2,
    Matrix3: Matrix3
  };
}(this.self));
