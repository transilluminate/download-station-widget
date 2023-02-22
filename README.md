# Download Station iOS Widget

Simple iOS widget using [Scriptable.app](https://scriptable.app/) to display the status of the downloads on the
[Synology](https://synology.com/) [Download Station](https://www.synology.com/en-us/dsm/packages/DownloadStation).

Accepts links from sharesheets to upload to the Download Station.

Can be set up to work from anywhere using [Tailscale](https://tailscale.com/synology/).

## Installation

- requires the [Scriptable iOS app](https://scriptable.app/)
- place the [Download Station.js](https://raw.githubusercontent.com/transilluminate/download-station-widget/main/Download%20Station.js)
file into your Scriptable iCloud folder, either find it in Finder, or use the file path
`~/Library/Mobile Documents/iCloud~dk~simonbs~Scriptable/Documents`

## On-Click action

- in Scriptable: can set the widget on-click action to open the Download Station (optional)
- open script settings, set the "When interacting" option on the widget to be "Open URL": `https://synology-fqdn.node123.ts.net:8001/index.cgi?launchApp=SYNO.SDS.DownloadStation.Application`
- (note: has to be a full qualified domain name with a valid https certificate to be a fully smooth experience)

## Examples

![Screenshot](https://raw.githubusercontent.com/transilluminate/download-station-widget/main/screenshot.png "Screenshot")
