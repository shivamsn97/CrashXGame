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
        custom_message('Connection lost!');
    }
}

function set_place_bet_text(state, betno) {
    if (state == 'no_bet') {
        $('#place-bet-' + betno + ' h2').text('Place Bet');
        $('#place-bet-' + betno + ' h6').text('on the next round!');
        $("#place-bet-" + betno).css('background', 'linear-gradient(315deg, #1157E7, #73EF92)');
    } else if (state == 'place_bet') {
        $('#place-bet-' + betno + ' h2').text('Place Bet');
        $('#place-bet-' + betno + ' h6').text('');
        $("#place-bet-" + betno).css('background', 'linear-gradient(315deg, #1157E7, #73EF92)');
    } else if (state == 'playing') {
        $('#place-bet-' + betno + ' h2').text('Bet Placed');
        $('#place-bet-' + betno + ' h6').text('Release to exit!');
        $("#place-bet-" + betno).css('background', 'linear-gradient(315deg, #FFD800, #FF9800)');
    } else if (state == 'waiting') {
        $('#place-bet-' + betno + ' h2').text('Waiting');
        $('#place-bet-' + betno + ' h6').text('Release to cancel!');
        $("#place-bet-" + betno).css('background', 'linear-gradient(315deg, #FFB800, #FF7800)');
    }
}

const Game = {
    amount: 0,
    bet1: null,
    bet2: null,
    state: 'waiting',
    setAmount(amount) {
        this.amount = amount;
        $('#amount-indicator').text(amount.toFixed(2));
    },
    setBets(bets) {
        console.log('setting-bets', bets)
        if (bets[1]) {
            this.bet1 = bets[1];
            set_place_bet_text('waiting', 1);
        } else {
            this.bet1 = null;
            if (this.state == 'waiting') {
                set_place_bet_text('place_bet', 1);
            } else {
                set_place_bet_text('no_bet', 1);
            }
        }
        if (bets[2]) {
            this.bet2 = bets[2];
            set_place_bet_text('waiting', 2);
        } else {
            this.bet2 = null;
            if (this.state == 'waiting') {
                set_place_bet_text('place_bet', 2);
            } else {
                set_place_bet_text('no_bet', 2);
            }
        }
    },
    onBetAck(data) {
        if (data.error) {
            console.log("Error while placing bet:", data.error);
            return;
        }
        if (data.bet_no == 1) {
            this.bet1 = data;
            set_place_bet_text('waiting', 1);
        }
        if (data.bet_no == 2) {
            this.bet2 = data;
            set_place_bet_text('waiting', 2);
        }
    },
    onBetCancelAck(data) {
        if (data.error) {
            console.log("Error while cancelling bet:", data.error);
            return;
        }
        if (data.bet_no == 1) {
            this.bet1 = null;
            if (this.state == 'waiting') {
                set_place_bet_text('place_bet', 1);
            } else {
                set_place_bet_text('no_bet', 1);
            }
        }
        if (data.bet_no == 2) {
            this.bet2 = null;
            if (this.state == 'waiting') {
                set_place_bet_text('place_bet', 2);
            } else {
                set_place_bet_text('no_bet', 2);
            }
        }
        socket.emit('get_user', TgApp.initDataUnsafe);
    },
    onGameUpdate(data) {
        const update = data.update;
        if (update == 'round_start') {
            this.state = 'waiting';
            const time_left_to_start = data.time_left_to_start;
            if (time_left_to_start <= 0) {
                custom_message('Round starting!');
            } else {
                wait(time_left_to_start);
            }
            TgApp.haptic();
            if (this.bet1) {
                set_place_bet_text('waiting', 1);
            } else {
                set_place_bet_text('place_bet', 1);
            }
            if (this.bet2) {
                set_place_bet_text('waiting', 2);
            } else {
                set_place_bet_text('place_bet', 2);
            }
        } else if (update == 'game_start') {
            start();
            this.state = 'playing';
            if (this.bet1) {
                set_place_bet_text('playing', 1);
            } else {
                set_place_bet_text('no_bet', 1);
            }
            if (this.bet2) {
                set_place_bet_text('playing', 2);
            } else {
                set_place_bet_text('no_bet', 2);
            }
            TgApp.haptic();
            socket.emit('get_user', TgApp.initDataUnsafe);
        } else if (update == 'game_update') {
            if (this.state == 'waiting' || this.state == 'crashed') {
                start();
                this.state = 'playing';
            }
            setMultiplier(data.multiplier);
            TgApp.haptic();
        } else if (update == 'game_end') {
            crash();
            setMultiplier(data.multiplier);
            this.state = 'crashed';
            // run TgApp.haptic('heavy'); for 10 times at 100ms interval
            for (let i=0; i<8; i++) {
                setTimeout(() => {
                    TgApp.haptic('heavy');
                }, i*100);
            }
            socket.emit('get_user', TgApp.initDataUnsafe);
            if (this.bet1) {
                set_place_bet_text('waiting', 1);
            } else {
                set_place_bet_text('no_bet', 1);
            }
            if (this.bet2) {
                set_place_bet_text('waiting', 2);
            } else {
                set_place_bet_text('no_bet', 2);
            }
            
        }
    },
    placeBet1(amount) {
        socket.emit('place_bet', {
            ytesy: 'sdfdgf',
            user: TgApp.initDataUnsafe,
            amount: amount,
            bet_no: 1
        });
    },
    releaseBet1() {
        console.log('release bet1:', this.bet1);
        if (this.bet1) {
            socket.emit('cancel_bet', {
                user: TgApp.initDataUnsafe,
                bet_no: 1
            });
        }
    },
    placeBet2(amount) {
        socket.emit('place_bet', {
            user: TgApp.initDataUnsafe,
            amount: amount,
            bet_no: 2
        });
    },
    releaseBet2() {
        if (this.bet2) {
            socket.emit('cancel_bet', {
                user: TgApp.initDataUnsafe,
                bet_no: 2
            });
        }
    },

    hold_bet_1() {
        const amount = $('#bet1-amount').val().substr(1);
        this.placeBet1(parseInt(amount));
    }, 
    hold_bet_2() {
        const amount = $('#bet2-amount').val().substr(1);
        this.placeBet2(parseInt(amount));
    },
    release_bet_1() {
        this.releaseBet1();
    },
    release_bet_2() {
        this.releaseBet2();
    }
}

socket.on('connect', () => {
    console.log('Connected!');
    setConnectionStatus(true);
    socket.emit('get_user', TgApp.initDataUnsafe);
});

socket.on('get_user', (data) => {
    if (data.error) {
        TgApp.closeWithAlert('Alert: ' + data.error)
        return;
    }
    console.log('useraddsfdf:', data.user.wallet_balance);
    Game.setAmount(data.user.wallet_balance);
    Game.setBets(data.bets);
});

socket.on('game_update', (data) => {
    Game.onGameUpdate(data);
});

socket.on('place_bet_ok', (data) => {
    Game.onBetAck(data);
});

socket.on('cancel_bet_ok', (data) => {
    Game.onBetCancelAck(data);
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
    // $("#place-bet-1").css('background', 'linear-gradient(315deg, #FFB800, #FF7800)');
    // $('#place-bet-1 h2').text('Exit');
    Game.hold_bet_1();
    Telegram.WebApp.HapticFeedback.impactOccurred('soft')
});

$("#place-bet-1").on('mouseup touchend', function() {
    console.log('mouseup1');
    // $("#place-bet-1").css('background', 'linear-gradient(315deg, #1157E7, #73EF92)');
    // $('#place-bet-1 h2').text('Place Bet');
    Game.release_bet_1();
    Telegram.WebApp.HapticFeedback.impactOccurred('soft')
});

$("#place-bet-2").on('mousedown touchstart', function() {
    console.log('mousedown2');
    // $("#place-bet-2").css('background', 'linear-gradient(315deg, #FFB800, #FF7800)');
    // $('#place-bet-2 h2').text('Exit');
    Game.hold_bet_2();
    Telegram.WebApp.HapticFeedback.impactOccurred('soft')
});

$("#place-bet-2").on('mouseup touchend', function() {
    console.log('mouseup2');
    // $("#place-bet-2").css('background', 'linear-gradient(315deg, #1157E7, #73EF92)');
    // $('#place-bet-2 h2').text('Place Bet');
    Game.release_bet_2();
    Telegram.WebApp.HapticFeedback.impactOccurred('soft')
});

window.Game = Game;