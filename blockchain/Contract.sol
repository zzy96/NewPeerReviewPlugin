pragma solidity ^0.4.17;

contract Store {

  string public placeID;
  uint256 public totalScore;
  uint256 public totalReviewAmount;
  Review[] public allReviews;
  // map reviewer address with array index +1
  mapping (address => uint256) mappingByReviewer;
  mapping (address => mapping (address => bool) ) voted;
  
  struct Review {
    string comment;
    uint256 score;
    address uploader;
    uint256 upvote;
    uint256 downvote;
    uint256 creation_blockstamp;
  }

  event LogVoteAdded(address indexed voter, address indexed reviewer, bool is_upvote);

  modifier validScore(uint256 _score) {
    require(_score >= 0 && _score <= 100);
    _;
  }

  modifier validVote(address _voter, address _reviewer) { 
    require(voted[_voter][_reviewer] == false);
    _; 
  }

  function Store(string _placeID) public {
    placeID = _placeID;
  }

  function addReview(string _comment, uint256 _score, address _uploader)
    public
    validScore(_score){

      if (mappingByReviewer[_uploader] != 0){
        totalScore = totalScore + _score - allReviews[mappingByReviewer[_uploader] - 1].score;
        allReviews[mappingByReviewer[_uploader] - 1].comment = _comment;
        allReviews[mappingByReviewer[_uploader] - 1].score = _score;
        allReviews[mappingByReviewer[_uploader] - 1].creation_blockstamp = block.timestamp;
      } else {
        totalReviewAmount = totalReviewAmount + 1;
        totalScore = totalScore + _score;
        Review memory new_review;
        new_review.comment = _comment;
        new_review.score = _score;
        new_review.uploader = _uploader;
        new_review.upvote = 0;
        new_review.downvote = 0;
        new_review.creation_blockstamp = block.timestamp;
        allReviews.push(new_review);
        mappingByReviewer[_uploader] = totalReviewAmount;
      }
  }

  function voteReview(address _voter, address _reviewer, bool _is_upvote) 
    public
    validVote(_voter, _reviewer) {

      voted[_voter][_reviewer] = true;
      
      if (_is_upvote){
        allReviews[mappingByReviewer[_reviewer] - 1].upvote += 1;  
      }
      else{
        allReviews[mappingByReviewer[_reviewer] - 1].downvote += 1;   
      }

    LogVoteAdded(_voter, _reviewer, _is_upvote);
  }
     
}

contract StoreRegistry{
  mapping (bytes32 => address) public registry;

  event LogStoreCreated(address indexed store_address);
  
  function addStore(string _placeID) public {
    require(registry[sha256(_placeID)] == 0x0);
    Store newStore = new Store(_placeID);
    registry[sha256(_placeID)] = address(newStore);
    LogStoreCreated(address(newStore));
  }

  function getStoreAddress(string _placeID)
    public constant
    returns (address){
      return registry[sha256(_placeID)]; 
  }

  function storeExist(string _placeID)
    public constant
    returns (bool){
      if (registry[sha256(_placeID)] == 0x0){
        return false;
      } else {
        return true;
      }
  }
}


/**
 * The NewUserFunder contract 
 */
contract NewUserFunder {
  uint256 public initialFunding;
  address public owner;
  mapping (address => bool) fundedAddress;
  
    
    event LogFundingTopUp(address indexed funder, uint256 amount);
    event LogFundingUser(address indexed beneficiary, uint256 amount);

    modifier not_funded_before(address _applicant) { 
      require(fundedAddress[_applicant] == false); 
      _; 
    }

    modifier onlyOwner(address _caller) { 
      require(_caller == owner); 
      _; 
    }
    
    
  function NewUserFunder() {
    owner = msg.sender;
    initialFunding = 10000000000000000; // 0.01 ether
  } 

  function() payable{
    LogFundingTopUp(msg.sender, msg.value);
  }

  function fundRequest(address _receipient)
    public
    not_funded_before(_receipient){
      fundedAddress[_receipient] = true;
      require(_receipient.send(initialFunding));
      LogFundingUser(_receipient, initialFunding);
  }

  function transferFund (address _destination)
    public
    onlyOwner(msg.sender){
      selfdestruct(_destination);
  }
  
}
