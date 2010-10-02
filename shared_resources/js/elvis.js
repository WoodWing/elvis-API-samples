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

//Douglas Crockford's Supplant. Read http://javascript.crockford.com/remedial.html for details.
// TODO replace with 'interpolate' from prototype?
String.prototype.replaceParams = function (o) {
    return this.replace(/{([^{}]*)}/g,
        function (a, b) {
            var r = eval("o."+b);
            //var r = o[b];
            return typeof r === 'string' ? r : a;
        }
    );
};
String.prototype.endsWith = function(str) {
	return (this.match(str+"$")==str);
}

/**
 * ElvisAPI
 * 
 * ...
 */

var ElvisAPI = Class.create({

    initialize: function (serverUrl) {
        this.serverUrl = serverUrl;
        this.data = null;
    },

    login: function (username, password, callbackHandler) {
        new Ajax.Request(this.serverUrl + "/services/login",
        {
            method: "post",
            parameters: {
            	username: username,
            	password: password
            },
            onSuccess: function (transport) {
                callbackHandler(transport.responseJSON);
            },
            onFailure: function () {
            	alert('Error logging in');
            }
        });
	},

    search: function (params, callbackHandler) {
        var defaultParams = {
//            q: "",
//            start: "",
            num: "50",
//            sort: "",
//            descending: "",
            metadataToReturn: "all"
//            format: "",
//            appendRequestSecret: ""
        };
        for (member in params) {
            defaultParams[member] = params[member];
        }
        new Ajax.Request(this.serverUrl + "/services/search",
        {
            method: "post",
            parameters: defaultParams,
            onSuccess: function (transport) {
                callbackHandler(transport.responseJSON);
            },
            onFailure: function () {
            	alert('Error performing search');
            }
        });
    },

    update: function (id, metadata) {
        // add id to metadata
        metadata["id"] = id;

        new Ajax.Request(this.serverUrl + "/services/update",
        {
            method: "post",
            parameters: metadata,
            onSuccess: function () {
                //Do nothing if updated without error?
            },
            onFailure: function () { alert('Error performing update') }
        });
    }
});

/**
 * HitRenderer
 * 
 * Can rendering result hits to HTML.
 *
 * TODO explain how to setup and customize...

var hitRenderer = new HitRenderer();

// path to locate document_*.png images
hitRenderer.sharedResources = "../shared_resources";

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
     * Constructor
     */

    initialize: function () {
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

        this.sharedResources = "shared_resources";
        
        // private instance variables
        this.hits = null;

        // Hack to bind 'public' method so it can be passed as reference
        this.render = function (data) {
            this.renderInternal(data);
        } .bind(this);
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
     *    elvisApi.search(..., myRenderer.render)
     *
     * The following html structure is rendered:
     *   
     *    div.elvisHitBox
     *    	a
     *    		div.elvisThumbnailImage
     *    			img
     */

    /**
     * Internally the method is called 'renderInternal'.
     * The actual render method is created at init so it can be bound
     * to the correct 'this' instance.
     */
    renderInternal: function (data) {
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
    getHitsFromData: function (data) {
        if (data == null) {
            return [];
        }
        else if (data.totalHits != null) {
            return (data.totalHits == 0 || !data.hits) ? [] : data.hits;
        }
        else if (data.constructor == Array) {
            return data;
        }
        else if (data.id && data.assetPath) {
            return [data];
        }
        else {
            alert("Unrecognized data type for HitRenderer.render(): " + data);
        }
    },
    
    renderAndProcessResults: function () {
        if (this.hitsTarget != null) {
            var html = this.renderHitList(this.hits);

            var targetElement = $(this.hitsTarget);
            targetElement.update(html);

            this.postProcessTarget(targetElement);
        }
    },
    
    renderInfo: function (data) {
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
    
    renderHitList: function (hitArray) {
        var html = "";
        for (var i = 0; i < hitArray.length; i++) {
            html += this.renderHitBox(hitArray[i], i);
        }
        return html;
    },

    renderHitBox: function (hit, idx) {
        return "<div class='elvisHitBox'>#{thumbnail}<div class='elvisMetadata'>#{metadata}</div></div>".interpolate({
            thumbnail: this.renderHitLink(hit, idx),
            metadata: this.renderMetadata(hit, this.metadataToDisplay)
        });
    },

    renderHitLink: function (hit, idx) {
        if (this.itemClick || this.linkClass || this.linkRel) {
            var href = (hit.previewUrl) ? hit.previewUrl : '#';

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

    renderThumbnailWrapper: function (hit) {
        return '<div class="elvisThumbnailWrapper">{thumbnail}</div>'.replaceParams({
            thumbnail: this.renderThumbnail(hit)
        });
        return this.renderThumbnail(hit);
    },

    renderThumbnail: function (hit) {
        if (hit.thumbnailUrl) {
            return '<div class="elvisThumbnailImage"><img src="{thumbnailUrl}" alt="" /></div>'.replaceParams(hit);
        }
        else if (hit.highlightedText) {
            return '<div class="elvisThumbnailText"><span>{highlightedText}</span></div>'.replaceParams(hit);
        }
        else if (hit.assetDomain == "container") { // && hit.thumbnailHits && hit.thumbnailHits.length != 0) {
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

    renderContainerThumbnail: function (hit) {
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

    renderMetadata: function (hit, fieldList) {
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

	layoutValue: function (hit, field, value) {
        var renderedValue = this.renderValue(hit, field, value);
        
    	return '<div title="{title}" class="{cssClass}">{value}</div>'.replaceParams({
        	title: field + ": " + renderedValue,
            cssClass: this.getValueCssClass(hit, field, value, renderedValue),
            value: renderedValue
        });
    },

    renderValue: function (hit, field, value) {
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

    renderRating: function (rating) {
        var html = "";
        if (rating == -1) {
        	html = 'Reject';
        }
        else {
	        var star = "&#9733;";
	        var dot = "&#8226;";
	        for (var i = 0; i < 5; i++) {
	            html += (rating != null && i < rating) ? star : dot;
	        }
	    }
        return html;
	},

    renderPreview: function (hit) {
        if (previewUrl) {
            return "";
        }

        return "<div id='preview'><object id='previewObject' data='{previewUrl}'></object></div>".replaceParams(hit);
    },

    /*
     * 'Private' methods
     * These are not meant to be 'overwritten'
     */
    
    getHitIcon: function (hit) {
        switch (hit.assetDomain) {
            case "audio":
            case "container":
            case "document":
            case "image":
            case "layout":
            case "pdf":
            case "presentation":
            case "text":
            case "video":
                return this.sharedResources + "/images/elvis/document_" + hit.assetDomain + ".png";
        }

        // Fallback
        return this.sharedResources + "/images/elvis/document_generic.png";
    },
    
    getValueCssClass: function (hit, field, value, renderedValue) {
    	if (field == "rating") {
    		return (renderedValue == "Reject") ? "elvisMetadataRatingReject" : "elvisMetadataRating"
    	}
    	
    	return "elvisMetadataValue";
    },

    /*
     * 'Protected' processing methods
     *
     * These can be 'overwritten' to customize behaviour
     */
    
    postProcessTarget: function (targetElement) {
        // find and process <a> tags directly under hit boxes
        var elements = targetElement.select(".elvisHitBox");
        
        for (var i = 0; i < elements.length; i++) {
            this.postProcessHit(elements[i], this.hits[i], i);
        }
    },

    postProcessHit: function (hitElement, hit, index) {
    	// register click handler
        if (this.itemClick) {
        	Event.observe(hitElement, 'click', function (event) {
                this.itemClick(hit, event.element(), this.hits, index);
            }.bind(this));
        }

        // process square thumbnails
        if (hit.assetDomain == "container") {
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

    makeImageSquareFilled: function (img, maxSize) {
        if (img.naturalWidth == 0) {
            img.observe("load", function (event) {
                this.squareFillImage(img, maxSize);
            }.bind(this));
        }
        else {
            this.squareFillImage(img, maxSize);
        }
    },

    squareFillImage: function (img, maxSize) {
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
	
    renderPager: function (data) {
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
        	}
        	
        	// render page links around current page
        	if (numPages > 1) {
	        	var firstPageIdx = Math.max(0, curPageIdx - Math.floor(maxLinks / 2));
	        	var lastLink = Math.min(lastPageIdx + 1, firstPageIdx + 9);
	        	for (var pageIdx = firstPageIdx; pageIdx < lastLink; pageIdx++) {
	        		if (pageIdx == curPageIdx) {
	        			linkHtml += '<span class="elvisPageCurrent">'+(pageIdx+1)+'</span>';
	        		}
	        		else {
	        			linkHtml += this.renderPageLink(pageIdx, pageIdx + 1);
	        		}
	        	}
	        }
        	
        	// render next link
        	if (curPageIdx < lastPageIdx) {
        		linkHtml += this.renderPageLink(curPageIdx + 1, "Next");
        	}
            
            // update html
            var targetElement = $(this.pageTarget);
            targetElement.update('');
            targetElement.update('<div class="elvisPager">' + linkHtml + '</div>');
            
            // add event handlers
	        var elements = targetElement.select("a");
	        for (var i = 0; i < elements.length; i++) {
	        	Event.observe(elements[i], 'click', function (event) {
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
    renderPageLink: function (pageIdx, label) {
        return '<a href="#" onclick="return (false)" rel="#{rel}">#{label}</a>'.interpolate({
        	rel: pageIdx,
        	label: label
        });
    }

});



var PreviewLightbox = Class.create({

    initialize: function () {
    	this.previewUrl = null;
        this.htmlCreated = false;
        this.naturalPreviewSize = null;
    },

    insertHtml: function () {
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

		$("elvisPreviewCell").observe("click", function (event) {
			if (event.pointerX() > document.viewport.getWidth() / 2) {
				this.next();
			}
			else {
				this.prev();
			}
		}.bind(this));
		
        $("elvisPreviewClose").observe("click", function (event) {
            this.close();
        }.bind(this));

        Event.observe(document.onresize ? document : window, "resize", function () {
            this.adjustSize();
        }.bind(this));
    },

	showGallery: function (hits, currentIndex) {
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

    show: function (previewUrlOrHit) {
    	if (previewUrlOrHit == null || previewUrlOrHit == "") {
    		return;
    	}
    	
    	if (previewUrlOrHit.previewUrl) {
    		this.previewUrl = previewUrlOrHit.previewUrl;
    	} else {
	    	this.previewUrl = previewUrlOrHit;
	    }
	    
        // only insert html once
        if (!this.htmlCreated) {
        	this.insertHtml();
        
        	this.htmlCreated = true;
        }
        
        // clear natural size so we can capture it again
        this.naturalPreviewSize = null;
        
        // clear contents
        $("elvisPreviewBox").setStyle({visibility: "hidden"});
        $("elvisPreviewBox").update("");
        
        // insert preview contents
    	if (this.previewUrl.endsWith(".jpg")) {
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
        
        this.adjustSize();
        
        $("elvisPreviewOverlay").show();
        $("elvisPreview").show();
    },

    close: function () {
        $("elvisPreview").hide();
        $("elvisPreviewOverlay").hide();

        // remove preview element to stop video
        $("elvisPreviewBox").update("");
    },

    adjustSize: function () {
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
    	var style = {width: document.viewport.getWidth(), height: document.viewport.getHeight()};
    	
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
        	$("elvisPreviewBox").setStyle({visibility: "visible"});
        }
    }
});
