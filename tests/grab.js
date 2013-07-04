/*jshint node:true, laxcomma:true, indent:2, white:true, curly:true, plusplus:true, undef:true, strict:true, trailing:true */
'use strict';

var grabber = require('../index')
  , fs = require('fs')
  , options;

options = {
  'url' : 'http://www.arstechnica.com/',
  'createSnapshot' : true,
  'imageFormat' : 'PNG'
};

grabber.grab(options, function (err, page) {
  if (err) {
    throw err;
  }
  
  fs.writeFile('result.html', page.html, function (err) {
    if (err) {
      throw err;
    }
    
    console.log('Page saved');
  });

  fs.writeFile("snap.png", new Buffer(page.image, "base64"), "binary", function (err) {
    if (err) {
      throw err;
    }
    
    console.log('Image saved');
  });
});