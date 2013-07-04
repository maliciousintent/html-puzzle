/*jshint node:true, laxcomma:true, indent:2, white:true, curly:true, undef:true, strict:true, trailing:true, eqnull:true */

'use strict';

var grabber = require('../index')
  , fs = require('fs');
  

if (!fs.existsSync('out')) {
  fs.mkdirSync('out');
}

var imageFormat = 'jpeg'
  , options = {
  url: 'http://www.arstechnica.com/',
  createSnapshot: true,
  createHTML: true,
  imageFormat: imageFormat
};

grabber.grab(options, function (err, page) {
  if (err) {
    throw err;
  }
  
  if (page.html != null) {
    fs.writeFile('out/result.zip', page.html, 'binary', function (err) {
      if (err) {
        throw err;
      }
      
      console.log('Page saved');
    });
  }

  if (page.image != null) {
    fs.writeFile('out/snap.' + imageFormat, new Buffer(page.image, 'base64'), 'binary', function (err) {
      if (err) {
        throw err;
      }
      
      console.log('Image saved');
    });
  }
});