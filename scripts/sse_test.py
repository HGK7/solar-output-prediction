import urllib.request

url = "http://localhost:5000/stream-plan?lat=27.5&lon=71.6"
req = urllib.request.Request(url)
with urllib.request.urlopen(req, timeout=10) as r:
    for i, line in enumerate(r):
        try:
            print(line.decode("utf-8").rstrip())
        except Exception as e:
            print("decode error", e)
        if i > 200:
            break
