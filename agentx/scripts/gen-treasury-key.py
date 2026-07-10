#!/usr/bin/env python3
import base58
from solders.keypair import Keypair

kp = Keypair()
print(base58.b58encode(bytes(kp)).decode())
