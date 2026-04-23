#!/bin/bash
cd /home/z/my-project
while true; do
  npx next dev -p 3000 >> dev.log 2>&1
  echo "$(date): Server stopped, restarting in 3s..." >> dev.log
  sleep 3
done
