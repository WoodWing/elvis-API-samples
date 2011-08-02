/**
 * Licensed under the MIT License
 * Copyright (c) 2010 dutchsoftware.com
 * 
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 * 
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 * 
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 */

//
// Depends on prototype.js
//
// Make sure it is loaded BEFORE this file
//

//Douglas Crockford's Supplant. Read http://javascript.crockford.com/remedial.html for details.
// TODO replace with 'interpolate' from prototype?
String.prototype.replaceParams = function(o) {
	return this.replace(/{([^{}]*)}/g,
	function(a, b) {
		var r = eval("o." + b);
		//var r = o[b];
		return typeof r === 'string' ? r : a;
	}
	);
};
String.prototype.endsWith = function(str) {
	return (this.match(str + "$") == str);
};
String.prototype.appendQueryParam = function(param, value) {
   return this + ((this.indexOf("?") == -1) ? "?" : "&") + param + "=" + encodeURIComponent(value);
};
String.prototype.utf8Encode = function() {
	var input = this.replace(/\r\n/g, "\n");
	var utftext = "";
	for (var n = 0; n < input.length; n++) {
		var c = input.charCodeAt(n);
		if (c < 128) {
			utftext += String.fromCharCode(c);
		}
		else if ((c > 127) && (c < 2048)) {
			utftext += String.fromCharCode((c >> 6) | 192);
			utftext += String.fromCharCode((c & 63) | 128);
		}
		else {
			utftext += String.fromCharCode((c >> 12) | 224);
			utftext += String.fromCharCode(((c >> 6) & 63) | 128);
			utftext += String.fromCharCode((c & 63) | 128);
		}
	}
	return utftext;
};
String.prototype.base64Encode = function() {
	var keyStr = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=";
	var output = "";
	var chr1, chr2, chr3, enc1, enc2, enc3, enc4;
	var i = 0;
	var input = this.utf8Encode();
	while (i < input.length) {
		chr1 = input.charCodeAt(i++);
		chr2 = input.charCodeAt(i++);
		chr3 = input.charCodeAt(i++);
		enc1 = chr1 >> 2;
		enc2 = ((chr1 & 3) << 4) | (chr2 >> 4);
		enc3 = ((chr2 & 15) << 2) | (chr3 >> 6);
		enc4 = chr3 & 63;
		if (isNaN(chr2)) {
			enc3 = enc4 = 64;
		} else if (isNaN(chr3)) {
			enc4 = 64;
		}
		output = output + keyStr.charAt(enc1) + keyStr.charAt(enc2)
						+ keyStr.charAt(enc3) + keyStr.charAt(enc4);
	}
	return output;
};

/**
 * Ajax throbber
 * http://ajaxload.info/
 */

Ajax.Responders.register({
	onCreate: function() {
		$('throbber').show();
	},
	onComplete: function() {
		if (Ajax.activeRequestCount == 0) {
			$('throbber').hide();
		}
	}
});

/**
 * ElvisAPI
 * 
 * ...
 */

var ElvisAPI = Class.create({

	initialize: function(serverUrl) {
		this._serverUrl = serverUrl;

		this._loginPage = null;

		this._username = null;
		this._password = null;
		this._autoLoginInProgress = false;
		this._requestsToRepeatAfterLogin = [];

		this.userProfile = null;
	},

	useAutoLogin: function(username, password) {
		this._loginPage = null;

		this._username = username;
		this._password = password;
	},

	useLoginPage: function(url) {
		this._username = null;
		this._password = null;

		this._loginPage = url;
	},

	login: function(username, password, successHandler) {
		new Ajax.Request(this._serverUrl + "/services/login",
		{
			method: "post",
			parameters: {
				//username: username,
				//password: password
				cred: (username + ":" + password).base64Encode()
			},
			onComplete: function(response) {
				this._handlePossibleFailure(response,
					function(loginResponse) {
						if (loginResponse.loginSuccess) {
							this.userProfile = loginResponse.userProfile;
		
							if (successHandler) {
								successHandler(loginResponse);
							}
						} else {
							alert(loginResponse.loginFaultMessage);
						}
					}.bind(this),
					function(response, info) {
						alert('Unable to authenticate, cause: ' + info.errorcode + ' ' + info.message);
					}).bind(this);
			}.bind(this)
		});
	},

	logout: function(nextUrl) {
		window.location = this._serverUrl + "/logout?logoutSuccessUrl=" + encodeURIComponent(nextUrl);
	},

	search: function(params, callbackHandler) {
		// Init param defaults
		var _param = {
			// q: "",
			// start: "",
			num: "50",
			// sort: "",
			// descending: "",
			metadataToReturn: "all"
			// format: "",
			// appendRequestSecret: ""
		};

		// Overwrite and extend defaults with actual params
		Object.extend(_param, params);

		// Add unique part to url when using 'get' to prevent caching
		// not needed with post (which should never be cached)
		//_param._ = (new Date()).getTime();

		new Ajax.Request(this._serverUrl + "/services/search",
		{
			method: "post",
			parameters: _param,
			onComplete: function(response) {
				this._handlePossibleFailure(response, callbackHandler);
			}.bind(this)
		});
	},

	browse: function(params, callbackHandler) {
		// Init param defaults
		var _param = {
			// path: "",
			// includeFolders: true,
			// includeAsset: true,
			// includeExtensions: "collection"
		};

		// Overwrite and extend defaults with actual params
		Object.extend(_param, params);

		new Ajax.Request(this._serverUrl + "/services/browse",
		{
			method: "post",
			parameters: _param,
			onComplete: function(response) {
				this._handlePossibleFailure(response, callbackHandler);
			}.bind(this)
		});
	},

	update: function(id, metadata) {
		// add id to metadata
		metadata["id"] = id;

		new Ajax.Request(this._serverUrl + "/services/update",
		{
			method: "post",
			parameters: metadata,
			onComplete: function(response) {
				this._handlePossibleFailure(response);
			}.bind(this)
		});
	},

	_handlePossibleFailure: function(response, successCallbackHandler, failureCallbackHandler) {
		if (!failureCallbackHandler) {
			failureCallbackHandler = this._onFailure.bind(this);
		}
	
		// Support both elvis 2.5 and 2.6 cross-domain error response formats
		var info = (response.responseJSON && response.responseJSON.errorcode)
			? response.responseJSON
			: {errorcode: response.status, message: response.statusText};
		
		if (!info.errorcode || (info.errorcode >= 200 && info.errorcode < 300)) {
			if (successCallbackHandler) {
				successCallbackHandler(response.responseJSON);
			}
		} else {
			failureCallbackHandler(response, info);
		}
	},

	_onFailure: function(response, info) {
		// Check for 401 Unauthorized
		if (info.errorcode == 401) {

			if (this._loginPage) {
				// Show login page
				window.location = this._loginPage;
				
				return;
			}

			if (this._username && this._password) {
				var l = this._requestsToRepeatAfterLogin.push(response.request);
				if (l == 1) {
					// Attempt auto login on first authentication failure
					this.login(this._username, this._password, function(loginResponse) {

						// Re-execute original requests after successful authentication
						var requests = this._requestsToRepeatAfterLogin;
						this._requestsToRepeatAfterLogin = [];

						for (var i = 0; i < requests.length; i++) {
							new Ajax.Request(requests[i].url, requests[i].options);
						}

					}.bind(this));
				}

				return;
			}
		}

		// Fallback: show error message
		alert('Server call failed, cause: ' + info.errorcode + ' ' + info.message);
	}

});

/**
 * AssetPermissions
 * 
 * Utility to check permissions 'mask' for available permissions.
 * The permissions mask consists of a string with one character for
 * every permission available in elvis: VPUMECD
 * 
 * V = VIEW
 * P = VIEW_PREVIEW
 * U = USE_ORIGINAL
 * M = EDIT_METADATA
 * E = EDIT
 * C = CREATE
 * D = DELETE
 */

var AssetPermissions = {
	hasViewPreview: function(hitPermissions) {
		return hitPermissions && hitPermissions.indexOf('P') != -1;
	},
	hasUseOriginal: function(hitPermissions) {
		return hitPermissions && hitPermissions.indexOf('U') != -1;
	}
}

/**
 * HitRenderer
 * 
 * Can rendering result hits to HTML.
 *
 * TODO explain how to setup and customize...

// setup path to locate document_*.png images
HitRenderer.resources = "shared_resources/elvis_api";

// Create a hitRenderer instance and configure it
var hitRenderer = new HitRenderer();

// id of element that will contain the rendered hits (optional)
hitRenderer.hitsTarget = "elementId";

// array with metadata field names that should be displayed below the each hit
hitRenderer.metadataToDisplay = ["name", "rating", "credit"];

// callback funtion, will be called when a hit is clicked
hitRenderer.itemClick = function (hit) {
	... your code ...
};

// id of element that will contain an info message about how many results were found (optional)
hitRenderer.infoTarget = "resultInfo";

// id of element that will contain a result pager
hitRenderer.pageTarget = "resultPager";

// callback function, will be called when a page link is clicked
hitRenderer.pageClick = function (start, num) {
	... your code to 'search' the requested page ...
};

// once a render is setup you can can use it by calling it's 'render' method:
hitRenderer.render( results from elvisApi.search OR array of hits OR single hit );

// it is also possible to pass the render method as callback to the elvisApi.search method
elvisApi.search(..., myRenderer.render)

 */
var HitRenderer = Class.create({

	/*
	 * Static config options
	 */

	resources: "shared_resources/elvis_api",

	/*
	 * Constructor
	 */

	initialize: function() {
		// set default options
		// these can be customized
		this.hitsTarget = null;
		this.infoTarget = null;
		this.pageTarget = null;
		this.sizeTarget = null;

		this.squareThumbs = false;
		this.renderSize = "medium"; // small | medium | large
		this.metadataToDisplay = ["name", "fileSize", "assetCreated", "rating"];
		this.linkClass = null;
		this.linkRel = null;

		this.selectable = false;
		this.multiselect = false;
		
		this.selectedHits = [];
		
		this.maxPageLinks = 9;

		// handler functions
		this.itemClick = null;
		this.pageClick = null;
		this.selectionChange = null;

		// private instance variables
		this.hits = null;

		// Hack to bind 'public' method so it can be passed as reference
		this.render = function(data) {
			this.renderInternal(data);
		}.bind(this);
	},

	/*
	 * Public method: render
	 *
	 * Renders data to HTML.
	 *
	 * This method is flexible, it accepts:
	 * - an array of hits
	 * - a single hit
	 * - a data object returned by the elvis API
	 *
	 * The last option means you can provide this method
	 * directly as callback to
	 *
	 *	  elvisApi.search(..., myRenderer.render)
	 *
	 * The following html structure is rendered:
	 *	 
	 *	  div.elvisHitBox
	 *		  a
	 *			  div.elvisThumbnailImage
	 *				  img
	 */

	/**
	 * Internally the method is called 'renderInternal'.
	 * The actual render method is created at init so it can be bound
	 * to the correct 'this' instance.
	 */
	renderInternal: function(data) {
		this.hits = this.getHitsFromData(data);

		this.renderAndProcessResults();

		if (data.totalHits != null && data.firstResult != null && data.maxResultHits != null) {
			this.renderInfo(data);

			this.renderPager(data);
		}
	},

	/*
	 * Resolves hit array from various types of data. It accepts:
	 * - an array of hits
	 * - a single hit
	 * - a data object returned by the elvis API
	 */
	getHitsFromData: function(data) {
		if (data == null) {
			return [];
		}
		else if (data.totalHits != null) {
			return (data.totalHits == 0 || !data.hits) ? [] : data.hits;
		}
		else if (data.constructor == Array) {
			return data;
		}
		else if (data.id && data.metadata) {
			return [data];
		}
		else {
			alert("Unrecognized data type for HitRenderer.render(): " + data);
		}
	},

	renderAndProcessResults: function() {
		if (this.hitsTarget != null) {
			var html = this.renderHitList(this.hits);

			var targetElement = $(this.hitsTarget);
			targetElement.update(html);

			this.postProcessTarget(targetElement);
			
			this.setRenderSize(this.renderSize);
		}
	},

	renderInfo: function(data) {
		if (this.infoTarget != null) {
			var infoMsg = (data.totalHits > data.maxResultHits && this.pageTarget == null)
				? "Found #{totalHits}, showing #{maxResultHits}"
				: "Found #{totalHits}";

			$(this.infoTarget).update(infoMsg.interpolate({
				totalHits: data.totalHits,
				maxResultHits: data.maxResultHits
			}));
		}
	},
	
	setRenderSize: function(size) {
		var targetElement = $(this.hitsTarget);
		
		switch (size) {
		case "medium":
			targetElement.removeClassName("elvisLarge");
			targetElement.removeClassName("elvisSmall");
			break;
		case "small":
			targetElement.removeClassName("elvisLarge");
			targetElement.addClassName("elvisSmall");
			break;
		case "large":
			targetElement.removeClassName("elvisSmall");
			targetElement.addClassName("elvisLarge");
			break;
		default:
			throw("Illegal renderSize: "+size);
		}
		
		this.renderSize = size;
		
		// scale square thumbnails
		this.rescaleSquareThumbs(targetElement);
		
		// update controls
		this.renderSizeControls();
	},

	/*
	 * 'Protected' rendering methods
	 *
	 * These can be 'overwritten' to customize behaviour
	 */

	renderHitList: function(hitArray) {
		var html = "";
		for (var i = 0; i < hitArray.length; i++) {
			html += this.renderHitBox(hitArray[i], i);
		}
		return html;
	},

	renderHitBox: function(hit, idx) {
		return "<div class='elvisHitBox'>#{thumbnail}#{metadata}</div>".interpolate({
			thumbnail: this.renderThumbnailWrapper(hit, idx),
			metadata: this.renderMetadata(hit, this.metadataToDisplay)
		});
	},

	renderThumbnailWrapper: function(hit, idx) {
		return '<div class="{classAttr}">{thumbnail}</div>'.replaceParams({
			thumbnail: this.renderHitLink(hit, idx),
			classAttr: "elvisThumbnailWrapper" + (this.squareThumbs && hit.thumbnailUrl ? " square" : "")
		});
	},

	renderHitLink: function(hit, idx) {
		if (this.itemClick || this.linkClass || this.linkRel) {
			var href = (hit.previewUrl) ? hit.previewUrl: '#';

			var linkAttr = '';
			if (this.linkClass) {
				linkAttr += ' class="' + this.linkClass + '"';
			}
			if (this.linkRel) {
				linkAttr += ' rel="' + this.linkRel + '"';
			}

			return '<a href="{href}" onclick="return (false)"{linkAttr}>{thumbnail}</a>'.replaceParams({
				href: href,
				linkAttr: linkAttr,
				thumbnail: this.renderThumbnail(hit)
			});
		} else {
			// do not create link if we don't have an itemClick handler and no linkClass or linkRel
			return this.renderThumbnail(hit);
		}
	},

	renderThumbnail: function(hit) {
		if (hit.thumbnailUrl) {
			var thumbOverlay = this.renderThumbnailImageOverlay(hit);
			return '<div class="elvisThumbnailImage">{thumbOverlay}<img src="{hit.thumbnailUrl}" alt="" {imgClassAttr} /></div>'.replaceParams({
				hit: hit,
				thumbOverlay: (thumbOverlay == null ? "" : '<div class="elvisThumbnailImageOverlay">' + thumbOverlay + '</div>'),
				imgClassAttr: (this.squareThumbs ? ' class="square"' : '')
			});
		}
		else if (hit.highlightedText) {
			return '<div class="elvisThumbnailText"><span>{highlightedText}</span></div>'.replaceParams(hit);
		}
		else if (hit.metadata.assetDomain == "container") {
			return this.renderContainerThumbnail(hit);
		}
		else {
			return '<div class="elvisThumbnailIcon"><img src="' + this.getHitIcon(hit) + '" /></div>';
		}
	},

	renderThumbnailImageOverlay: function(hit) {
		if (hit.metadata.assetDomain == "video") {
			return '<div class="elvisThumbnailVideoIndicator"></div>';
		}
		return "";
	},

	renderContainerThumbnail: function(hit) {
		var html = '<div class="elvisContainerBox">';

		var i = 0;
		while (i < hit.thumbnailHits.length) {
			var thumbnailHit = hit.thumbnailHits[i++];
			if (thumbnailHit.thumbnailUrl) {
				html += '<div class="elvisContainerThumb square"><img src="{thumbnailUrl}" alt="" class="square" /></div>'.replaceParams(thumbnailHit);
			}
			else {
				html += '<div class="elvisContainerIcon"><img src="' + this.getHitIcon(thumbnailHit) + '" /></div>';
			}
		}
		while (i++ < 4) {
			html += '<div class="elvisContainerEmpty"></div>';
		}

		html += "</div>";

		return html;
	},

	renderMetadata: function(hit, fieldList) {
		var html = "";
		if (fieldList != null && fieldList.length != 0) {
			html += "<div class='elvisMetadata'>";
			for (var i = 0; i < fieldList.length; i++) {
				var field = fieldList[i];

				var value = hit.metadata[field];
				if (value == null) {
					value = hit[field];
				}

				html += this.layoutValue(hit, field, value);
			}
			html += "</div>";
		}
		return html;
	},

	layoutValue: function(hit, field, value) {
		var renderedValue = this.renderValue(hit, field, value);

		return '<div title="{title}" class="{cssClass}">{value}</div>'.replaceParams({
			title: field + ": " + renderedValue,
			cssClass: this.getValueCssClass(hit, field, value, renderedValue),
			value: renderedValue
		});
	},

	renderValue: function(hit, field, value) {
		if (field == "rating") {
			return this.renderRating(value);
		}
		else if (value == null) {
			return "";
		}
		else if (value.formatted) {
			return value.formatted;
		}
		else if (value instanceof Array) {
			return value.join(', ');
		}
		else {
			return value;
		}
	},

	renderRating: function(rating) {
		var html = "";
		if (rating == -1) {
			html = 'Reject';
		}
		else {
			var star = "&#9733;";
			var dot = "&#8226;";
			for (var i = 0; i < 5; i++) {
				html += (rating != null && i < rating) ? star: dot;
			}
		}
		return html;
	},

	/*
	 * 'Private' methods
	 * These are not meant to be 'overwritten'
	 */

	getHitIcon: function(hit) {
		switch (hit.metadata.assetDomain) {
		case "audio":
		case "container":
		case "document":
		case "image":
		case "layout":
		case "pdf":
		case "presentation":
		case "text":
		case "video":
			return HitRenderer.resources + "/images/document_" + hit.metadata.assetDomain + ".png";
		}

		// Fallback
		return HitRenderer.resources + "/images/document_generic.png";
	},

	getValueCssClass: function(hit, field, value, renderedValue) {
		if (field == "rating") {
			return (renderedValue == "Reject") ? "elvisMetadataRatingReject": "elvisMetadataRating"
		}

		return "elvisMetadataValue";
	},

	/*
	 * 'Protected' processing methods
	 *
	 * These can be 'overwritten' to customize behaviour
	 */

	postProcessTarget: function(targetElement) {
		// find and process <a> tags directly under hit boxes
		var elements = targetElement.select(".elvisHitBox");

		for (var i = 0; i < elements.length; i++) {
			this.postProcessHit(elements[i], this.hits[i], i);
		}
	},

	postProcessHit: function(hitElement, hit, index) {
		// register click handler
		if (this.itemClick || this.selectable) {
			Event.observe(hitElement, 'click', function(event) {
				var result = (this.itemClick ? this.itemClick(event, hit, this.hits, index) : true);
				if (result && this.selectable) {
					this.toggleSelected(hitElement, hit, index);
				}
			}.bind(this));
		}
	},

	toggleSelected: function(hitElement, hit, index) {
		if (this.multiselect) {
			// remove or add selected hit
			if (hitElement.hasClassName("selected")) {
				this.selectedHits = this.selectedHits.without(hit);
			} else {
				this.selectedHits.push(hit);
			}
		} else {
			// select this hit
			if (hitElement.hasClassName("selected")) {
				this.selectedHits = [];
			} else {
				this.selectedHits = [hit];
			}
			
			// unselect other hits
			hitElement.siblings().each(function (e) {
				e.removeClassName("selected");
			});
		}
		
		hitElement.toggleClassName("selected");
		
		if (this.selectionChange) {
			this.selectionChange(this.selectedHits);
		}
	},

	rescaleSquareThumbs: function(targetElement) {
		targetElement.select("img.square").each(this.squareFillImage, this);
	},

	squareFillImage: function(img) {
		// wait until image has loaded so we know its dimensions
		if (img.naturalWidth == 0 || img.up("div.square").clientWidth == 0) {
			img.observe("load", function(event) {
				this.squareFillImage(img);
			}.bind(this));
			return;
		}
		
		// get 'square' container size
		// (a little larger to make sure it really fills its container and avoid anti-alias grey areas)
		var maxSize = img.up("div.square").clientWidth + 2;
		
		// default sizing (for square images)
		var style = {
			width: maxSize + "px",
			height: maxSize + "px",
			left: "-1px",
			top: "-1px"
		};
		
		// adjust scaling for landscape and portrait images
		if (img.naturalWidth > img.naturalHeight) {
			// landscape (height is smallest)
			var width = (maxSize / img.naturalHeight) * img.naturalWidth;
			var offset = (maxSize - width) / 2;

			style.width = width + "px";
			style.left = offset + "px";
		} else if (img.naturalWidth < img.naturalHeight) {
			// portrait (width is smallest)
			var height = (maxSize / img.naturalWidth) * img.naturalHeight;
			var offset = (maxSize - height) / 2;

			style.height = height + "px";
			style.top = offset + "px";
		}
		
		img.setStyle(style);
	},

	/*
	 * Size controls
	 */
	
	renderSizeControls: function() {
		if (this.sizeTarget) {
			$(this.sizeTarget).update("");
			
			var sizes = ["small", "medium", "large"];
			for (var i = 0; i < sizes.length; i++) {
				var size = sizes[i];
				var linkElement = new Element("a", {"class": size + (size == this.renderSize ? " selected" : "")});
				this.observeSizeControl(linkElement, size);
				
				$(this.sizeTarget).insert(linkElement);
			}
		}
	},
	
	observeSizeControl: function(linkElement, size) {
		linkElement.observe("click", function() {
			this.setRenderSize(size);
		}.bind(this));
	},

	/*
	 * Pager
	 */

	renderPager: function(data) {
		if (this.pageTarget != null) {
			if (this.pageClick == null) {
				alert("When <hitRenderer>.pageTarget is specified you must also define a <hitRenderer>.pageClick handler function");
				return;
			}

			var numPages = Math.ceil(data.totalHits / data.maxResultHits);
			var curPageIdx = Math.floor(data.firstResult / data.maxResultHits);
			var lastPageIdx = numPages - 1;
			var linkHtml = '';

			// render prev link
			if (curPageIdx > 0) {
				linkHtml += this.renderPageLink(curPageIdx - 1, "Prev", "elvisPagePrev");
			} else {
				linkHtml += '<span class="elvisPagePrev elvisPageDisabled">Prev</span>';
			}

			// render page links around current page
			if (numPages > 1) {
				var pageRangeStart = Math.max(0, Math.min(curPageIdx - Math.floor(this.maxPageLinks / 2), numPages - this.maxPageLinks));
				var pageRangeEnd = Math.min(lastPageIdx + 1, pageRangeStart + this.maxPageLinks);
				for (var pageIdx = pageRangeStart; pageIdx < pageRangeEnd; pageIdx++) {
					if (pageIdx == curPageIdx) {
						linkHtml += '<span class="elvisPageCurrent">' + (pageIdx + 1) + '</span>';
					}
					else {
						linkHtml += this.renderPageLink(pageIdx, pageIdx + 1);
					}
				}
			}

			// render next link
			if (curPageIdx < lastPageIdx) {
				linkHtml += this.renderPageLink(curPageIdx + 1, "Next", "elvisPageNext");
			} else {
				linkHtml += '<span class="elvisPageNext elvisPageDisabled">Next</span>';
			}

			// update html
			var targetElement = $(this.pageTarget);
			targetElement.update('');
			
			if (numPages > 1) {
				targetElement.update('<div class="elvisPager">' + linkHtml + '</div>');
			}

			// add event handlers
			var elements = targetElement.select("a");
			for (var i = 0; i < elements.length; i++) {
				Event.observe(elements[i], 'click', function(event) {
					var pageIdx = parseInt(Event.findElement(event, "a").rel);
					var start = pageIdx * data.maxResultHits;

					this.pageClick(start, data.maxResultHits);
					
				}.bind(this));
			}

			/* TODO this would be nicer, but it doesn't seem to work...
			if (this.pageClickEventHandler == null) {
				this.pageClickEventHandler = target.on("click", false, function (event, element) {
					alert('d');
				});

			}
			*/
		}
	},
	renderPageLink: function(pageIdx, label, className) {
		return '<a href="#" onclick="return (false)" rel="#{rel}"#{classAttr}>#{label}</a>'.interpolate({
			rel: pageIdx,
			label: label,
			classAttr: (className != undefined ? ' class="'+className+'"' : '')
		});
	}
});



var FacetRenderer = Class.create({

	initialize: function() {
		// set default options
		// these can be customized
		this.facets = null;
		this.facetTargetPostfix = "Facet";
		this.facetClick = null;
		//this.maxValuesToDisplay = 30;

		// private instance variables
		this._selectedFacets = {};

		// Hack to bind 'public' method so it can be passed as reference
		this.render = function(data) {
			this._renderInternal(data);
		}.bind(this);
	},
	
	_renderInternal: function(data) {
		for (var j = 0; j < this.facets.length; j++) {
			var field = this.facets[j];
			
			var target = $(field + this.facetTargetPostfix);
			if (target == null) {
				alert('Element with id="' + (field + this.facetTargetPostfix) + '" is missing, it should be declared in the html somewhere');
			}
			
			var targetUL = this._locateOrCreateTargetUL(target, field);
			var facetValues = data.facets[field];

			var c = facetValues.length;//Math.min(facetValues.length, this.maxValuesToShow);
			var html = "";
			for (var i = 0; i < c; i++) {
				var value = facetValues[i].value;
				var hitCount = facetValues[i].hitCount;

				var selected = (this._selectedFacets[field] && this._selectedFacets[field][value]);

				html += '<li#{classAttr}><a href="#" onclick="return false"><span class="label">#{label}</span><span class="count">#{hitCount}</span></a></li>'.interpolate({
					field: field,
					label: value,
					hitCount: hitCount,
					classAttr: (selected ? ' class="selected"' : '')
				});
			}
			
			// Update contents
			targetUL.update(html);

			// Register click listeners
			this._postProcessFacet(targetUL, field, facetValues);

			// Show or hide if empty
			if (html != "") {
				target.show();
			} else {
				target.hide();
			}
		}
	},
	
	_locateOrCreateTargetUL: function(target, field) {
		var targetULs = target.select("ul");
		if (targetULs.length == 0) {
			target.insert(new Element("ul", {"class": "elvisFacet"}));
			return target.select("ul")[0];
		}

		return targetULs[0];
	},
	
	_postProcessFacet: function(targetUL, field, facetValues) {
		var links = targetUL.select("a");
		for (var i = 0; i < links.length; i++) {
			var value = facetValues[i].value;
			var linkElement = links[i];
			
			this._postProcessLink(linkElement, field, value);
		}
	},
	
	_postProcessLink: function(linkElement, field, value) {
		Event.observe(linkElement, 'click', function(event) {

			// prep selected facets for field
			if (this._selectedFacets[field] == null) {
				this._selectedFacets[field] = {};
			}

			// toggle selected
			var selected = !(this._selectedFacets[field][value]);
			this._selectedFacets[field][value] = selected;
			
			if (this.facetClick) {
				this.facetClick(field, value, selected, event.element());
			}
			
		}.bind(this));
	},
	
	/**
	 * Adds facet.<field>.selection arguments to params for elvisApi.search()
	 */
	addFacetSelectionParams: function(params) {
		for (var field in this._selectedFacets) {
			var selection = "";
			for (var value in this._selectedFacets[field]) {
				if (this._selectedFacets[field][value]) {
					if (selection != "") {
						selection += ","
					}
					selection += value;
				}
			}
			if (selection != "") {
				params["facet." + field + ".selection"] = selection;
			}
		}
	}

});



var ColumnTree = Class.create({

	initialize: function (targetId, elvisApi, selectionChangeHandler) {
		this.elvisApi = elvisApi;
		this.selectionChangeHandler = selectionChangeHandler;
		
		this.folderPath = "";
		this.containerId = null;
		
		this._targetId = targetId;
		this._innerWrapper = null;
		
		document.observe("dom:loaded", function() {
			this._initHtml();
		}.bind(this));
	},
	
	_initHtml: function () {
		this._target = $(this._targetId);
		this._target.addClassName("elvisColumnTree");
		
		this._innerWrapper = new Element("div");
		this._target.insert(this._innerWrapper);
		
		// Browse root
		this._browse(this.folderPath);
		
		this.selectionChangeHandler(this);
	},

	_browse: function (folderPath) {
		//Browse default includes collection and dossier extensions, these are handled as assets and not folders.
		this.elvisApi.browse({path: folderPath}, this._render.bind(this));
		
		this.folderPath = folderPath;
	},

	_render: function (browseResult) {
		// empty result, do nothing
		if (browseResult.length == 0) {
			return;
		}

		// Create new list
		var list = new Element("div", {"class": "elvisColumnTreeList"});
		
		var ul = new Element("ul");
		for (var i = 0; i < browseResult.length; i++) {
			ul.insert( this._createItem(browseResult[i], list) );
		}
		
		list.insert(ul);
		this._innerWrapper.insert(list);
		
		// Adjust width of inner wrapper and scroll right
		this._innerWrapper.style.width = (201 * this._innerWrapper.childElements().length) + "px";
		this._target.scrollLeft = this._innerWrapper.clientWidth;
	},
	
	_createItem: function (data, listElement) {
		var li = new Element("li", {"class": (data.directory ? "folder" : "container")});
		li.update(data.name);
		li.observe("click", function() {
			this._itemClick(data, li, listElement);
		}.bind(this));
		return li;
	},
	
	_itemClick: function(data, liElement, listElement) {
		liElement.siblings().each(function (e) {
			e.removeClassName("selected");
		})
		liElement.addClassName("selected");
	
		if (data.directory) {
			this.containerId = null;
			
			// remove any displayed subfolders
			listElement.nextSiblings().each(Element.remove);
			
			// browse to subfolder
			this._browse(data.assetPath);
		}
		else if (data.containerId) {
			// select container
			this.containerId = data.containerId;
		}
		
		this.selectionChangeHandler(this);
	}

});



var PreviewLightbox = Class.create({

	initialize: function() {
		this.previewUrl = null;
		this.htmlCreated = false;
		this.naturalPreviewSize = null;
		this._previewType = null; // .jpg | .mp4 | .html
	},

	insertHtml: function() {
		/*
		div #elvisPreview
		-- div #elvisPreviewWrapper
		---- div #elvisPreviewCell
		------ div #elvisPreviewBox
		-------- img|video|div #elvisPreviewObject .elvisPreviewImage|.elvisPreviewVideo|.elvisPreviewText
		------ a #elvisPreviewClose
		*/

		var template = '<div id="elvisPreviewOverlay"></div>'
		+ '<div id="elvisPreview" style="display: none;"><div id="elvisPreviewWrapper">'
			+ '<div id="elvisPreviewCell"><div id="elvisPreviewBox" style="visibility: hidden;"></div></div>'
			+ '<a id="elvisPreviewClose" href="#" onclick="return (false)">&nbsp;</a>'
			+ '<a id="elvisPreviewPrev" href="#" onclick="return (false)">&nbsp;</a>'
			+ '<a id="elvisPreviewNext" href="#" onclick="return (false)">&nbsp;</a>'
		+ '</div></div>';

		$$("body")[0].insert(template);

		$("elvisPreviewClose").observe("click", function(event) {
			this.close();
		}.bind(this));
		
		$("elvisPreviewPrev").observe("click", function(event) {
			this.prev();
		}.bind(this));
		
		$("elvisPreviewNext").observe("click", function(event) {
			this.next();
		}.bind(this));

		Event.observe(document.onresize ? document: window, "resize", function() {
			this.adjustSize();
		}.bind(this));
	},

	showGallery: function(hits, currentIndex) {
		this.hits = hits;
		this.currentIndex = currentIndex;

		this.show(this.hits[this.currentIndex]);
	},

	next: function() {
		if (this.currentIndex < this.hits.length - 1) {
			this.show(this.hits[++this.currentIndex]);
		} else {
			this.close();
		}
	},

	prev: function() {
		if (this.currentIndex > 0) {
			this.show(this.hits[--this.currentIndex]);
		} else {
			this.close();
		}
	},

	show: function(previewUrlOrHit) {
		if (previewUrlOrHit == null || previewUrlOrHit == "") {
			return;
		}

		// find preview url
		if (previewUrlOrHit.previewUrl) {
			this.previewUrl = previewUrlOrHit.previewUrl;
		} else if (typeof(previewUrlOrHit) == 'string') {
			this.previewUrl = previewUrlOrHit;
		} else {
			this.previewUrl = "";
		}

		// only insert html once
		if (!this.htmlCreated) {
			this.insertHtml();

			this.htmlCreated = true;
		}

		// clear natural size so we can capture it again
		this.naturalPreviewSize = null;

		// clear contents
		$("elvisPreviewBox").setStyle({
			visibility: "hidden"
		});
		$("elvisPreviewBox").update("");

		// determine previewType
		var typeRegEx = /.*\.(jpg|mp4|html)/.exec(this.previewUrl);
		this._previewType = (typeRegEx == null || typeRegEx.length == 1) ? null : typeRegEx[1];

		// insert preview contents
		if (this._previewType == "jpg") {
			$("elvisPreviewBox").update('<img id="elvisPreviewObject" class="elvisPreviewImage" src="#{src}"/>'.interpolate({
				src: this.previewUrl
			}));
		}
		else if (this._previewType == "mp4") {
			$("elvisPreviewBox").update('<video id="elvisPreviewObject" class="elvisPreviewVideo" src="#{src}" controls="true" autoplay="true"></video>'.interpolate({
				src: this.previewUrl
			}));
		}
		else if (this._previewType == "html") {
			$("elvisPreviewBox").update('<div id="elvisPreviewObject" class="elvisPreviewText"></div>');
			new Ajax.Updater('elvisPreviewObject', this.previewUrl, {});
		}
		else {
			var msg = "No preview available";
			if (previewUrlOrHit.metadata) {
				msg += " for " + previewUrlOrHit.metadata.name;
			}
			$("elvisPreviewBox").update('<div id="elvisPreviewObject" class="elvisPreviewNotAvailable"><div>#{msg}</div></div>'.interpolate({
				msg: msg
			}));
		}

		// show loading icon
		$("elvisPreview").addClassName("loading");

		this.adjustSize();

		$("elvisPreviewOverlay").show();
		$("elvisPreview").show();
	},

	close: function() {
		$("elvisPreview").hide();
		$("elvisPreviewOverlay").hide();

		// remove preview element to stop video
		$("elvisPreviewBox").update("");
	},

	adjustSize: function() {
		//Adding check to determine the object exists to prevent unwarrented errors.
		if ($("elvisPreviewObject") != null && $("elvisPreviewObject").getWidth() == 0) {
			// Delay adjustSize until we know preview size
			new PeriodicalExecuter(function(pe) {
				pe.stop();
				this.adjustSize();
			}.bind(this), 0.3);

			return;
		}

		// store natural size first time
		var isFirstAdjust = (this.naturalPreviewSize == null);
		if (isFirstAdjust) {
			this.naturalPreviewSize = {
				width: $("elvisPreviewObject").getWidth(),
				height: $("elvisPreviewObject").getHeight()
			};
		}

		// set size on preview object
		var style = {
			width: document.viewport.getWidth(),
			height: document.viewport.getHeight()
		};

		if (this._previewType == "jpg") {
			style.marginTop = 0;

			// determine correct scale factor (smallest = best fit)
			var fH = document.viewport.getWidth() / this.naturalPreviewSize.width;
			var fV = document.viewport.getHeight() / this.naturalPreviewSize.height;
			var f = Math.min(fH, fV);

			// prevent upscaling
			f = Math.min(f, 1.0);

			// apply scaling
			style.width = Math.round(this.naturalPreviewSize.width * f);
			style.height = Math.round(this.naturalPreviewSize.height * f);
		}
		else if (this._previewType == "mp4") {
			// make sure video does not overlap close button
			style.marginTop = 60;
			style.height = style.height - 60;
		}
		else if (this._previewType == "html") {
			// correction for padding
			style.width = style.width - 60;
			style.height = style.height - 60;
		}

		//Adding check to determine the object exists to prevent unwarrented errors.
		if ($("elvisPreviewObject") != null) {
			$("elvisPreviewObject").setStyle({
				marginTop: style.marginTop + 'px',
				width: style.width + 'px',
				height: style.height + 'px'
			});
		}
		if (isFirstAdjust) {
			//$$("body")[0].setStyle({height: document.viewport.getHeight()+"px", overflow: "hidden"});
			$("elvisPreviewBox").setStyle({
				visibility: "visible"
			});
			
			// hide loading icon
			$("elvisPreview").removeClassName("loading");
		}
	}
});
