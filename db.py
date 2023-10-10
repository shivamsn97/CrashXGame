import time
import psycopg2
import threading
import random

class InsufficientBalanceError(ValueError):
    def __init__(self, user_id, current_amount, required_amount, *args, **kwargs):
        message = f'Insufficient balance in wallet. User ID: {user_id}, Current amount: {current_amount}, Required amount: {required_amount}'
        super().__init__(message)        


class CryptoGameDB:
    """
    create a postgresql database wrapper class for a crypto game with the following features:

    - Users - ablility to register new users and query them. Users should be identified by telegram ID, which is a BIGINT
    - Wallet - Keep a wallet and transactions for each users. Default balance should be zero
    - Game - Keep a track of all games happening. A game has a unique ID, and a value of that game - for eg the game could result as 6 times.
    - Bets - A record of all bets. A user can bet on the current game for a specific amount. A user can place atmost two bets on the same game. It should have the amount the user has used to place the bet, which should be deducated from the wallet of the user, and a multiplier value that will indicate the value at which the user has exited the bet. A amount equal to the bet amount multiplied by the multiplier should be added back to the wallet of the user. In case user don't exit the bet by time, the multiplier value should be NULL, and no amount should be added back to the user's wallet.

    """
    def __init__(self, dbname, user, password, host, port):
        self.conn = psycopg2.connect(
            dbname=dbname,
            user=user,
            password=password,
            host=host,
            port=port
        )
        self.cur = self.conn.cursor()
        self.lock = threading.Lock()
        self.create_tables()
        
    def create_tables(self):
        with self.lock:
            self.cur.execute('''
                CREATE TABLE IF NOT EXISTS users (
                    telegram_id BIGINT PRIMARY KEY,
                    wallet_balance DOUBLE PRECISION NOT NULL DEFAULT 0
                );
            ''')
            self.cur.execute('''
                CREATE TABLE IF NOT EXISTS games (
                    game_id SERIAL PRIMARY KEY,
                    game_value INTEGER NOT NULL
                );
            ''')
            self.cur.execute('''
                CREATE TABLE IF NOT EXISTS bets (
                    bet_id SERIAL PRIMARY KEY,
                    telegram_id BIGINT REFERENCES users(telegram_id),
                    game_id INTEGER REFERENCES games(game_id),
                    bet_amount INTEGER NOT NULL,
                    multiplier INTEGER,
                    exit_time TIMESTAMP
                );
            ''')
            self.cur.execute('''
                CREATE TABLE IF NOT EXISTS transactions (
                    transaction_id SERIAL PRIMARY KEY,
                    telegram_id BIGINT REFERENCES users(telegram_id),
                    transaction_amount DOUBLE PRECISION NOT NULL,
                    remarks TEXT,
                    transaction_time TIMESTAMP
                );        
            ''')
            self.conn.commit()
        
    def add_user(self, telegram_id, amount = 0):
        with self.lock:
            self.cur.execute('''
                INSERT INTO users (telegram_id, wallet_balance) VALUES (%s, %s)
            ''', (telegram_id, amount))
            self.conn.commit()
        
    def get_user(self, telegram_id):
        with self.lock:
            self.cur.execute('''
                SELECT * FROM users WHERE telegram_id = %s
            ''', (telegram_id,))
            rtn = self.cur.fetchone()
            if not rtn:
                return None
            return {
                'telegram_id': rtn[0],
                'wallet_balance': rtn[1]
            }
        
    def credit(self, telegram_id, transaction_amount, remarks):
        if transaction_amount <= 0:
            raise ValueError('Amount must be greater than 0')
        with self.lock:
            self.cur.execute('''
                INSERT INTO transactions (telegram_id, transaction_amount, remarks) VALUES (%s, %s, %s)
            ''', (telegram_id, transaction_amount, remarks))
            self.cur.execute('''
                UPDATE users SET wallet_balance = wallet_balance + %s WHERE telegram_id = %s
            ''', (transaction_amount, telegram_id))
            self.conn.commit()
            
    def debit(self, telegram_id, transaction_amount, remarks):
        if transaction_amount <= 0:
            raise ValueError('Amount must be greater than 0')
        with self.lock:
            self.cur.execute('''
                SELECT wallet_balance FROM users WHERE telegram_id = %s
            ''', (telegram_id,))
            wallet_balance = self.cur.fetchone()[0]
            if wallet_balance < transaction_amount:
                raise InsufficientBalanceError(telegram_id, wallet_balance, transaction_amount)
            self.cur.execute('''
                INSERT INTO transactions (telegram_id, transaction_amount, remarks) VALUES (%s, %s, %s)
            ''', (telegram_id, transaction_amount, remarks))
            self.cur.execute('''
                UPDATE users SET wallet_balance = wallet_balance - %s WHERE telegram_id = %s RETURNING wallet_balance
            ''', (transaction_amount, telegram_id))
            wallet_balance = self.cur.fetchone()[0]
            self.conn.commit()
            return wallet_balance
        
    def add_game(self, game_value):
        with self.lock:
            self.cur.execute('''
                INSERT INTO games (game_value) VALUES (%s) RETURNING game_id
            ''', (game_value,))
            game_id = self.cur.fetchone()[0]
            self.conn.commit()
            return game_id
        
    def get_game(self, game_id):
        with self.lock:
            self.cur.execute('''
                SELECT * FROM games WHERE game_id = %s
            ''', (game_id,))
            return self.cur.fetchone()
        
    def add_bet(self, telegram_id, game_id, bet_amount, multiplier):
        user = self.get_user(telegram_id)
        if user is None:
            raise ValueError('User does not exist')
        self.debit(telegram_id, bet_amount, f'Placed bet on game #{game_id}')
        with self.lock:
            self.cur.execute('''
                INSERT INTO bets (telegram_id, game_id, bet_amount, multiplier) VALUES (%s, %s, %s, %s) RETURNING bet_id
            ''', (telegram_id, game_id, bet_amount, multiplier))
            bet_id = self.cur.fetchone()[0]
            self.conn.commit()
            return bet_id
        
    def get_bet(self, bet_id):
        with self.lock:
            self.cur.execute('''
                SELECT * FROM bets WHERE bet_id = %s
            ''', (bet_id,))
            return self.cur.fetchone()
        
    def exit_bet(self, bet_id, multiplier):
        bet = self.get_bet(bet_id)
        with self.lock:
            self.cur.execute('''
                UPDATE bets SET multiplier = %s, exit_time = NOW() WHERE bet_id = %s
            ''', (multiplier, bet[0]))
            self.conn.commit()
        if multiplier > 0:
            self.credit(bet[1], bet[3] * multiplier, f'Exited bet #{bet[0]}')
            

class CurrentGame:
    """
    A class to handle the current game that is happening.
    """
    def __init__(self, db: CryptoGameDB):
        self.db = db
        self.current_game_id = None
        self.current_game_multiplier = None
        self.multiplier = 1
        self.emitter_callback = None
        self.bets = dict()
        
    @staticmethod
    def generate_multiplier(E=100):
        return 12
        H = random.random() * E * 0.99
        if(H % 33 == 0):
            return 1
        val = (100 * E - H) / (E - H) / 100
        if val <= 1:
            return 1
        return val
    
    def start_game(self, emitter_callback):
        """
        A function to start a new game.
        """
        self.current_game_multiplier = self.generate_multiplier()
        self.current_game_id = self.db.add_game(self.current_game_multiplier)
        if not emitter_callback:
            raise ValueError('No emitter callback found')
        self.emitter_callback = emitter_callback
        
    def ticker(self):
        '''
        Continuously running function to emit the multiplier starting from 1 to the current multiplier at an interval of 0.5 seconds. Should be time based, not sleep based.
        '''
        if self.current_game_id is None:
            raise ValueError('No active game found')
        ct = time.time()
        self.emitter_callback({
            'game_id': self.current_game_id,
            'status': 'starting',
            'multiplier': self.multiplier,
            'bets': self.bets
        })
        ai = 0
        while True:
            ct = time.time()
            if self.multiplier >= self.current_game_multiplier:
                break
            self.multiplier += 0.03
            if ai % 5 == 0:
                self.emitter_callback({
                    'game_id': self.current_game_id,
                    'status': 'running',
                    'multiplier': self.multiplier,
                    'bets': self.bets
                })
            ai = (ai + 1) % 10
            time.sleep(0.1 - (time.time() - ct))
            ct = time.time()
        self.emitter_callback({
            'game_id': self.current_game_id,
            'status': 'completed',
            'multiplier': self.multiplier,
            'bets': self.bets
        })
        self.end_game()
        
    def place_bet(self, telegram_id, bet_amount):
        """
        A function to let a user place a bet on the current game.
        """
        if self.current_game_id is None:
            raise ValueError('No active game found')
        bet_id = self.db.add_bet(telegram_id, self.current_game_id, bet_amount, self.current_game_multiplier)
        self.bets[bet_id] = {
            'telegram_id': telegram_id,
            'bet_amount': bet_amount,
            'multiplier': None
        }
        return bet_id
        
    def exit_game(self, bet_id, multiplier = None):
        """
        A function to let a user exit the current game.
        """
        if multiplier is None:
            multiplier = self.multiplier
        if self.current_game_id is None:
            raise ValueError('No active game found')
        bet = self.db.get_bet(bet_id)
        if bet is None:
            raise ValueError('No such bet found')
        if bet[2] != self.current_game_id:
            raise ValueError('Bet is not for the current game')
        self.bets[bet_id]['multiplier'] = multiplier
        self.db.exit_bet(bet[0], multiplier)
        
    def end_game(self):
        """
        A function to end the current game and start a new one.
        """
        self.current_game_id = None
        self.current_game_multiplier = None
