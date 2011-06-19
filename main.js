var step = require("./step.js"),
	http = require("http"),
	server = require("./server.js");

HOST = "127.0.0.1";
PORT = 8080;

server.setStaticPath("/static");

server.addAlias("/", "/index.html");
server.addHandler("/test", function(req, res) {
	res.writeHead(200, {
		"Content-Type": "text/plain"
	});
	res.write("All your base are belong to us");
	res.end();
});

server.addHandler("/core/", proxy);

server.start(HOST, PORT);

function proxy(req, res, query) {
	var url = "fifthrevision.com";

	//var queryStr = JSON.stringify(query);
	
	var queryStr = "";
	for (var a in query) {
		queryStr += "&" + a + "=" + query[a];
	}
	queryStr = queryStr.substr(1);

	var r = http.request({
		host: url,
		port: 80,
		method: "GET",
		path: "/core/?" + queryStr
	}).on("response", function(resp) {
		resp.on("data", function(chunk) {
			res.write(chunk);
		});
		resp.on("end", function() {
			res.end();
		});
	});
	r.end();
}

// Functions here
function speak(req, res, query) {
	var text = query.text;
	console.log(encodeURI(text));
	var body = "";
	
	res.writeHead(200, { "Content-Type" : "audio/mpeg"});
	var r = http.request({
		host: "translate.google.com",
		port: 80,
		method: "GET",
		path: "/translate_tts?q=" + encodeURI(text)
	}).on("response", function(resp) {
		resp.on("data", function(chunk) {
			res.write(chunk);
		});
		resp.on("end", function() {
			console.log("writing chunk");
			res.end();
		});
	});
	r.end();
}

function ring(req, res, query) {
	var name1 = stripAtInFront(query.name1);
	var name2 = stripAtInFront(query.name2);

	if (!(name1 && name2)){
		res.writeJSON(400, {
			"error": "Both Names must be valid"
		});
		return;
	}
	
	var body1 = "";
	var body2 = "";
	var userid1 = "";
	var userid2 = "";
	var userbody1 = "";
	var userbody2 = "";
	var results;

	step(
		function() {
			console.log("requesting name 1");
			// We search twitter using "from:name1+to:name2" and "from:name2+to:name1"
			var self = this;

			if(!name1) return true;

			var queryString = "";
			queryString += (name1) ? "from%3A" + name1 : "";
			queryString += (name2) ? "+%40" + name2 : "";

			var r1 = http.request({
				host: "search.twitter.com",
				port: 80,
				method: "GET",
				path: "/search.json?rpp=100&q=" + queryString // from%3A" + name1 + "+%40" + name2
			}).on("response", function(resp) {
				resp.setEncoding("utf8");
				resp.on("data", function(chunk) {
					if(body1 === "") 
						body1 = chunk;
					else 
						body1 += chunk;
				});
				resp.on("end", self);
			});
			r1.end();
		},
		function(err) {
			console.log("requesting name 2");
			var self = this;

			var queryString = "";
			queryString += (name2) ? "from%3A" + name2 : "";
			queryString += (name1) ? "+%40" + name1 : "";
			
			var r2 = http.request({
				host: "search.twitter.com",
				port: 80,
				method: "GET",
				path: "/search.json?rpp=100&q=" + queryString 
			}).on("response", function(resp) {
				resp.setEncoding("utf8");
				resp.on("data", function(chunk) {
					if(body2 === "")
						body2 = chunk;
					else 
						body2 += chunk;
				});
				resp.on("end", self);
			});
			r2.end();
		},
		function(err) {
			console.log("Requesting user 1");
			if(err) throw err;
			
			var self = this;

			console.log("body1 " + body1 + "\n");
			console.log("body2 " + body2 + "\n");

			var b1 = JSON.parse(body1);
			var b2 = JSON.parse(body2);

			results = [];

			for (var i = 0; i < b1.results.length; i++) {
				results.push({
					from: name1,
					to: name2,
					from_img_url: b1.results[i].profile_image_url,
					from_id_str: b1.results[i].id_str,
					text: b1.results[i].text,
					time: new Date(b1.results[i].created_at).getTime()
				});
				userid1 = b1.results[i].id_str;
			}
	
			for (var i = 0; i < b2.results.length; i++) {
				results.push({
					from: name2,
					to: name1,
					from_img_url: b2.results[i].profile_image_url,
					from_id_str: b2.results[i].id_str,
					text: b2.results[i].text,
					time: new Date(b2.results[i].created_at).getTime()
				});
				userid2 = b2.results[i].id_str;
			}

			results.sort(function(a, b) {
				return (b.time - a.time);
			});
			
			var requestString = "";
			if(userid1) requestString += "user_id=" + userid1;
			requestString += "&screen_name=" + name1;
			
			var r3 = http.request({
				host: "api.twitter.com",
				port: 80,
				method: "GET",
				path: "/1/users/show.json?" + requestString
			}).on("response", function(resp) {
				resp.setEncoding("utf8");
				resp.on("data", function(chunk) {
					if(userbody1 === ""){
						userbody1 = chunk;
					} else {
						userbody1 += chunk;
					}
				});
				resp.on("end", self);
			});
			r3.end();

		},
		function(err) {
			console.log("request user 2");
			if(err) throw err;
			var self = this;
	
			var requestString = "";
			if(userid2) requestString += "user_id=" + userid2;
			requestString += "&screen_name=" + name2;

			var r4 = http.request({
				host: "api.twitter.com",
				port: 80,
				method: "GET",
				path: "/1/users/show.json?" + requestString
			}).on("response", function(resp) {
				resp.setEncoding("utf8");
				resp.on("data", function(chunk) {
					if(userbody2 === ""){
						userbody2 = chunk;
					} else {
						userbody2 += chunk;
					}
					console.log(chunk);
				});
				resp.on("end", self);
			});
			r4.end();
		},
		function(err) {
			console.log("final");
			if(err) throw err;
			
			console.log("body1 " + userbody1 + "\n");
			console.log("body2 " + userbody2 + "\n");

			var ub1 = JSON.parse(userbody1);
			var ub2 = JSON.parse(userbody2);
			
			var fullname1 = ub1.name;
			var fullname2 = ub2.name;

			var userResult = [];

			userResult.push({
				name: fullname1,
				screen_name: name1,
				profile_image_url: ub1.profile_image_url 
			});
			userResult.push({
				name: fullname2,
				screen_name: name2,
				profile_image_url: ub2.profile_image_url
			});

			for(var i = 0; i < results.length; i++) {
				if(results[i].from == name1) {
					results[i].full_name = fullname1;
				} else {
					results[i].full_name = fullname2;
				}
			}

			var finalResult = {
				users: userResult,
				messages: results
			}

//			console.log(results);
			res.writeJSON(200, finalResult);
		}
	);
}

function stripAtInFront(name) {
	if(!name) return null;
	return ((name.charAt(0) == "@") ? name.substr(1) : name);
}
