#!/bin/bash
# wait for renderer to finish, then encode silent 1080x1920 30fps H.264
while pgrep -f "render.js frames" >/dev/null; do sleep 5; done
n=$(ls /tmp/frames/*.jpg 2>/dev/null | wc -l); echo "frames: $n"
ffmpeg -y -loglevel error -framerate 30 -i /tmp/frames/%05d.jpg -c:v libx264 -preset slow -crf 17 -pix_fmt yuv420p -movflags +faststart -an /home/user/CLAUDE/channels/md-suleman/video/day01-cybersecurity-intro.mp4 && echo ENCODED
