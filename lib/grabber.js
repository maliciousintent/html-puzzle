/*jshint node:true, laxcomma:true, indent:2, white:true, curly:true, plusplus:true, undef:true, strict:true, trailing:true */
'use strict';

var async = require('async')
  , logger = require('coolog')('grabber')
  , request = require('request')
  , cheerio = require('cheerio')
  , phantom = require('node-phantom')
  , Zip = require('adm-zip')
  , url = require('url')
  , path = require('path')
  , cssParser  = require('css')
  , Canvas = require('canvas')
  , grabber = {};


/**
 * Create an absolute link for the given path
 * @param  {String} baseUrl the base path
 * @param  {String} pathUrl the resource url
 * @param {Boolean} isCss true if the url to resolve is taken from a css
 */
function _getAbsoluteUrl(baseUrl, pathUrl, isCss) {
  var base = url.parse(baseUrl)
    , filePath = url.parse(pathUrl)
    , host = '';

  if (filePath.host !== null) {
    //path url is already an absolute url
    return pathUrl;
  } 

  if (!isCss) {
    return url.resolve(baseUrl, pathUrl);
  } else {
    host = base.host + path.dirname(base.pathname);
    //logger.info('Host: "' +host+ '" pathUrl "' + pathUrl + '"');
    // TODO: sometime there is a %27 or a %22 at the beginning of the url..why?
    return base.protocol + "//" + host + "/" + filePath.pathname.replace('%27', '').replace('%22', '');  
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


function findImageLink(parsedCss) {
  var result = [];

  if (parsedCss.hasOwnProperty('property') && (parsedCss.property === 'background-image' || parsedCss.property === 'background')) {
    result.push(parsedCss);
  } else {
    for (var item in parsedCss) {
      if (typeof parsedCss[item] === 'object') {
        result = result.concat(findImageLink(parsedCss[item]));
      }
    }
  }
  return result;
}

/**
 * Embed all external stylesheets in the page
 * @param  {String}   baseUrl  the page url
 * @param  {Object}   $        a cheerio object that hold the dom tree
 * @param  {Function} callback the callback called at the end of the process
 */
function _embedStyles(baseUrl, $, callback)  {
  async.eachLimit(
    $('link[rel="stylesheet"]'),
    2,
    function (item, eachCallback) {
      var href = $(item).attr('href')
        , abosoluteStyleUrl
        , parsedCSS
        , backgroundImageLinks;

      if (href === undefined) {
        eachCallback(); // no href
        return;
      }
      
      abosoluteStyleUrl = _getAbsoluteUrl(baseUrl, href);

      request(abosoluteStyleUrl, function (error, response, body) {
        if (error || response.statusCode !== 200) {
          logger.warn("cannot get style", abosoluteStyleUrl, error);
          eachCallback();
        } else {
          try {
            parsedCSS = cssParser.parse(body);
          } catch (e) {
            $(item).replaceWith('<style>' + body + '</style>');
            eachCallback();
            return;
          }
          backgroundImageLinks = findImageLink(parsedCSS);
          async.eachLimit(backgroundImageLinks, 5, function (item, imageEachCallback) {
            var matches = []
              , abosoluteImageUrl
              , base64
              , regexp = new RegExp('url.*?((?:\\/[\\w\\.\\-]+)+)');

            matches = item.value.match(regexp);
            if (matches === null || matches[0] === undefined) {
              imageEachCallback();
            } else {
              // TODO: Fix this replace
              //logger.info(matches[0]);
              abosoluteImageUrl = _getAbsoluteUrl(abosoluteStyleUrl, matches[0].replace('url(', ''), true);
              request({url: abosoluteImageUrl, encoding: 'binary'}, function (error, response, body) {
                if (error || response.statusCode !== 200) {
                  logger.warn("cannot get image", abosoluteImageUrl, error);
                } else {
                  base64 = new Buffer(body, 'binary').toString('base64');
                  item.value = 'url("data:' + response.headers['content-type'] + ';base64,' + base64 + '")';
                }
                imageEachCallback();
              });
            }
          }, function (err) {
            if (err) {
              //just add the old body
              $(item).replaceWith('<style>' + body + '</style>');
            } else {
              $(item).replaceWith('<style>' + cssParser.stringify(parsedCSS) + '</style>');
            }
            eachCallback();
          });
        }
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
          body = body.replace(new RegExp('</script>', 'g'), "</s' + 'crypt>");
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
 * @param  {Boolean} insertWatermark true if u want to inser a custom watermark, false otherwise
 * @param  {String} watermarkText the watermark to add
 * @param  {Function} callback    the function called at the end of the process. It take two arguments. The first is an eventual error, the second is the image in base64 format
 */
function _createSnapshot(url, imageFormat, insertWatermark, watermarkText, callback) {
  phantom.create(function (err, ph) {
    ph.createPage(function (err, page) {
      page.open(url, function (err, status) {
        page.renderBase64(imageFormat, function (err, res) {
          if (err) {
            callback(err, undefined);
          } else {

            if (!insertWatermark) {
              callback(undefined, res);
            } else {

              var image = new Canvas.Image();
              
              image.onerror = function (err)  {
                logger.error(err);
              };

              image.onload = function () {
                var canvas = new Canvas(image.width, image.height)
                  , ctx = canvas.getContext('2d');

                ctx.drawImage(image, 0, 0, image.width, image.height);
                ctx.fillStyle = "#FFF";
                ctx.strokeStyle = "rgba(0, 0, 0, .8)";
                ctx.font = "22px sans-serif";
                ctx.fillText(watermarkText, 0, image.height - 40);
                ctx.strokeText(watermarkText, 0, image.height - 40);
                //DO IT ASYNC
                canvas.toBuffer(function (err, buf) {
                  callback(null, buf.toString('base64'));
                });
              };

              image.src = new Buffer(res, 'base64');
            
            }
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
    , insertWatermark = (options.insertWatermark === undefined) ? false : options.insertWatermark
    , watermarkText = (options.watermarkText || '')
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
          
          _createSnapshot(url, imageFormat, insertWatermark, watermarkText, next);
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
