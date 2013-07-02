var grabber = require('./index')
  , fs = require('fs');

grabber.grab('http://stackoverflow.com/questions/10940273/how-can-i-read-a-file-encoded-in-utf-16-in-nodejs', function(err, page) {
  
  fs.writeFile('result.html', page, function (err) {
    if (err) throw err;
    console.log('Page saved');
  });

});