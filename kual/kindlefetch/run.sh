#!/bin/sh
# Launcher script for ShadowBridge extension

# Ensure kterm is used for interactive shell
if [ -f "/mnt/us/extensions/kterm/bin/kterm" ]; then
    /mnt/us/extensions/kterm/bin/kterm -e "sh /mnt/us/extensions/shadowbridge/bin/shadowbridge.sh" -k 1 -o U -s 7
else
    # Fallback to local shell if kterm is missing (might not be interactive/visible on all models)
    sh /mnt/us/extensions/shadowbridge/bin/shadowbridge.sh
fi
