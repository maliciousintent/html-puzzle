var grabber = require('./index')
  , fs = require('fs');

grabber.grab('http://www.disco.unimib.it/', function(err, page) {
  
  fs.writeFile('result.html', page, function (err) {
    if (err) throw err;
    console.log('Page saved');
  });

});