/*jshint node:true, laxcomma:true, indent:2, white:true, curly:true, plusplus:true, undef:true, strict:true, trailing:true */
'use strict';

var async = require('async')
  , logger = require('coolog')('grabber')
  , request = require('request')
  , cheerio = require('cheerio')
  , phantom = require('node-phantom')
  , Zip = require('adm-zip')
  , url = require('url')
  , grabber = {};


/**
 * Create an absolute link for the given path
 * @param  {String} baseUrl the base path
 * @param  {String} pathUrl the resource url
 */
function _getAbsoluteUrl(baseUrl, pathUrl) {
  var base = url.parse(baseUrl)
    , path = url.parse(pathUrl)
    , separator = '';

  if (path.host !== null) {
    //path url is already an absolute url
    return pathUrl;
  } else if (pathUrl.indexOf("//") === 0) {
    return "http:" + pathUrl;
  } else {
    if (path.path.indexOf('/') !== 0) {
      separator = '/';
    }
    return base.protocol + '//' + base.host + separator + path.path;
  }
}

/**
 * Embed all external images (img tag) in the page
 * @param  {String}   baseUrl  the page url
 * @param  {Object}   $        a cheerio object that hold the dom tree
 * @param  {Function} callback the callback called at the end of the process
 */
function _embedImages(baseUrl, $, callback) {
  async.each(
    $('img'),

    function (item, eachCallback) {
      var src = $(item).attr('src')
        , abosoluteImageUrl
        , base64;

      if (src === undefined) {
        eachCallback(); // no src
        return;
      }

      abosoluteImageUrl = _getAbsoluteUrl(baseUrl, src);

      request({url: abosoluteImageUrl, encoding: 'binary'}, function (error, response, body) {
        if (error || response.statusCode !== 200) {
          logger.warn("cannot get image", abosoluteImageUrl, error);
        } else {
          base64 = new Buffer(body, 'binary').toString('base64');
          $(item).attr('src', "data:" + response.headers['content-type'] + ";base64," + base64);
        }
        eachCallback();
      });
    },

    function (err) {
      callback(err);
    });
}

/**
 * Embed all external stylesheets in the page
 * @param  {String}   baseUrl  the page url
 * @param  {Object}   $        a cheerio object that hold the dom tree
 * @param  {Function} callback the callback called at the end of the process
 */
function _embedStyles(baseUrl, $, callback)  {
  async.each(
    $('link[rel="stylesheet"]'),

    function (item, eachCallback) {
      var href = $(item).attr('href')
        , abosoluteStyleUrl;

      if (href === undefined) {
        eachCallback(); // no href
        return;
      }
      
      abosoluteStyleUrl = _getAbsoluteUrl(baseUrl, href);

      request(abosoluteStyleUrl, function (error, response, body) {
        if (error || response.statusCode !== 200) {
          logger.warn("cannot get style", abosoluteStyleUrl, error);
        } else {
          $(item).replaceWith('<style>' + body + '</style>');
        }
        eachCallback();
      });
    },

    function (err) {
      callback(err);
    });
}

/**
 * Embed all external javascript files in the page
 * @param  {String}   baseUrl  the page url
 * @param  {Object}   $        a cheerio object that hold the dom tree
 * @param  {Function} callback the callback called at the end of the process
 */
function _embedJavascript(baseUrl, $, callback) {
  async.each(
    $('script'),

    function (item, eachCallback) {
      var src = $(item).attr('src')
        , abosoluteJsUrl;

      if (src === undefined) {
        eachCallback(); // no src
        return;
      }
      
      abosoluteJsUrl = _getAbsoluteUrl(baseUrl, src);

      request(abosoluteJsUrl, function (error, response, body) {
        if (error || response.statusCode !== 200) {
          logger.warn("cannot get js script", abosoluteJsUrl, error);
        } else {
          $(item).replaceWith('<script style="text/javascript">' + body + '</script>');
        }
        eachCallback();
      });
    },

    function (err) {
      callback(err);
    });
}


/**
 * Create a snapshot
 * @param  {String}   url         the url of the image
 * @param  {String}   imageFormat the format of the image. should be PNG, JPG or GIF
 * @param  {Function} callback    the function called at the end of the process. It take two arguments. The first is an eventual error, the second is the image in base64 format
 */
function _createSnapshot(url, imageFormat, callback) {
  phantom.create(function (err, ph) {
    ph.createPage(function (err, page) {
      page.open(url, function (err, status) {
        page.renderBase64(imageFormat, function (err, res) {
          if (err) {
            callback(err, undefined);
          } else {
            callback(null, res);
          }
          ph.exit();
        });
      });
    });
  });
}


/**
 * Grab and compress a remote html page
 * @param  {String} url the url
 * @param {Object} options an object with the options
 * @param {Function} callback the callback called at the end of the grab
 * @return {String} the content of the html page
 */
grabber.grab = function (options, callback) {
  
  var createImageSnap = (options.createSnapshot === undefined) ? true : options.createSnapshot
    , createHTML = (options.createHTML === undefined) ? true : options.createHTML
    , imageFormat = (options.imageFormat || 'PNG').toUpperCase()
    , createZip = (options.createZip === undefined) ? true : options.createZip
    , url = options.url
    , $;

    
  request(url, function (error, response, body) {

    if (error || response.statusCode !== 200) {
      callback(error, body);
    } else {
      
      $ = cheerio.load(body);

      async.parallel({
        
        snapshot: function _makeShapshot(next) {
          if (!createImageSnap) {
            return next(null, null);
          }
          
          _createSnapshot(url, imageFormat, next);
        },
        
        html: function _makeHTML(seriesCallback) {
          if (!createHTML) {
            return seriesCallback(null, null);
          }
          
          async.parallel([
            function _doEmbedStyles(next) {
              _embedStyles(url, $, next);
            },

            function _doEmbedImages(next) {
              _embedImages(url, $, next);
            },

            function _doEmbedJavascript(next) {
              _embedJavascript(url, $, next);
            }
          ], function (err) {
            if (err) {
              return seriesCallback(err, null);
            }
            
            seriesCallback(err, $.html());
          });
        }
        
      }, function (err, result) {
        var zip;

        if (err) {
          callback(err, null);
        } else {

          if (createZip) {
            zip = new Zip();
            if (createHTML) {
              zip.addFile("page.html", new Buffer($.html()));
            }
            if (createImageSnap) {
              zip.addFile("snap." + imageFormat, new Buffer(result.snapshot, 'base64'));
              // fix compression to prevent corrupted images
              zip.getEntry("snap." + imageFormat).header.method = 0;
            }
          }

          callback(null, {
            'html': result.html
          , 'image': result.snapshot
          , 'zip': zip.toBuffer()
          });
        }
      });
    }
  });
};


module.exports = grabber;
