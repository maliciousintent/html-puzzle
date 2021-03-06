Html-Puzzle
======

A tiny, easy-to-use, html grab and package library.
Tested with Node 0.10.12

## Requirements ##
PhantomJS (if you want to create a page snapshot)

## Install ##

```bash
npm -S install html-puzzle
```


## Use ##

```nodejs
var grabber = require('../index');

var imageFormat = 'png'
  , options = {
      url: 'http://arstechnica.com/',
      createSnapshot: true,
      createHTML: true,
      imageFormat: imageFormat,
      createZip : true,
      insertWatermark : true,
      watermarkText : 'created using html-puzzle'
    };

grabber.grab(options, function (err, page) {
  // do awesome stuff
  // page.html contains the html code (if createHTML is true)
  // page.image contains the base64 encoded image (if createSnapshot is true)
  // page.zip contains a zip file (binary, if createZip is true)
});

```
See tests/test.js for more information.

## Performance ##

Time to grab [arstechnica.com](http://www.arstechnica.com) using a 100Mbps fiber connection on a Virtual Machine (512MB RAM, 1 core).

![time](https://raw.github.com/plasticpanda/html-puzzle/master/tests/time.png)


## Todo ##

* Add javascript blacklist (eg: google analytics..)
* Fix problem with js loaded resources
* Test with strange characters
* Test performances

## License ##

Copyright (c) 2013 PlasticPanda.com, Mauro Bolis <mauro@plasticpanda.com>, Simone Lusenti <simone@plasticpanda.com>

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.