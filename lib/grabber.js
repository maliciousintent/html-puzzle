/*jshint node:true, laxcomma:true, indent:2, white:true, curly:true, plusplus:true, undef:true, strict:true, trailing:true */
'use strict';

var async = require('async')
  , logger = require('coolog')('grabber')
  , request = require('request')
  , cheerio = require('cheerio')
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
 * Embed all the images in the page using base 64 encoding
 * @param  {Object}   item     
 * @param  {Function} callback 
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
 * Grab and compress a remote html page
 * @param  {String} url the url
 * @param {Function} callback the callback called at the end of the grab
 * @return {String} the content of the html page
 */
grabber.grab = function (url, callback) {
  logger.info('Start html request');
  request(url, function (error, response, body) {
    var $;
    if (error || response.statusCode !== 200) {
      callback(error, body);
    } else {
      
      $ = cheerio.load(body);
      
      // embed everything
      async.parallel([

        //embed css
        function (callback) {
          _embedStyles(url, $, callback);
        },

        //embed images
        function (callback) {
          _embedImages(url, $, callback);
        },

        //embed js
        function (callback) {
          _embedJavascript(url, $, callback);
        }


      ], function (err, result) {
        if (err) {
          callback(err, $.html());
        } else {
          callback(undefined, $.html());
        }
      });
    }
  });
};


module.exports = grabber;