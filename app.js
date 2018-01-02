var express = require('express'),
    path = require('path'),
    os = require('os'),
    logger = require('morgan'),
    errorHandler = require('errorhandler'),
    markdownServe = require('markdown-serve'),
    wrench = require('wrench'),
    moment = require('moment'),
    Promise = require('bluebird'),
    parser = require('./node_modules/markdown-serve/lib/parser.js'),
    resolver = require('./node_modules/markdown-serve/lib/resolver.js');

var app = express();

// all environments
app.set('port', process.env.PORT || 3000);
app.set('views', path.resolve(__dirname, 'views'));
app.set('view engine', 'jade');
app.use(logger('dev'));
app.use(express.static(path.resolve(__dirname, 'public')));

// development only
if ('development' == app.get('env')) {
    app.use(errorHandler());
    app.set('host', 'http://localhost');
}

app.get('/', function(req, res, next) {
    res.render('index');
});

// Without view option specified, data is returned as JSON.
// Here we are mounting on a separate sub-path... so to get at the about page for example, we would access http://localhost:3000/json/about
// NOTE that the order of middleware(s) are important, so we need to put this first to route any requests to "/json" and handle as putting
// this middleware after will never invoke it
app.use('/json', markdownServe.middleware({
    rootDirectory: path.resolve(__dirname, 'posts'),
}));

app.get('/pages', function(req, res, next) {
    getPages(req, res, next);
});

app.get('/pages/:directory', function(req, res, next) {
    getPages(req, res, next, req.params.directory);
});

// app.use(markdownServe.middleware({
//   rootDirectory: path.resolve(__dirname, 'posts'),
//   view: 'article'
// }));

app.get('*', function(req, res, next) {
    if (req.method !== 'GET') next();

    var rootDir = path.resolve(__dirname, 'posts');
    var markdownServer = new markdownServe.MarkdownServer(rootDir);

    markdownServer.get(req.path, function(err, result) {
        if (err) {
            console.log(err);
            next();
            return;
        }

        delete result._file;
        if (result.meta && !result.meta.draft) {
            var view = result.meta.view || 'article';
            var date = moment(result.meta.date);
            date.date(date.date());
            res.render(view, {
                markdownFile: result,
                formattedDate: date.format('MMMM D, YYYY')
            });
        } else {
            next();
        }
    });
});

app.listen(app.get('port'), function() {
    var h = (app.get('host') || os.hostname() || 'unknown') + ':' + app.get('port');
    console.log('Express server listening at ' + h);
});

/*
Get Pages
*/
function getPages(req, res, next, directoryPath) {
    // initiate promise
    var files = (function() {
        return Promise.resolve([]);
    })();

    // gets all filenames
    function getAllFilenames(results) {
        // readdirRecursive returns null as last element to indicate it's done reading all files.
        var hasTerminated = false;

        return new Promise(function(resolve, reject) {
            wrench.readdirRecursive('posts', function(error, curFiles) {
                // add new filenames to array and filter out directory names
                results = results.concat(curFiles).filter(function(value) {
                    if (value !== null) {
                        return value.includes('.md') ? true : false;
                    } else {
                        hasTerminated = true;
                        return false;
                    }
                });

                // if wrench function has looked through all subdirectory filenames, resolve
                if (hasTerminated)
                    resolve(results);
            });
        });
    };

    // filter only files of directoryPath
    function filterDirectoryFiles(results) {
        if (typeof directoryPath !== 'undefined') {
            var re = new RegExp('^' + directoryPath + '/');
            return results.filter(function(filename) {
                return re.test(filename);
            });
        } else
            return results;
    }

    // get markdown data
    function parseFiles(results) {
        // array of promises that get markdown metadata
        var newResults = [];
        results.forEach(function(filename) {
            newResults.push(
                new Promise(function(resolve, reject) {
                    parser.parse(path.join(__dirname + '/posts/', filename), {}, function(err, result) {
                        if (err)
                            reject(err);
                        else {
                            console.log(result);
                            resolve({
                                uriPath: filename.replace('.md', ''),
                                meta: result.meta,
                                content: result.rawContent
                            });
                        }
                    })
                })
            );
        });

        return Promise.all(newResults);
    }

    files.then(getAllFilenames)
        .then(filterDirectoryFiles)
        .then(parseFiles)
        .then(function(results) {
            res.json(results);
        }).catch(function(error) {
            next(error);
        });
}
