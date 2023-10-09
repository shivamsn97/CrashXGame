from bot import tg_app
from telegram.ext import CommandHandler

async def test(update, context):
    await update.message.reply_text('I\'m working!')
    
tg_app.add_handler(CommandHandler('test', test))
