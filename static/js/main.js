// Copyright (c) 2011 Chong Han Chua

// System Constants
VERSION = 1.5;
BLOG_URL = "core/";

// Constants
MONTHS = ["January", "February", "March", "April", "May", "June",
	   "July", "August", "September", "October", "November", "December"];

FIRST_PAGE_LEFT = 0; //px
LEVEL_PAGE_OFFSET = 170;
SECOND_PAGE_LEFT = 170; //px
ANIMATION_OFFSET = 50; //px
ANIMATION_DURATION = 1000; //ms
FADE_OUT_TIME = 800;
CONTENT_BOTTOM_PAD = 150;
NO_REQUEST_TXID = -255;

var CUSTOM_FIELDS = {
	"client": "Client", 
	"project_timeline": "Project Timeline", 
	"responsible_for": "Responsible For",
	"other_info": "Other Information"
};
var ALL_CUSTOM_FIELDS;
var ACTION_MAP = {
	"post": "get_post",
	"page": "get_page",
	"category": "get_category_posts"
}

var contentWrapperHeight;

var activeContents = [];
var curActiveContent = 0;
var curLoadScreenIndex = 0;

// remove console.log errors
if(!console) {
	var console = {
		log: function(){}
	}
}

// jQuery settings
jQuery.fx.interval = 24;

var currentLink = "";
var curPageRequestId = 0;
var aDiv;

$(document).ready(function() {
	console.log("Hi! Welcome to fifthrevision.com, version " + VERSION);
	$("#notice").remove();

	ALL_CUSTOM_FIELDS = "";
	for(key in CUSTOM_FIELDS) {
		if(CUSTOM_FIELDS.hasOwnProperty(key)) {
			ALL_CUSTOM_FIELDS += (ALL_CUSTOM_FIELDS === "") ? key : "," + key;
		}
	}

	var isiPad = navigator.userAgent.match(/iPad/i) != null;
	if(isiPad) {
		$("body").css({
			width: 1024,
			height: 768
		});
	}

	$("#primary-nav a").live("click", function(e) {
		var href = $(e.currentTarget).attr("href");
		if (href.substr(0,2) != "#!") {
			e.preventDefault();
		}
		navigationHandler(href);
	});

	$(".content-glass").live("click", glassClickHandler);
	$(".back-button").live("click", backButtonClickHandler);

	$("#list-portfolio a").live("mouseover", mouseoverHandler);
	$("#list-portfolio a").live("mouseout", mouseoutHandler);

	$(".content a:has(img)").live("click", function(e) {
		e.preventDefault();
		var url = $(e.currentTarget).attr("href");
		var image = $("<img>").attr("src", url);
		// setContentToSupportPage(image);
		curPageRequestId = NO_REQUEST_TXID;
		setContentToPage(curActiveContent)(image, NO_REQUEST_TXID);
	});
	$(".content a").live("click", function(e) {
		var href = $(e.currentTarget).attr("href");
		if (href.substr(0,2) != "#!") 
			return;

		href = href.substr(3);
		var urls = href.split("/");
		var action = urls[0];

		curPageRequestId = request(BLOG_URL, toRequestString({
			"json": ACTION_MAP[action],
			"slug": urls[1],
			"&custom_fields": ALL_CUSTOM_FIELDS,
			"dev": 1 // This is super weird, JSON plugin is fucked up. need to check
		}), setContentToPage(curActiveContent));
	});

	request(BLOG_URL, toRequestString({
		"json" : "get_category_posts",
		"category_slug": "portfolio",
		"include": ["title","slug","custom_fields"],
		"custom_fields": ["publish_date","alt_text"],
		"orderby": "meta_value_num",
		"meta_key": "publish_date"
	}), setPortfolio);

	request(BLOG_URL, toRequestString({
		"json": "get_category_posts",
		"category_slug": "writing",
		"include": ["title", "slug"],
		"count": 5
	}), setWriting);

	$("#nav-main").animate({
		opacity: 1	
	}, 1500);

	$(window).resize(windowResizeHandler);

	/*$(window).scroll(function(e) {
		positionSecondaryContent();
	});*/

	var host = window.location.host;
	var href = window.location.href;
	var index = href.indexOf(host);
	href = href.substr(index + host.length + 1);
	if(href) {
		navigationHandler(href);
	}
});

function showError() {
	
}

/**
 * Proxy method to request data from the server
 * url - URL to request relative to the host
 * queryStr - query string to be appended after url
 * fn - callback function to call
 **/
function request(url, queryStr, fn) {
	queryStr = queryStr || "";
	var id = new Date().getTime();
	xhr = $.ajax({
		url: url + "?" + queryStr,
		dataType: "json",
		success: function(data) {
			fn(data, this.id);
		},
		error: function(jqXHR, textStatus) {
			showError();
		},
		id: id
	});
	return id;
}

/**
 * Navigation Handler for links clicked on the primary menu
 * href - link contained within the element
 **/
function navigationHandler(href) {
	if (currentLink == href) return;

	// workaround for handling div
	// must have a better way of doing this...
	 if(href.match(/http:\/\/.+/i)) {
		window.open(href, "_blank");	
		return;
	};

	if(href.match(/mailto:.+/i)){
		window.location.href = href;
		return;
	}

	var allLoadScreens = $(".loading");
	for(var i = 0; i < allLoadScreens.length; i++) {
		if (i == curLoadScreenIndex) {
			$(allLoadScreens[i]).css("display", "none");
		} else {
			$(allLoadScreens[i]).css("display", "block");
		}
	}
	curLoadScreenIndex = (++curLoadScreenIndex) % allLoadScreens.length;

	for(var i = curActiveContent - 1; i >= 0; i--) {
		var content = activeContents.pop();
		content.animate({
			left: FIRST_PAGE_LEFT + i * LEVEL_PAGE_OFFSET + ANIMATION_OFFSET,
			opacity: 0
		}, 500, function() {
			$(this).remove();	
		});
	}
	curActiveContent = 0;
	$("#loading").animate({
		opacity: 1
	}, 800);

	currentLink = href;
	if(currentLink == "#!/resume") {
		var content = '<iframe src="http://crocodoc.com/CNDALE2?embedded=true" width="800" height="1070" style=""></iframe>';
		curPageRequestId = NO_REQUEST_TXID;
		setContentToPage(0)(content, NO_REQUEST_TXID);
		return;
	}

	href = href.substr(3);
	var urls = href.split("/");
	var action = urls[0];

	curPageRequestId = request(BLOG_URL, toRequestString({
		"json": ACTION_MAP[action],
		"slug": urls[1],
		"&custom_fields": ALL_CUSTOM_FIELDS,
		"dev": 1 // This is super weird, JSON plugin is fucked up. need to check
	}), setContentToPage(0));
}

/**
 * Mouse Over Handler for hover state links
 * e - jquery event Object 
 */
function mouseoverHandler(e) {
	var curTarget = $(e.currentTarget);
	var alt = curTarget.attr("alt");
	if(!alt) return;

	var pos = curTarget.position();

	aSpan = $("<span style='display:none;font-size:80%'>");
	aSpan.text(alt);
	$("body").append(aSpan);

	var w = aSpan.width() + 10;

	aSpan.remove();

	aDiv = $("<div class='hover-alt'>").css("position", "absolute");
	aDiv.css("left", pos.left + curTarget.width() + 10).css("top", pos.top);
	aDiv.css("width", 1);
	aDiv.append($("<div>").css("width", w).text(alt));
	aDiv.animate({
		width: w
	}, 100);
	$("body").append(aDiv);
}

/**
 * Mouse Out Handler for hover state links
 * e - jquery event Object 
 */
function mouseoutHandler(e) {
	aDiv.animate({
		width: 0
	}, 100, function() {
		$(this).remove();
	});
}

/**
 * Sets a content data structure into a certain "level" in the page
 * level - numerical level, defaults to 0
 *
 * @return
 * a function closure
 */
function setContentToPage(level) {
	level = level || 0;
	return function(data, txId) {
		if(txId != curPageRequestId)
			return; // abandon because new pages have been requested

		var content = $("<div class='content'>");
		if(level > 0) {
			content.append($("<div class='back-button'>"));
		}

		if(data.page) {
			content.append("<h2>" + data.page.title + "</h2>");
			content.append(data.page.content);
		} else if (data.post) {
			content.append("<h2>" + data.post.title + "</h2>");

			var metadata = $("<div class='metadata'>");
			var ul = $("<ul>");
			for(key in data.post.custom_fields) {
				if(data.post.custom_fields.hasOwnProperty(key)) {
					var li = $("<li>").html("<span class='header'>" + CUSTOM_FIELDS[key] + ": </span>" + data.post.custom_fields[key]);
					ul.append(li);
				}
			}
			content.append(metadata.append(ul));
			content.append(data.post.content);

			if(data.post.categories[0].slug == "writing") {
				var postDate = data.post.date;
				var year = postDate.substr(0, 4);
				console.log(postDate.substr(5,2));
				var month = parseInt(postDate.substr(5,2), 10) - 1;
				var date = postDate.substr(8, 2);
				var strDate = "- " + MONTHS[month] + " " + date + ", " + year;
				content.append($("<div class='date'>").text(strDate));
				content.append($("<div class='signature'>"));
			}
		} else if (data.posts) { 
			content.append("<h2>" + data.category.title + "</h2>");
			var ul = $("<ul class='post-list'>");
			for (var i = 0; i < data.posts.length; i++) {
				var a = $("<a>").attr("href", "#!/post/" + data.posts[i].slug).text(data.posts[i].title);
				var li = $("<li>").append(a);
				ul.append(li);
			}
			content.append(ul);
		} else {
			content.append(data);
		}
		
		content.append($("<div class='clear'>"));
		var contentWrapper = $("<div class='content-wrapper'>");
		contentWrapper.addClass("content-wrapper-level-" + level);
		contentWrapper.append(content);
		contentWrapper.append("<div class='content-glass'>");

		if(level == 0) {
			$("#loading").after(contentWrapper);
		} else {
			activeContents[level - 1].after(contentWrapper);
		}

		contentWrapper.css({
			left: FIRST_PAGE_LEFT + level * LEVEL_PAGE_OFFSET + ANIMATION_OFFSET,
			opacity: 0,
		});
		// activeContent = contentWrapper;
		
		for (var i = 0; i < curActiveContent; i++) {
			var aContent = activeContents[i];
			aContent.children(".content-glass").css({
				"display": "block",
				"opacity": 0.01
			}).animate({
				"opacity": 0.4
			});
			
		};

		activeContents.push(contentWrapper);
		curActiveContent = level + 1;
		resizeContentWrappers();
		contentWrapper.animate({
			opacity: 1,
			left: FIRST_PAGE_LEFT + level * LEVEL_PAGE_OFFSET
		}, 1000);
	}
}

/**
 * Event handler for clicking on non top level content
 * e - jquery event object
 */
function glassClickHandler(e) {
	var self = $(e.currentTarget);
	self.css("display", "none");
	var container = self.parent(".content-wrapper");
	var strClass = container.attr("class");
	var longestClass = strClass.split(" ").sort().pop();
	var numLevel = parseInt(longestClass.charAt(longestClass.length - 1), 10);
	fadeOutToLevel(numLevel);
}


/**
 * Event handler for clicking on back button
 * e - jquery event object
 */
function backButtonClickHandler(e) {
	var self = $(e.currentTarget);
	var container = self.parent().parent(".content-wrapper");
	var strClass = container.attr("class");
	var longestClass = strClass.split(" ").sort().pop();
	var numLevel = parseInt(longestClass.charAt(longestClass.length - 1), 10);
	fadeOutToLevel(numLevel - 1);
}

/**
 * Fades out stacked content objects to a certain level
 * level - number value of level to retain
 */
function fadeOutToLevel(level) {
	curActiveContent = level + 1;
	for(var i = activeContents.length; i > curActiveContent; i--) {
		var content = activeContents.pop();
		content.animate({
			left: FIRST_PAGE_LEFT + i * LEVEL_PAGE_OFFSET + ANIMATION_OFFSET,
			opacity: 0
		}, FADE_OUT_TIME, function() {
			$(this).remove();	
		});
	}
	resizeContentWrappers();
}

/**
 * A function to iterate through and resize content wrappers
 * The main use of this function is to ensure the background image stretches
 */
function resizeContentWrappers() {
	$(".content").each(function() {
		$(this).css("height", null);
	});

	var height = 0;

	var maxContentDivH = 0;
	for(var i = 0; i < activeContents.length; i++) {
		var activeContentDiv = activeContents[i].children(".content").first();
		var h = activeContentDiv.height();
		maxContentDivH = (maxContentDivH < h) ? h : maxContentDivH; 
	}
	maxContentDivH += CONTENT_BOTTOM_PAD;

	contentWrapperHeight = (maxContentDivH > $(window).height()) ? maxContentDivH : $(window).height();

	$(".content-wrapper").each(function() {
		$(this).css("height", contentWrapperHeight);
	});

	$(".content").each(function() {
		$(this).css("height", contentWrapperHeight - CONTENT_BOTTOM_PAD);
	});
}

// The following functions provide synchronization for a parallel AJAX request
// upon first load. To coordinate the menu fade in time.
var writingSet = false;

function setWriting(data) {
	var writingList = $("#list-writing");
	for (var i = 0; i < data.posts.length; i++) {
		var a = $("<a>").attr("href", "#!/post/" + data.posts[i].slug).html(data.posts[i].title);
		var li = $("<li>").append(a);
		writingList.append(li);
	}
	var a = $("<a>").attr("href", "#!/category/writing").html("[list all]");
	var li = $("<li>").append(a);
	writingList.append(li);
	writingSet = true;
	fadeIn();
}

var portfolioSet = false;

function setPortfolio(data) {
	var portfolioList = $("#list-portfolio");
	for (var i = 0; i < data.posts.length; i++) {
		var a = $("<a>").attr("href", "#!/post/" + data.posts[i].slug).html(data.posts[i].title);
		if(data.posts[i].custom_fields.alt_text) {
			a.attr("alt", data.posts[i].custom_fields.alt_text);
		}
		var li = $("<li>").append(a);
		portfolioList.append(li);
	}
	portfolioSet = true;
	fadeIn();
}

function fadeIn() {
	if(portfolioSet && writingSet) {
		$("#nav-content").animate({
			opacity: 1
		}, 1000);
	}
}

// resize handler
function windowResizeHandler() {
	resizeContentWrappers();
}

// UTILITIES

/**
 * Preload images
 * imgs - array of image paths in string
 **/
function preloadImage(imgs) {
	if(imgs.constructor == Array) {
		for (var i = 0; i < imgs.length; i++) {
			var img = document.createElement("img");
			img.src = imgs[i];
		}
	}
}

/**
 * Convert JSON object into Request parameters. the main use of this method
 * is to provide readability on AJAX params
 * obj - js object
 *
 * @return
 * string - converted request string
 */
function toRequestString(obj) {
	var str = "";
	for(var key in obj) {
		// check for none null and prototype chain
		if(obj[key] && obj.hasOwnProperty(key)){ 
			str += "&" + key + "=";
			if(obj[key] instanceof Array) {
				str += obj[key].join(",");
			} else {
				str += obj[key];
			}
		}
	}
	return str.substr(1);
}
