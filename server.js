var unirest = require("unirest");
var express = require("express");
var events = require("events");

var getFromApi = function(endpoint, args, flag) {
    var emitter = new events.EventEmitter();
    if (endpoint === 'artists') {
       if(flag){
           endpoint = 'artists/' + args + '/related-artists';
       }else {
           endpoint = 'artists/' + args + '/top-tracks?country=US';
       }
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
        var relatedReq = getFromApi('artists', artist.id, true);
    
        relatedReq.on('end', function(item) {
            artist.related = item.artists;
            // console.log(artist.related);
            var artistLength = artist.related.length;
            var checked = 0;
            
            var checkList = function() {
                if (checked === artistLength) {
                    res.json(artist);
                }
            };
            
            artist.related.forEach(function(artist, index){
                var topReq = getFromApi('artists', artist.id, false);
                
                topReq.on('end', function(item) {
                    artist.tracks = item.tracks;
                    checked += 1;
                    checkList();
                });
                
                topReq.on('error',function() {
                    res.status(404);
                });
            });
        });
        
        relatedReq.on('error', function() {
            res.status(404);
        });
    });
    
    searchReq.on('error', function(code) {
        res.sendStatus(code);
    });
    
    
});

app.listen(process.env.PORT || 8080);