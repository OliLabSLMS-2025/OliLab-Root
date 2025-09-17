#!/bin/bash

# This script ensures that Gunicorn, the web server,
# is started correctly to serve the Flask application.
# It makes the application accessible on the network.
gunicorn app:app