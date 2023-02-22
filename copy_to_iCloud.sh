#!/bin/bash

iCloudFolder="${HOME}/Library/Mobile Documents/iCloud~dk~simonbs~Scriptable/Documents/"

if [ -x "$iCloudFolder" ]; then
	echo "Copying to iCloud/Scriptable Folder"
	echo "=> $iCloudFolder"
	cp "./Download Station.js" "$iCloudFolder"
	open "$iCloudFolder"
else
	echo "Whoops! iCloud/Scriptable folder does not exist!"
	echo "=> $iCloudFolder"
fi
