var UsageReportHitRenderer = HitRenderer.extend({

	init: function(elvisApi) {
		this._parent();
		this.elvisApi = elvisApi;

        this.editableMetadataToDisplay = [];
		this.onUpdateMetadata = null;
		this.externalThrobberTarget = null;
		this.onThumbnailClick = null;
		this.onLinkedPdfClick = null;

        String.prototype.capitalizeFieldName = function () {
            return this.charAt(0).toUpperCase() + this.substring(1);
        };

	},

	renderHitBox: function(hit, idx) {
		return '<div hitId="{hitid}" class="elvisHitBox">{thumbnail}{metadata}</div>'.replaceParams({
			hitid: hit.id,
			thumbnail: this.renderThumbnailWrapper(hit, idx),
			metadata: this.renderMetadata(hit, this.metadataToDisplay)
		});
	},

	// Custom metadata value rendering
	layoutValue: function(hit, field, value) {
		var renderedValue = this.renderValue(hit, field, value);
		return this.editField(hit, field, value).replaceParams({
			field: field.capitalizeFieldName(),
			cssClass: this.getValueCssClass(hit, field, value, renderedValue),
			value: renderedValue,
			fieldName: field
		});
	},

	editField: function(hit, field, value) {
		if (this.editableMetadataToDisplay.indexOf(field) != -1) {
			return '<div class="field"><span>{field}:</span></div><div class="{cssClass}"><input type="text" class="inputFocus {fieldName}" name="{fieldName}"'
			+ ' value="{value}"/><img src="resources/img/loader.gif" style="visibility:hidden;" /></div>';
		} else if (field == 'used') {
			return '<div class="field">{field}:</div><div class="{cssClass}"><input type="checkbox" class="{fieldName}" name="{fieldName}" {checked} />'.replaceParams({
				checked: (value == 'true') ? 'checked="checked"' : ''
			});
		} else if (field == 'ignore') {
			return '<div style="display:inline; margin-left:75px;">Hide:<input type="checkbox" name="{fieldName}" class="ignore" {checked} /></div></div></div>'.replaceParams({
				checked: (value == 'true') ? 'checked="checked"' : ''
			});
		} else {
			return '<div class="field">{field}:</div><div class="{cssClass}">{value}</div>';
		}
	},

	postProcessHit: function(hitElement, hit, index) {
		var self = this;

		// Register image click handler
		$('.elvisThumbnailWrapper:first', hitElement).bind('click', function(event) {
			if (self.onThumbnailClick) {
				self.onThumbnailClick(event, hit);
			}
		});
		
		// METADATA EDIT HANDLING
		
		// Register handlers to handler metadata update
		for (var i = 0; i < this.editableMetadataToDisplay.length; i++) {
			var metadataField = this.editableMetadataToDisplay[i];

			// Register input focus handler
			$('.' + metadataField, hitElement).focus(function(event) {
				//changes usageFee styling to input
				this.className = 'inputBlur ' + this.name;

				$(this).next('img').css('visibility', 'hidden');
				$(this).next('img').attr('src','resources/img/loader.gif');

				//hitValueOld = this.value;
			});

			// Register input blur handler
			$('.' + metadataField, hitElement).blur(function(event) {
				//changes usageFee styling to label
				this.className = 'inputFocus ' + this.name;
				self._updateMetadata(hitElement, hit, this.name, $(this).val(), $(this).next('img'));
			});

			// Register keydown handler
			$('.' + metadataField, hitElement).keydown(function(event) {
				var charCode;

				if (event && event.which) {
					charCode = event.which;
				} else if (window.event) {
					event = window.event;
					charCode = event.keyCode;
				}
				if (charCode == 13) {
					//When input is changed and ENTER is pressed, save metadata, and give feedback about the progress
					$(event.target).blur();
				}
				if (charCode == 9) {
					//When input is changed and TAB is pressed, save metadata, give feedback about the progress and focus next text input
					event.preventDefault();

					var tab = $(this).parents('.layoutImages').eq(0).find(':text');
					var idx = tab.index(this);

					if (event.shiftKey) {
						if ( idx > 0) { tab[idx - 1].focus(); }
					} else if (idx < (tab.length - 1)) {
						tab[idx + 1].focus();
					}
				}
			});
		}
		
		// Register checkbox used click handler
		$('.used', hitElement).bind('click', function(event) {
			self._updateMetadata(hitElement, hit, 'used', event.target.checked, $(this).next('img'));
		});

		// Register checkbox hidden click handler
		$('.ignore', hitElement).bind('click', function(event) {
			self._updateMetadata(hitElement, hit, 'ignore', event.target.checked, $(this).next('img'));
		});
		
		// END OF METADATA EDIT HANDLING

		this._parent(hitElement, hit, index);

		// Search and display linked PDF
		this.elvisApi.search({
				q: 'relatedTo:' + hit.id + ' +assetDomain:pdf',
				sort: 'assetCreated-desc',
				metadataToReturn: 'name',
				num: 1
			},
			function (data) {
				if (data.hits.length == 0) {
					return;
				}

				var pdfHit = data.hits[0];

				var linkedPdf = $('<div/>').addClass('linkedPdf');
				linkedPdf.append('<h3>Used on page:</h3>');
				linkedPdf.append('<img src="' + pdfHit.thumbnailUrl + '"/>');
				linkedPdf.bind('click', function(event) {
					if (self.onLinkedPdfClick) self.onLinkedPdfClick(event, pdfHit);
				});

				$(hitElement).append(linkedPdf);
			}
		);
		
	},
	
	_updateMetadata: function(hitElement, hit, fieldName, fieldValue, stateIcon) {
		var self = this;
		// check for changes; if no - nothing to do
		if (hit.metadata[fieldName] == fieldValue) return;
		//Hiding and showing of the throbber is that when metadata of hits is being updated,
		//it should not show the general ajax loader
		if (this.externalThrobberTarget) $(this.externalThrobberTarget).css('visibility', 'hidden');
		$(stateIcon).css('visibility', 'visible');

		var metadata = {};
		metadata[fieldName] = fieldValue;
		
		this.elvisApi.update(hit.id, metadata, function(){
			if (self.externalThrobberTarget) $(self.externalThrobberTarget).css('visibility', 'visible');
			$(stateIcon).attr('src','resources/img/check.png');
			// update metadata field internally
			hit.metadata[fieldName] = fieldValue;
			
			if (self.onUpdateMetadata) {
				self.onUpdateMetadata(hitElement, hit, fieldName);
			}
		});
	}

});