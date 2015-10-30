var ImportPanel = $.Class({
		
		init : function (importPanelTarget, elvisApi) {
			var self = this;

			this.newFileDefaultIcon = 'ip-new-file.png';
			this.folderPath = null;
			this.onCreateCollection = null;

			this._importPanelTarget = importPanelTarget;
			this._elvisApi = elvisApi;
			this._renderered = false;
			this._foldersBar = new FoldersBar();
			this._selectFolderDialog = new SelectFolderDialog(elvisApi);
			this._selectFolderDialog.onOk = function() {
				self.setFolderPath(self._selectFolderDialog.folderPath);
			}

			$(document).ready(function () {
				self.render();
				self._selectFolderDialog.render();
			});
		},
		
		render : function () {
			var self = this;
			if (this._renderered)
				return;
			this._renderered = true;
			var element = $(this._importPanelTarget);
			this.renderFilelistBox(element);
			this.renderTargetFolderBox(element);
			this.renderCollectionBox(element);
			this.renderFinishBox(element);
			
			var ImportHitRenderer = HitRenderer.extend({
					postProcessHit: function(hitElement, hit, index) {
						this._parent(hitElement, hit, index);
						if (hit.thumbnail) {
							$('.elvisThumbnailImage img', hitElement).remove();
							$('.elvisThumbnailImage', hitElement).append(hit.thumbnail);
							$(hit.thumbnail).css('border', '0 none');
						}
						$('<div class="ip-item-progressbar"></div>').progressbar({value: 0}).appendTo(hitElement);
						if (hit.state === 'ok') {
							$('<div class="ip-item-ok"></div>').appendTo(hitElement);
						} else if (hit.state === 'failed') {
							$('<div class="ip-item-failed"></img></div>').attr('title', hit.errormessage).appendTo(hitElement);
						}
					},
					layoutValue: function(hit, field, value) {
						var renderedValue = this.renderValue(hit, field, value);
						return '<div style="overflow:hidden"><div class="elvisMetadataName">{name}</div><div class="{cssClass}">{value}</div></div>'.replaceParams({
							name: field,
							cssClass: this.getValueCssClass(hit, field, value, renderedValue),
							value: renderedValue
						});
						
					}
				});
			
			this.hitRenderer = new ImportHitRenderer();
			this.hitRenderer.hitsTarget = "#ip-upload-list";
			this.hitRenderer.squareThumbs = true;
			this.hitRenderer.metadataToDisplay = ["directory", "filename", "tags", "description", "copyright"];
			this.hitRenderer.selectable = true;
			this.hitRenderer.multiselect = true;
			this.hitRenderer.selectionChange = function (hits) {
				$('#ip-remove-files').button({disabled: hits.length == 0});
				if (self.selectionChange) {
					var newHits = $.grep(hits, function(hit) {
						return hit.state === 'new';
					});
					self.selectionChange(newHits);
				}
			}
			this.hitRenderer.hits = [];
		},
		
		renderFilelistBox : function (element) {
			var self = this;
			var wrapper = $('<div class="ip-box-wrapper"></div>').appendTo(element);
			$('<span class="ip-step ip-step-1"></span>').appendTo(wrapper);
			var box = $('<div class="ip-box"></div>').appendTo(wrapper);
			
			var form = $('<form></form>').attr('action', this._elvisApi._serverUrl + '/services/create').attr('id', 'ip-form').
			attr('method', 'post').attr('enctype' ,'multipart/form-data').bind('submit', function() {return false}).appendTo(box);
			
			$('<div id="ip-upload-list"></div>').appendTo(form);
			$('<input type="hidden" name="folderPath"></input>').val('/Test-upload-friday').appendTo(form);
			$('<input type="hidden" name="metadata"></input>').appendTo(form);
			var toolbar = $('<div class="ip-upload-list-toolbar"></div>').appendTo(form);
			var addFiles = $('<a id="ip-add-files" href="#">Add files...</a>').appendTo(toolbar).button({icons: {primary: 'add-files-icon'}});
			
			$('<input id="ip-file-upload" type="file" name="Filedata" multiple="multiple"></input>').appendTo(addFiles).fileupload({
				dataType : "json",
				add : function (e, data) {
					self.addItem(e, data);
				},
				send: function(e, data) {
					self._do_for_index(e, data, function(index, hit, boxElement) {
						$('.ip-item-progressbar', boxElement).show();
					});
				},
				progress : function (e, data) {
					self._do_for_index(e, data, function(index, hit, boxElement) {
						var progress = parseInt(data.loaded / data.total * 100, 10);
						$('.ip-item-progressbar', boxElement).progressbar({value: progress});
					});
				},
				done : function (e, data) {
					self._do_for_index(e, data, function(index, hit, boxElement) {
						if (data.result) {
							if (data.result.errorcode) {
								hit.state = 'failed';
								hit.errormessage = data.result.message;
							} else {
								hit.state = 'ok';
								// update hit
								for (var field in data.result) {
									hit[field] = data.result[field];
								}
								delete hit.thumbnail;
							}
							self._refresh();
						}
					});
				},
				fail : function (e, data) {
					self._do_for_index(e, data, function(index, hit, boxElement) {
						hit.state = 'failed';
						hit.errormessage = 'Unknown error';
						self._refresh();
					});
				},
				always : function(e, data) {
					self._do_for_index(e, data, function(index, hit, boxElement) {
						self._finishImport();
					});
				}
			});
			$('#ip-file-upload').width($('#ip-add-files').width()).height($('#ip-add-files').height());
			$('<a id="ip-remove-files" href="#">Remove file(s)</a>').appendTo(toolbar).button({icons: {primary: 'remove-files-icon'}, disabled: true}).click(function() {
				$.each(self.hitRenderer.selectedHits, function(i, hit) {
					var index = $.inArray(hit, self.hitRenderer.hits);
					if (index >= 0) {
						self.hitRenderer.hits.splice(index, 1);
					}
				});
				self._refresh();
				$(this).button({disabled: true});
			});
			$('<a id="ip-select-none" href="#">Select none</a>').appendTo(toolbar).button().click(function() {
				self.hitRenderer.selectedHits = [];
				self._refresh();
				self.hitRenderer.selectionChange(self.hitRenderer.selectedHits);
			});
			$('<a id="ip-select-all" href="#">Select all</a>').appendTo(toolbar).button().click(function() {
				self.hitRenderer.selectedHits = self.hitRenderer.hits.slice(0);
				self._refresh();
				self.hitRenderer.selectionChange(self.hitRenderer.selectedHits);
			});

		},
		
		renderTargetFolderBox : function (element) {
			var wrapper = $('<div class="ip-box-wrapper"></div>').appendTo(element);
			$('<span class="ip-step ip-step-2"></span>').appendTo(wrapper);
			var box = $('<div class="ip-box"></div>').appendTo(wrapper);
			var foldersBarElement = $('<div/>').addClass('ip-folder-path').appendTo(box);
			this._foldersBar.target = foldersBarElement;
			this._foldersBar.render();
			var self = this;
			$('<a href="#"/>').attr('id', 'ip-change-folder').text('Change...').appendTo(box).button().click(function() {
				self._selectFolderDialog.folderPath = '/Users/admin'
				self._selectFolderDialog.show();
			});
		},
		
		renderCollectionBox : function (element) {
			var wrapper = $('<div class="ip-box-wrapper"></div>').appendTo(element);
			$('<span class="ip-step ip-step-3"></span>').appendTo(wrapper);
			var box = $('<div class="ip-box"></div>').appendTo(wrapper);
			$('<div></div>').text('Select a collection to add the uploads to').appendTo(box);
			var select = $('<select id="ip-new-collection"></select>').appendTo(box).change(function() {
				if ($(this).val() == 'new') {
					$('#ip-new-collection-name').show().focus();
				} else {
					$('#ip-new-collection-name').hide();
				}
			});
			$('<option value="none">Don\'t add to collection</option>').appendTo(select);
			$('<option value="new">Create new collection...</option>').appendTo(select);
			$('<input id="ip-new-collection-name" style="display:none" type="text"></input>').appendTo(box);
		},
		
		renderFinishBox : function (element) {
			var self = this;
			var wrapper = $('<div class="ip-box-wrapper"></div>').appendTo(element);
			$('<span class="ip-step ip-step-4"></span>').appendTo(wrapper);
			var box = $('<div class="ip-box"></div>').appendTo(wrapper);
			$('<a id="ip-finish-import" href="#">Finish import</a>').appendTo(box).button({icons: {primary: 'finish-import-icon'}}).click(function() {
				$.each(self.hitRenderer.hits, function(i, hit) {	
					var data = hit.data;
					if (data && data.submit && !data.jqXHR) {
						// update target folder
						var folderPath = self._foldersBar.folderPath;
						$('[name=folderPath]', data.form).val(folderPath);
						// update metadata per hit
						var metadata = {};
						$.each(self.hitRenderer.metadataToDisplay, function(index, field) {
							if (field == 'directory') return;
							if (hit.metadata[field]) {
								metadata[field] = hit.metadata[field];
							}
						});
						$('[name=metadata]', data.form).val(JSON.stringify(metadata));
						// submit
						data.jqXHR = data.submit();
					}
				});
			
			});
		}, 
		
		addItem: function(e, data) {
			var self = this;
			var filename = [];
            $.each(data.files, function(index, file){ // TODO validate on Opera!!!
                filename[filename.length] = file.name;
            });
			var newHit = {
				id: this._generateId(),
				state: 'new', // new, ok, failed
				metadata: {
					directory: '&lt;destination&gt;',
					filename: filename.join(', '),
				},
				// set default icon
				thumbnailUrl: this.newFileDefaultIcon,
				data: data
			}
			this.hitRenderer.hits.push(newHit);
			data.context = data.context || {};
			data.context.hit = newHit;
			
			try {
				window.loadImage(
					data.files[0],
					function(img) {
						if (img.type !== 'error') {
							newHit.thumbnail = img;
						}
						self._refresh();
					},
					{maxWidth: 120, maxHeight: 120, canvas: false}
				);
			} catch (ignore) {
			}
			this._refresh();
		},
		
		updateMetadata: function(assetId, metadata) {
			var self = this;
			$.each(this.hitRenderer.hits, function(i, hit) {
				if (hit.id == assetId) {
					hit.metadata = $.extend(hit.metadata, metadata);
					return;
				}
			});
			this._refresh();
		},
		
		setFolderPath: function(folderPath) {
			this._foldersBar.folderPath = folderPath;
			this._foldersBar.render();
		},
		
		_do_for_index: function(e, data, handler) {
			var self = this;
			if (data && data.context && data.context.hit && handler) {
				var index = self.hitRenderer.hits.indexOf(data.context.hit);
				if (index >= 0) handler(index, data.context.hit, $('#ip-upload-list .elvisHitBox[hitindex=' + index + ']'));
			}
		},
		
		_refresh: function() {
			var self = this;
			window.clearTimeout(this._refreshTimer);
			this._refreshTimer = window.setTimeout(function() { self.hitRenderer.refresh() }, 200);
		},
		
		_finishImport: function() {
			var self = this;
			for (var i = 0; i < this.hitRenderer.hits.length; i++) {
				if (this.hitRenderer.hits[i].state == 'new') return;
			}
			// assume upload complete
			if ($('#ip-new-collection').val() == 'new' && $('#ip-new-collection-name').val().length > 0) {
				// create new collection
				var folderPath = this._foldersBar.folderPath;
				//$('#ip-target-folder').val();
				var metadata = {folderPath : folderPath, assetType: "collection", name: $('#ip-new-collection-name').val()};
				self._elvisApi.create(metadata, function(data) {
					var collectionId = data.id;
					// create relations
					for (var i = 0; i < self.hitRenderer.hits.length; i++) {
						if (self.hitRenderer.hits[i].state == 'ok') {
							var assetId = self.hitRenderer.hits[i].id;
							var metadata = {target1Id : collectionId, target2Id: assetId, relationType: "contains"};
							self._elvisApi.createRelation(metadata);						
						}
					}
					if (self.onCreateCollection) {
						self.onCreateCollection(data);
					}
				});
			}
			
			this.hitRenderer.selectionChange(this.hitRenderer.selectedHits);
		},
		
		_generateId: function() {
			return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
				var r = Math.random()*16|0, v = c == 'x' ? r : (r&0x3|0x8);
				return v.toString(16);
			});		
		}
		
	});
