/**
 * Licensed under the MIT License
 * Copyright (c) 2010-2013 WoodWing Software
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

/*------------------------------------------------------------------------------

Depends on:

	jquery.js (1.6 or higher)
	jquery.class.js
	jquery.cookie.js

make sure these are loaded BEFORE this file.

--------------------------------------------------------------------------------

This file defines useful 'classes' that can be used with
the Elvis API. For more info see http://www.elvisdam.com

Documentation can be found at:
https://elvis.tenderapp.com/kb/api/javascript-library-introduction

------------------------------------------------------------------------------*/

/**
 * ElvisAPI
 * 
 * See documentation at community knowledge base on:
 * http://www.elvisdam.com
 */
var ElvisAPI = $.Class({

	init: function(serverUrl) {
		this._serverUrl = serverUrl;

		this._loginPage = null;

		this._loginHandler = null;

		this._username = null;
		this._password = null;
		this._clientType = null;
		this._autoLoginInProgress = false;
		this._requestsToRepeatAfterLogin = [];
		this._sessionId = $.cookie('elvisSessionId');
	},

	useAutoLogin: function(username, password, clientType) {
		this._loginPage = null;
		this._loginHandler = null;

		this._username = username;
		this._password = password;
		this._clientType = clientType;
	},

	useLoginPage: function(url) {
		this._username = null;
		this._password = null;
		this._loginHandler = null;

		this._loginPage = url;
	},

	useLoginHandler: function(loginHandler) {
		this._loginPage = null;
		this._username = null;
		this._password = null;

		this._loginHandler = loginHandler;
	},

	login: function(username, password, successHandler, data) {
		var self = this;

		var params = {
			//username: username,
			//password: password
			cred: (username + ":" + password).base64Encode()
		};

		// Pass client type if specified by useAutoLogin
		if (!params.clientType && this._clientType) {
			params.clientType = this._clientType;
		}

		// Allow passing additional params through data object
		if (data) {
			$.extend(params, data);
		}

		this._doAjax({
			url: this._serverUrl + "/services/login",
			data: params,
			success: function(data) {
				if (data.loginSuccess) {
					self._sessionId = data.sessionId;
					$.cookie('elvisSessionId', self._sessionId);

					if (successHandler) {
						successHandler(data);
					}
				} else {
					alert(data.loginFaultMessage);
				}
			},
			// Overwrite default error handling to prevent attempt to auto-login
			error: function(jqXHR, textStatus, errorThrown) {
				alert('Unable to authenticate, cause: ' + jqXHR.status + ' ' + jqXHR.statusText);
			}
		});
	},

	getProfile: function(successHandler) {
		this._doAjax({
			url: this._serverUrl + "/services/profile",
			success: function(data) {
				successHandler(data);
			}
		});
	},

	logout: function(arg) {
		if (typeof arg == 'function') {
			var callbackHandler = arg;
			this._doAjax({
				url: this._serverUrl + "/services/logout",
				success: function(data) {
					callbackHandler();
				}
			});
		}
		else if (arg != undefined && typeof arg == 'string') {
			var nextUrl = arg;
			window.location = this._serverUrl + "/logout?logoutSuccessUrl=" + encodeURIComponent(nextUrl);
		}
		else {
			window.location = this._serverUrl + "/logout";
		}
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
		_param = $.extend(_param, params);

		var self = this;

		this._doAjax({
			url: this._serverUrl + "/services/search",
			data: _param,
			success: function(data) {
				if (self._sessionId) {
					for (var i = 0; i < data.hits.length; i++) {
						self._processHitUrls(data.hits[i]);
					}
				}

				callbackHandler(data);
			}
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

		// Overwrite and extend defaults with actual paramsalert("test");
		_param = $.extend(_param, params);

		this._doAjax({
			url: this._serverUrl + "/services/browse",
			data: _param,
			success: function(data) {
				callbackHandler(data);
			}
		});
	},

	update: function(id, metadata, successHandler) {
		// Add id to metadata
		metadata["id"] = id;

		var request = {
			url: this._serverUrl + "/services/update",
			data: metadata
		};

		if (successHandler) {
			request.success = successHandler;
		}

		this._doAjax(request);
	},

	_doAjax: function(request) {
		request.elvisApi = this;

		// Extend ajax request with default error handling
		if (!request.error) {
			request.error = this._onError;
		}

		// Wrap success handler to provide JSONP error handling by looking for 'errorcode' in response data from Elvis
		var originalSuccessHandler = request.success;
		request.success = function(data, textStatus, jqXHR) {
			if (!data.errorcode) { // || (data.errorcode >= 200 && data.errorcode < 300)) {
				if (originalSuccessHandler) {
					originalSuccessHandler(data, textStatus, jqXHR);
				}
			} else {
				// Error was received in response data, adjust jqXHR status and call error handler
				jqXHR.status = data.errorcode;
				jqXHR.statusText = data.message;

				request.error(jqXHR, "error", data.message);
			}
		};

		// Configure default ajax settings
		if (!request.type) {
			request.type = "POST";
		}
		if (!request.dataType) {
			request.dataType = "json";
		}
		if (!request.xhrFields) {
			request.xhrFields = {
			   withCredentials: true
			};
		}

		// Add unique part to URL when using 'get' to prevent caching
		// not needed with post (which should never be cached)
		//_param._ = (new Date()).getTime();

		request.url = this._appendSessionId(request.url);

		// Execute ajax request
		$.ajax(request);
	},

	_processHitUrls: function(hit) {
		if (hit.thumbnailUrl) {
			hit.thumbnailUrl = this._processHitUrl(hit.thumbnailUrl);
		}
		if (hit.previewUrl) {
			hit.previewUrl = this._processHitUrl(hit.previewUrl);
		}
		if (hit.originalUrl) {
			hit.originalUrl = this._processHitUrl(hit.originalUrl);
		}
		if (hit.thumbnailHits) {
			for (var i = 0; i < hit.thumbnailHits.length; i++) {
				this._processHitUrls(hit.thumbnailHits[i]);
			}
		}
	},

	_processHitUrl: function(url) {
		return this._appendSessionId(url);
	},

	_appendSessionId: function(url) {
		// Add sessionId to URL in case cookies don't work
		if (url && this._sessionId) {
			// TODO should we remove ;jsessionid=[a-zA-Z0-9-_]+ if is already in the URL? could that happen?
			var idx = url.indexOf("?");
			if (idx == -1) {
				url += ";jsessionid=" + this._sessionId;
			} else {
				// Put ;jsessionid before querystring, otherwise it doesn't work
				url = url.substring(0, idx) + ";jsessionid=" + this._sessionId + url.substring(idx);
			}
		}
		return url;
	},

	_onError: function(jqXHR, textStatus, errorThrown) {
		// 'this' context for this function will be the jquery request object
		var request = this;
		var self = request.elvisApi;

		// Check for 401 Unauthorized
		if (jqXHR.status == 401) {
			// Use remembered credentials if available
			// TODO find a secure non-xss hackable method to remember the users credentials

			if (self._loginPage) {
				// Show login page
				window.location = self._loginPage;

				return;
			}

			// Ajax login attempt, keep original request to repeat after login
			var l = self._requestsToRepeatAfterLogin.push(request);
			if (l != 1) {
				return; // Only attempt login on first failed request
			}

			// Handler to re-execute original requests after successful authentication
			var loginSuccesHandler = function(loginResponse) {
				var requests = self._requestsToRepeatAfterLogin;
				self._requestsToRepeatAfterLogin = [];

				for (var i = 0; i < requests.length; i++) {
					self._retryRequestAfterLogin(requests[i]);
				}
			};

			if (self._username && self._password) {
				self.login(self._username, self._password, loginSuccesHandler);

				return; // Don't show alert
			}

			if (self._loginHandler) {
				self._loginHandler(loginSuccesHandler);

				return; // Don't show alert
			}
		}

		if (jqXHR.status >= 300) {
			// Fallback: show error message
			alert('Server call failed, cause: ' + jqXHR.status + ' ' + jqXHR.statusText);
		}
	},

	_retryRequestAfterLogin: function(request) {
		var originalErrorHandler = request.error;

		// Overwrite default error handling to prevent attempt to auto-login
		request.error = function(jqXHR, textStatus, errorThrown) {
			if (jqXHR.status == 401) {
				// Not logged in? But we just did a successful login!
				// Prevent infinite retry loop in case cross-domain is preventing cookie from being accepted
				alert('Cross-domain login might have been blocked. Error: ' + jqXHR.status + ' ' + jqXHR.statusText);
			}
			else {
				originalErrorHandler.call(request, jqXHR, textStatus, errorThrown);
			}
		};

		request.url = this._appendSessionId(request.url);

		$.ajax(request);
	}
});

/**
 * Utility methods for Elvis plugins.
 * 
 * ElvisPlugin.resolveElvisContext()
 *	resolves elvisContext either from window or parent if running in iframe (for action opened in external browser)
 * 
 * ElvisPlugin.queryForSelection(pluginHits)
 *	returns a "(id:... OR id:... OR id:...)" query to search all hits in an elvisContext selection
 * 
 * ElvisPlugin.resolveQueryString()
 *	returns the query string that was used as search in the Elvis desktop client,
 *  if available, returns the search used in the current search tab,
 *  otherwise returns the search entered in the top-left search field.
 */ 
var ElvisPlugin = {
	resolveElvisContext: function(required) {
		if (!window.elvisContext && parent && parent.elvisContext) {
			window.elvisContext = parent.elvisContext;
		}

		if (window.elvisContext == undefined && (required || required == undefined)) {
			alert("Unable to resolve elvisContext, this action plugin has to be triggered from Elvis.");
		}

		return window.elvisContext;
	},
	queryForSelection: function(selectedHits) {
		if (selectedHits.length == 0) {
			return "";
		}

		var assetIds = new Array();
		for (var i = 0; i < selectedHits.length; i++) {
			assetIds.push(selectedHits[i].id);
		}
		return "(id:" + assetIds.join(" OR id:") + ")";
	},
	queryForFolderSelection: function(selectedFolders) {
		if (selectedFolders.length == 0) {
			return "";
		}

		var paths = new Array();
		for (var i = 0; i < selectedFolders.length; i++) {
			paths.push(selectedFolders[i].assetPath);
		}
		return '(ancestorPaths:"' + paths.join('" OR ancestorPaths:"') + '")';
	},
	resolveQueryString: function() {
		var elvisCtx = ElvisPlugin.resolveElvisContext(false);
		if (!elvisCtx) {
			return null;
		}
		var query = elvisCtx.activeTab.queryString;
		if (query == null) {
			query = elvisCtx.app.queryString;
		}
		return query;
	}
}

/**
 * AssetPermissions
 * 
 * Utility to check permissions 'mask' for available permissions.
 * The permissions mask consists of a string with one character for
 * every permission available in Elvis: VPUMERXCD
 * 
 * V = VIEW
 * P = VIEW_PREVIEW
 * U = USE_ORIGINAL
 * M = EDIT_METADATA
 * E = EDIT
 * R = RENAME
 * X = MOVE
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

// Setup path to locate /images/document_*.png
HitRenderer.resources = "shared_resources/elvis_api";

// Create a hitRenderer instance and configure it
var hitRenderer = new HitRenderer();

// Id of element that will contain the rendered hits (optional)
hitRenderer.hitsTarget = "elementId";

// Array with metadata field names that should be displayed below the each hit
hitRenderer.metadataToDisplay = ["name", "rating", "credit"];

// Callback funtion, will be called when a hit is clicked
hitRenderer.itemClick = function (hit) {
	... your code ...
};

// Id of element that will contain an info message about how many results were found (optional)
hitRenderer.infoTarget = "resultInfo";

// Id of element that will contain a result pager
hitRenderer.pageTarget = "resultPager";

// Callback function, will be called when a page link is clicked
hitRenderer.pageClick = function (start, num) {
	... your code to 'search' the requested page ...
};

// Once a render is setup you can can use it by calling it's 'render' method:
hitRenderer.render( results from elvisApi.search OR array of hits OR single hit );

// It is also possible to pass the render method as callback to the elvisApi.search method
elvisApi.search(..., myRenderer.render)

 */
var HitRenderer = $.Class({

	/*
	 * Constructor
	 */

	init: function() {
		// Set default options
		// These can be customized
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

		// Handler functions
		this.itemClick = null;
		this.pageClick = null;
		this.selectionChange = null;

		// Resolve HitRenderer.resources if not explicitly configured
		if (!HitRenderer.resources) {
			var elvisApiUrl = "${pluginsBaseRootUrl}/web.shared/elvis_api";
			if (elvisApiUrl.indexOf("$") == 0) {
				// Variable was not replaced, we are probably not running on an
				// Elvis server, try to lookup URL in elvisContext
				var elvisCtx = ElvisPlugin.resolveElvisContext(false);
				if (elvisCtx != undefined) {
					elvisApiUrl = elvisCtx.app.pluginsBaseRootUrl + "/web.shared/elvis_api";
				}
				else {
					// Unable to resolve elvisContext, use backward compatible default
					elvisApiUrl = "shared_resources/elvis_api";
				}
			}
			HitRenderer.resources = elvisApiUrl;
		}

		// Private instance variables
		this.hits = null;

		// Hack to bind 'public' method so it can be passed as reference
		var self = this;
		this.render = (function(data) {
			self.renderInternal(data);
		});
	},

	/*
	 * Public method: render
	 *
	 * Renders data to HTML.
	 *
	 * This method is flexible, it accepts:
	 * - an array of hits
	 * - a single hit
	 * - a data object returned by the Elvis API
	 *
	 * The last option means you can provide this method
	 * directly as callback to
	 *
	 *	  elvisApi.search(..., myRenderer.render)
	 *
	 * The following HTML structure is rendered:
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
	 * - a data object returned by the Elvis API
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
			targetElement.html(html);

			this.postProcessTarget(targetElement);

			this.setRenderSize(this.renderSize);

		}
	},

	renderInfo: function(data) {
		if (this.infoTarget != null) {
			var infoMsg = (data.totalHits > data.maxResultHits && this.pageTarget == null)
				? "Found {totalHits}, showing {maxResultHits}"
				: "Found {totalHits}";
			$(this.infoTarget).html(infoMsg.replaceParams({
				totalHits: data.totalHits,
				maxResultHits: data.maxResultHits
			}));
		}
	},

	setRenderSize: function(size) {
		var targetElement = $(this.hitsTarget);

		switch (size) {
		case "medium":
			targetElement.removeClass("elvisLarge");
			targetElement.removeClass("elvisSmall");
			break;
		case "small":
			targetElement.removeClass("elvisLarge");
			targetElement.addClass("elvisSmall");
			break;
		case "large":
			targetElement.removeClass("elvisSmall");
			targetElement.addClass("elvisLarge");
			break;
		default:
			throw("Illegal renderSize: "+size);
		}

		this.renderSize = size;

		// Scale square thumbnails
		this.rescaleSquareThumbs(targetElement);

		// Update controls
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
		return "<div class='elvisHitBox'>{thumbnail}{metadata}</div>".replaceParams({
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
			// Do not create link if we don't have an itemClick handler and no linkClass or linkRel
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
		// Find and process hit boxes
		var elements = $(".elvisHitBox", targetElement);

		for (var i = 0; i < elements.length; i++) {
			this.postProcessHit(elements[i], this.hits[i], i);
		}
	},

	postProcessHit: function(hitElement, hit, index) {
		var self = this;

		// Register click handler
		if (this.itemClick || this.selectable) {
			$(hitElement).bind("click", function(event) {
				var result = (self.itemClick ? self.itemClick(event, hit, self.hits, index) : true);
				if (result && self.selectable) {
					self.toggleSelected(hitElement, hit, index);
				}

				event.preventDefault();
			});
		}

		// Register double-click handler
		if (this.itemDoubleClick) {
			$(hitElement).bind("dblclick", function(event) {
				self.itemDoubleClick(event, hit, self.hits, index);

				event.preventDefault();
			});
		}
	},

	toggleSelected: function(hitElement, hit, index) {
		var hitElementJQ = $(hitElement);
		if (this.multiselect) {
			// Remove or add selected hit
			if (hitElementJQ.hasClass("selected")) {
				this.selectedHits.splice(jQuery.inArray(hit, this.selectedHits), 1);
			} else {
				this.selectedHits.push(hit);
			}
		} else {
			// Select this hit
			if (hitElementJQ.hasClass("selected")) {
				this.selectedHits = [];
			} else {
				this.selectedHits = [hit];
			}

			// Unselect other hits
			hitElementJQ.siblings().removeClass("selected");
		}

		hitElementJQ.toggleClass("selected");

		if (this.selectionChange) {
			this.selectionChange(this.selectedHits);
		}
	},

	rescaleSquareThumbs: function(targetElement) {
		var self = this;
		$("img.square", targetElement).each(function(){
			self.squareFillImage($(this));
		});
	},

	findParent: function(el, str) {
		return typeof str == 'undefined' ? el.parent() : $(el.parents(str).get(0));
	},

	squareFillImage: function(img) {
		var imgElmt = img.context;
		// Wait until image has loaded so we know its dimensions
		if (imgElmt.naturalWidth == 0 || this.findParent(img, "div.square").context.clientWidth == 0) {
			var self = this;
			img.bind("load", function(){
				self.squareFillImage(img);
			});
			return;
		}

		// Get 'square' container size
		// (a little larger to make sure it really fills its container and avoid anti-alias grey areas)
		var maxSize = this.findParent(img, "div.square").context.clientWidth + 2;

		// Default sizing (for square images)
		var style = {
			width: maxSize + "px",
			height: maxSize + "px",
			left: "-1px",
			top: "-1px"
		};

		// Adjust scaling for landscape and portrait images
		if (imgElmt.naturalWidth > imgElmt.naturalHeight) {
			// Landscape (height is smallest)
			var width = (maxSize / imgElmt.naturalHeight) * imgElmt.naturalWidth;
			var offset = (maxSize - width) / 2;

			style.width = width + "px";
			style.left = offset + "px";
		} else if (imgElmt.naturalWidth < imgElmt.naturalHeight) {
			// Portrait (width is smallest)
			var height = (maxSize / imgElmt.naturalWidth) * imgElmt.naturalHeight;
			var offset = (maxSize - height) / 2;

			style.height = height + "px";
			style.top = offset + "px";
		}

		img.css(style);
	},

	/*
	 * Size controls
	 */

	renderSizeControls: function() {
		if (this.sizeTarget) {
			$(this.sizeTarget).html("");

			var sizes = ["small", "medium", "large"];
			for (var i = 0; i < sizes.length; i++) {
				var size = sizes[i];
				var linkElement = $("<a href='#' onclick='return false'/>").addClass(size + (size == this.renderSize ? " selected" : ""));
				this.observeSizeControl(linkElement, size);

				$(this.sizeTarget).append(linkElement);
			}
		}
	},

	observeSizeControl: function(linkElement, size) {
		var self = this;
		linkElement.bind("click", function() {
			self.setRenderSize(size);
		});
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

			// Render prev link
			if (curPageIdx > 0) {
				linkHtml += this.renderPageLink(curPageIdx - 1, "Prev", "elvisPagePrev");
			} else {
				linkHtml += '<span class="elvisPagePrev elvisPageDisabled">Prev</span>';
			}

			// Render page links around current page
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

			// Render next link
			if (curPageIdx < lastPageIdx) {
				linkHtml += this.renderPageLink(curPageIdx + 1, "Next", "elvisPageNext");
			} else {
				linkHtml += '<span class="elvisPageNext elvisPageDisabled">Next</span>';
			}

			// Update HTML
			var targetElement = $(this.pageTarget);
			targetElement.html('');

			if (numPages > 1) {
				targetElement.html('<div class="elvisPager">' + linkHtml + '</div>');
			}

			// Add event handlers
			var self = this;
			targetElement.find("a").bind("click", function(event){
				var pageIdx = parseInt($(this).attr("rel"));
				var start = pageIdx * data.maxResultHits;
				self.pageClick(start, data.maxResultHits);
			});
		}
	},
	renderPageLink: function(pageIdx, label, className) {
		return '<a href="#" onclick="return (false)" rel="{rel}"{classAttr}>{label}</a>'.replaceParams({
			rel: pageIdx,
			label: label,
			classAttr: (className != undefined ? ' class="'+className+'"' : '')
		});
	}
});



var FacetRenderer = $.Class({

	init: function() {
		// Set default options
		// These can be customized
		this.facets = null;
		this.facetTargetPostfix = "Facet";
		this.facetClick = null;
		//this.maxValuesToDisplay = 30;

		// Private instance variables
		this._selectedFacets = {};

		// Hack to bind 'public' method so it can be passed as reference
		this.render = function(data) {
			this._renderInternal(data);
		};
	},

	_renderInternal: function(data) {
		for (var j = 0; j < this.facets.length; j++) {
			var field = this.facets[j];
			var facetValues = data.facets[field];

			var target = $("#" + field + this.facetTargetPostfix);
			if (target.length == 0) {
				alert('Element with id="' + (field + this.facetTargetPostfix) + '" is missing, it should be declared in the html');
			}

			var targetUL = this._locateOrCreateTargetUL(target, field);

			// Render facet items
			this._renderFacet(targetUL, field, facetValues);

			// Register click listeners
			this._postProcessFacet(target, field, facetValues);

			// Show or hide if empty
			if (facetValues.length != 0) {
				target.show();
			} else {
				target.hide();
			}
		}
	},

	_renderFacet: function(targetUL, field, facetValues) {
		var c = facetValues.length;//Math.min(facetValues.length, this.maxValuesToShow);
		var html = "";
		for (var i = 0; i < c; i++) {
			var value = facetValues[i].value;
			var hitCount = facetValues[i].hitCount;

			var selected = (this._selectedFacets[field] && this._selectedFacets[field][value]);

			html += '<li{classAttr}><a href="#" onclick="return false"><span class="label">{label}</span><span class="count">{hitCount}</span></a></li>'. replaceParams({
				field: field,
				label: value,
				hitCount: hitCount,
				classAttr: (selected ? ' class="selected"' : '')
			});
		}

		// Update contents
		targetUL.html(html);
	},

	_locateOrCreateTargetUL: function(target, field) {
		var targetULs = $("ul:first", target);
		if (targetULs.size() == 0) {
			target.append($("<ul/>").addClass("elvisFacet"));
			return $("ul:first", target);
		}

		return targetULs;
	},

	_postProcessFacet: function(target, field, facetValues) {
		var links = target.find("a");
		for (var i = 0; i < links.length; i++) {
			var value = facetValues[i].value;
			var linkElement = links[i];

			this._postProcessLink(linkElement, field, value);
		}
	},

	_postProcessLink: function(linkElement, field, value) {
		var self = this;
		$(linkElement).bind("click", function(event){
			// prep selected facets for field
			if (self._selectedFacets[field] == null) {
				self._selectedFacets[field] = {};
			}

			// toggle selected
			var selected = !(self._selectedFacets[field][value]);
			self._selectedFacets[field][value] = selected;

			if (self.facetClick) {
				self.facetClick(field, value, selected, $(this));
			}
		});
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



var ColumnTree = $.Class({

	init: function (targetId, elvisApi) {
		this.elvisApi = elvisApi;
		this.pathChange = null;

		this.folderPath = "";
		this.containerId = null;

		this._targetId = targetId;
		this._innerWrapper = null;


		var self = this;
		$(document).ready(function(){
			self._initHtml();
		});
	},

	_initHtml: function () {
		this._target = $(this._targetId);
		this._target.addClass("elvisColumnTree");

		this._innerWrapper = $("<div/>");
		this._target.append(this._innerWrapper);

		// Browse root
		this._browse(this.folderPath);
	},

	refresh: function () {
		this._innerWrapper.html("");

		var self = this;
		this.elvisApi.browse({path: this.folderPath, fromRoot: ""}, function(result) {
			self._render(result);
		});
	},

	_browse: function (folderPath) {
		this.folderPath = folderPath;

		//Browse default includes collection and dossier extensions, these are handled as assets and not folders.
		//this.elvisApi.browse({path: folderPath}, this._render.bind(this));
		var self = this;
		this.elvisApi.browse({path: folderPath}, function(result) {
			self._render(result);
		});
	},

	_render: function (browseResult) {
		// Empty result, do nothing
		if (browseResult.length == 0) {
			return;
		}

		// Create new list
		this._renderFolder(browseResult);

		// Adjust width of inner wrapper and scroll right
		this._innerWrapper.width(201 * this._innerWrapper.children().length);
		this._target.scrollLeft = this._innerWrapper.clientWidth;
	},

	_renderFolder: function (browseResult) {
		var listElement = $("<div/>").addClass("elvisColumnTreeList");
		this._innerWrapper.append(listElement);

		var ul = $("<ul/>");
		for (var i = 0; i < browseResult.length; i++) {
			var data = browseResult[i];

			var li = this._createItem(data, listElement);
			ul.append(li);

			// Render child folders if received
			if (data.children) {
				li.addClass("selected");

				this._renderFolder(data.children);
			}
		}
		listElement.append(ul);
	},

	_createItem: function (data, listElement) {
		var li = $("<li/>").addClass(data.directory ? "folder" : "container");
		li.html(data.name);

		var self = this;
		li.bind("click", function(){
			self._itemClick(data, li, listElement);
		});

		return li;
	},

	_itemClick: function(data, li, listElement) {
		li.siblings().removeClass("selected");
		li.addClass("selected");

		if (data.directory) {
			this.containerId = null;

			// Remove any displayed subfolders
			listElement.nextAll().remove();

			// Browse to subfolder
			this._browse(data.assetPath);
		}
		else if (data.containerId) {
			// Select container
			this.containerId = data.containerId;
		}

		this.pathChange();
	}

});



var PreviewLightbox = $.Class({

	init: function() {
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

		var self = this,
			template = '<div id="elvisPreviewOverlay"></div>'
		+ '<div id="elvisPreview" style="display: none;"><div id="elvisPreviewWrapper">'
			+ '<div id="elvisPreviewCell"><div id="elvisPreviewBox" style="visibility: hidden;"></div></div>'
			+ '<a id="elvisPreviewClose" href="#" onclick="return (false)">&nbsp;</a>'
			+ '<a id="elvisPreviewPrev" href="#" onclick="return (false)">&nbsp;</a>'
			+ '<a id="elvisPreviewNext" href="#" onclick="return (false)">&nbsp;</a>'
		+ '</div></div>';

		$('body').append(template);

		$('#elvisPreview').bind("click", function(event) {
				self.close();
				return false;
		});
		$('#elvisPreviewClose').bind("click", function(event) {
			self.close();
			return false;
		});

		$('#elvisPreviewPrev').bind("click", function(event) {
			self.prev();
			return false;
		});

		$('#elvisPreviewNext').bind("click", function(event) {
			self.next();
			return false;
		});

		$(window).resize(function(){
			self.adjustSize();
		});
	},

	showGallery: function(hits, currentIndex) {
		this.hits = hits;
		this.currentIndex = currentIndex;

		this.show(this.hits[this.currentIndex]);
	},

	next: function() {
		if (this.hits != null && this.currentIndex < this.hits.length - 1) {
			this.show(this.hits[++this.currentIndex]);
		} else {
			this.close();
		}
	},

	prev: function() {
		if (this.hits != null && this.currentIndex > 0) {
			this.show(this.hits[--this.currentIndex]);
		} else {
			this.close();
		}
	},

	show: function(previewUrlOrHit) {
		if (previewUrlOrHit == null || previewUrlOrHit == "") {
			return;
		}

		// Find preview URL
		if (previewUrlOrHit.previewUrl) {
			this.previewUrl = previewUrlOrHit.previewUrl;
		} else if (typeof(previewUrlOrHit) == 'string') {
			this.previewUrl = previewUrlOrHit;
		} else {
			this.previewUrl = "";
		}

		// Only insert HTML once
		if (!this.htmlCreated) {
			this.insertHtml();

			this.htmlCreated = true;
		}

		// Clear natural size so we can capture it again
		this.naturalPreviewSize = null;

		// Clear contents
		var previewBox = $('#elvisPreviewBox');
		previewBox.css({
			visibility: "hidden"
		});
		previewBox.html("");

		// Determine previewType
		var typeMatch = /.*\.(jpg|mp4|html)/.exec(this.previewUrl);
		this._previewType = (typeMatch == null || typeMatch.length == 1) ? null : typeMatch[1];

		// Insert preview contents
		if (this._previewType == "jpg") {
			previewBox.html('<img id="elvisPreviewObject" class="elvisPreviewImage" src="{src}"/>'.replaceParams({
				src: this.previewUrl
			}));
		}
		else if (this._previewType == "mp4") {
			previewBox.html('<video id="elvisPreviewObject" class="elvisPreviewVideo" src="{src}" controls="true" autoplay="true"></video>'.replaceParams({
				src: this.previewUrl
			}));
		}
		else if (this._previewType == "html") {
			previewBox.html('<iframe id="elvisPreviewObject" class="elvisPreviewText" src="{src}"></div>'.replaceParams({
				src: this.previewUrl
			}));
		}
		else {
			var msg = "No preview available";
			if (previewUrlOrHit.metadata) {
				msg += " for " + previewUrlOrHit.metadata.name;
			}
			previewBox.html('<div id="elvisPreviewObject" class="elvisPreviewNotAvailable"><div>{msg}</div></div>'.replaceParams({
				msg: msg
			}));
		}

		// Show loading icon
		$('#elvisPreview').addClass("elvisThrobber");

		this.adjustSize();

		$('#elvisPreviewPrev').toggle(this.hits != null && this.currentIndex > 0);
		$('#elvisPreviewNext').toggle(this.hits != null && this.currentIndex < this.hits.length - 1);

		$('#elvisPreviewOverlay').show();
		$('#elvisPreview').show();
	},

	close: function() {
		$('#elvisPreview').hide();
		$('#elvisPreviewOverlay').hide();

		// Remove preview element to stop video
		$('#elvisPreviewBox').html("");
		
		// Clear hits so next call will not show old gallery
		this.hits = null;
	},

	adjustSize: function() {
		// Adding check to determine the object exists to prevent unwarrented errors.
		var previewObject = $('#elvisPreviewObject');
		if (previewObject != null && previewObject.width() == 0) {
			// Delay adjustSize until we know preview size
			var self = this;
			setTimeout(function(pe) {
				self.adjustSize();
			}, 300);

			return;
		}

		// Store natural size first time
		var isFirstAdjust = (this.naturalPreviewSize == null);
		if (isFirstAdjust) {
			this.naturalPreviewSize = {
				width: previewObject.width(),
				height: previewObject.height()
			};
		}

		// Set size on preview object
		var jqViewport = $(window);
		var style = {
			width: jqViewport.width(),
			height: jqViewport.height()
		};

		if (this._previewType == "jpg") {
			style.marginTop = 0;

			// Determine correct scale factor (smallest = best fit)
			var fH = style.width / this.naturalPreviewSize.width;
			var fV = style.height / this.naturalPreviewSize.height;
			var f = Math.min(fH, fV);

			// Prevent upscaling
			f = Math.min(f, 1.0);

			// Apply scaling
			style.width = Math.round(this.naturalPreviewSize.width * f);
			style.height = Math.round(this.naturalPreviewSize.height * f);
		}
		else if (this._previewType == "mp4") {
			// Make sure video does not overlap close button
			style.marginTop = 60;
			style.height = style.height - 60;
		}

		// Adding check to determine the object exists to prevent unwarrented errors.
		if ($('#elvisPreviewObject') != null) {
			$('#elvisPreviewObject').css({
				marginTop: style.marginTop + 'px',
				width: style.width + 'px',
				height: style.height + 'px'
			});
		}
		if (isFirstAdjust) {
			// $('#body')[0].css({height: document.viewport.height()+"px", overflow: "hidden"});
			$('#elvisPreviewBox').css({
				visibility: "visible"
			});

			// Hide loading icon
			$('#elvisPreview').removeClass("elvisThrobber");
		}
	}
});


/**
 * Extensions of JavaScript String
 * 
 * Generic code for AJAX throbber
 */

(function() {

	// Douglas Crockford's Supplant. Read http://javascript.crockford.com/remedial.html for details.
	String.prototype.replaceParams = function(o) {
		return this.replace(/{([^{}]*)}/g,
		function(a, b) {
			try {
				var r = eval("o." + b);
				return typeof r === 'string' || typeof r === 'number' ? r : a;
			} catch (e) {
				return "";
			}
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
	 * AJAX throbber
	 * Shows throbber when AJAX requests are executed
	 *
	 * http://ajaxload.info/
	 */

	jQuery(function($){
		$('#throbber').ajaxStart(function(){
			$(this).show();
		});
		$('#throbber').ajaxStop(function(){
			$(this).hide();
		});
	});

})();
