// Variables used by Scriptable.
// These must be at the very top of the file. Do not edit.
// icon-color: deep-green; icon-glyph: download;
// share-sheet-inputs: url;
//
// Copyright 2023 Adrian Robinson
// email: $ echo YWRyaWFuIGRvdCBqIGRvdCByb2JpbnNvbiBhdCBnbWFpbCBkb3QgY29tCg== | base64 --decode
// github: https://github.com/transilluminate/download-station-widget

// requires the amazing Scriptable iOS app (https://scriptable.app)
// place this file into your Scriptable iCloud folder, either in Finder, or path:
// ~/Library/Mobile Documents/iCloud~dk~simonbs~Scriptable/Documents

// set the login details for the Synology
const username = "";
const password = "";

// set your Download Station server URL
// default = "http://synology:5000"
// (note: you can use a Tailscale mesh network to make this seamless)
const server = "http://diskstation:5000";

// Can set the widget on-click action to open the Download Station (optional)
// Set the "When interacting" option on the widget to be:
// "Open URL": https://synology-fqdn.node123.ts.net:8001/index.cgi?launchApp=SYNO.SDS.DownloadStation.Application
// (note: has to be a full qualified domain name with a valid https certificate to be a fully smooth experience)

// variables to fill, do not edit
let serverInfo = {};
let sessionID = "";
let numberOfDownloads = 0;

async function serverRequest(url) {
	try {
		const request = new Request(url);
		const serverResponse = await request.loadJSON();

		if (serverResponse.success == true) {
			console.log('serverRequest() -> success!');
			return serverResponse;
		}
		else {
			console.error(`serverRequest() -> error: ${JSON.stringify(serverResponse)}`);
		}
		
	} catch (error) {
		console.error(`serverRequest(${url}) -> error: ${JSON.stringify(error)}`);
	}
}

async function getServerInfo() {
	const path = "/webapi/query.cgi";
	const url = server + path +
		"?" + "api=SYNO.API.Info" +
		"&" + "version=1" +
		"&" + "method=query" +
		"&" + "query=SYNO.API.Auth,SYNO.DownloadStation.Task";
	return await serverRequest(url);
}

async function getSessionID() {
	const path = "/webapi/" + serverInfo.data["SYNO.API.Auth"].path;
	const url = server + path +
		"?" + "api=SYNO.API.Auth" +
		"&" + "version=3" +
		"&" + "method=login" +
		"&" + "account=" + username +
		"&" + "passwd=" + password +
		"&" + "session=DownloadStation" +
		"&" + "format=sid";
	const serverResponse = await serverRequest(url);
	return serverResponse.data.sid;
}

async function getDownloads() {
	const path = "/webapi/" + serverInfo.data["SYNO.DownloadStation.Task"].path;
	const url = server + path +
		"?" + "api=SYNO.DownloadStation.Task" +
		"&" + "version=1" +
		"&" + "method=list" +
		"&" + "additional=transfer" +
		"&" + "_sid=" + sessionID;
	return await serverRequest(url);
}

async function addDownload(uri) {
	const path = "/webapi/" + serverInfo.data["SYNO.DownloadStation.Task"].path;
	const url = server + path +
		"?" + "api=SYNO.DownloadStation.Task" +
		"&" + "version=2" +
		"&" + "method=create" +
		"&" + "uri=" + uri +
		"&" + "username=" + username +
		"&" + "password=" + password;
	return await serverRequest(url);
}

// From: https://stackoverflow.com/a/14919494
function humanFileSize(bytes, si=true, dp=1) {
	const thresh = si ? 1000 : 1024;
	if (Math.abs(bytes) < thresh) { return bytes + ' B'; }
	const units = si
		? ['kB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB']
		: ['KiB', 'MiB', 'GiB', 'TiB', 'PiB', 'EiB', 'ZiB', 'YiB'];
	let u = -1;
	const r = 10**dp;
	do {
		bytes /= thresh;
		++u;
	} while (Math.round(Math.abs(bytes) * r) / r >= thresh && u < units.length - 1);
	return bytes.toFixed(dp) + ' ' + units[u];
}

function processDownloadTasks(data) {
	let tasks = [];
	const truncate = 40; // default truncate at = 40
	
	for (const i in data) {
		let task = {};
		task.id = data[i].id
		task.title = data[i].title;
		task.shortTitle = (data[i].title.length > truncate) ? data[i].title.slice(0,truncate-1) + '…' : data[i].title;
		task.status = data[i].status;
		task.size = data[i].size;
		task.sizeHuman = humanFileSize( task.size );
		task.downloaded = data[i].additional.transfer.size_downloaded;
		task.downloadedHuman = humanFileSize( task.downloaded );
		task.speedDownload = data[i].additional.transfer.speed_download;
		task.speedDownloadHuman = humanFileSize( task.speedDownload ) + '/s';
		task.speedUpload = data[i].additional.transfer.speed_upload;
		task.speedUploadHuman = humanFileSize( task.speedUpload ) + '/s';
		
		if (task.size > 0) { // avoid divide by 0 (if download is pending)
			task.percentComplete = ((task.downloaded / task.size) * 100).toFixed(1);
		}
		else {
			task.percentComplete = "0"; // don't add the '%' to the end as we sort by numerical later
		}
		if      (task.status == 'waiting')     { task.statusIcon = '💤'; }
		else if (task.status == 'downloading') { task.statusIcon = '⤵️'; }
		else if (task.status == 'seeding')     { task.statusIcon = "⤴️"; }
		else if (task.status == 'paused')      { task.statusIcon = '⏸️'; }
		else if (task.status == 'finished')    { task.statusIcon = "✅"; }
		else if (task.status == 'error')       { task.statusIcon = "⚠️"; }
		else                                   { task.statusIcon = "🔄"; };

		tasks.push(task);
	}
	return tasks;
}

function createWidget(data,widgetSize) {
 
 	if (widgetSize == 'large' || widgetSize == 'medium') {
 	
		let displayDownloads;
		
		if (widgetSize == 'large') {
			displayDownloads = 6;
		}
		else if (widgetSize == 'medium') {
			displayDownloads = 2;
		}
 	
		// sort by percent completed % descending
		data.sort((a, b) => { return b.percentComplete - a.percentComplete; });
 	 	
		const widget = new ListWidget();
  
		let verticalStack = widget.addStack();
		verticalStack.layoutVertically();

			let headerStack = verticalStack.addStack();

			const headerText = "Download Station";
			let headerElement = headerStack.addText(headerText);
			headerElement.font = Font.mediumSystemFont(18);
			headerElement.textColor = Color.blue();
		
			headerStack.addSpacer();
  
			const headerIcon = SFSymbol.named("externaldrive.connected.to.line.below");
			let headerIconElement = headerStack.addImage(headerIcon.image);
			headerIconElement.imageSize = new Size(24,24);
			headerIconElement.tintColor = Color.blue();

		verticalStack.addSpacer(10);

			for (const i in data.slice(0,displayDownloads)) {

				let titleStack = verticalStack.addStack();
    
				let titleText = `${data[i].shortTitle}`;
				let titleElement = titleStack.addText(titleText);
				titleElement.font = Font.mediumSystemFont(12);
				titleElement.textColor = Color.white();

				verticalStack.addSpacer(4);
  
				let subtitleStack = verticalStack.addStack();
				let subtitleText = `${data[i].statusIcon} ${data[i].downloadedHuman} of ${data[i].sizeHuman} (${data[i].percentComplete}%) 🔽 ${data[i].speedDownloadHuman} 🔼 ${data[i].speedUploadHuman}`;
				let subtitleElement = subtitleStack.addText(subtitleText);
				subtitleElement.font = Font.mediumSystemFont(10);
				subtitleElement.textColor = Color.gray();
 	
				verticalStack.addSpacer(10);
			}

		verticalStack.addSpacer();
  
			let footerStack = verticalStack.addStack();
      
			let infoText = `Total number of tasks: ${numberOfDownloads}`;
			let infoElement = footerStack.addText(infoText);
			infoElement.font = Font.mediumSystemFont(9);
			infoElement.textColor = Color.gray();
  
			footerStack.addSpacer();
  
			let now = new Date();
			let h = now.getHours();
			let m = now.getMinutes();
			let s = now.getSeconds();
			h = (h < 10) ? '0' + h : h;
			m = (m < 10) ? '0' + m : m;
			s = (s < 10) ? '0' + s : s;
   
			let uodatedText = `Last updated: ${h}:${m}:${s}`;
			let updatedElement = footerStack.addText(uodatedText);
			updatedElement.font = Font.mediumSystemFont(9);
			updatedElement.textColor = Color.gray();
 
		return widget;
 	
 	}
 	else if (widgetSize == 'small')  {

		let downloading = 0;
		let seeding = 0;
		let finished = 0;
		let tasks = numberOfDownloads;
		
		for (const i in data) {
			if      (data[i].status == 'finished')    { finished++; }
			else if (data[i].status == 'downloading') { downloading++; }
			else if (data[i].status == 'seeding' )    { seeding++; };
		}
 	
 		const widget = new ListWidget();

		let verticalStack = widget.addStack();
		verticalStack.layoutVertically();

			let headerStack = verticalStack.addStack();

			const headerText = "DS";
			let headerElement = headerStack.addText(headerText);
			headerElement.font = Font.mediumSystemFont(24);
			headerElement.textColor = Color.blue();
		
			headerStack.addSpacer();
  
			const headerIcon = SFSymbol.named("externaldrive.connected.to.line.below");
			let headerIconElement = headerStack.addImage(headerIcon.image);
			headerIconElement.imageSize = new Size(24,24);
			headerIconElement.tintColor = Color.blue();

		verticalStack.addSpacer();

		let stack1 = verticalStack.addStack();
		let key1 = stack1.addText('Tasks:');
		key1.font = Font.mediumSystemFont(14);
		key1.textColor = Color.blue();
		stack1.addSpacer();
		let value1 = stack1.addText(`${tasks}`);
		value1.font = Font.mediumSystemFont(14);
		value1.textColor = Color.blue();
		
		verticalStack.addSpacer(2);

		let stack2 = verticalStack.addStack();
		let key2 = stack2.addText('Downloading:');
		key2.font = Font.mediumSystemFont(14);
		key2.textColor = Color.blue();
		stack2.addSpacer();
		let value2 = stack2.addText(`${downloading}`);
		value2.font = Font.mediumSystemFont(14);
		value2.textColor = Color.blue();

		verticalStack.addSpacer(2);

		let stack3 = verticalStack.addStack();
		let key3 = stack3.addText('Seeding:');
		key3.font = Font.mediumSystemFont(14);
		key3.textColor = Color.blue();
		stack3.addSpacer();
		let value3 = stack3.addText(`${seeding}`);
		value3.font = Font.mediumSystemFont(14);
		value3.textColor = Color.blue();

		verticalStack.addSpacer(2);

		let stack4 = verticalStack.addStack();
		let key4 = stack4.addText('Finished:');
		key4.font = Font.mediumSystemFont(14);
		key4.textColor = Color.blue();
		stack4.addSpacer();
		let value4 = stack4.addText(`${finished}`);
		value4.font = Font.mediumSystemFont(14);
		value4.textColor = Color.blue();
		
		return widget;
	}
}

function displayNotification(title,subtitle,body) {
	let n = new Notification();
	n.title = title;
	n.subtitle = subtitle;
	n.body = body;
	n.schedule();
}

if (username && password) {

	// populate variables
	serverInfo = await getServerInfo();
	sessionID = await getSessionID();

	// called from share sheet
	if (args.urls[0]) {
		let url = args.urls[0];
		let serverResponse = await addDownload(url);
		if (serverResponse.success == true) {
			displayNotification('Download Station','Success!',`\nAdded: ${url}`);
		}
		else {
			displayNotification('Download Station','Failure!',`\nError: ${serverResponse}`);
		}
	}

	// main
	if (config.runsInWidget) {

		widgetSize = config.widgetFamily;
		let rawJSON = await getDownloads();
		numberOfDownloads = rawJSON.data.total;

		let formattedJSON = processDownloadTasks(rawJSON.data.tasks);
		let widget = createWidget(formattedJSON,widgetSize);
  
		Script.setWidget(widget);
	}
	else { // test in the app

		widgetSize = 'large';
		let rawJSON = await getDownloads();
		numberOfDownloads = rawJSON.data.total;
	
		let formattedJSON = processDownloadTasks(rawJSON.data.tasks);
		let widget = createWidget(formattedJSON,widgetSize);

		if      (widgetSize == 'large')  { widget.presentLarge();  }
		else if (widgetSize == 'medium') { widget.presentMedium(); }
		else if (widgetSize == 'small')  { widget.presentSmall();  };
	}
}
else {
	// no login credentials!
	displayNotification("Download Station.js Script Error","","No username or password set!");
}
Script.complete();
