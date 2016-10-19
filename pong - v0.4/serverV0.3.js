/**************************************************
 * SERVER FILE
 *
 * Uses Socket.io with Express
 *
 **************************************************
 * REQUIREMENTS
 **************************************************/

var util = require("util"),                                     // Module for logging
    express = require('express'),                               // Module for express framework
    http = require('http'),                                     // Module for http server
    socketio = require('socket.io');                            // Module for Socket.io

var port = 3000;                                                // Default Port
var gameCount = 0;                                              // Games played and for creation of rooms
var waitingGames = [];

/**************************************************
 ** SERVER SERTUP
 **************************************************/

var app = express(),                                            // Create express instance
    server = http.createServer(app),                            // Create the http server from express
    io = socketio(server);                                      // Setup socket io to listen to the server

var nspClient = io.of('/client');                               // Name space for connecting clients
app.use('/public', express.static(__dirname + '/public'));      // Public folders

app.get('/', function (request, response) {
    response.sendFile(__dirname + '/pong.html');                // Game file (pong) on connect
});

/**************************************************
 ** Event Handlers
 **************************************************/

function clientConnected(client) {
    util.log('Client joined ' + client.id);

    client.on('play', function () {
        enterRoom(client)
    });

    //Event handlers for paddle and ball, updates the cords
    client.on('sendP1Y', function (data) {
        if(nspClient.connected[data.id]){
            client.broadcast.to(data.room).emit('updateP1Y', data.yCord);
        } else {
            nspClient.to(data.room).emit('disconnect');
        }
    });

    client.on('sendP2Y', function (data) {
        if(nspClient.connected[data.id]){
            client.broadcast.to(data.room).emit('updateP2Y', data.yCord);
        } else {
            nspClient.to(data.room).emit('disconnect');
        }
    });

    client.on('sendBall', function (data) {
        client.broadcast.to(data.room).emit('updateBall', data);
    });

    client.on('sendScore', function (data) {
        client.broadcast.to(data.room).emit('updateScore', { scoreP1: data.scoreP1, scoreP2: data.scoreP2});
    });

    client.on('matchDone', function (data) {
        client.to(data.room).emit('winner', data.name);
    });

    client.on('sendPlayerInfo', function (data) {
        client.to(data.room).emit('updatePlayers', {name: data.name, paddleColor: data.paddleColor, id: client.id});
    });
}

// Function to create a game room, if a game is not available
function enterRoom(client) {
    if (checkRooms(client) == false) {
        client.join('game' + gameCount);
        waitingGames.push({game: 'game' + gameCount, open: true});
        gameCount++;
    }
}

// Function to checks if a game room is available
function checkRooms(client) {
    for (var i = 0; i < waitingGames.length; i++) {
        if (waitingGames[i].open) {
            waitingGames[i].open = false;
            client.join(waitingGames[i].game);
            nspClient.in(waitingGames[i].game).emit('start', waitingGames[i].game);
            nspClient.to(client.id).emit('hostFalse');
            waitingGames.shift();
            return true;
        }
    }
    return false;
}

/**************************************************
 ** Initialize server
 **************************************************/

function init() {
    server.listen(port, function () {
        util.log('Server Started listing on port: ' + port)
    });

    nspClient.on('connection', clientConnected);
}

init();