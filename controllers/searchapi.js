var youtube = require('youtube-api');
var async = require('async');
var fs = require('fs');
var json2csv = require('json2csv');
var finalResults = [];
var finalResults2 = [];
var totalResults = '';
var inputObject = {};
var count = 0;
var publishAfterTime = '';
var publishBeforeTime = '';

var API_ACCESS_KEY = 'AIzaSyD93zoVXfwOKmkxMFU0LWKvkdzQMdm1yOk';

var nextPageToken;

exports.clickedSearchButton = function(time,done){

	youtube.authenticate({
    type: 'key',
    key: API_ACCESS_KEY,
  });
	finalResults = [];
	finalResults2 = [];
	count = 0;
	inputObject = {};
	inputObject.inputTimeWindow = time;
    search(null,done);
	
}

function search(pageToken,mycall) {
	
	getPublishBeforeAndAfterTime();
	var requestOptions = {
		type: 'playlist',
		part: 'snippet',
		q: '',
		maxResults: '50',
		publishedAfter: publishAfterTime,
        publishedBefore: publishBeforeTime
	}
	if (pageToken) {
		requestOptions.pageToken = pageToken;
	}
	
	var request = youtube.search.list(requestOptions,function(err,response){
		if (err) return console.log("error");
		var resultsArr = [];
		//nextPageToken = response.nextPageToken;
		for(var x in response.items){
			var playlistResult = new Object();
			playlistResult.playlistId = response.items[x].id.playlistId;
			resultsArr.push(playlistResult)			
		}
		for (var i = 0; i < resultsArr.length; i++) {
			finalResults.push(resultsArr[i]);          
		}
		console.log("Got this many id's :" + finalResults.length);
		if(nextPageToken){
			search(nextPageToken,mycall);
		}else{
			getVideoDetails(function(data){
				console.log("Total data came : " + data.length);
				displayfinalResults();
				mycall("success");
			});
		}		
	});		  
}

var finalResults3 = [];

function getVideoDetails(callback){
	
	var i =0 ;
	async.whilst(
	function(){ return i<5;},
	function(cback){playlistInfoRecursive(finalResults[i].playlistId, null,i,finalResults2,callback,cback);
	i++;},
	function(err,done){
		console.log("Ho gaya sab");
	}
	);
}


function playlistInfoRecursive(playlistId,pageToken,num,finalResults2,callback,cback){
	var playlistrequest = youtube.playlistItems.list({
    part: 'snippet',
    pageToken: pageToken,
    maxResults: 50,
    playlistId: playlistId,
	key: API_ACCESS_KEY
  },function(err,response){
	  if(err) return callback({error: err});
	  var videoArr = [];
	  var videoIDString = '';
	  var playlistNextPageToken = response.nextPageToken;
	  async.each(response.items,function(data){
		  var videoResult = new Object();
		  videoResult.videoId = data.snippet.resourceId.videoId;
		  videoResult.channelId = data.snippet.channelId;
		  videoIDString = videoIDString + videoResult.videoId + ",";
		  videoArr.push(videoResult);
	  });
	  
	  var videoIDStringFinal = videoIDString.substring(0, videoIDString.length - 1);
	  var videoIDRequest = youtube.videos.list({
        id: videoIDStringFinal,
		fields : 'items(id,snippet(categoryId),contentDetails(duration),statistics(viewCount,commentCount))',
        part: 'snippet,id,contentDetails,statistics',
        key: API_ACCESS_KEY
      },function(err,response){
		  var categoryIDString = '';
		  async.each(response.items, function(videodata) {
			var videoRequestVideoId = videodata.id;
			  for (var i = 0; i < videoArr.length; i++) {
				if (videoArr[i].videoId === videoRequestVideoId) {
				  videoArr[i].duration = videodata.contentDetails.duration;
				  videoArr[i].viewCount = videodata.statistics.viewCount;
				  videoArr[i].commentCount = videodata.statistics.commentCount;
				  videoArr[i].categoryId = videodata.snippet.categoryId;
				  categoryIDString = categoryIDString + videoArr[i].categoryId + ",";
				  break;
				}
			  }
		  });
		var categoryIDStringFinal = categoryIDString.substring(0, categoryIDString.length - 1);	  
	var categoryIDRequest = youtube.videoCategories.list({
        id: categoryIDStringFinal,
        part: 'snippet',
        key: API_ACCESS_KEY
      },function(err,response){
		  async.each(response.items, function(categdata) {
			var videocategRequestcategoryId = categdata.id;
			  for (var i = 0; i < videoArr.length; i++) {
				if (videoArr[i].categoryId === videocategRequestcategoryId) {
					videoArr[i].category = categdata.snippet.title;
					//
					count++; 	
					finalResults2.push(videoArr[i]);
					//
				}
			  }
		  });
	
	
	  if(playlistNextPageToken){
		  playlistInfoRecursive(playlistId,playlistNextPageToken,num,finalResults2,callback,cback);
	  }else if(!playlistNextPageToken && (num == 4)){
		  callback(finalResults2);
		  cback();
		  	 
	  }else{
		  console.log("Next playlist call :" + count);
		  cback();
	  }	
	  });  
	  });	  
		    	  
  });
}

function displayfinalResults(){
	var datajson = JSON.stringify(finalResults2);
	var youtubeData = JSON.parse( datajson );
	
	var fields = ['videoId','categoryId' , 'category', 'duration', 'viewCount' , 'commentCount', 'channelId' ];
		var csv = json2csv({ data: youtubeData, fields: fields });
		fs.writeFile('outputfile.csv', csv, function(err){
			if (err) throw err;
			  console.log('file saved');
			});	

}

/**  This function takes a date object and returns a UTC formatted date string
 *  @param {object} - Date object
 *  @return {string} - String with the date in UTC format
 */
function convertDateToTimeDateStamp(dateObj) {
  return dateObj.getUTCFullYear() + '-' + formatAsTwoDigitNumber(dateObj.getUTCMonth() + 1) + '-' + formatAsTwoDigitNumber(dateObj.getUTCDate()) + 'T' + formatAsTwoDigitNumber(dateObj.getUTCHours()) + ':' + formatAsTwoDigitNumber(dateObj.getUTCMinutes()) + ':' + formatAsTwoDigitNumber(dateObj.getUTCSeconds()) + 'Z';
}

/**  This function takes a number and returns its two digital string equivalent
 *  @param {number} - number to be converted
 *  @return {string} - number represented as a two digit string
 */
function formatAsTwoDigitNumber(numb) {
  if (numb < 10) {
    return String('0' + numb);
  } else {
    return String(numb);
  }
}

/**  This function calculates the before and after timestamps needed for the API search and stores them in global variables
 */
function getPublishBeforeAndAfterTime() {
  
  //Time comes from drop down option, convert to UTC format
   
    var nowTime_TimeStamp = convertDateToTimeDateStamp(new Date())
    var nowTimeMilliSecs = new Date().getTime();

    //if publishBeforeTime is blank or the user clicked the search button then
    //set publishBeforeTime to current time.  Otherwise we want to use the value
    //from the URL parameter
    
      publishBeforeTime = nowTime_TimeStamp;
    

    //define the before time in milliseconds by subtracting time window from the time right now
    var thresholdTime = 0;

    numberMilliSecondsInHour = 1000 * 60 * 60;
    if (inputObject.inputTimeWindow === 'hour') {
      thresholdTime = nowTimeMilliSecs - numberMilliSecondsInHour;
    } else if (inputObject.inputTimeWindow === '3hours') {
      thresholdTime = nowTimeMilliSecs - (3 * numberMilliSecondsInHour);
    } else if (inputObject.inputTimeWindow === '6hours') {
      thresholdTime = nowTimeMilliSecs - (6 * numberMilliSecondsInHour);
    } else if (inputObject.inputTimeWindow === '9hours') {
      thresholdTime = nowTimeMilliSecs - (9 * numberMilliSecondsInHour);
    } else if (inputObject.inputTimeWindow === '12hours') {
      thresholdTime = nowTimeMilliSecs - (12 * numberMilliSecondsInHour);
    } else if (inputObject.inputTimeWindow === '24hours') {
      thresholdTime = nowTimeMilliSecs - (24 * numberMilliSecondsInHour);
    } else if (inputObject.inputTimeWindow === 'week') {
      thresholdTime = nowTimeMilliSecs - (24 * 7 * numberMilliSecondsInHour);
    } else if (inputObject.inputTimeWindow === '30days') {
      thresholdTime = nowTimeMilliSecs - (24 * 30 * numberMilliSecondsInHour);
    } else if (inputObject.inputTimeWindow === 'year') {
      thresholdTime = nowTimeMilliSecs - (24 * 365.25 * numberMilliSecondsInHour);
    } else {
      thresholdTime = 0
    }

    //if threshold time is 0 then set before to epoch
    if (thresholdTime === 0) {
      publishAfterTime = '1970-01-01T00:00:00Z';
    } else {
      publishAfterTime = convertDateToTimeDateStamp(new Date(thresholdTime));
    } 
}