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

///////////////////////////////////////////////////////////////////////////////
//
// This file defines useful 'classes' that can be used with
// the Elvis API. For more info see http://www.elvisdam.com
//
// Depends on jQuery. Make sure jQuery is loaded BEFORE this file.
//
///////////////////////////////////////////////////////////////////////////////

/**
 * ElvisAPI
 * 
 * See documentation on community knowledgebase on:
 * http://www.elvisdam.com
 */
var ElvisAPI = $.Class({

	init: function(serverUrl) {
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
		var self = this;
		
        this._doAjax({
			url: this._serverUrl + "/services/login",
			data: {
				//username: username,
				//password: password
				cred: (username + ":" + password).base64Encode()
			},
			success: function(data) {
				if (data.loginSuccess) {
					this.userProfile = data.userProfile;
		
							if (successHandler) {
						successHandler(data);
							}
						} else {
					alert(data.loginFaultMessage);
						}
			},
			// Overwrite default error handling to prevent attempt to auto-login
			onFailure: function(request, errorInfo) {
				alert('Unable to authenticate, cause: ' + errorInfo.errorcode + ' ' + errorInfo.message);
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
		_param = $.extend(_param, params);

        this._doAjax({
        	url: this._serverUrl + "/services/search",
            data: _param,
            success: function(data) {
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

	update: function(id, metadata) {
		// add id to metadata
		metadata["id"] = id;

        this._doAjax({
        	url: this._serverUrl + "/services/update",
            data: metadata,
            dataType: "text" // server sends empty response, do not try to parse
		});
	},

	_doAjax: function(request) {
		var self = this;
	
		// Extend ajax request with default error handling
		if (!request.error) {
			request.error = function(jqXHR, textStatus, errorThrown) {
				self._onFailure(request, {errorcode: jqXHR.status, message: jqXHR.statusText + ' (' + textStatus + ')'});
			};
		}
	
		// Wrap success handler to provide JSONP error handling by looking for 'errorcode' in response data from elvis
		var originalSuccessHandler = request.success;
		request.success = function(data, textStatus, jqXHR) {
			if (!data.errorcode) { // || (data.errorcode >= 200 && data.errorcode < 300)) {
				if (originalSuccessHandler) {
					originalSuccessHandler(data, textStatus, jqXHR);
			}
		} else {
				self._onFailure(request, data);
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
	    
		// Add unique part to url when using 'get' to prevent caching
		// not needed with post (which should never be cached)
		//_param._ = (new Date()).getTime();
	    
	    // Execute ajax request
		$.ajax(request);
	},

	_onFailure: function(request, errorInfo) {
		if (request.onFailure) {
			request.onFailure(request, errorInfo);
			return;
		}
	        
		// Check for 401 Unauthorized
		if (errorInfo.errorcode == 401) {

			if (this._loginPage) {
				// Show login page
				window.location = this._loginPage;
				
				return;
			}

			if (this._username && this._password) {
				var l = this._requestsToRepeatAfterLogin.push(request);
				if (l == 1) {
			        var self = this;
			        
					// Attempt auto login on first authentication failure
					this.login(this._username, this._password, function(loginResponse) {

						// Re-execute original requests after successful authentication
						var requests = self._requestsToRepeatAfterLogin;
						self._requestsToRepeatAfterLogin = [];

						for (var i = 0; i < requests.length; i++) {
							new $.ajax(requests[i]);
						}

					});
				}

				return;
			}
		}

		// Fallback: show error message
		alert('Server call failed, cause: ' + errorInfo.errorcode + ' ' + errorInfo.message);
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
var HitRenderer = $.Class({

	/*
	 * Static config options
	 */

	resources: "shared_resources/elvis_api",

	/*
	 * Constructor
	 */

	init: function() {
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
		// find and process hit boxes
		var elements = $(".elvisHitBox", targetElement);

		for (var i = 0; i < elements.length; i++) {
			this.postProcessHit(elements[i], this.hits[i], i);
		}
	},

	postProcessHit: function(hitElement, hit, index) {
		// register click handler
		if (this.itemClick || this.selectable) {
            var self = this;
            $(hitElement).bind("click", function(event){
                var result = (self.itemClick ? self.itemClick(event, hit, self.hits, index) : true);
				if (result && self.selectable) {
					self.toggleSelected(hitElement, hit, index);
				}
                
                event.preventDefault();
            });
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
				e.removeClass("selected");
			});
		}
		
		hitElement.toggleClass("selected");
		
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
		// wait until image has loaded so we know its dimensions
		if (imgElmt.naturalWidth == 0 || this.findParent(img, "div.square").context.clientWidth == 0) {
            var self = this;
            img.bind("load", function(){
                self.squareFillImage(img);
            });
			return;
		}
		
		// get 'square' container size
		// (a little larger to make sure it really fills its container and avoid anti-alias grey areas)
		var maxSize = this.findParent(img, "div.square").context.clientWidth + 2;
		
		// default sizing (for square images)
		var style = {
			width: maxSize + "px",
			height: maxSize + "px",
			left: "-1px",
			top: "-1px"
		};
		
		// adjust scaling for landscape and portrait images
		if (imgElmt.naturalWidth > imgElmt.naturalHeight) {
			// landscape (height is smallest)
			var width = (maxSize / imgElmt.naturalHeight) * imgElmt.naturalWidth;
			var offset = (maxSize - width) / 2;

			style.width = width + "px";
			style.left = offset + "px";
		} else if (imgElmt.naturalWidth < imgElmt.naturalHeight) {
			// portrait (width is smallest)
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
				var linkElement = $("<a/>").addClass(size + (size == this.renderSize ? " selected" : ""));
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
			targetElement.html('');

			if (numPages > 1) {
				targetElement.html('<div class="elvisPager">' + linkHtml + '</div>');
			}

			// add event handlers
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
		};
	},
	
	_renderInternal: function(data) {
		for (var j = 0; j < this.facets.length; j++) {
			var field = this.facets[j];
			
			var target = $("#" + field + this.facetTargetPostfix);
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

				html += '<li{classAttr}><a href="#" onclick="return false"><span class="label">{label}</span><span class="count">{hitCount}</span></a></li>'. replaceParams({
					field: field,
					label: value,
					hitCount: hitCount,
					classAttr: (selected ? ' class="selected"' : '')
				});
			}
			
			// Update contents
			targetUL.html(html);

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
		var targetULs = $("ul:first", target);
		if (targetULs.size() == 0) {
			target.append($("<ul/>").addClass("elvisFacet"));
			return $("ul:first", target);
		}

		return targetULs;
	},
	
	_postProcessFacet: function(targetUL, field, facetValues) {
		var links = targetUL.find("a");
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

	init: function (targetId, elvisApi, selectionChangeHandler) {
		this.elvisApi = elvisApi;
		this.selectionChangeHandler = selectionChangeHandler;
		
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
		
		this.selectionChangeHandler(this);
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
		// empty result, do nothing
		if (browseResult.length == 0) {
			return;
		}

		// Create new list
		var list = $("<div/>").addClass("elvisColumnTreeList");
		
		var ul = $("<ul/>");
		for (var i = 0; i < browseResult.length; i++) {
			ul.append( this._createItem(browseResult[i], list) );
		}
		
		list.append(ul);
		this._innerWrapper.append(list);
		
		// Adjust width of inner wrapper and scroll right
		this._innerWrapper.style.width = (201 * this._innerWrapper.childElements().length) + "px";
		this._target.scrollLeft = this._innerWrapper.clientWidth;
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
	
	_itemClick: function(data, liElement, listElement) {
		liElement.siblings().each(function (e) {
			e.removeClass("selected");
		})
		liElement.addClass("selected");
	
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

		$('#elvisPreviewClose').bind("click", function(event) {
			self.close();
		});

		$('#elvisPreviewPrev').bind("click", function(event) {
			self.prev();
		});

		$('#elvisPreviewNext').bind("click", function(event) {
			self.next();
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
		var previewBox = $('#elvisPreviewBox');
		previewBox.css({
			visibility: "hidden"
		});
		previewBox.html("");

		// determine previewType
		var typeMatch = /.*\.(jpg|mp4|html)/.exec(this.previewUrl);
		this._previewType = (typeMatch == null || typeMatch.length == 1) ? null : typeMatch[1];

		// insert preview contents
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
			previewBox.html('<div id="elvisPreviewObject" class="elvisPreviewText"></div>');
			$('#elvisPreviewObject').load(this.previewUrl);
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

		// show loading icon
		$('#elvisPreview').addClass("loading");

		this.adjustSize();

		$('#elvisPreviewOverlay').show();
		$('#elvisPreview').show();
	},

	close: function() {
		$('#elvisPreview').hide();
		$('#elvisPreviewOverlay').hide();

		// remove preview element to stop video
		$('#elvisPreviewBox').html("");
	},

	adjustSize: function() {
		//Adding check to determine the object exists to prevent unwarrented errors.
		var previewObject = $('#elvisPreviewObject');
		if (previewObject != null && previewObject.width() == 0) {
			// Delay adjustSize until we know preview size
			var self = this;
			setTimeout(function(pe) {
				self.adjustSize();
			}, 300);

			return;
		}

		// store natural size first time
		var isFirstAdjust = (this.naturalPreviewSize == null);
		if (isFirstAdjust) {
			this.naturalPreviewSize = {
				width: previewObject.width(),
				height: previewObject.height()
			};
		}

		var doc = $(document);
		// set size on preview object
		var style = {
			width: doc.width(),
			height: doc.height()
		};

		if (this._previewType == "jpg") {
			style.marginTop = 0;

			// determine correct scale factor (smallest = best fit)
			var fH = doc.width() / this.naturalPreviewSize.width;
			var fV = doc.height() / this.naturalPreviewSize.height;
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
		if ($('#elvisPreviewObject') != null) {
			$('#elvisPreviewObject').css({
				marginTop: style.marginTop + 'px',
				width: style.width + 'px',
				height: style.height + 'px'
			});
		}
		if (isFirstAdjust) {
			//$('#body')[0].css({height: document.viewport.height()+"px", overflow: "hidden"});
			$('#elvisPreviewBox').css({
				visibility: "visible"
			});
			
			// hide loading icon
			$('#elvisPreview').removeClass("loading");
		}
	}
});


/**
 * Extensions of javascript String
 * 
 * Generic code for ajax throbber
 */

(function() {

	//Douglas Crockford's Supplant. Read http://javascript.crockford.com/remedial.html for details.
	String.prototype.replaceParams = function(o) {
		return this.replace(/{([^{}]*)}/g,
		function(a, b) {
			var r = eval("o." + b);
			return typeof r === 'string' || typeof r === 'number' ? r : a;
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
	 * Shows throbber when ajax requests are executed
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
