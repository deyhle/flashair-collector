# flashair-collector

This is a node.js service to auto-download images from multiple Toshiba FlashAir WiFi SD cards in the network.

## What you need

- Node.js (tested with v8.11.3)
- Multiple cameras that support SDHC SD cards (> 2GB)
- Multiple Toshiba FlashAir Cards (tested with W-02 and W-04 models)
- A network which you control, ideally with static IP Addresses

## Install
Clone the repo, then run `npm install`.

## Setup
It's best do have an own WiFi for the cards and the flashair-collector-server with an own IP range.
Configure your FlashAir cards to connect to that network, the config file on the card should look similar to this:

```
APPMODE=5
APPNETWORKKEY=yourwifipassword
APPSSID=yourSSID
APPNAME=sdcard1
DHCP_Enabled=NO
IP_Address=10.0.14.51
Subnet_Mask=255.255.255.0
Default_Gateway=10.0.14.1
Preferred_DNS_Server=8.8.8.8
Alternate_DNS_Server=10.0.14.1
```

You don't necessarily need Internet connection. I have the router at 10.0.14.1 configured, the cards have IP addresses 10.0.14.51, 10.0.14.52, ... and the name sdcard1, sdcard2 ...

You'll have to register the used cards in `config/default.yml`:

```yml
cards:
  - host: 10.0.14.51
    name: Tisch 1
  - host: 10.0.14.52
    name: Tisch 2
pingInterval: 3000
```

The script will try to connect to all the registered cards at `pingInterval` milliseconds. If it succeeds, it loads the folders and image filenames from the card, checks if the files are already downloaded, and tries to download if not. If it fails, gets a timeout or the card goes offline, it fails silently. When the card comes back online, it will check and try again.
Some console output is provided.

All images are put in `./target`, and prefixed with the card name as configured. It's meant to be used with a hotswap slideshow tool like PhotolivePLUS (Mac App Store).
