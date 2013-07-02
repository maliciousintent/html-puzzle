Html-Puzzle
======

A tiny, easy-to-use, html grab and package library.


## Install ##

Not yet


## Use ##

```nodejs
var grabber = require('html-puzzle');
grabber.grab('http://www.google.it', function(err, page) {
  // do awesome stuff
});
```

## Todo ##

* Add javascript blacklist (eg: google analytics..)
* Test performances
* Fix problem with js-loaded resources
* Test with strange characters