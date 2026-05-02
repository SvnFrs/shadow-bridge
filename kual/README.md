# ShadowBridge KUAL Extension

This extension allows you to search and download books directly from your Kindle using the ShadowBridge proxy backend.

## Installation

1.  Connect your Kindle to your computer via USB.
2.  Copy the `kindlefetch` folder from this directory to the `extensions` folder on your Kindle's user storage.
3.  **Rename** the folder from `kindlefetch` to `shadowbridge` (so the path is `extensions/shadowbridge/menu.json`).
4.  Open `extensions/shadowbridge/backend.url` and replace `YOUR_PC_IP` with the local IP address of the computer running the ShadowBridge server.
5.  Eject your Kindle.
6.  Open **KUAL** on your Kindle and select **ShadowBridge Search**.

## Prerequisites

- **KUAL** must be installed on your Kindle.
- **kterm** is highly recommended for an interactive search experience. If `kterm` is missing, the script will try to run in the default shell, but it may not be visible on all firmware versions.
- **Active WiFi connection** to reach your ShadowBridge server.

## Features

- **No `jq` dependency**: Uses a custom `sed` parser to work on standard Kindle firmware.
- **Automated Downloads**: Select a book by number to download it directly to your `documents` folder.
- **Library Refresh**: Automatically triggers a framework scan so the book appears in your library without a restart.
