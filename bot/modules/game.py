from bot import tg_app
from telegram.ext import CommandHandler
from telegram import InlineKeyboardButton, InlineKeyboardMarkup, WebAppInfo
import config

async def test(update, context):
    kbd = [[InlineKeyboardButton("Start Game", web_app = WebAppInfo(url=config.GAME_URL))]]
    reply_markup = InlineKeyboardMarkup(kbd)
    await update.message.reply_text('Click the button below.', reply_markup=reply_markup)
    
    
tg_app.add_handler(CommandHandler('game', test))
