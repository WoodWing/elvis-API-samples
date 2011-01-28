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
			onSuccess: function(response) {
				var loginResponse = response.responseJSON;
				if (loginResponse.loginSuccess) {
					this.userProfile = loginResponse.userProfile;

					successHandler(loginResponse);
				} else {
					alert(loginResponse.loginFaultMessage);
				}
			}.bind(this),
			onFailure: function(response) {
				alert('Unable to authenticate, cause: ' + response.status + ' ' + response.statusText);
			}
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
			onSuccess: function(response) {
				callbackHandler(response.responseJSON);
			},
			onFailure: this._onFailure.bind(this)
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
			onSuccess: function(transport) {
				callbackHandler(transport.responseJSON);
			},
			onFailure: this._onFailure.bind(this)
		});
	},

	update: function(id, metadata) {
		// add id to metadata
		metadata["id"] = id;

		new Ajax.Request(this._serverUrl + "/services/update",
		{
			method: "post",
			parameters: metadata,
			onFailure: this._onFailure.bind(this)
		});
	},

	_onFailure: function(response) {
		// Check for 401 Unauthorized
		if (response.status == 401) {

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
		alert('Server call failed, cause: ' + response.status + ' ' + response.statusText);
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

		this.itemClick = null;

		this.squareThumbs = false;
		this.metadataToDisplay = ["name", "fileSize", "assetCreated", "rating"];
		this.linkClass = null;
		this.linkRel = null;

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
		return "<div class='elvisHitBox'>#{thumbnail}<div class='elvisMetadata'>#{metadata}</div></div>".interpolate({
			thumbnail: this.renderHitLink(hit, idx),
			metadata: this.renderMetadata(hit, this.metadataToDisplay)
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

			//return '<a href="#" onclick="return false;"{linkAttr}>{thumbnail}</a>'.replaceParams({
			return '<a href="{href}" onclick="return (false)"{linkAttr}>{thumbnail}</a>'.replaceParams({
				href: href,
				linkAttr: linkAttr,
				thumbnail: this.renderThumbnailWrapper(hit)
			});
		} else {
			// do not create link if we don't have an itemClick handler and no linkClass or linkRel
			return this.renderThumbnailWrapper(hit);
		}
	},

	renderThumbnailWrapper: function(hit) {
		return '<div class="elvisThumbnailWrapper">{thumbnail}</div>'.replaceParams({
			thumbnail: this.renderThumbnail(hit)
		});
		return this.renderThumbnail(hit);
	},

	renderThumbnail: function(hit) {
		if (hit.thumbnailUrl) {
			return '<div class="elvisThumbnailImage"><img src="{thumbnailUrl}" alt="" /></div>'.replaceParams(hit);
		}
		else if (hit.highlightedText) {
			return '<div class="elvisThumbnailText"><span>{highlightedText}</span></div>'.replaceParams(hit);
		}
		else if (hit.metadata.assetDomain == "container") {
			// && hit.thumbnailHits && hit.thumbnailHits.length != 0) {
			if (hit.thumbnailHits && hit.thumbnailHits.length != 0) {
				return this.renderContainerThumbnail(hit);
			}
			else {
				return '<div class="elvisContainerBox"><img src="' + this.getHitIcon(hit) + '" /></div>';
			}
		}
		else {
			return '<div class="elvisThumbnailIcon"><img src="' + this.getHitIcon(hit) + '" /></div>';
		}
	},

	renderContainerThumbnail: function(hit) {
		var html = '<div class="elvisContainerBox"><div class="elvisContainerThumbWrapper">';

		for (var i = 0; i < hit.thumbnailHits.length; i++) {
			var thumbnailHit = hit.thumbnailHits[i];
			if (thumbnailHit.thumbnailUrl) {
				html += '<div class="elvisContainerThumb"><img src="{thumbnailUrl}" alt="" /></div>'.replaceParams(thumbnailHit);
			}
			else {
				html += '<div class="elvisContainerIcon"><img src="' + this.getHitIcon(thumbnailHit) + '" /></div>';
			}
		}

		html += "</div></div>";

		return html;
	},

	renderMetadata: function(hit, fieldList) {
		var html = "";
		if (this.metadataToDisplay != null && this.metadataToDisplay.length != 0) {
			for (var i = 0; i < fieldList.length; i++) {
				var field = fieldList[i];

				var value = hit.metadata[field];
				if (value == null) {
					value = hit[field];
				}

				html += this.layoutValue(hit, field, value);
			}
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

	renderPreview: function(hit) {
		if (previewUrl) {
			return "";
		}

		return "<div id='preview'><object id='previewObject' data='{previewUrl}'></object></div>".replaceParams(hit);
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
		if (this.itemClick) {
			Event.observe(hitElement, 'click', function(event) {
				this.itemClick(hit, event.element(), this.hits, index);
			}.bind(this));
		}

		// process square thumbnails
		if (hit.metadata.assetDomain == "container") {
			// process container thumbnails to be square
			var imgs = hitElement.select(".elvisContainerThumb img");
			for (var i = 0; i < imgs.length; i++) {
				this.makeImageSquareFilled(imgs[i], 50);
			}
		}
		else if (this.squareThumbs && hit.thumbnailUrl) {
			// process image thumbnails to be square
			hitElement.addClassName("square");

			var img = hitElement.select("img")[0];
			this.makeImageSquareFilled(img, 140);
		}
	},

	makeImageSquareFilled: function(img, maxSize) {
		if (img.naturalWidth == 0) {
			img.observe("load", function(event) {
				this.squareFillImage(img, maxSize);
			}.bind(this));
		}
		else {
			this.squareFillImage(img, maxSize);
		}
	},

	squareFillImage: function(img, maxSize) {
		if (img.naturalWidth > img.naturalHeight) {
			// landscape
			var scale = img.naturalHeight / maxSize;
			var offset = -(img.naturalWidth / scale - maxSize) / 2;

			img.setStyle({
				height: maxSize + "px",
				left: offset + "px"
			});
		} else if (img.naturalWidth < img.naturalHeight) {
			// portrait
			var scale = img.naturalWidth / maxSize;
			var offset = -(img.naturalHeight / scale - maxSize) / 2;

			img.setStyle({
				width: maxSize + "px",
				top: offset + "px"
			});
		} else {
			// square
			var scale = img.naturalWidth / maxSize;
			var offset = -(img.naturalHeight / scale - maxSize) / 2;

			img.setStyle({
				width: maxSize + "px",
				height: maxSize + "px",
				top: offset + "px",
				left: offset + "px"
			});
		}
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

			var maxLinks = 9;

			var numPages = Math.ceil(data.totalHits / data.maxResultHits);
			var curPageIdx = Math.floor(data.firstResult / data.maxResultHits);
			var lastPageIdx = numPages - 1;
			var linkHtml = '';

			// render prev link
			if (curPageIdx > 0) {
				linkHtml += this.renderPageLink(curPageIdx - 1, "Prev");
			} else {
				linkHtml += '<span class="elvisPageDisabled">Prev</span>';
			}

			// render page links around current page
			if (numPages > 1) {
				var firstPageIdx = Math.max(0, curPageIdx - Math.floor(maxLinks / 2));
				var lastLink = Math.min(lastPageIdx + 1, firstPageIdx + 9);
				for (var pageIdx = firstPageIdx; pageIdx < lastLink; pageIdx++) {
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
				linkHtml += this.renderPageLink(curPageIdx + 1, "Next");
			} else {
				linkHtml += '<span class="elvisPageDisabled">Next</span>';
			}

			// update html
			var targetElement = $(this.pageTarget);
			targetElement.update('');
			targetElement.update('<div class="elvisPager">' + linkHtml + '</div>');

			// add event handlers
			var elements = targetElement.select("a");
			for (var i = 0; i < elements.length; i++) {
				Event.observe(elements[i], 'click', function(event) {
					var pageIdx = parseInt(Event.findElement(event, 'a').rel);
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
	renderPageLink: function(pageIdx, label) {
		return '<a href="#" onclick="return (false)" rel="#{rel}">#{label}</a>'.interpolate({
			rel: pageIdx,
			label: label
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

				html += '<li#{classAttr}><a href="#" onclick="onFacetClick(event, \'#{field}\', \'#{label}\'); return false"><span class="label">#{label}</span><span class="count">#{hitCount}</span></a></li>'.interpolate({
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
			target.insert(new Element("ul", {'class': 'elvisFacet'}));
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



var PreviewLightbox = Class.create({

	initialize: function() {
		this.previewUrl = null;
		this.htmlCreated = false;
		this.naturalPreviewSize = null;
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
		+ '<div id="elvisPreview" style="display: none;"><div id="elvisPreviewWrapper"><div id="elvisPreviewCell">'
		+ '<div id="elvisPreviewBox" style="visibility: hidden;"></div>'
		+ '</div><a id="elvisPreviewClose" href="#" onclick="return (false)"/>&nbsp;</a></div>';

		$$("body")[0].insert(template);

		$("elvisPreviewCell").observe("click", function(event) {
			if (event.pointerX() > document.viewport.getWidth() / 2) {
				this.next();
			}
			else {
				this.prev();
			}
		}.bind(this));

		$("elvisPreviewClose").observe("click", function(event) {
			this.close();
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

		// insert preview contents
		if (this.previewUrl == "") {
			var msg = "No preview available";
			if (previewUrlOrHit.metadata) {
				msg += " for " + previewUrlOrHit.metadata.name;
			}
			$("elvisPreviewBox").update('<div id="elvisPreviewObject" class="elvisPreviewNotAvailable"><div>#{msg}</div></div>'.interpolate({
				msg: msg
			}));
		}
		else if (this.previewUrl.endsWith(".jpg")) {
			$("elvisPreviewBox").update('<img id="elvisPreviewObject" class="elvisPreviewImage" src="#{src}"/>'.interpolate({
				src: this.previewUrl
			}));
		}
		else if (this.previewUrl.endsWith(".mp4")) {
			$("elvisPreviewBox").update('<video id="elvisPreviewObject" class="elvisPreviewVideo" src="#{src}" controls="true" autoplay="true"></video>'.interpolate({
				src: this.previewUrl
			}));
		}
		else if (this.previewUrl.endsWith(".html")) {
			$("elvisPreviewBox").update('<div id="elvisPreviewObject" class="elvisPreviewText"></div>');
			new Ajax.Updater('elvisPreviewObject', this.previewUrl, {});
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

		var isFirstAdjust = (this.naturalPreviewSize == null);

		// store natural size first time
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

		if (this.previewUrl.endsWith(".jpg")) {
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
		else if (this.previewUrl.endsWith(".mp4")) {
			// make sure video does not overlap close button
			style.marginTop = 60;
			style.height = style.height - 60;
		}
		else if (this.previewUrl.endsWith(".html")) {
			// correction for padding
			style.height = style.height - 60;
		}

		//$('debugDiv').update(document.viewport.getWidth() + "x" + document.viewport.getHeight()+" style: "+style.top+","+style.bottom+" "+style.width+"x"+style.height);
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
