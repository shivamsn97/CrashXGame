import hashlib
import hmac
import json
import time

import config


expected = '3db4a0749579386bbfb40a34b338e99c01d520490e03ecc4364dc567e353c566'

token = '6659443263:AAHWDdMi2_8pkeSMYS5DKve7mOOH3bVxhQ0'

secret_key = hmac.new('WebAppData'.encode('utf-8'), bytes(token, 'utf-8'), hashlib.sha256).digest()
print(secret_key)


dcs = '''auth_date=1696924166
query_id=AAGxy11sAAAAALHLXWwKEkfy
user={"id":1818086321,"first_name":"Hola","last_name":"","language_code":"en","allows_write_to_pm":true}'''

key = hmac.new(secret_key, dcs.encode('utf-8'), hashlib.sha256).hexdigest()

print(key)