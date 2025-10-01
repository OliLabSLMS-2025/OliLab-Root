#!/bin/bash

# This script is executed by Render to start the production web server.
# It ensures the script is executable before running Gunicorn.

# Exit immediately if a command exits with a non-zero status.
set -e

# Start the Gunicorn server.
# "app:create_app()" tells Gunicorn to look for the `create_app` factory
# function inside the `app` module (app.py).
gunicorn "app:create_app()"