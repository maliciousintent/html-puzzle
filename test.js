var grabber = require('./index')
  , fs = require('fs');

grabber.grab('http://www.ansa.it', function(err, page) {
  
  fs.writeFile('result.html', page, function (err) {
    if (err) throw err;
    console.log('Page saved');
  });

});