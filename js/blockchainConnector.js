const Web3 = require('web3');
const Tx = require('ethereumjs-tx');

var exports = module.exports = {};

var ethAccount = {};
var isConnected;
var web3 = new Web3(new Web3.providers.HttpProvider('https://kovan.infura.io'));
if (web3){
	console.log('Blockchain connected (via Infura Kovan node)');
	isConnected = true;
}
else{
	console.log('Blockchain not connected(failed to use Infura Kovan testnet node)');
	isConnected = false;
}

const store_abi = [{"constant":true,"inputs":[],"name":"totalReviewAmount","outputs":[{"name":"","type":"uint256"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":true,"inputs":[],"name":"placeID","outputs":[{"name":"","type":"string"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":false,"inputs":[{"name":"_comment","type":"string"},{"name":"_score","type":"uint256"},{"name":"_uploader","type":"address"}],"name":"addReview","outputs":[],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":true,"inputs":[],"name":"totalScore","outputs":[{"name":"","type":"uint256"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":false,"inputs":[{"name":"_voter","type":"address"},{"name":"_reviewer","type":"address"},{"name":"_is_upvote","type":"bool"}],"name":"voteReview","outputs":[],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":true,"inputs":[{"name":"","type":"uint256"}],"name":"allReviews","outputs":[{"name":"comment","type":"string"},{"name":"score","type":"uint256"},{"name":"uploader","type":"address"},{"name":"upvote","type":"uint256"},{"name":"downvote","type":"uint256"},{"name":"creation_blockstamp","type":"uint256"}],"payable":false,"stateMutability":"view","type":"function"},{"inputs":[{"name":"_placeID","type":"string"}],"payable":false,"stateMutability":"nonpayable","type":"constructor"},{"anonymous":false,"inputs":[{"indexed":true,"name":"voter","type":"address"},{"indexed":true,"name":"reviewer","type":"address"},{"indexed":false,"name":"is_upvote","type":"bool"}],"name":"LogVoteAdded","type":"event"}];
const store_registry_abi = [{"constant":false,"inputs":[{"name":"_placeID","type":"string"}],"name":"addStore","outputs":[],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":true,"inputs":[{"name":"","type":"bytes32"}],"name":"registry","outputs":[{"name":"","type":"address"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":true,"inputs":[{"name":"_placeID","type":"string"}],"name":"getStoreAddress","outputs":[{"name":"","type":"address"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":true,"inputs":[{"name":"_placeID","type":"string"}],"name":"storeExist","outputs":[{"name":"","type":"bool"}],"payable":false,"stateMutability":"view","type":"function"},{"anonymous":false,"inputs":[{"indexed":true,"name":"store_address","type":"address"}],"name":"LogStoreCreated","type":"event"}];
const store_registry_address = "0x72a7063B83b9C13Defb3d4D129dFe678E23904ab";

var store_registry_instance = new web3.eth.Contract(store_registry_abi, store_registry_address);

exports.web3IsConnected = function(){
	return isConnected;
}

exports.getEthAccount = function(){
	return ethAccount;
}

exports.storeEthAccount = function(account){
	ethAccount = account;
}

exports.decrypt = function(encrypted, password){
	return web3.eth.accounts.decrypt(encrypted, password);
}

exports.validPrivateKey = function(address, privateKey){
	if (web3.eth.accounts.privateKeyToAccount(privateKey).address == address){
		web3.eth.accounts.wallet.add(privateKey);
		return true;
	} else {
		return false;
	}
}

exports.getBalance = function(cb){
	web3.eth.getBalance(ethAccount.address).then(balance => {
		cb(balance/(10**18));
	});
}

/*
	Blockchain Write
*/

exports.createStore = function(storeId, cb){
	store_registry_instance.methods.addStore(storeId).send({
	    from: ethAccount.address,
	    gas: 4000000,
	    gasPrice: '10000000000'
	}, cb);
}
//End of createStore function

exports.submitReview = function(storeId, content, score, cb){
	store_registry_instance.methods.getStoreAddress(storeId).call()
		.then(store_address => {
			console.log("You are writing review to: " + store_address);
			var store_contract_instance = new web3.eth.Contract(store_abi, store_address);
		    store_contract_instance.methods.addReview(content, score, ethAccount.address).send({
			    from: ethAccount.address,
			    gas: 400000,
			    gasPrice: '10000000000'
			}, cb);
		});
}
//End of submitReview function

exports.voteReview = function(storeId, reviewer, isUpvote, cb){
	store_registry_instance.methods.getStoreAddress(storeId).call()
		.then(store_address => {
			var store_contract_instance = new web3.eth.Contract(store_abi, store_address);
		    store_contract_instance.methods.voteReview(ethAccount.address, reviewer, isUpvote).send({
			    from: ethAccount.address,
			    gas: 400000,
			    gasPrice: '10000000000'
			}, cb);
		});
}
//End of addVote function

/*
	Blockchain Read
*/

exports.storeExist = function(storeId, cb){
	store_registry_instance.methods.getStoreAddress(storeId).call()
		.then(result => {
			console.log('store address: '+result)
			var is_exist;
			if (result == 0x0){
				console.log('Store doesn\'t exist.');
				is_exist = false;
				cb(is_exist);
			}
			else{
				console.log('Store does exist.');
				is_exist = true;
				cb(is_exist);
			}
		});
}
//End of storeExist function

exports.readReviewAmount = function(storeId, cb){
	store_registry_instance.methods.getStoreAddress(storeId).call()
		.then(store_address => {
			var store_contract_instance = new web3.eth.Contract(store_abi, store_address);
		    store_contract_instance.methods.totalReviewAmount().call()
				.then(totalReviewAmount => {
					cb(totalReviewAmount);
				});
		});
}
//End of readReview function

exports.readReview = function(storeId, index, cb){
	store_registry_instance.methods.getStoreAddress(storeId).call()
		.then(store_address => {
			var store_contract_instance = new web3.eth.Contract(store_abi, store_address);
		    store_contract_instance.methods.allReviews(index).call()
				.then(review => {
					cb({
						'comment': review[0],
						'score': review[1],
						'reviewer': review[2],
						'upvote': review[3],
						'downvote': review[4]
					});
				});
		});
}
//End of readReview function

exports.readOverallScore = function(storeId, cb){
	store_registry_instance.methods.getStoreAddress(storeId).call()
		.then(store_address => {
			var store_contract_instance = new web3.eth.Contract(store_abi, store_address);
		    store_contract_instance.methods.totalScore().call()
				.then(totalScore => {
					store_contract_instance.methods.totalReviewAmount().call()
						.then(totalReviewAmount => {
							cb(totalScore, totalReviewAmount);
						});
				});
		});
}
// End of readOverallScore function
