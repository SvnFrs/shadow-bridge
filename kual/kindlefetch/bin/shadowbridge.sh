#!/bin/sh
# Kindle-friendly search and download script for ShadowBridge

set -e

# Configuration
EXT_DIR="/mnt/us/extensions/shadowbridge"
URL_FILE="$EXT_DIR/backend.url"
DOCS_DIR="/mnt/us/documents"
TMP_JSON="/tmp/sb_search.json"

# Load backend URL
if [ -f "$URL_FILE" ]; then
    BASE_URL=$(cat "$URL_FILE")
else
    BASE_URL="http://192.168.1.10:3000"
fi

# Simple JSON parser fallback using sed (since Kindle usually lacks jq)
parse_json() {
    # Extract fields using regex: looks for "key":"value" or "key":value
    # Returns: index|source|title|format|url
    grep -o '"source":"[^"]*","title":"[^"]*","author":"[^"]*","sizeMb":[^,]*,"format":"[^"]*","downloadUrl":"[^"]*"' "$TMP_JSON" | \
    sed 's/"source":"\([^"]*\)","title":"\([^"]*\)","author":"[^"]*","sizeMb":[^,]*,"format":"\([^"]*\)","downloadUrl":"\([^"]*\)"/\1|\2|\3|\4/g'
}

main() {
    clear
    echo "========================================"
    echo "       SHADOWBRIDGE KINDLE CLIENT"
    echo "========================================"
    echo "Backend: $BASE_URL"
    echo ""

    printf "Search: "
    read -r QUERY
    if [ -z "$QUERY" ]; then exit 0; fi

    # URL Encoding (simple space to +)
    ENCODED=$(echo "$QUERY" | sed 's/ /+/g')

    echo "Fetching results..."
    if ! curl -fsS "$BASE_URL/api/search?q=$ENCODED" -o "$TMP_JSON"; then
        echo "Error: Could not connect to backend."
        sleep 5
        exit 1
    fi

    echo ""
    echo "Results found:"
    echo "----------------------------------------"

    # Display results with numbers
    # We use a custom parser to avoid dependency on JQ
    IFS='
'
    COUNT=0
    RESULTS=$(parse_json)
    
    if [ -z "$RESULTS" ]; then
        echo "No results found."
        sleep 3
        exit 0
    fi

    for row in $RESULTS; do
        COUNT=$((COUNT + 1))
        SOURCE=$(echo "$row" | cut -d'|' -f1)
        TITLE=$(echo "$row" | cut -d'|' -f2)
        FORMAT=$(echo "$row" | cut -d'|' -f3)
        echo "[$COUNT] ($SOURCE) [$FORMAT] $TITLE"
        
        # Limit to 10 results for screen space
        if [ "$COUNT" -ge 10 ]; then break; fi
    done

    echo "----------------------------------------"
    printf "Enter number to download (or 0 to exit): "
    read -r CHOICE

    if [ "$CHOICE" -gt 0 ] && [ "$CHOICE" -le "$COUNT" ]; then
        SELECTED=$(echo "$RESULTS" | sed -n "${CHOICE}p")
        RAW_URL=$(echo "$SELECTED" | cut -d'|' -f4)
        FILE_TITLE=$(echo "$SELECTED" | cut -d'|' -f2 | sed 's/[^a-zA-Z0-9]/_/g')
        FILE_EXT=$(echo "$SELECTED" | cut -d'|' -f3)
        DEST_PATH="$DOCS_DIR/${FILE_TITLE}.${FILE_EXT}"

        echo "Resolving direct link..."
        # Resolve the URL via the proxy backend
        DL_URL=$(curl -fsS "$BASE_URL/api/resolve?url=$(echo "$RAW_URL" | sed 's/&/%26/g')" | grep -o '"downloadUrl":"[^"]*"' | cut -d'"' -f4)
        
        if [ -z "$DL_URL" ]; then DL_URL="$RAW_URL"; fi

        echo "Downloading to: $DEST_PATH"
        if curl -L "$DL_URL" -o "$DEST_PATH"; then
            echo "Success! The book will appear in your Library soon."
            # Trigger Kindle framework to scan for new files
            dbus-send --system "/default" "com.lab126.powerd.resmResume" > /dev/null 2>&1 || true
        else
            echo "Download failed."
        fi
        sleep 5
    fi
}

main
