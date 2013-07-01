/*jshint node:true, indent:2, laxcomma:true, undef:true, unused:true */

/*
 * Clog - Colorful console output for your applications in NodeJS
 * https://github.com/plasticpanda/clog
 *
 * Edited by Simone Lusenti <simone@plasticpanda.com>
 * Based on work (c) 2012 Firejune <to@firejune.com>
 * 
 * Copyright (c) 2013 Simone Lusenti & Plastic Panda
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 * 
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 * 
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 */


var util = require('util');
require('colors');


var COLOR_MAP = {
  'log'   : 'white'
, 'error' : 'red'
, 'warn'  : 'orange'
, 'info'  : 'cyan'
, 'ok'    : 'green'
, 'debug' : 'grey'
};


function Clog (prefix, compact) {
  var that = this;
  
  Object.keys(COLOR_MAP).forEach(function (level) {
    that[level] = (function _makeFn(level) {
      return function () {
        that._log.apply(that, [level].concat(Array.prototype.slice.call(arguments)));
      };
    })(level);
  });

  this.prefix = prefix;
  this.compact = compact || false;
}


Clog.prototype._log = function (type, msg) {
  var that = this;
  
  if (COLOR_MAP[type] === undefined || ''[COLOR_MAP[type]] === undefined) {
    throw new TypeError('Level ' + type + ' is not defined (or non-existent color).');
  }
  
  if ('string' !== typeof msg) {
    msg = util.inspect(msg);
  }
  
  if (msg.indexOf('\n') > -1) {
    // If string is multiline call _log for each string
    msg.split('\n').forEach(function (row) {
      that.log(type, row);
    });
    
  } else {
    console.log.apply(console, [
        '['.grey.bold + (this.compact !== true ? (new Date() + ' - ').grey : '') + this.prefix.blue + ']'.grey.bold
      , (type + ':')[COLOR_MAP[type]].bold
      , msg
      ].concat(Array.prototype.slice.call(arguments, 2))
    );
  }
};


var clogFactory = function (prefix, compact) {
  return new Clog(prefix, compact);
};

module.exports = clogFactory;
