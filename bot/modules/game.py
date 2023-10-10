from bot import tg_app, db
from telegram.ext import CommandHandler
from telegram import InlineKeyboardButton, InlineKeyboardMarkup, WebAppInfo
import config

async def game(update, context):
    user = db.get_user(update.effective_user.id)
    if not user:
        db.add_user(update.effective_user.id, 100)
    kbd = [[InlineKeyboardButton("Start Game", web_app = WebAppInfo(url=config.GAME_URL))]]
    reply_markup = InlineKeyboardMarkup(kbd)
    await update.message.reply_text('Click the button below.', reply_markup=reply_markup)
    
tg_app.add_handler(CommandHandler('game', game))
