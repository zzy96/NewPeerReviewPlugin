var fs = require('browserify-fs');
var SHA3 = require('browserify-sha3');
var bc = require('./blockchainConnector.js');

var storeName;
var storeId;
var user = "";
var server = "http://188.166.190.168:3000/";

window.addEventListener('load', start);

function start(){
	// load some event listener
	document.getElementById('loginButton').addEventListener('click', login);
	document.getElementById('signupButton').addEventListener('click', signup);
	document.getElementById('logoutButton').addEventListener('click', logout);
	document.getElementById('viewHistoryButton').addEventListener('click', viewHistory);
	checkLoginStatus(function(status){
		if (status){
			document.getElementById('login').style.display = 'none';
			document.getElementById('logout').style.display = 'block';
			unlockAccount(function(status){
				if (status){
					console.log("Account unlock success");
				} else {
					console.log("Account unlock fail");
				}
			});
		} else {
			document.getElementById('login').style.display = 'block';
			document.getElementById('logout').style.display = 'none';
		}
		startSearchStore();
	});
}

function logout(){
    var xhttp = new XMLHttpRequest();
    xhttp.onreadystatechange = function() {
		if (this.readyState == 4 && this.status == 200) {
			user = "";
			document.getElementById('submitButton').innerHTML = "Submit Your Review ";
			document.getElementById('reviewForm').style.display = "none";
			document.getElementById('profile').innerHTML = "Welcome to Blockchain Review System";
			start();
		}
	}
	xhttp.open('GET', server + 'logout', true);
    xhttp.send();
}

function login(){
	var xhttp = new XMLHttpRequest();
	xhttp.onreadystatechange = function() {
		if (this.readyState == 4 && this.status == 200) {
			var response = JSON.parse(xhttp.responseText);
			console.log(response);
			if (response.status == 'success') {
				fs.writeFile('password.dat', sha3.digest('hex'), function(error){
					if (error){
						console.log(error);
					} else {
						start();
					}
				});
			} else {
				displayMessage('warning', "Login Failed!");
			}
		}
	}
	xhttp.open('POST', server + 'login', true);
	var sha3 = new SHA3.SHA3Hash();
	sha3.update(document.getElementById('password').value);
	var data = {
  	"username": document.getElementById('username').value,
  	"hashedPassword": sha3.digest('hex')
  }
  xhttp.setRequestHeader("Content-Type", "application/json");
	xhttp.send(JSON.stringify(data));
}

function signup(){
	if (document.getElementById('username').value == "" || document.getElementById('password').value == ""){
		displayMessage('warning', "Empty Input!");
	} else {
		var xhttp = new XMLHttpRequest();
		xhttp.onreadystatechange = function() {
			if (this.readyState == 4 && this.status == 200) {
				var response = JSON.parse(xhttp.responseText);
				console.log(response);
				if (response.status == 'success') {
					fs.writeFile('password.dat', sha3.digest('hex'), function(error){
						if (error){
							console.log(error);
						} else {
							start();
						}
					});
				} else {
					displayMessage('warning', "Signup Failed!");
				}
			}
		}
		xhttp.open('POST', server + 'signup', true);
		var sha3 = new SHA3.SHA3Hash();
		sha3.update(document.getElementById('password').value);
		var data = {
	  	"username": document.getElementById('username').value,
	  	"hashedPassword": sha3.digest('hex')
	  }
	  xhttp.setRequestHeader("Content-Type", "application/json");
		xhttp.send(JSON.stringify(data));
	}
}

function checkLoginStatus(cb){
	// update key and profile from backend server
	console.log("checkLoginStatus");
	var xhttp = new XMLHttpRequest();
	xhttp.onreadystatechange = function() {
		if (this.readyState == 4 && this.status == 200) {
			// Typical action to be performed when the document is ready:
			var response = JSON.parse(xhttp.responseText);
			console.log(response);
			if (response.username != ""){
				console.log('account address: ' + response.address);
				bc.storeEthAccount({
					"address": response.address,
					"privateKey": response.encryptedAccount
				});
				user = response.username;
				console.log(response.address + " is logged in");
				cb(true);
			} else {
				cb(false);
			}
		}
	};
	xhttp.open('GET', server + 'loginstatus', true);
	xhttp.send();
}

function unlockAccount(cb){
	fs.readFile('password.dat', 'utf-8', function(err, data) {
        var privateKey = bc.decrypt(bc.getEthAccount().privateKey, data);
		if (bc.validPrivateKey(bc.getEthAccount().address, privateKey.privateKey)){
			cb(true);
		} else {
			cb(false);
		}
  });
}

function startSearchStore(){
	if (user != ""){
		bc.getBalance(function(balance){
			if (balance < 0.04){
				document.getElementById('profile').innerHTML = `Hello, ` + user + ` <br><span id="balance"><span class="glyphicon glyphicon-credit-card"></span><span id="noFund"> ` + balance + `</span> Ether</span>`;
			} else {
				document.getElementById('profile').innerHTML = `Hello, ` + user + ` <br><span id="balance"><span class="glyphicon glyphicon-credit-card"></span> ` + balance + ` Ether</span>`;
			}
		});
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
			if (user != ""){
				document.getElementById('feedback-msg').innerHTML = `
					<div class='feedback-div alert alert-success'>
						<p class='feedback-p' style='font-size:14px;'>User Address: ${bc.getEthAccount().address}</p>
					</div>
				`;
				// displayMessage('success', bc.getEthAccount().address);
			} else {
				displayMessage('success', "Successfully connected to Blockchain!");
			}
			// attempt to get a store on google map
			if (getStoreFromUrl(url)){
				document.getElementById('storeName').innerHTML = "Searching for "+storeName+" on Blockchain";
				cb();
			} else {
				if (user != ""){
					document.getElementById('feedback-msg').innerHTML = `
						<div class='feedback-div alert alert-success'>
							<p class='feedback-p' style='font-size:14px;'>User Address: ${bc.getEthAccount().address}</p>
						</div>
						<div class='feedback-div alert alert-warning'>
							<p class='feedback-p'>Please select a store on Google map!</p>
						</div>
					`;
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
		}
		else{
			// if blockchain is not connected
			displayMessage('warning', "Not connected to Blockchain!");
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
				document.getElementById('reviewForm').style.display = 'block';
				document.getElementById('formInputs').reset();
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

							// display reviews
							addressToUsername(review, function(review){
								var tr = document.createElement('tr');
								// reviewer
								td = document.createElement('td');
								node = document.createTextNode(review.username);
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
								td.style['vertical-align'] = 'middle';
								tr.appendChild(td);
								tbody.appendChild(tr);
								// votes
								td = document.createElement('td');

								node = document.createTextNode(review.upvote + " ");
								td.appendChild(node);

								icon = document.createElement('span');
								icon.className = 'glyphicon glyphicon-thumbs-up';
								// icon.className = 'glyphicon glyphicon-chevron-up';
								td.appendChild(icon);
								if (user != ""){
									icon.addEventListener('click', voteReview.bind(null, review.reviewer, true));
								}

								node = document.createElement('br');
								td.appendChild(node);

								node = document.createTextNode(review.downvote + " ");
								td.appendChild(node);

								icon = document.createElement('span');
								icon.className = 'glyphicon glyphicon-thumbs-down';
								// icon.className = 'glyphicon glyphicon-chevron-down';
								td.appendChild(icon);
								if (user != ""){
									icon.addEventListener('click', voteReview.bind(null, review.reviewer, false));
								}

								td.style['vertical-align'] = 'middle';
								tr.appendChild(td);
								tbody.appendChild(tr);
							});

						});
					}
				}
			});
			
			bc.readOverallScore(storeId, function(totalScore, totalReviewAmount){
				if (totalReviewAmount != 0){
					document.getElementById("storeScore").innerHTML = "(Overall Score: " + Math.floor(totalScore/totalReviewAmount) + ")";
				} else {
					document.getElementById("storeScore").innerHTML = "(Overall Score: 0)";
				}
			});

		} else {
			if (user != ""){
				document.getElementById("createStore").style.display = "block";
				document.getElementById("createStore").addEventListener('click',createStoreWrapper);
			}
		}
	});// End of storeExist RPC call
}

function addressToUsername(review, cb){
	var xhttp = new XMLHttpRequest();
	xhttp.onreadystatechange = function() {
		if (this.readyState == 4 && this.status == 200) {
			var response = JSON.parse(xhttp.responseText);
			if (response.username != ""){
				review.username = response.username;
				cb(review);
			} else {
				review.username = review.reviewer.slice(0,6)+'..'+review.reviewer.slice(-4);
				cb(review);
			}
		}
	};
	xhttp.open('GET', server + 'address/' + review.reviewer, true);
	xhttp.send();
}

function validInput(){
	if (document.getElementById("content").value == ""){
		displayMessage('warning', "Empty Review Content!");
		return false;
	} else if (!(parseInt(document.getElementById("score").value) == Number(document.getElementById("score").value) && parseInt(document.getElementById("score").value)>=0 && parseInt(document.getElementById("score").value)<=100)){
		displayMessage('warning', "Invalid Score!");
		return false;
	} else {
		return true;
	}
}

function submitReview(){
	if (!validInput()){
		return false;
	}
	checkBalance(function(flag){
		if (flag){
			var content = document.getElementById("content").value;
			var score = document.getElementById("score").value;
			document.getElementById('reviewForm').style.display = "none";
			displayMessage('warning', "Review Pending...");

			bc.submitReview(storeId, content, score, function(error, transactionHash){
				if (error){
					console.log(error);
					displayMessage('danger', "Review Failed!");
				} else {
					bc.getBalance(function(balance){
						recordHistory(transactionHash, balance, 'submit review');
					});
					startSearchStore();
				}
			});
		}
	});
}

function createStoreWrapper(){
	checkBalance(function(flag){
		if (flag){
			document.getElementById('createStore').style.display = "none";

			displayMessage('warning', "Creating Store ...");

			bc.createStore(storeId, function(error, transactionHash){
				
				if (error){
					console.log(error);
					displayMessage('danger', "Creating Store Failed!");
				} else {
					bc.getBalance(function(balance){
						recordHistory(transactionHash, balance, 'create store');
					});
					var refreshCheck = setInterval(function(){
						bc.storeExist(storeId, function(is_exist){
							console.log("waiting...");
							if (is_exist){
								console.log("created!");
								displayMessage('success', "Store Created!");
								clearInterval(refreshCheck);
								startSearchStore();
							}
						});	
					}, 1000);
				}
			});
		}
	});
}

function voteReview(reviewer, isUpvote){
	checkBalance(function(flag){
		if (flag){
			// some ui process
			displayMessage('warning', "Vote Pending...");
			bc.voteReview(storeId, reviewer, isUpvote, function(error, transactionHash){
				if (error){
					console.log(error);
					displayMessage('danger', "Vote Failed!");
				} else {
					bc.getBalance(function(balance){
						recordHistory(transactionHash, balance, 'vote review');
					});
					startSearchStore();
					// some ui process
				}
			});
		}
	});
	
}

function checkBalance(cb){
	bc.getBalance(function(balance){
		if (balance > 0.04){
			cb(true);
		} else {
			displayMessage('danger', "Insufficient Ether Balance!");
			cb(false);
		}
	});
}

function displayMessage(type, message){
	document.getElementById('feedback-msg').innerHTML = `
		<div class='feedback-div alert alert-${type}'>
			<p class='feedback-p'>${message}</p>
		</div>
	`;
}

function recordHistory(hash, balance, type){
	var xhttp = new XMLHttpRequest();
	xhttp.onreadystatechange = function() {
		if (this.readyState == 4 && this.status == 200) {
			console.log(xhttp.responseText);
		}
	}
	xhttp.open('POST', server + 'history/' + user, true);
	var data = {
  	"hash": hash,
  	"type": type,
  	"balance": balance
  }
  xhttp.setRequestHeader("Content-Type", "application/json");
	xhttp.send(JSON.stringify(data));
}

function viewHistory(){
	if (document.getElementById('viewHistoryButton').innerHTML == "View History"){
		var xhttp = new XMLHttpRequest();
		xhttp.onreadystatechange = function() {
			if (this.readyState == 4 && this.status == 200) {
				var response = JSON.parse(xhttp.responseText);
				console.log(response);
				if (response.length != 0){
					document.getElementById('noTransaction').style.display = "none";
					console.log("displaying history...");
					var tbody = document.getElementById('transactions');
					while(tbody.hasChildNodes()){
						tbody.removeChild(tbody.lastChild);
					}
					var td;
					var node;
					var link;
					for (var i=0; i<response.length; i++){
						var tr = document.createElement('tr');
						// txhash
						td = document.createElement('td');
						link = document.createElement('a');
						link.setAttribute('href', "https://kovan.etherscan.io/tx/" + response[i].hash);
						link.setAttribute('target', "_blank");
						node = document.createTextNode(response[i].hash.slice(0,6)+'..'+response[i].hash.slice(-4));
						link.appendChild(node);
						td.appendChild(link);
						td.style['vertical-align'] = 'middle';
						tr.appendChild(td);
						// type
						td = document.createElement('td');
						node = document.createTextNode(response[i].type);
						td.appendChild(node);
						td.style['vertical-align'] = 'middle';
						tr.appendChild(td);
						// balance
						td = document.createElement('td');
						node = document.createTextNode(response[i].balance);
						td.appendChild(node);
						td.style['vertical-align'] = 'middle';
						tr.appendChild(td);

						tbody.appendChild(tr);
					}
				}
			}
		}
		xhttp.open('GET', server + 'history/' + user, true);
		xhttp.send();
		document.getElementById('history').style.display = "block";
		document.getElementById('reviewArea').style.display = "none";
		document.getElementById('viewHistoryButton').innerHTML = "View Review";
	} else {
		document.getElementById('history').style.display = "none";
		document.getElementById('viewHistoryButton').innerHTML = "View History";
		startSearchStore();
	}
}
// End of main.js module
