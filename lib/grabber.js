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
    , path = url.parse(pathUrl);

    return base.protocol + "//" + base.host + path.path;
}

/**
 * Embed all the images in the page using base 64 encoding
 * @param  {Object}   item     
 * @param  {Function} callback 
 */
function _embedBase64(baseUrl, $, callback) {
  async.each(
    $('img'), 
    
    function(item, eachCallback) {
      var src = $(item).attr('src')
        , abosoluteImageUrl
        , base64;

      if(src === undefined) eachCallback(); // no src
      
      abosoluteImageUrl = _getAbsoluteUrl(baseUrl, src);

      request({url: abosoluteImageUrl, encoding: 'binary'}, function (error, response, body) {
        if(error || response.statusCode !== 200) {
          logger.warn("cannot get image", abosoluteImageUrl, error);
          eachCallback();
        } else {
          base64 = new Buffer(body, 'binary').toString('base64');
          $(item).attr('src', "data:"+response.headers['content-type']+";base64,"+base64);
          eachCallback();
        }
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

        //embed js
        function (callback) {
          //TODO: implement
          callback();
        },

        //embed images
        function (callback) {
          _embedBase64(url, $, callback);
        }


      ], function(err, result) {
        if(err) {
          callback(err, $.html());
        } else {
          callback(undefined, $.html());
        }
      }); 



    }
  });
}


module.exports = grabber;