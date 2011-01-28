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

/**
 * MetadataEditor
 * 
 * Can rendering result hits to HTML.
 *
 * TODO explain how to setup and customize...
 */
var MetadataEditor = Class.create({

	initialize: function() {
		this.hit = null;
		this.saveCallbackHandler = null;
		this.htmlCreated = false;
	},

	initHtml: function() {
		if (this.htmlCreated) {
			// only insert html once
			return;
		}
		/*
		div #elvisMetadataEditor
		-- div #elvisMetadataEditorWrapper
		---- div #elvisMetadataEditorBox
		------ div #elvisMetadataEditorThumb
		-------- HitRenderer
		------ div #elvisMetadataEditorBlock
		-------- metadata, rating...
		------ textarea #descriptionField
		------ div #buttons
		*/

		var template = '<div id="elvisMetadataEditorOverlay"></div>'
			+ '<form>'
			+ '<input type="hidden" id="ratingField" name="rating"/>'
			+ '<div id="elvisMetadataEditor" style="display: none;"><div id="elvisMetadataEditorWrapper"><div id="elvisMetadataEditorBox">'
			+ '<div id="elvisMetadataEditorThumb"></div>'
			+ '<div id="elvisMetadataEditorBlock"></div>'
			+ '<div id="elvisMetadataEditorComment"><strong>Comments:</strong>'
			+ '<textarea id="descriptionField" name="description"></textarea></div>'
			+ '<div id="buttons"><input id="elvisMetadataEditorClose" type="button" value="Cancel"/><input id="elvisMetadataEditorSave" type="button" value="Save"/></div>'
			+ '</div></div></form>';

		$$("body")[0].insert(template);

		$("elvisMetadataEditorSave").observe("click", function(event) {
			this.save();
		}.bind(this));

		$("elvisMetadataEditorClose").observe("click", function(event) {
			this.close();
		}.bind(this));

		Event.observe(document.onresize ? document : window, "resize", function() {
			this.adjustSize();
		}.bind(this));

		this.htmlCreated = true;
	},

	show: function(hit, saveCallbackHandler) {
		if (hit == null) {
			return;
		}

		this.hit = hit;
		this.saveCallbackHandler = saveCallbackHandler;
		this.initHtml();

		this.renderThumb();
		this.renderMetadata();
		this.postProcess($("elvisMetadataEditor"));

		$("elvisMetadataEditorOverlay").show();
		$("elvisMetadataEditor").show();

		this.adjustSize();
	},

	renderThumb: function() {
		// TODO allow setting this renderer instead of pre-configuring it
		var hitRenderer = new HitRenderer();
		hitRenderer.sharedResources = "../shared_resources/elvis_api";
		hitRenderer.hitsTarget = "elvisMetadataEditorThumb";
		hitRenderer.squareThumbs = true;
		hitRenderer.metadataToDisplay = [];
		hitRenderer.render(this.hit);
	},

	renderMetadata: function() {
		var html = "";

		//name
		var name = this.renderValue("name", this.hit);
		html = '<div title="{title}" class="elvisMetadataEditorValue"><strong>Name:</strong> {value}</div>'.replaceParams({
			title: "Name: " + name,
			value: name
		});

		//assetModifier
		var assetModifier = this.renderValue("assetModifier", this.hit);
		html += '<div title="{title}" class="elvisMetadataEditorValue"><strong>Modified by:</strong> {value}</div>'.replaceParams({
			title: "Modified by: " + assetModifier,
			value: assetModifier
		});

		//usageRights
		var usageRights = this.renderValue("usageRights", this.hit);
		html += '<div title="{title}" class="elvisMetadataEditorValue"><strong>Usage Rights:</strong> {value}</div>'.replaceParams({
			title: "Usage Rights: " + usageRights,
			value: usageRights
		});

		//status
		var status = this.renderValue("status", this.hit);
		var statuses = ["New", "Draft", "Production", "Correction", "Final"];
		html += '<div class="elvisMetadataEditorValue"><strong>Status:</strong> <select id="statusField" name="status"><option></option>';
		for (var i = 0; i < statuses.length; i++) {
			html += (statuses[i] == status) ? ("<option selected>" + statuses[i] + "</option>") : ("<option>" + statuses[i] + "</option>");
		}
		html += "</select></div>";

		//rating
		var rating = this.renderValue("rating", this.hit);
		var starHtml = "";
		for (var i = 0; i < 5; i++) {
			starHtml += '<li><a href="#">{symbol}</a></li>'.replaceParams({
				symbol: this.getRatingSymbol(rating, i)
			});
		}
		html += '<div title="{title}" class="elvisMetadataEditorRating"><ul>{value}</ul></div>'.replaceParams({
			title: "Rating: " + rating,
			value: starHtml
		});
		$("ratingField").setValue(rating);

		//description
		var description = this.renderValue("description", this.hit);
		$("descriptionField").setValue(description);

		$("elvisMetadataEditorBlock").update(html);
	},

	renderValue: function(field, hit) {
		var value = hit.metadata[field];
		if (value == null) {
			value = hit[field];
		}

		if (value == null) {
			return "";
		}
		else if (value.formatted) {
			return value.formatted;
		}
		else {
			return value;
		}
	},

	getRatingSymbol: function(rating, index) {
		var star = "&#9733;";
		var dot = "&#8226;";
		return (rating != null && rating != "" && index < rating) ? star : dot;
	},

	postProcess: function(targetElement) {
		var ratingElements = targetElement.select(".elvisMetadataEditorRating a");

		for (var i = 0; i < ratingElements.length; i++) {
			this.postProcessRating(ratingElements[i], i + 1);
		}
	},

	postProcessRating: function(ratingElement, rating) {
		Event.observe(ratingElement, 'click', function(event) {
			this.changeRating(rating);
			return false;
		}.bind(this));
	},

	changeRating: function(rating) {
		var ratingElements = $("elvisMetadataEditor").select(".elvisMetadataEditorRating a");

		for (var i = 0; i < ratingElements.length; i++) {
			ratingElements[i].update(this.getRatingSymbol(rating, i));
		}

		$("ratingField").setValue(rating);
	},

	save: function() {
		//TODO: optimize
		var metadata = new Object();
		metadata["status"] = $F("statusField");
		metadata["rating"] = $F("ratingField");
		metadata["description"] = $F("descriptionField");
		this.hit.metadata.status = $F("statusField");
		this.hit.metadata.rating = $F("ratingField");
		this.hit.metadata.description = $F("descriptionField");

		this.saveCallbackHandler(this.hit, metadata);
		this.close();
	},

	close: function() {
		$("elvisMetadataEditor").hide();
		$("elvisMetadataEditorOverlay").hide();
	},

	adjustSize: function() {

		var box = $("elvisMetadataEditorBox");

		// set size on preview object
		var marginTop = Math.round((document.viewport.getHeight() - box.getHeight()) / 2);
		var marginLeft = Math.round((document.viewport.getWidth() - box.getWidth()) / 2);

		//box.setStyle("marginTop", marginTop + 'px');
		//box.setStyle("marginLeft", marginLeft + 'px');
		box.setStyle({
			marginTop: marginTop + 'px',
			marginLeft: marginLeft + 'px'
		});
	}
})
