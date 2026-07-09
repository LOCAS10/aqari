#!/bin/bash
cd /home/z/my-project
while true; do
  echo "[$(date)] Starting server..."
  npx next start -p 3000 2>&1
  echo "[$(date)] Server stopped, restarting in 2s..."
  sleep 2
done
