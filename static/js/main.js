BLOG_URL = "core/";

MONTHS = ["January", "February", "March", "April", "May", "June",
	   "July", "August", "September", "October", "November", "December"];

FIRST_PAGE_LEFT = 0; //px
SECOND_PAGE_LEFT = 170; //px
ANIMATION_OFFSET = 50; //px

ANIMATION_DURATION = 1000; //ms

var customFields = {
	"client": "Client", 
	"project_timeline": "Project Timeline", 
	"responsible_for": "Responsible For",
	"other_info": "Other Information"
};
var allCustomFields;
var contentWrapperHeight;

if(!console) {
	var console = {
		log: function(){}
	}
}

// jQuery settings
jQuery.fx.interval = 24;

var currentLink = "";
var curPageRequestId = 0;

var activeContent = null;
var secondaryContent = null;
var contentGlass = null;
var contentFixed = null;

var aDiv;

$(document).ready(function() {
	console.log("Hi! Welcome to fifthrevision.com.");
	$("#notice").remove();

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

	$("#list-portfolio a").live("mouseover", function(e) {
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
	});

	$("#list-portfolio a").live("mouseout", function(e) {
		aDiv.animate({
			width: 0
		}, 100, function() {
			$(this).remove();
		});
	});

	$(".content a:has(img)").live("click", function(e) {
		e.preventDefault();
		var url = $(e.currentTarget).attr("href");
		var image = $("<img>").attr("src", url);
		setContentToSupportPage(image);
	});

	secondaryContent = $("#secondary-content");
	contentGlass = $("#content-glass");
	contentFixed = $(".content-fixed");
	contentGlass.click(function() {
		contentGlass.css("display", "none");
		fadeOutSupportPage();
	});
	$("#back-button").click(function() {
		contentGlass.css("display", "none");
		fadeOutSupportPage();
	});

	allCustomFields = "";
	for(key in customFields) {
		allCustomFields += (allCustomFields === "") ? key : "," + key;
	}

	request(BLOG_URL, "json=get_category_posts&category_slug=portfolio&include=title,slug,custom_fields&custom_fields=publish_date,alt_text&orderby=meta_value_num&meta_key=publish_date", setPortfolio);
	request(BLOG_URL, "json=get_category_posts&category_slug=writing&include=title,slug&count=5", setWriting);

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

var curLoadScreenIndex = 0;

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

	if(activeContent) {
		if(secondaryContent.css("opacity") > 0) {	
			secondaryContent.animate({
				left: SECOND_PAGE_LEFT + ANIMATION_OFFSET,
				opacity: 0
			}, 500);
		}

		activeContent.animate({
			left: FIRST_PAGE_LEFT + ANIMATION_OFFSET,
			opacity: 0
		}, 500, function() {
			$(this).remove();
		});
	} else {
		$("#loading").animate({
			opacity: 1
		}, 800);
	}

	currentLink = href;
	if(currentLink == "#!/resume") {
		var content = '<iframe src="http://crocodoc.com/CNDALE2?embedded=true" width="800" height="1070" style=""></iframe>';
		curPageRequestId = -1;
		setContentToPage(content, curPageRequestId);
		return;
	}

	href = href.substr(3);
	var urls = href.split("/");
	var action = urls[0];
	var query = "slug=" + urls[1];
	if(action == "post") {
		action = "get_post";
	} else {
		action = "get_page";
	}

	curPageRequestId = request(BLOG_URL, "json=" + action + "&" + query + "&custom_fields=" + allCustomFields + "&dev=1", setContentToPage);
}

function setContentToPage(data, txId) {
	if(txId != curPageRequestId)
		return; // abandon because new pages have been requested

	var content = $("<div class='content'>");
	if(data.page) {
		content.append("<h2>" + data.page.title + "</h2>");
		content.append(data.page.content);
	} else if (data.post) {
		content.append("<h2>" + data.post.title + "</h2>");

		var metadata = $("<div class='metadata'>");
		var ul = $("<ul>");
		for(key in data.post.custom_fields) {
			if(data.post.custom_fields.hasOwnProperty(key)) {
				var li = $("<li>").html("<span class='header'>" + customFields[key] + ": </span>" + data.post.custom_fields[key]);
				ul.append(li);
			}
		}
		content.append(metadata.append(ul));

		content.append(data.post.content);

		if(data.post.categories[0].slug == "writing") {
			var postDate = data.post.date;
			var year = postDate.substr(0, 4);
			var month = parseInt(postDate.substr(5,2)) - 1;
			var date = postDate.substr(8, 2);
			var strDate = "- " + MONTHS[month] + " " + date + ", " + year;
			content.append($("<div class='date'>").text(strDate));
			content.append($("<div class='signature'>"));
		}
	} else {
		content.append(data);
	}
	content.append($("<div class='clear'>"));
	var contentWrapper = $("<div class='content-wrapper'>");
	contentWrapper.append(content);
	$("#loading").after(contentWrapper);
	contentWrapper.css({
		left: FIRST_PAGE_LEFT + ANIMATION_OFFSET,
		opacity: 0,
	});
	activeContent = contentWrapper;
	resizeContentWrappers();
	contentWrapper.animate({
		left: FIRST_PAGE_LEFT,
		opacity: 1
	}, 1000);
}

function setContentToSupportPage(data) {
	contentGlass.css("display", "block");

	var content = secondaryContent.find(".content .content-inner");
	content.empty();
	content.append(data);

	secondaryContent.css({
		left: SECOND_PAGE_LEFT + ANIMATION_OFFSET,
		opacity: 0,
		display: "block"
	});
	resizeContentWrappers();
	secondaryContent.animate({
		left: SECOND_PAGE_LEFT,
		opacity: 1
	}, 1000);
	contentGlass.css("height", contentWrapperHeight);
	// positionSecondaryContent();
}

function positionSecondaryContent() {
		var h = contentFixed.height();
		var t = $(window).scrollTop();
		var targetH = (h + t > contentWrapperHeight - 150) ? contentWrapperHeight - h - 150 : t;
		contentFixed.stop().animate({
			top: targetH
		}, "slow");
}

function fadeOutSupportPage() {
	secondaryContent.animate({
		left: SECOND_PAGE_LEFT + ANIMATION_OFFSET,
		opacity: 0
	}, 1000, function() {
		secondaryContent.css({
			display: "none"
		});
		contentGlass.css("display", "none");
		resizeContentWrappers();
	});
}

function resizeContentWrappers() {
	$(".content").each(function() {
		$(this).css("height", null);
	});

	var height = 0;

	var maxContentDivH = 0;
	if(activeContent) {
		var activeContentDiv = activeContent.children(".content").first();
		maxContentDivH = activeContentDiv.height();
	}

	if (secondaryContent.is(":visible")) {
		var secContentDiv = secondaryContent.children(".content").first();
		if(secContentDiv.height() > maxContentDivH) maxContentDivH = secContentDiv.height();
	}
	maxContentDivH += 150;

	contentWrapperHeight = (maxContentDivH > $(window).height()) ? maxContentDivH : $(window).height();

	$(".content-wrapper").each(function() {
		$(this).css("height", contentWrapperHeight);
	});

	$(".content").each(function() {
		$(this).css("height", contentWrapperHeight - 150);
	});
}

// Retrieve list of documents and fade in

var writingSet = false;

function setWriting(data) {
	var writingList = $("#list-writing");
	for (var i = 0; i < data.posts.length; i++) {
		var a = $("<a>").attr("href", "#!/post/" + data.posts[i].slug).html(data.posts[i].title);
		var li = $("<li>").append(a);
		writingList.append(li);
	}
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

// utils
function preloadImage(imgs) {
	if(imgs.constructor == Array) {
		for (var i = 0; i < imgs.length; i++) {
			var img = document.createElement("img");
			img.src = imgs[i];
		}
	}
}
