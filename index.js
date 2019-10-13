var app = require('express')();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var port = process.env.PORT || 3000;

app.get('/', function (req, res) {
    res.sendFile(__dirname + '/index.html');
});

let users = {};
let choices = {};
let round = 1;

// https://stackoverflow.com/a/35047888/4807393
function objectsHaveSameKeys(...objects) {
    const allKeys = objects.reduce((keys, object) => keys.concat(Object.keys(object)), []);
    const union = new Set(allKeys);
    return objects.every(object => union.size === Object.keys(object).length);
}

function roundEnd(io, socket) {
    // RESOLVE ROUND, choices (clear dict)

    let shields = [];
    let dead = [];

    for (let key in choices) {
        if (choices.hasOwnProperty(key)) {
            console.log(key, ' -> ', choices[key]);

            if (choices[key].value === 'shield') {
                shields.push(key);
                io.emit("chat message", users[key].name + " shields!");
            }
        }
    }

    for (let key in choices) {
        if(!choices.hasOwnProperty(key)) continue;
        let choice = choices[key].value;

        if (choice === 'reload') {
            users[key].reloads++;
            io.emit("chat message", users[key].name + " reloads!");
        } else if (choice === 'shoot') {
            io.emit("chat message", users[key].name + " shoots!");
            if (users[key].reloads === 0) {
                io.emit("chat message", "But they had no ammo!");
                continue;
            } else {
                users[key].reloads--;
            }

            for (let key_ in choices) {
                if(!choices.hasOwnProperty(key_) || key_ === key) continue;
                if (shields.filter(e => e === key_).length === 0) {
                    io.emit('player dies', users[key_].name);
                    io.emit('chat message', users[key_].name + " dies!");
                    dead.push(key_);
                }
            }
        }
    }

    let names = [];

    for (let death of dead) {
        names.push(users[death].name);
        delete users[death];
    }

    console.log(users);

    round += 1;
    io.emit('round start', { 'round': round, 'dead': names });
    choices = {};
}

io.on('connection', function (socket) {
    socket.on('chat message', function (msg) {
        console.log(msg);
        io.emit('chat message', '<b>' + msg.player + '</b> says: ' + msg.msg);
    });

    socket.on('choice', function (choice) {
        console.log(choice);
        choices[socket.id] = choice.choice;
        io.emit('choice', choice);
        io.emit('chat message', '<span class="system">' + choice.player + ' has chosen!</span>');

        if (objectsHaveSameKeys(users, choices)) {
            roundEnd(io, socket);
        }
    });

    socket.on('player join', function (player) {
        io.emit('player join', player);
        users[socket.id] = {
            'name': player,
            'reloads': 0,
            'dead': false
        };
    });

    socket.on('disconnect', function () {
        console.log('USER LEFT:', users[socket.id]);
        if (users[socket.id] !== undefined) io.emit('player leave', users[socket.id].name);
        delete users[socket.id];
        delete choices[socket.id];
    });

    //socket.emit('round start', 0);
});

http.listen(port, function () {
    console.log('listening on *:' + port);
});
