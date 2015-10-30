var MetadataPanelBase = $.Class({

	init: function() {
		this.dateInputFormat = 'mm/dd/yy',
		this.dateStaticTextFormat = 'D d MM yy',
		this.onInit = null;
		this.onUpdateMetadata = null;
		this.onUiUpdateMetadata = null;
		this.multipleValuesText = '(multiple values)';
		this.noItemsSelectedText = 'View metadata by selecting one or multimple items';
		this.calendarImage = 'mp-field-cal.png',
		this.metadataToDisplay = null;
		this.expandGroups = false;
		this.allowChangeFilename = false;

		this._uniqueId = new String(Math.floor(Math.random() * 99999));
		this._mode = 0;
		this._current = null;
		this._metadataFields = null;
		this._assetIds = [];
	},
	
	initHtml: function(panelElementId, fieldGroups) {
	
		// init only once
		if (this._metadataFields) return;
		if (this.onInit) {
			fieldGroups = this.onInit(fieldGroups);
		}
		this._metadataFields = {};
		this._panelElementId = panelElementId;
		
		var element = $(this._panelElementId);
		var self = this;
	
		// panel content
		var content = $('<div class="mp-content"></div>').appendTo(element);
		// groups
		for (var i = 0; i < fieldGroups.length; i++) {
			// filter group fields
			var groupFields = [];
			for (var j = 0; j < fieldGroups[i].fields.length; j++) {
				var fieldInfo = fieldGroups[i].fields[j];
				if (Object.keys(fieldInfo).length == 0) continue;
				if (fieldInfo.technical) continue;
				if (this.metadataToDisplay && this.metadataToDisplay.indexOf(fieldInfo.name) < 0) continue;
				if (this.allowChangeFilename && fieldInfo.name == 'filename') {
					fieldInfo.editable = true;
					fieldInfo.blockMultipleEdit = true;
				}
				groupFields.push(fieldInfo);
			}
			// don't display empty groups
			if (groupFields.length > 0) {
				fieldGroups[i].fields = groupFields;
				this._addGroup(content, fieldGroups[i]);
			}
		}
		// toolbar
		var toolbar = $('<div class="mp-toolbar"></div>').appendTo(element);
		$('<div class="mp-toolbar-ok"></div>').appendTo(toolbar).click(function() {self._ok()});
		$('<div class="mp-toolbar-cancel"></div>').appendTo(toolbar).click(function() {self._cancel()});
		// init groups
		$('.mp-group', element).click(function() {
			$(this).next().toggle();
			$('span:first', $(this)).toggleClass('mp-group-col');
			$('span:first', $(this)).toggleClass('mp-group-exp');
			self._adjastInputWidth();
			return false;
		});
		// empty panel
		var empty = $('<div class="mp-empty"></div>').appendTo(element);
		$('<div></div>').text(this.noItemsSelectedText).appendTo(empty);
		
		// init all fields
		$('.mp-field-text', element).show();
		$('.mp-field-input', element).hide();
		$('.mp-field-value > textarea', element).attr('rows', 1).css('overflow', 'hidden').css('resize', 'none');
		$('.mp-field-value', element).click(function() {
			if (this == self._current) {
				return false;
			}
			if (self._current != null) {
				self._updateMetadata();
			}
			self._current = this;
			
			self._toggleEdit();
			
			$('.mp-field-value > textarea', element).attr('rows', 1).css('overflow', 'hidden');
			$('textarea', $(this)).attr('rows', 5).css('overflow', 'auto');
			
			$('.mp-field-input', $(this)).focus();
			var fieldInfo = $(this).data('fieldInfo');
			if (fieldInfo.multivalue) {
				$('#' + self._metadataFields[fieldInfo.name].inputElementId).tags('focus');
			}
			
		});
		$('.mp-group-content', element).css('display', (this.expandGroups ? 'block' : 'none'));
		
		$(window).resize(function() {
			self._adjastInputWidth();
		});
		
		this.setHits([]);

	},
	
	setHits: function(hits) {
		var element = $(this._panelElementId);
		if (!hits || (hits && hits.length == 0)) {
			$('.mp-content', element).hide();
			$('.mp-toolbar', element).hide();
			$('.mp-empty', element).show();
		} else {
			$('.mp-content', element).show();
			$('.mp-toolbar', element).show();
			$('.mp-empty', element).hide();
		}
		// get asset IDs
		var ids = [];
		this._assetIds = [];
		for (var i = 0; i < hits.length; i++) {
			ids.push(hits[i].id);
			this._assetIds.push(hits[i].id);
		}
		// clear previous values
		for (var field in this._metadataFields) {
			this._metadataFields[field].values = null;
		}
		
		// fill metadata
		for (var i = 0; i < hits.length; i++) {
			var hit = hits[i];
			var id = hit.id;
			var metadata = hit.metadata;
			for (var field in metadata) {
				var value = metadata[field];
				var metadataField = this._metadataFields[field];
				if (metadataField) {
					var values = metadataField.values;
					if (!values) { // init all values
						values = {};
						for (var j = 0; j < this._assetIds.length; j++) {
							values[this._assetIds[j]] = null;
						}
						metadataField.values = values;
					}
					metadataField.values[id] = value;
				}
			}
		}
		// update ui
		this._cancel();
	},

	_addGroup: function(content, fieldGroup) {
		var self = this;
		$('<h3 class="mp-group"><span style="float:left" class="mp-icon mp-group-col"></span><a href="#">' + fieldGroup.name + '</a></h3>').appendTo(content);
		var groupContent = $('<div class="mp-group-content"></div>').appendTo(content);
		for (var i = 0; i < fieldGroup.fields.length; i++) {
			var fieldInfo = fieldGroup.fields[i];
			var fieldElement = $('<div class="mp-field"></div>').appendTo(groupContent);
			$('<div class="mp-field-name"></div>').text(fieldInfo.name).appendTo(fieldElement);
			var valueElement = $('<div class="mp-field-value"></div>').appendTo(fieldElement);
			valueElement.data('fieldInfo', fieldInfo);

			// prepare metadata field descriptor
			var metadataField = {
				fieldInfo: fieldInfo,
				textElementId: null,
				inputElementId: null,
				values: null,
				changed: false,
				newValue: null
			};
			this._metadataFields[fieldInfo.name] = metadataField;
			// add static text element
			var text = $('<div class="mp-field-text"></div>').appendTo(valueElement);
			metadataField.textElementId = 'mp-' + this._uniqueId + '-field-text-' + fieldInfo.name;
			if (fieldInfo.name == 'rating') {
				var staticRating = $('<div class="mp-field-static"></div>').attr('id', metadataField.textElementId).appendTo(text);
				$(staticRating).rating({stars: 5, editable: false});
			} else {
				$('<div class="mp-field-static"></div>').attr('id', metadataField.textElementId).appendTo(text);
			}
			// add inputs for editable fields
			if (fieldInfo.editable) {
				$(text).prepend('<div class="mp-icon mp-field-ed mp-field-static-ed"></div>');
				metadataField.inputElementId = 'mp-' + this._uniqueId + '-field-input-' + fieldInfo.name;
				if (fieldInfo.predefinedValues) {
					function fillSelect(select, predefinedValues) {
						if (predefinedValues.length > 0 && predefinedValues[0].value.length > 0) {
							$('<option value=""></option>').appendTo(select);
						} 
						for (var j = 0; j < predefinedValues.length; j++) {
							$('<option></option>').val(predefinedValues[j].value).text(predefinedValues[j].value).appendTo(select);
						}
					}
					if (!fieldInfo.predefinedValuesOnlyFromList) {
						var select = $('<select class="mp-field-input"></select>').appendTo(valueElement).change(function() {
							$(this).next().val($(this).val());
							$(this).next().change();
						});
						fillSelect(select, fieldInfo.predefinedValues);
						$('<input style="height:1.2em;border:0" type="text" class="mp-field-input"></input>').attr('id', metadataField.inputElementId).appendTo(valueElement).
							keypress(function() {$(this).change()}).change(function() {
								var fieldInfo = $(this).parent().data('fieldInfo');
								self._metadataFields[fieldInfo.name].changed = true;
								self._metadataFields[fieldInfo.name].newValue = $(this).val();
								self._onChanged();
							});
					} else {
						var select = $('<select class="mp-field-input"></select>').attr('id', metadataField.inputElementId).appendTo(valueElement);
						fillSelect(select, fieldInfo.predefinedValues);
						$(select).change(function() {
							var fieldInfo = $(this).parent().data('fieldInfo');
							self._metadataFields[fieldInfo.name].changed = true;
							self._metadataFields[fieldInfo.name].newValues = $(this).val();
							self._onChanged();
						});
					}
				} else if (fieldInfo.multivalue) {
					var tags = $('<div class="mp-field-input"></div>').attr('id', metadataField.inputElementId).appendTo(valueElement);
					$(tags).tags();
					$(tags).bind('onChange', function() {
						var fieldInfo = $(this).parent().data('fieldInfo');
						var toAdd = $(tags).tags('getTagsToAdd');
						var toRemove = $(tags).tags('getTagsToRemove');
						var value = [];
						for (var j = 0; j < toAdd.length; j++) value.push('+' + toAdd[j]);
						for (var j = 0; j < toRemove.length; j++) value.push('-' + toRemove[j]);
						self._metadataFields[fieldInfo.name].changed = true;
						self._metadataFields[fieldInfo.name].newValue = value;
						self._onChanged();
					});
				} else if (fieldInfo.name == 'rating') {
					var rating = $('<div class="mp-field-input"></div>').attr('id', metadataField.inputElementId).appendTo(valueElement);
					$(rating).rating({stars: 5, editable: fieldInfo.editable});
					$(rating).bind('onChange', function() {
						var fieldInfo = $(this).parent().data('fieldInfo');
						self._metadataFields[fieldInfo.name].changed = true;
						self._metadataFields[fieldInfo.name].newValue = $(this).rating('getRating');
						self._onChanged();
					});
				} else if (fieldInfo.datatype == 'date') {
					var inp = $('<input type="text" class="mp-field-input"></input>').attr('id', metadataField.inputElementId).appendTo(valueElement).
							keypress(function() {$(this).change()}).change(function() {
						var fieldInfo = $(this).parent().data('fieldInfo');
						var value = $.trim($(this).val());
						var newValue = '';
						if (value && value.length > 0) {
							var newDate = Date.parseExact(value, 'MM/dd/yyyy');
							if (newDate) {
								newValue = newDate.getTime();
							} else {
								return;
							}
						}
						self._metadataFields[fieldInfo.name].changed = true;
						self._metadataFields[fieldInfo.name].newValue = newValue;
						self._onChanged();
					});
					$(inp).datepicker({
						dateFormat: this.dateInputFormat,
						showOn: 'button',
						changeMonth: true,
						changeYear: true,
						showOtherMonths: true,
						buttonImage: this.calendarImage,
						buttonImageOnly: true						
					});
					$('.ui-datepicker-trigger', valueElement).addClass('mp-field-input-calendar mp-field-input');
				} else if (fieldInfo.datatype == 'datetime') {
					var onChangeDatetime = function() {
						var fieldInfo = $(this).parent().data('fieldInfo');
						var dateValue = $.trim($(this).parent().find(':input:first').val());
						var timeValue = $.trim($(this).parent().find(':input:last').val());
						if (dateValue && dateValue.length > 0 && (!timeValue || (timeValue && timeValue.length == 0))) {
							$(this).parent().find(':input:last').val('0:00:00');
							timeValue = '0:00:00';
						}
						var newValue = '';
						if (dateValue && dateValue.length > 0 && timeValue && timeValue.length > 0) {
							var newDate = Date.parseExact(dateValue + ' ' + timeValue, 'MM/dd/yyyy H:mm:ss');
							if (newDate) {
								newValue = newDate.getTime();
							} else {
								return;
							}
						}
						self._metadataFields[fieldInfo.name].changed = true;
						self._metadataFields[fieldInfo.name].newValue = newValue;
						self._onChanged();
					}
					var inp = $('<input type="text" class="mp-field-input"></input>').attr('id', metadataField.inputElementId).appendTo(valueElement).
							keypress(function() {$(this).change()}).change(onChangeDatetime);
					$(inp).datepicker({
						dateFormat: this.dateInputFormat,
						showOn: 'button',
						changeMonth: true,
						changeYear: true,
						showOtherMonths: true,
						buttonImage: this.calendarImage,
						buttonImageOnly: true						
					});
					$('.ui-datepicker-trigger', valueElement).addClass('mp-field-input-calendar mp-field-input');
					$('<input type="text" class="mp-field-input"></input>').attr('id', metadataField.inputElementId + '2').appendTo(valueElement).
							keypress(function() {$(this).change()}).change(onChangeDatetime);
				} else {
					$('<textarea class="mp-field-input"></textarea>').attr('id', metadataField.inputElementId).appendTo(valueElement).keypress(function() {$(this).change()}).change(function() {
						var fieldInfo = $(this).parent().data('fieldInfo');
						var value = $(this).val();
						self._metadataFields[fieldInfo.name].changed = true;
						self._metadataFields[fieldInfo.name].newValue = $(this).val();
						self._onChanged();
					});
				} 
			}
		}
	},	
	
	_onChanged: function() {
		this._enableButtons(true);
	},
	
	_enableButtons: function(enable) {
		if (enable) {
			$('.mp-toolbar-ok').removeClass('mp-toolbar-ok-disabled');
			$('.mp-toolbar-cancel').removeClass('mp-toolbar-cancel-disabled');
		} else {
			$('.mp-toolbar-ok').addClass('mp-toolbar-ok-disabled');
			$('.mp-toolbar-cancel').addClass('mp-toolbar-cancel-disabled');
		}
	},
	
	_updateMetadataField: function(metadataField) {
		var valuesArray = [];
		var allEquals = true;
		var text = '';
		// put values to array
		for (var i = 0; i < this._assetIds.length; i++) {
			var value = null;
			if (metadataField.values) {
				value = metadataField.values[this._assetIds[i]];
				if (value && typeof value == 'object') {
					if (value['value']) {
						value = value.value;
					}
				}
				if (value == '') value = null;
			}
			valuesArray.push(value);
		}
		// compare values
		for (var i = 1; i < valuesArray.length; i++) {
			if (!this._equalsValues(valuesArray[i - 1], valuesArray[i])) {
				allEquals = false;
				break;
			}
		}
		if (allEquals) {
			// get any first value
			if (valuesArray.length > 0 && valuesArray[0]) {
				var value = valuesArray[0];
				if (value instanceof Array) {
					text = value.join();
				} else {
					if (metadataField.fieldInfo.datatype == 'date') {
						text = $.datepicker.formatDate(this.dateStaticTextFormat, new Date(value));
					} else if (metadataField.fieldInfo.datatype == 'datetime') {
						text = $.datepicker.formatDate(this.dateStaticTextFormat, new Date(value));
						text += new Date(value).toString(' H:mm:ss');
					} else if (metadataField.fieldInfo.datatype == 'number' ||
							metadataField.fieldInfo.datatype == 'decimal') {
						if (metadataField.values[this._assetIds[0]]) {
							var formatted = metadataField.values[this._assetIds[0]]['formatted'];
							if (formatted) {
								text = formatted;
							} else {
								text = metadataField.values[this._assetIds[0]];
							}							
						}
					} else {
						text = value;
					}
				}
			}
		} else {
			text = this.multipleValuesText;
		}
	
		// update text
		if (metadataField.textElementId) {
			if (metadataField.fieldInfo.name == 'rating') {
				$('#' + metadataField.textElementId).rating('setRating', parseInt(text));
			} else {
				$('#' + metadataField.textElementId).text(text);
			}
		}
		// update input
		if (metadataField.inputElementId) {
			if (metadataField.fieldInfo.multivalue) {
				$('#' + metadataField.inputElementId).tags('setTags', this._assetIds, metadataField.values);
			} else if (metadataField.fieldInfo.name == 'rating') {
				$('#' + metadataField.inputElementId).rating('setRating', parseInt(text));
			} else if (metadataField.fieldInfo.datatype == 'date') {
				var newValue = '';
				if (allEquals && valuesArray.length > 0 && valuesArray[0]) {
					newValue = $.datepicker.formatDate(this.dateInputFormat, new Date(value));
				}
				$('#' + metadataField.inputElementId).val(newValue);
			} else if (metadataField.fieldInfo.datatype == 'datetime') {
				var newValue = '';
				var newValue2 = '';
				if (allEquals && valuesArray.length > 0 && valuesArray[0]) {
					newValue = $.datepicker.formatDate(this.dateInputFormat, new Date(value));
					newValue2 = new Date(value).toString('H:mm:ss');
				}
				$('#' + metadataField.inputElementId).val(newValue);
				$('#' + metadataField.inputElementId + '2').val(newValue2);
			} else {
				$('#' + metadataField.inputElementId).val(text);
			}
		}
	},
	
	_toggleEdit: function() {
		var element = $(this._panelElementId);
		var self = this;
		if (this._mode == 0) {
			this._mode = 1;
			$('.mp-field-value', element).each(function() {
				var fieldInfo = $(this).data('fieldInfo');
				var blockMultipleEdit = self._assetIds.length > 1 && fieldInfo.blockMultipleEdit === true;
				if (fieldInfo.editable && !blockMultipleEdit) {
					$('.mp-field-text', $(this)).hide();
					$('.mp-field-input', $(this)).show();
				}
			});
		}
		this._adjastInputWidth();
	},

	_cancel: function() {
		var element = $(this._panelElementId);
		this._current = null;
		if (this._mode == 1) {
			this._mode = 0;
			$('.mp-field-value', element).each(function() {
				var fieldInfo = $(this).data('fieldInfo');
				if (fieldInfo.editable) {
					$('.mp-field-text', $(this)).show();
					$('.mp-field-input', $(this)).hide();
				}
			});
		}
		for (var field in this._metadataFields) {
			var metadataField = this._metadataFields[field];
			metadataField.changed = false;
			metadataField.newValue = null;
			this._updateMetadataField(metadataField);
		}
		this._enableButtons(false);
	},
	
	_ok: function() {
		this._current = null;
		this._updateMetadata();
		if (this._mode == 1) {
			this._mode = 0;
			$('.mp-field-text').show();
			$('.mp-field-input').hide();
		}
		this._enableButtons(false);
	},

	_updateMetadata: function() {
		// collect metadata to update on server
		// TODO handle '(multiple values)' pattern
		if (this.onUpdateMetadata && this._assetIds.length > 0) {	
			var metadata = {};
			for (var field in this._metadataFields) {
				var metadataField = this._metadataFields[field];
				if (metadataField.changed) {
					metadata[field] = metadataField.newValue;
				}
			}
			if (Object.keys(metadata).length > 0) {
				// update metadata on server
				this.onUpdateMetadata(this._assetIds, metadata);
			}
		}
		// assume we have successfully updated metadata on server
		// update component ui
		for (var field in this._metadataFields) {
			var metadataField = this._metadataFields[field];
			if (metadataField.changed) {
				if (!metadataField.values) metadataField.values = {};
				// update values (duplicate server behaviour)
				// FIXME maybe better to read from server fresh values?
				for (var i = 0; i < this._assetIds.length; i++) {
					if (metadataField.fieldInfo.multivalue) {
						metadataField.values[this._assetIds[i]] = this._updateTags(metadataField.values[this._assetIds[i]], metadataField.newValue);
					} else {
						metadataField.values[this._assetIds[i]] = metadataField.newValue;
					}
				}
				this._updateMetadataField(metadataField);
			}		
		}
		
		// update metadata on ui
		if (this.onUiUpdateMetadata) {
			for (var i = 0; i < this._assetIds.length; i++) {
				var metadata = {};
				for (var field in this._metadataFields) {
					var metadataField = this._metadataFields[field];
					if (metadataField.changed) {
						metadata[field] = metadataField.values[this._assetIds[i]];
					}
				}
				this.onUiUpdateMetadata(this._assetIds[i], metadata);
			}
		}
		
		// clear status
		for (var field in this._metadataFields) {
			var metadataField = this._metadataFields[field];
			if (metadataField.changed) {
				metadataField.changed = false;
				metadataField.newValue = null;
			}		
		}
		
	},

	_updateTags: function(tags, newTags) {
		if (!tags) tags = [];
		for (var i = 0; i < newTags.length; i++) {
			var tag = newTags[i].substr(1);
			var index = tags.indexOf(tag);
			if (newTags[i].charAt(0) == '+' && index < 0) {
				tags.push(tag);
			} else if (newTags[i].charAt(0) == '-' && index >= 0) {	
				tags.splice(index, 1);
			}
		}
		tags.sort();
		return tags;
	},
	
	_equalsValues: function(v1, v2) {
		if (v1 === v2) return true;
		if (v1 instanceof Array && v2 instanceof Array) {
			return !(v1 < v2 || v2 < v1);
		}
		return false;
	},

	_adjastInputWidth: function() {
		var element = $(this._panelElementId);
		$('.mp-field-value', element).each(function() {
			var w = $(this).width();
			var fieldInfo = $(this).data('fieldInfo');
			if (w > 0 && fieldInfo.editable) {
				if (fieldInfo.predefinedValues && !fieldInfo.predefinedValuesOnlyFromList) {
					$('select', $(this)).width(w-10);
					$('input', $(this)).width(w-10-20).css('margin-left', -(w-10-1));
				} else if (fieldInfo.datatype == 'date') {
					$(':input', $(this)).width(w-30);
				} else if (fieldInfo.datatype == 'datetime') {
					$(':input:first',$(this)).width(70);
					$(':input:last', $(this)).width(w-10-70-23);
				} else {
					$(':input', $(this)).width(w-10);
				}
			}
		});
	}
});  

var MetadataPanel = MetadataPanelBase.extend({

	init: function(metadataTarget, elvisApi) {
		this._parent();
		this.elvisApi = elvisApi;
		this.onUpdateMetadata = this._onUpdateMetadata;
		var self = this;
		$(document).ready(function(){
			self.elvisApi.fieldinfo(function(data) {
				self.initHtml(metadataTarget, data.fieldGroups);
			});
		});

	},
	
	_onUpdateMetadata: function(assetIds, metadata) {
		if (this.allowChangeFilename && assetIds.length == 1 && metadata.filename) {
			//var assetPath = // TODO get asset path and invoke asset rename
			
		} else {
			var query = 'id:(' + assetIds.join(' ') + ')';
			elvisApi.updatebulk(query, {metadata: JSON.stringify(metadata)});
		}
	}
	
});


(function($){

	/*
	 * Rating component
	 * options: {stars: 5, editable: true}
	*/
	$.fn.rating = function(o) {
		var container = $(this);
		if (o && typeof o == 'object') {
			for (var i = 0; i <= o.stars; i++) {
				var star = $('<div class="mp-rating"></div>').appendTo(container);
				$(star).data('rating', i);
				if (i > 0) {
					$(star).addClass('mp-rating-dot');
				}
			}
			if (o.editable) {
				$('.mp-rating', container).click(function() {
					$(container).data('rating', $(this).data('rating'));
					$(this).parent().trigger('onChange');
				});
				$('.mp-rating', container).mouseenter(function() {
					updateRating($(this).data('rating'));
				});
				$('.mp-rating', container).mouseleave(function() {
					updateRating($(container).data('rating'));
				});
			}
			$(container).data('rating', 0);
			updateRating(0);
		} else if (o && typeof o == 'string' && o == 'getRating') {
			return $(container).data('rating');
		} else if (o && typeof o == 'string' && o == 'setRating') {
			var rating = parseInt(arguments[1]);
			rating = isNaN(rating) ? 0 : rating;
			$(container).data('rating', rating);
			updateRating(rating);
		}
		function updateRating(rating) {
			$('.mp-rating', container).each(function() {
				var r = $(this).data('rating');
				if (r > 0 && r <= rating) {
					$(this).addClass('mp-rating-star');
				} else {
					$(this).removeClass('mp-rating-star');
				}
			});
		}
	}

	/*
	 * Tags component
	 * 
	*/
	$.fn.tags = function() {
		var self = this;
		var container = $(this);
		var getContext = function() {
			var context = $(container).data('context');
			if (!context) {
				context = {
					values: {},
					assetIds: [],
					tags: null,
					brief: true,
				};
				$(container).data('context', context);
			}
			return context;
		};
		var updateTagList = function() {
			var context = getContext();
			var tags = context.tags;
			var brief = context.brief;
			context.listElement.empty()
			var num = 0;
			for (var tag in tags) {
				if (!(brief && num > 4)) {
					var tagItem = $('<div style="overflow:hidden"></div>').appendTo(context.listElement);
					$(tagItem).tristate(tags[tag]);
					$(tagItem).click(function() {
						context.listElement.parent().trigger('onChange');
					});
				}
				num++;
			}
			if (brief && num > 5) {
				$('<div>more...</div>').appendTo(context.listElement).click(function() {
					getContext().brief = false;
					updateTagList();
				});
			}
		}
		var sortTags = function(tags) {
			var temp = [];
			var sortedTags = {};
			for (var tag in tags) temp.push(tag);
			temp.sort();
			for (var i = 0; i < temp.length; i++) sortedTags[temp[i]] = tags[temp[i]];
			return sortedTags;
		}
		var context = getContext();
		if (arguments.length == 0) {
			context.inputElement = $('<input type="text"></input>').appendTo(container).keypress(function(event) {
				if (event.keyCode == 44 || event.keyCode == 13) {
					var cnt = getContext();
					var val = $.trim($(this).val());
					if (val != '') {
						cnt.tags[val] = {state: 1, label: val};
						cnt.tags = sortTags(cnt.tags);
						updateTagList();
						$(this).parent().trigger('onChange');
					}
					setTimeout(function() {
						cnt.inputElement.val('');
					}, 1);
				}
			});
			context.listElement = $('<div></div>').appendTo(container);
		} else if (arguments.length == 3 && arguments[0] && arguments[0] == 'setTags' && 
				arguments[1] && arguments[1] instanceof Array) {
			context.assetIds = arguments[1];
			context.values = arguments[2]; // can be null
			context.brief = true;
			if (!context.values) context.values = {};
			for (var i = 0; i < context.assetIds.length; i++) {
				if (!context.values[context.assetIds[i]]) context.values[context.assetIds[i]] = [];
			}
			var assetIds = context.assetIds;
			var values = context.values;
			var allTags = {};
			for (var i = 0; i < assetIds.length; i++) {
				var tagValues = values[assetIds[i]];
				if (tagValues) {
					for (var j = 0; j < tagValues.length; j++) {
						var tag = $.trim(tagValues[j]);
						if (tag.length > 0) {
							var count = allTags[tagValues[j]];
							if (!count) count = 0;
							allTags[tagValues[j]] = ++count;
						}
					}
				}
			}
			var tags = {};
			for (var tag in allTags) {
				var state = allTags[tag] < assetIds.length ? 2 : 1;
				tags[tag] = {state: state, label: tag};
			}
			context.tags = sortTags(tags);
			updateTagList();
		} else if (arguments.length == 1 && arguments[0] && arguments[0] == 'getTagsToAdd') {
			var result = [];
			for (var tag in context.tags) if (context.tags[tag].state == 1) result.push(tag);
			return result;
		} else if (arguments.length == 1 && arguments[0] && arguments[0] == 'getTagsToRemove') {
			var result = [];
			for (var tag in context.tags) if (context.tags[tag].state == 0) result.push(tag);
			return result;
		} else if (arguments.length == 1 && arguments[0] && arguments[0] == 'focus') {
			if (context.inputElement) context.inputElement.focus();
		}
	}

	/*
	 * Tristate component
	 * options: {state: 0|1|2, label: ''}
	 */
	$.fn.tristate = function(options) {
		var container = $(this);
		var icon = $('<span class="mp-tristate-icon">&nbsp;</label>').appendTo(container);
		$('<span class="mp-tristate-label"></label>').text(options.label).appendTo(container);
		$(container).click(function() {
			if (options.state == 2) {
				options.state = 1
			} else if (options.state == 1) {
				options.state = 0
			} else if (options.state == 0) {
				options.state = 1
			}
			updateIcon();
		});
		function updateIcon() {
			$(icon).removeClass('mp-tristate-icon-no');
			$(icon).removeClass('mp-tristate-icon-yes');
			$(icon).removeClass('mp-tristate-icon-some');
			if (options.state == 1) {
				$(icon).addClass('mp-tristate-icon-yes');
			} else if (options.state == 2) {
				$(icon).addClass('mp-tristate-icon-some');
			} else {
				$(icon).addClass('mp-tristate-icon-no');
			}
		}
		updateIcon();
	}

})(jQuery);  
