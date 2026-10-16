import random
def retry_delay(attempt,base=1.0,cap=60.0): return min(cap,base*2**max(0,attempt-1))*random.uniform(.8,1.2)
