import multiprocessing

# Worker type — gevent lets each worker handle many concurrent connections
# without blocking on I/O (DB queries, Redis, etc.)
worker_class = "gevent"
worker_connections = 1000  # concurrent connections per worker

# One process per CPU core is enough with gevent (I/O concurrency handles the rest)
workers = multiprocessing.cpu_count() * 2 + 1

# Give long-running views (file uploads, etc.) time to complete
timeout = 120
keepalive = 5

bind = "0.0.0.0:8000"

# Log to stdout so systemd / Docker captures it
accesslog = "-"
errorlog = "-"
loglevel = "info"
