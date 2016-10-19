var unirest = require("unirest");
var express = require("express");
var events = require("events");

var getFromApi = function(endpoint, args) {
    var emitter = new events.EventEmitter();
    if (endpoint === 'artists') {
       endpoint = 'artists/' + args + '/related-artists';
    }
    unirest.get('https://api.spotify.com/v1/' + endpoint)
           .qs(args)
           .end(function(response) {
                if (response.ok) {
                    emitter.emit('end', response.body);
                }
                else {
                    emitter.emit('error', response.code);
                }
            });
    return emitter;
};

var app = express();
app.use(express.static('public'));

app.get('/search/:name', function(req,res) {
    var searchReq = getFromApi('search', {
        q: req.params.name,
        limit: 1,
        type: 'artist',
    });
    
    searchReq.on('end', function(item) {
        var artist = item.artists.items[0];
        var relatedReq = getFromApi('artists', artist.id);
    
        relatedReq.on('end', function(item) {
            artist.related = item.artists;
            var artistLength = artist.related.length;
            var checked = 0;
            
            var checkList = function() {
                if (checked === artistLength) {
                    res.json(artist);
                }
            };
            
            artist.related.forEach(function(){
                checked += 1;
                checkList();
            });
        });
        
        relatedReq.on('error', function(code) {
            res.status(404);
        });
    });
    
    searchReq.on('error', function(code) {
        res.sendStatus(code);
    });
    
    
});

app.listen(process.env.PORT || 8080);