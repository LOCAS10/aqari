#!/bin/bash
cd /home/z/my-project
while true; do
  echo "[$(date)] Starting..."
  npx next dev -p 3000 --webpack 2>&1
  echo "[$(date)] Exited, restarting..."
  sleep 2
done
