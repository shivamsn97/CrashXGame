import hashlib
import hmac
import json
import time
from urllib.parse import parse_qs
from flask import Flask, request
from flask_socketio import SocketIO, emit
import config
from game import socketio
import threading
from db import CryptoGameDB, CurrentGame

app = Flask(__name__, static_folder='../static')
app.config['SECRET_KEY'] = 'jirfhw3yug428qwyedvfgrwt238yew'
socketio = SocketIO(app, cors_allowed_origins="*")


class GameHandler:
    def __init__(self):
        self.db = CryptoGameDB(dbname=config.PG_DATABASE, user=config.PG_USER, password=config.PG_PASSWORD, host=config.PG_HOST, port=config.PG_PORT)
        self.current_game = None
        # run the runner thread in the background
        self.runner_thread = threading.Thread(target=self.runner)
        self.runner_thread.daemon = True
        self.runner_thread.start()
        self.waiting_bets = {}
        
    def send_waiting_bets(self):
        for tg_id in self.waiting_bets.keys():
            for bet in self.waiting_bets[tg_id].values():
                if bet['status'] == 'waiting':
                    bet['status'] = 'active'
                    bet['bet_id'] = self.current_game.place_bet(tg_id, bet['amount'])
                    if not bet['bet_id']:
                        bet['status'] = 'waiting'
                        bet['bet_id'] = None
                        continue
                    
    def close_all_bets(self):
        for tg_id in list(self.waiting_bets.keys()):
            for bt in list(self.waiting_bets[tg_id].keys()):
                bet = self.waiting_bets[tg_id][bt]
                if bet['status'] == 'active':
                    self.db.exit_bet(bet['bet_id'], 0)
                    del self.waiting_bets[tg_id][bt]
        
    @staticmethod
    def ticker_callback(data):
        if data['status'] == 'starting':
            socketio.emit('game_update', {
                'update': 'game_start',
                'multiplier': data['multiplier']
            })
        elif data['status'] == 'running':
            socketio.emit('game_update', {
                'update': 'game_update',
                'multiplier': data['multiplier']
            })
        elif data['status'] == 'completed':
            socketio.emit('game_update', {
                'update': 'game_end',
                'multiplier': data['multiplier']
            })
        
    def runner(self):
        while True:
            for i in range(5):
                socketio.emit('game_update', {
                    'update': 'round_start',
                    'time_left_to_start': 5 - i
                })
                time.sleep(1)
            self.start_game()
            self.send_waiting_bets()
            self.current_game.ticker()
            self.close_all_bets()
            time.sleep(2.5)
            self.current_game.end_game()
            
    def new_bet(self, user_id, bet_no, amount):
        print("NEW BET", user_id, bet_no, amount)
        if not user_id in self.waiting_bets:
            self.waiting_bets[user_id] = {}
        if bet_no in self.waiting_bets[user_id]:
            return {
                'error': 'Bet already placed',
                'bet_id': None,
                'amount': amount,
            }
        self.waiting_bets[user_id][bet_no] = {
            'amount': amount,
            'status': 'waiting',
            'bet_id': None
        }
        return {
            'user_id': user_id,
            'bet_no': bet_no,
            'bet_id': None,
            'amount': amount,
        }
        
    def cancel_bet(self, user_id, bet_no):
        print("CANCEL BET", user_id, bet_no)
        if not user_id in self.waiting_bets:
            return {
                'error': 'Bet not found',
                'bet_id': None,
            }
        if not bet_no in self.waiting_bets[user_id]:
            return {
                'error': 'Bet not found',
                'bet_id': None,
            }
        bet = self.waiting_bets[user_id][bet_no]
        if bet['status'] == 'waiting':
            del self.waiting_bets[user_id][bet_no]
            return {
                'success': True,
                'bet_no': bet_no,
                'bet_id': bet['bet_id'],
            }
        else:
            self.current_game.exit_game(bet['bet_id'])
            del self.waiting_bets[user_id][bet_no]
            return {
                'success': True,
                'bet_no': bet_no,
                'bet_id': bet['bet_id'],
            }
        
            
    def start_game(self):
        self.current_game = CurrentGame(self.db)
        self.current_game.start_game(self.ticker_callback)
        
    def get_current_game(self):
        return self.current_game
    
game_handler = GameHandler()

@app.route('/')
def index():
    return 'Hello, world!'

@socketio.on('connect')
def test_connect():
    print('Client connected')

@socketio.on('disconnect')
def test_disconnect():
    print('Client disconnected')
    
@socketio.on('place_bet')
def place_bet(data):
    user = data['user']
    if not check_web_app_signature(user):
        emit('place_bet_ok', {'error': 'Invalid signature'})
        return
    user = game_handler.db.get_user(user['user']['id'])
    if not user:
        emit('place_bet_ok', {'error': 'User not found'})
        return
    amount = data['amount']
    if not isinstance(amount, int):
        emit('place_bet_ok', {'error': 'Invalid amount'})
        return
    if amount < 1:
        emit('place_bet_ok', {'error': 'Invalid amount'})
        return
    if amount > 1000:
        emit('place_bet_ok', {'error': 'Invalid amount'})
        return
    if amount > user['wallet_balance']:
        emit('place_bet_ok', {'error': 'Insufficient funds'})
        return
    r = game_handler.new_bet(user['telegram_id'], data['bet_no'], amount)
    emit('place_bet_ok', r)
    
@socketio.on('cancel_bet')
def cancel_bet(data):
    user = data['user']
    if not check_web_app_signature(user):
        emit('cancel_bet_ok', {'error': 'Invalid signature'})
        return
    user = game_handler.db.get_user(user['user']['id'])
    if not user:
        emit('cancel_bet_ok', {'error': 'User not found'})
        return
    r = game_handler.cancel_bet(user['telegram_id'], data['bet_no'])
    emit('cancel_bet_ok', r)
    

# endpoint to measure latency
@socketio.on('ping')
def ping():
    # time.sleep(random.triangular(0, 1, 0.07))
    emit('pong')

@socketio.on('get_user')
def get_user(user):
    if not user:
        emit('get_user', {'error': 'No user provided'})
        return
    if not check_web_app_signature(user):
        emit('get_user', {'error': 'Invalid signature'})
        return
    try:
        user_id = user['user']['id']
    except:
        emit('get_user', {'error': 'Invalid user'})
        return
    try:
        user = game_handler.db.get_user(user_id)
    except Exception as e:
        emit('get_user', {'error': str(e)})
        return
    if not user:
        emit('get_user', {'error': 'User not found'})
        return
    bets = None
    if user['telegram_id'] in game_handler.waiting_bets:
        bets = game_handler.waiting_bets[user['telegram_id']]
    emit('get_user', {'user': user, 'bets': bets})

        
    
WEBAPP_SECRET_KEY = hmac.new('WebAppData'.encode('utf-8'), config.TG_BOT_TOKEN.encode('utf-8'), hashlib.sha256).digest()


def check_web_app_signature(init_data):
    hash_value = init_data['hash']
    del init_data['hash']
    data_check_string = ''
    for key in sorted(init_data.keys()):
        val = init_data[key]
        if isinstance(val, bool):
            val = str(val).lower()
        elif isinstance(val, int):
            val = str(val)
        elif isinstance(val, dict):
            val = json.dumps(val, separators=(',', ':'))
        data_check_string += key + '=' + val + '\n'
    data_check_string = data_check_string[:-1]
    key = hmac.new(WEBAPP_SECRET_KEY, data_check_string.encode('utf-8'), hashlib.sha256).hexdigest()
    return key == hash_value
    

@app.route('/api/tg_validate', methods=['POST'])
def tg_validate():
    if not check_web_app_signature(request.get_json()['_auth']):
        return {'ok': False, 'error': 'Invalid signature'}
    return {'ok': True}
    



if __name__ == '__main__':
    socketio.run(app, debug=True, use_reloader=False)
