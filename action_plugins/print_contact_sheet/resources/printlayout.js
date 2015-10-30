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
	jquery.elvis.js

make sure these are loaded BEFORE this file.

------------------------------------------------------------------------------*/

var PrintLayout = (function(window) {

	var elvisApi = null; 
	var hitRenderer = null;
	var PrintHitRenderer = null;
	var selectedHitsOnPage = null;
	var autoPrint = false;

	// Extend HitRenderer to create printable pages
	PrintHitRenderer = HitRenderer.extend({
		renderHitList: function(hitArray) {
			var html = "";
			var totalHits = hitArray.length;
			var totalPages = Math.ceil(totalHits / this.hitsOnPage);

			for (var i=0; i<totalPages; i++) {
				var pageHits = hitArray.splice(0, Math.min(this.hitsOnPage, hitArray.length));

				html += ("<div class='page'><div class='content'>{previews}</div>" +
						"<div class='elvisCopyright'>Powered by <a href='http://www.woodwing.com/digital-asset-management'>Elvis DAM</a></div>" +
						"<div class='pagebreak'></div></div>").replaceParams({
							previews: this.renderPageHits(pageHits)
						});
			}

			return html;
		},

		renderPageHits: function(hits) {
			if (this.hitsOnPage == 1 || this.hitsOnPage == 2) {
				// Render previews
				this.renderMetadataLabels = true;
				metadataToDisplay = (this.hitsOnPage == 1) ? metadatasToDisplay.onePerPage : metadatasToDisplay.twoPerPage;
				previewHtml = "";
				for (var i = 0; i < hits.length; i++) {
					previewHtml += this.renderPagePreview(hits[i], metadataToDisplay);
				}
				return previewHtml;
			}
			else if (this.hitsOnPage == 6 || this.hitsOnPage == 12) {
				// Render thumbnails
				if (this.hitsOnPage == 6) {
					this.setRenderSize("large");
					this.metadataToDisplay = metadatasToDisplay.sixPerPage;
				}
				else {
					this.setRenderSize("medium");
					this.metadataToDisplay = metadatasToDisplay.twelvePerPage;
				}
				this.renderMetadataLabels = false;
				previewHtml = "";
				for (var i = 0; i < hits.length; i++) {
					previewHtml += this.renderHitBox(hits[i], i);
				}
				return previewHtml;
			}
		},

		renderPagePreview: function(hit, metadataToDisplay) {
			return ("<div class='preview{hitsOnPage}'><img src='{url}'/></div>" +
				"<div class='metadata{hitsOnPage}'>{metadata}</div>").replaceParams({
					hitsOnPage: this.hitsOnPage,
					url: hit.previewUrl,
					metadata: this.renderMetadata(hit, metadataToDisplay)
				});
		},

		layoutValue: function(hit, field, value) {
			if (!this.renderMetadataLabels) {
				// Default layout, without label
				return this._parent(hit, field, value);
			}

			// Layout with label
			var renderedValue = this.renderValue(hit, field, value);
			var capsFieldName = field.charAt(0).toUpperCase() + field.slice(1);

			return '<div title="{title}" class="{cssClass}"><strong>{fieldName}: </strong>{value}</div>'.replaceParams({
				title: escape(field + ": " + renderedValue),
				cssClass: this.getValueCssClass(hit, field, value, renderedValue),
				value: renderedValue,
				fieldName: capsFieldName
			});
		}

	});

	function onPageLoad(metadatasToDisplay, defaultHitsOnPage) {
		this.metadatasToDisplay = metadatasToDisplay;
		this.defaultHitsOnPage = defaultHitsOnPage;

		loadAutoPrint();

		elvisApi = new ElvisAPI("${serverUrl}");

		hitRenderer = new PrintHitRenderer();
		hitRenderer.hitsTarget = "#resultContainer";
		hitRenderer.metadatasToDisplay = metadatasToDisplay;

		var hitsOnPage = $.cookie('printLayout_hitsOnPage');
		if (hitsOnPage == null) {
			hitsOnPage = defaultHitsOnPage;
		}

		searchAndRenderHits(hitsOnPage, true);
	}

	function searchAndRenderHits(hitsOnPage, isPageLoad) {
		var elvisContext = ElvisPlugin.resolveElvisContext();

		var selection = elvisContext.activeTab.assetSelection;
		if (selection.length == 0) {
			alert("Selection is empty. Select one or more images or a collection of images from the Elvis Desktop client.");
		}

		$("#resultContainer").html("");
		$("#loadingThrobber").show();

		applyHitsOnPage(hitsOnPage);

		var assetIds = new Array();
		for (var i=0; i<selection.length; i++) {
			assetIds.push(selection[i].id);
		}

		var query = "id:" + assetIds.join(" OR id:");

		elvisApi.search({
			q: query,
			sort: "filename"
			// TODO add metadataToReturn depending on metadata displayed for current nr of hits per page
			//metadataToReturn:
		}, function(data) {
			hitRenderer.render(data);

			$("#loadingThrobber").hide();

			window.focus();

			// Use timeout to make sure all images are loaded (this will work only on fast networks)
			// TODO: Use jquery Batch image load event plugin instead:
			// http://plugins.jquery.com/project/BatchImagesLoad
			if (isPageLoad && autoPrint) {
				setTimeout(printSheet, 1500);
			}
		});
	}

	function applyHitsOnPage(hitsOnPage) {
		hitRenderer.hitsOnPage = hitsOnPage;
		$.cookie('printLayout_hitsOnPage', hitsOnPage, { expires: 365 });

		if (selectedHitsOnPage != null) {
			selectedHitsOnPage.removeClass("selectedHitsOnPage");
		}

		// Set styles
		selectedHitsOnPage = $("#hitsOnPage" + hitsOnPage);
		selectedHitsOnPage.addClass("selectedHitsOnPage");
	}

	function saveAutoPrint() {
		autoPrint = $("#autoPrint").is(':checked');
		hitRenderer.autoPrint = autoPrint;
		$.cookie('printLayout_autoPrint', autoPrint, { expires: 365 });
	}

	function loadAutoPrint() {
		autoPrint = ($.cookie('printLayout_autoPrint') == "true") ? true : false;
		if (autoPrint) {
			$("#autoPrint").attr("checked", true);
		}
	}

	function printSheet() {
		window.focus();
		window.print();
	}

	// Return 'public' functions
	return {
		onPageLoad: function(metadatasToDisplay, defaultHitsOnPage) {
			onPageLoad(metadatasToDisplay, defaultHitsOnPage);
		},

		setHitsOnPage : function(hitsOnPage) {
			searchAndRenderHits(hitsOnPage, false);
		},

		saveAutoPrint : function() {
			saveAutoPrint();
		},

		printSheet : function() {
			printSheet();
		}
	};

})(window);