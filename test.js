var grabber = require('./index')
  , fs = require('fs')
  , options;

options = {
    'url' : 'https://github.com/plasticpanda/html-puzzle',
    'createSnapshot' : true,
    'imageFormat' : 'PNG'
};

grabber.grab(options, function(err, page) {
  
  fs.writeFile('result.html', page.html, function (err) {
    if (err) throw err;
    console.log('Page saved');
  });

  fs.writeFile("snap.png", new Buffer(page.image, "base64"), "binary", function(err) {
    if (err) throw err;
    console.log('Image saved');
  });
});