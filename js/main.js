var bc = require('./blockchainConnector.js');
var storeName;
var storeId;
var user = "";

window.addEventListener('load', start);

function start(){
	if (checkLoginStatus()){
		loadPage('html/reviewcomponent.html', 'reviewForm', startSearchStore);
	} else {
		loadPage('html/logincomponent.html', 'login', startSearchStore);
	}
}

function loadPage(href, div, cb){
    var xmlhttp = new XMLHttpRequest();
    xmlhttp.open('GET', href, false);
    xmlhttp.send();
    document.getElementById(div).innerHTML = xmlhttp.responseText;
    cb();
}

function checkLoginStatus(){
	// update key and profile from backend server
	if (true){
		bc.storeEthAccount({
			"address": "0x62617E98Bd15B4333D7cDBB5d19D47FD936Ef8eB",
			"privateKey": "0x5b6c27844966d24889cc36616fa0e0c90fef40b0bd14eefe7b852aaf5ccba4cb"
		});
		document.getElementById('logout').style.display = 'block';
		user = "Vitalik";
		return true;
	} else {
		return false;
	}
}

function startSearchStore(){
	if (user != ""){
		document.getElementById('profile').innerHTML = "Hello, " + user;
	}
	console.log("searching...");
	getCurrentTabUrl(display);
}

function getCurrentTabUrl(cb) {
	var queryInfo = {
		active: true,
		currentWindow: true
	};
	chrome.tabs.query(queryInfo, function(tabs){
		var tab = tabs[0];
		var url = tab.url;
		console.assert(typeof url == 'string', 'tab.url should be a string');

		if (bc.web3IsConnected()){
			// if blockchain is connected
			document.getElementById('feedback-msg').innerHTML = `
			<div class='feedback-div alert alert-success'>
				<p class='feedback-p'>Successfully connected to Blockchain!</p>
			</div>
			`;
			// attempt to get a store on google map
			if (getStoreFromUrl(url)){
				document.getElementById('storeName').innerHTML = "Searching for "+storeName+" on Blockchain";
				cb();
			} else {
				document.getElementById('feedback-msg').innerHTML = `
				<div class='feedback-div alert alert-success'>
					<p class='feedback-p'>Successfully connected to Blockchain!</p>
				</div>
				<div class='feedback-div alert alert-warning'>
					<p class='feedback-p'>Please select a store on Google map!</p>
				</div>
				`;
			}
		}
		else{
			// if blockchain is not connected
			document.getElementById('feedback-msg').innerHTML = `
			<div class='feedback-div alert alert-warning'>
				<p class='feedback-p'>Not connected to Blockchain!</p>
			</div>
			`;
		}
	});
}

function getStoreFromUrl(url){
	if (url.match('https://www.google.com.sg/maps/place/')){
		var results = url.split("/");
		storeName = decodeURIComponent(results[5].split('+').join(' '));
		var storeLatLng = results[7].split('!');
		// remove possible ?hl=en at the end of URL
		storeId = results[5].split('+').join('') + "--" + storeLatLng[storeLatLng.length - 2].slice(2).match(/[0-9]+\.[0-9]{3}/g) + "--" + storeLatLng[storeLatLng.length - 1].slice(2).match(/[0-9]+\.[0-9]{3}/g);
		return true;
	} else {
		return false;
	}
}

function display(){
	console.log("display: " + storeId);

	// check if store exists

	bc.storeExist(storeId, function(isExist){

		document.getElementById('storeName').innerHTML = storeName;

		if (isExist){
			document.getElementById('reviewArea').style.display='block';
			if (user != ""){
				document.getElementById('score').value = "";
				document.getElementById('content').value = "";
				document.getElementById('reviewForm').style.display = 'block';
				document.getElementById('submitButton').addEventListener('click', submitReview);
			}
			
			// get blockchain data

			bc.readReviewAmount(storeId, function(totalReviewAmount){
				if (totalReviewAmount == 0){
					document.getElementById('noReview').style.display = 'block';
					return;
				} else{
					document.getElementById('noReview').style.display = 'none';
					console.log("displaying reviews...");
					var tbody = document.getElementById('reviews');
					while(tbody.hasChildNodes()){
						tbody.removeChild(tbody.lastChild);
					}
					var td;
					var node;
					var icon;
					for (var i=0; i<totalReviewAmount; i++){
						bc.readReview(storeId, i, function(review){

							// old review as placeholder in form
							if (user != "" && (bc.getEthAccount())['address'] == review.reviewer){
								document.getElementById('content').value = review.comment;
								document.getElementById('score').value = review.score;
								document.getElementById('submitButton').innerHTML = "Update Your Review ";
								icon = document.createElement('span');
								icon.className = 'glyphicon glyphicon-pencil';
								document.getElementById('submitButton').appendChild(icon);
							}
							var tr = document.createElement('tr');
							// indexing
							td = document.createElement('td');
							node = document.createTextNode(i+1);
							td.appendChild(node);
							td.style['vertical-align'] = 'middle';
							tr.appendChild(td);
							// reviewer
							td = document.createElement('td');
							node = document.createTextNode(review.reviewer.slice(0,6)+'..'+review.reviewer.slice(-4));
							td.appendChild(node);
							td.style['vertical-align'] = 'middle';
							tr.appendChild(td);
							// content
							td = document.createElement('td');
							node = document.createTextNode(review.comment);
							td.appendChild(node);
							td.style['vertical-align'] = 'middle';
							tr.appendChild(td);
							// score
							td = document.createElement('td');
							node = document.createTextNode(review.score);
							td.appendChild(node);
							tr.appendChild(td);
							td.style['vertical-align'] = 'middle';
							tbody.appendChild(tr);
							// votes
							td = document.createElement('td');
							if (user != ""){
								icon = document.createElement('span');
								icon.className = 'glyphicon glyphicon-chevron-up';
								td.appendChild(icon);
								td.appendChild(document.createElement('br'));
								icon.addEventListener('click', voteReview.bind(null, review.reviewer, true));
							}
							node = document.createTextNode(review.upvote - review.downvote);
							td.appendChild(node);
							if (user != ""){
								td.appendChild(document.createElement('br'));
								icon = document.createElement('span');
								icon.className = 'glyphicon glyphicon-chevron-down';
								td.appendChild(icon);
								icon.addEventListener('click', voteReview.bind(null, review.reviewer, false));
							}
							td.style['vertical-align'] = 'middle';
							tr.appendChild(td);
							tbody.appendChild(tr);

						})
					}
				}
			});
			
			bc.readOverallScore(storeId, function(totalScore, totalReviewAmount){
				if (totalReviewAmount != 0){
					document.getElementById("storeScore").innerHTML = totalScore/totalReviewAmount;
				} else {
					document.getElementById("storeScore").innerHTML = 0;
				}
			});

		} else {
			document.getElementById("createStore").style.display = "block";
			document.getElementById("createStore").addEventListener('click',createStoreWrapper);
		}
	});// End of storeExist RPC call
}

function submitReview(){
	var content = document.getElementById("content").value;
	var score = document.getElementById("score").value;
	document.getElementById('submitButton').style.display = "none";
	document.getElementById('reviewForm').style.display = "none";
	document.getElementById('feedback-msg').innerHTML = `
	<div class='feedback-div alert alert-warning'>
		<p class='feedback-p'>Review Pending... </p>
	</div>
	`;

	bc.submitReview(storeId, content, score, function(error, transactionHash){
		setTimeout(function(){
			startSearchStore();
		}, 10000);
	});
}

function createStoreWrapper(){
	document.getElementById('createStore').style.display = "none";

	document.getElementById('feedback-msg').innerHTML = `
	<div class='feedback-div alert alert-warning'>
		<p class='feedback-p'>Creating Store ... </p>
	</div>
	`;

	bc.createStore(storeId, function(error, transactionHash){
		
		if (error){
			document.getElementById('feedback-msg').innerHTML = `
			<div class='feedback-div alert alert-danger'>
				<p class='feedback-p'>Creating Store Failed</p>
			</div>
			`;
			console.log(error);
		} else {
			var refreshCheck = setInterval(function(){
				bc.storeExist(storeId, function(is_exist){
					console.log("waiting...");
					if (is_exist){
						console.log("created!");
						document.getElementById('feedback-msg').innerHTML = `
						<div class='alert alert-success' style='margin: 0px 70px 10px 0px; height:30px;padding:0px'>
						<p style='font-size:17px; text-align:center; vertical-align:center;'>Store Created! </p>
						</div>
						`;
						clearInterval(refreshCheck);
						setTimeout(startSearchStore, 1000);
					}
				});	
			}, 1000);
		}
	});
}

function voteReview(reviewer, isUpvote){
	// some ui process
	bc.voteReview(storeId, reviewer, isUpvote, function(error, transactionHash){
		if (error){
			console.log(error);
		} else {
			// some ui process
		}
	});
}

// End of main.js module
