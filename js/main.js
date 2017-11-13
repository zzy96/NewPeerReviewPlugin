var fs = require('browserify-fs');
var bc = require('./blockchainConnector.js');
var storeName;
var storeId;
var user = "";

window.addEventListener('load', start);

function start(){
	// load some event listener
	document.getElementById('loginButton').addEventListener('click', login);
	document.getElementById('logoutButton').addEventListener('click', logout);
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
	xhttp.open('GET', 'http://188.166.190.168:8000/accounts/logout', true);
    xhttp.send();
}

function login(){
	var xhttp = new XMLHttpRequest();
	xhttp.onreadystatechange = function() {
		if (this.readyState == 4 && this.status == 200) {

			var tokenInput = xhttp.responseText.match(/<input type='hidden' name='csrfmiddlewaretoken' value='[\w]+' \/>/g)[0];
			var token = tokenInput.split("\'")[5];
			console.log('csrfmiddlewaretoken: ' + token);
			var xhttpAgain = new XMLHttpRequest();
			xhttpAgain.onreadystatechange = function() {
				if (this.readyState == 4 && this.status == 200) {
					console.log(xhttpAgain.responseText);
					if (xhttpAgain.responseText.match(/success/g)) {
						fs.writeFile('password.dat', document.getElementById('password').value, function(error){
							if (error){
								console.log(error);
							} else {
								start();
							}
						});
					} else {
						document.getElementById('feedback-msg').innerHTML = `
							<div class='feedback-div alert alert-warning'>
								<p class='feedback-p'>Login Failed!</p>
							</div>
						`;
					}
				}
			}
			xhttpAgain.open('POST', 'http://188.166.190.168:8000/accounts/login/', true);
			var data = new FormData();
			data.append('csrfmiddlewaretoken', token);
			data.append('username', document.getElementById('username').value);
			data.append('password', document.getElementById('password').value);
			xhttpAgain.send(data);
		}
	};
	xhttp.open('GET', 'http://188.166.190.168:8000/accounts/login/', true);
	xhttp.send();
}

function checkLoginStatus(cb){
	// update key and profile from backend server
	console.log("checkLoginStatus");
	var xhttp = new XMLHttpRequest();
	xhttp.onreadystatechange = function() {
		if (this.readyState == 4 && this.status == 200) {
			// Typical action to be performed when the document is ready:
			var response = JSON.parse(xhttp.responseText);
			if (response.login_status == "yes"){
				console.log('account address: ' + response.address);
				bc.storeEthAccount({
					"address": response.address,
					"privateKey": response.encrypted_account
				});
				user = response.username;
				console.log(response.address + " is logged in");
				cb(true);
			} else {
				cb(false);
			}
		}
	};
	xhttp.open('GET', 'http://188.166.190.168:8000/wallet/check/', true);
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
				document.getElementById('profile').innerHTML = `Hello, ` + user + ` <span id="balance">(` + balance + ` Ether <span id="noFund">insufficient balance</span>)</span>`;
			} else {
				document.getElementById('profile').innerHTML = `Hello, ` + user + ` <span id="balance">(` + balance + ` Ether)</span>`;
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
				document.getElementById('reviewForm').style.display = 'block';
				console.log("hahhaahahah");
				document.getElementById('formInputs').reset();
				console.log("6666666");
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
								node = document.createTextNode(review.reviewer);
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
					document.getElementById("storeScore").innerHTML = Math.floor(totalScore/totalReviewAmount);
				} else {
					document.getElementById("storeScore").innerHTML = 0;
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
				review.reviewer = response.username;
				cb(review);
			} else {
				review.reviewer = review.reviewer.slice(0,6)+'..'+review.reviewer.slice(-4);
				cb(review);
			}
		}
	};
	xhttp.open('GET', 'http://188.166.190.168:8000/account/' + review.reviewer, true);
	xhttp.send();
}

function validInput(){
	if (document.getElementById("content").value == ""){
		document.getElementById('feedback-msg').innerHTML = `
		<div class='feedback-div alert alert-warning'>
			<p class='feedback-p'>Empty Review Content!</p>
		</div>
		`;
		return false;
	} else if (!(parseInt(document.getElementById("score").value) == Number(document.getElementById("score").value) && parseInt(document.getElementById("score").value)>=0 && parseInt(document.getElementById("score").value)<=100)){
		document.getElementById('feedback-msg').innerHTML = `
		<div class='feedback-div alert alert-warning'>
			<p class='feedback-p'>Invalid Score!</p>
		</div>
		`;
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
	});
}

function createStoreWrapper(){
	checkBalance(function(flag){
		if (flag){
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
	});
}

function voteReview(reviewer, isUpvote){
	checkBalance(function(flag){
		if (flag){
			// some ui process
			document.getElementById('feedback-msg').innerHTML = `
			<div class='feedback-div alert alert-warning'>
				<p class='feedback-p'>Vote Pending... </p>
			</div>
			`;
			setTimeout(startSearchStore, 10000);
			bc.voteReview(storeId, reviewer, isUpvote, function(error, transactionHash){
				if (error){
					console.log(error);
				} else {
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
			document.getElementById('feedback-msg').innerHTML = `
			<div class='feedback-div alert alert-danger'>
				<p class='feedback-p'>Insufficient Ether Balance!</p>
			</div>
			`;
			cb(false);
		}
	});
}
// End of main.js module
