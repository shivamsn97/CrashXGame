// Import the socket.io-client library
import { io } from "socket.io-client";

// Connect to the server
const socket = io();
var connected = false;

function setConnectionStatus(status) {
    connected = status;
    if (status) {
        $('#latency-symbol').removeClass('fa-circle-exclamation');
        $('#latency-symbol').addClass('fa-wifi');
        updateLatency();
    } else {
        $('#latency-symbol').css('color', 'red');
        $('#latency-symbol').removeClass('fa-wifi');
        $('#latency-indicator').text('-');
        $('#latency-symbol').addClass('fa-circle-exclamation');
    }
}

socket.on('connect', () => {
    console.log('Connected!');
    setConnectionStatus(true);
    // send telegram user info to server
    // socket.emit('connection_data', {
    //     id: Telegram.User.id,
    //     first_name: Telegram.User.first_name,
    //     last_name: Telegram.User.last_name,
    //     username: Telegram.User.username
    // });
});

socket.on('disconnect', () => {
    console.log('Disconnected!');
    setConnectionStatus(false);

    // retry connection
    setTimeout(() => {
        socket.connect();
    }, 1000);
});

function calculate_latency(callback) {
    const start_time = Date.now();
    socket.emit('ping');
    socket.once('pong', () => {
        const latency = Math.floor((Date.now() - start_time)/2);
        if (callback) {
            callback(latency);
        }
    });
}

const latency_colors = [
    [30, '#00ff00'],
    [80, '#ffff00'],
    [150, '#ffaa00'],
    [300, '#ff6000'],
    [Infinity, '#ff0000']
];

function calculate_latency_color(l) {
    for (let i=0; i<latency_colors.length; i++) {
        if (l < latency_colors[i][0]) {
            return latency_colors[i][1];
        }
    }
}

const updateLatency = () => {
    calculate_latency((latency) => {
        const cl = calculate_latency_color(latency);
        $('#latency-symbol').css('color', cl);
        $('#latency-indicator').text(latency);
    });
}

setInterval(updateLatency, 10000);
setTimeout(updateLatency, 500);


window.socket = socket;
window.updateLatency = updateLatency;


// get the user da

$("#place-bet-1").on('mousedown touchstart', function() {
    console.log('mousedown1');
    $("#place-bet-1").css('background', 'linear-gradient(315deg, #FFB800, #FF7800)');
    $('#place-bet-1 h2').text('Exit');
    Telegram.WebApp.HapticFeedback.impactOccurred('soft')
});

$("#place-bet-1").on('mouseup touchend', function() {
    console.log('mouseup1');
    $("#place-bet-1").css('background', 'linear-gradient(315deg, #1157E7, #73EF92)');
    $('#place-bet-1 h2').text('Place Bet');
    Telegram.WebApp.HapticFeedback.impactOccurred('soft')
});

$("#place-bet-2").on('mousedown touchstart', function() {
    console.log('mousedown2');
    $("#place-bet-2").css('background', 'linear-gradient(315deg, #FFB800, #FF7800)');
    $('#place-bet-2 h2').text('Exit');
    Telegram.WebApp.HapticFeedback.impactOccurred('soft')
});

$("#place-bet-2").on('mouseup touchend', function() {
    console.log('mouseup2');
    $("#place-bet-2").css('background', 'linear-gradient(315deg, #1157E7, #73EF92)');
    $('#place-bet-2 h2').text('Place Bet');
    Telegram.WebApp.HapticFeedback.impactOccurred('soft')
});