#!/bin/bash
cd /home/z/my-project
while true; do
  echo "[$(date)] Starting server..." >> /tmp/aqari-server.log 2>&1
  npx next start -p 3000 >> /tmp/aqari-server.log 2>&1
  EXIT_CODE=$?
  echo "[$(date)] Server exited with code $EXIT_CODE, restarting in 3s..." >> /tmp/aqari-server.log 2>&1
  sleep 3
done