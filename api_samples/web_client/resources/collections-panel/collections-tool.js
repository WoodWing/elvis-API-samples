var CollectionsTool = $.Class({
    
    /* constructor */
    init: function(options) {
        this.vars = {
            rendered: false,
            collections: [],
            createNewEl: null,
            listEl: null,
            footerEl: null,
            id: "tool_" + this.generateId()
        };
        this.options = $.extend({}, this.defaultOptions, options, this.readonlyOptions);
		var self = this;
		$(document).ready(function() {
			self.render();
		});
    },
    
    defaultOptions: {
		collectionsTarget: null,
        multiSelect: true,
        removeAfterInnerCopy: false,                        // true = move, false = copy (on inner drag)
		onChangeCollectionsList: null,
        debugMode: $.browser.mozilla || $.browser.webkit,
        droppableAccept: ".collection-item-img",
        droppableActiveClass: "droppable-active",
        droppableHoverClass: "droppable-hover",
        droppableTolerance: "intersect",
        createNewSelector: "div.ec-create-new-box",
        listSelector: "div.ec-list-box",
        tpl:
            '<div class="elvis-collection-box">' + 
            '  <div class="ec-list-box">' +
            '  </div>' +
            '</div>',
        cBodySelector: "div.ec-collection-body",
        cHeaderSelector: "div.ec-collection-header-box",
        cTpl:
            '<div class="ec-collection-box">' +
            '  <div class="ec-collection-header-box">' +
            '    <a class="button collection-deactivate" href="javascript:void(0);" title="{collectionDeactivate}"></a>' +
            '    <span class="items-count"></span>' +
            '    <span class="name"></span>' +
            '    <div class="clear"></div>' +
            '  </div>' +
            '  <div class="ec-create-new-box">' + 
            '    <p class="ec-label">{createNewLabel}</p>' +
            '    <p class="ec-icon-box"><a class="ec-icon" href="javascript:void(0);" title="{createNewIcon}"></a></p>' +
            '  </div>' +
            '  <div class="ec-collection-body hitsContainer">' +
            '  </div>' +
            '  <div class="clear"></div>' +
            '</div>',
		createNewBoxHeight: 100,
		animationDuration: 300, // ms
        texts: {
            createNewLabel: "Drop to create new",
            createNewIcon: "Click to create new collection",
            collectionName: "Collection",
            collectionDeactivate: "Deactivate"
        }
    },
    
    readonlyOptions: {
        version: "1.0",
        cItemImageOverTrashClass: "collection-item-img-over-trash",
        markVideo: "video"
    },

    /**
     * HTML render of tool
     */
    render: function(){
        if (this.vars.rendered) {
            this.log("Already rendered");
        } else {
            this.log("Start HTML render");
			var el = $("<div/>").addClass("elvis-collection-float-box").appendTo($(this.options.collectionsTarget));
            el.append(this._htmlCreate(this.options.tpl));
            this.log("HTML rendered");
            this.vars.listEl = $(this.options.listSelector, el);
            if (this.vars.listEl.size() != 1) {
                this.logError("Error initialize 'list' element using 'listSelector' option");
            }
            // bind js events
            var self = this;
            // set rendered flag
            this.vars.rendered = true;

			this._addDummyCollection();
			
			this.resize();

        }
    },

    getVersion: function() {
        return this.options.version;
    },

    /**
     * Get all collections
     * @return array - all collections of current tool
     */
    getCollections: function() {
        return this.vars.collections;
    },

    /**
     * Collections setter
     * @param collections array - collections
     */
    setCollections: function(collections) {
        this.vars.collections = collections;
    },

    /**
     * on drop image on collection create zone
     * @param e - jQuery event
     * @param ui - jQuery drop element
     */
    createCollectionHandle: function(e, ui) {
        var c = this.createCollection(null, null, true);
        if (c && ui) {
            this.addToCollectionHandle(c, e, ui);
        }
    },

    /**
     * on drop image on collection zone
     * @param c - collection
     * @param e - jQuery event
     * @param ui - jQuery drop element
     */
    addToCollectionHandle: function(c, e, ui) {
        var hits = ui.helper.data("hits"), i, collection, added;
		if (!hits) return;
        for (i = 0; i < hits.length; i++) {
            hit = hits[i];
			collection = hit.collection;
            added = this.addToCollection(c, hit);
            if (collection && added && this.options.removeAfterInnerCopy) {
				this.removeFromCollection(collection.data.id, hit.id);
            }
        }
    },

    /**
     * on click collection button
     * @param c object - collection
     * @param e object - jQuery event
     * @param b jQuery html object - button
     */
    collectionButtonHandle: function(c, e, b) {
        this.log("Button handle, class=\"" + b.attr("class") + "\"");
        if (b.hasClass("collection-deactivate")) {
            this.removeCollection(c.data.id);
        }
        return false;
    },

    /**
     * create new collection
     * @param dataVar - collection data (like {id : "collection id", metadata: {name: "collection name", ...}}
     * @param name - collection name; if not specified then try find name on dataVar.metadata.name or default collection name will be used
     * @return collection object on success, or false - on failure
     */
    createCollection: function(dataVar, name, fromDummy) {
        var data = $.extend({}, {id: this.generateId(), metadata: {}}, dataVar || {});
        if (!this.isDefined(data.metadata.name)) {
            data.metadata.name = this.isDefined(name) ? name : this.options.texts.collectionName + " " + (this.getCollections().length + 1);
        }
        var c = $.extend({}, {data: data}, {
            items: [],
			hitRenderer: this.createHitRenderer(),
            uid: "c_" + this.generateId()
        });
		if (fromDummy) {
			c.el = $('.elvis-collection-box-dummy', this.vars.listEl).removeClass('elvis-collection-box-dummy');
		} else {
			c.el = this._htmlCreate(this.options.cTpl);
			$('.ec-create-new-box', c.el).remove();
		}
        self = this;
        c.bodyEl = $(this.options.cBodySelector, c.el);
		c.hitRenderer.hits = [];
		c.hitRenderer.hitsTarget = $('.ec-collection-body', c.el);
        if (c.bodyEl.size() != 1) {
            this.logError("Error initialize 'collection body' element using 'cBodySelector' option");
            return false;
        }
        this.vars.collections.unshift(c);
		if (this.options.onChangeCollectionsList) {
			this.options.onChangeCollectionsList(this.getCollections());
		}
		if (fromDummy) {
			$('.ec-collection-body', c.el).show();
			$('.ec-collection-header-box', c.el).fadeIn(this.options.animationDuration);
			$('.ec-create-new-box', c.el).fadeOut(this.options.animationDuration, function() { 
				$(this).remove() 
				self._addDummyCollection(true);
				self.resize();
			});
		} else {
			c.el.height(0);
			c.el.insertAfter($('.elvis-collection-box-dummy:first', this.vars.listEl));
			this.resize();
		}
        c.el.droppable({
            accept: this.options.droppableAccept + ":not(." + this.options.cItemImageOverTrashClass + "):not(." + c.uid + ")",
            activeClass: this.options.droppableActiveClass,
            hoverClass: this.options.droppableHoverClass,
            tolerance: this.options.droppableTolerance,
            drop: function(e, ui) {
                self.addToCollectionHandle(c, e, ui);
            }
        });
        this.updateCollectionHeader(c);
        // bind header buttons
        $(this.options.cHeaderSelector + " .button", c.el).bind("click", function(e){
            return self.collectionButtonHandle(c, e, $(this));
        });
        this.log("Collection with name '" + data.metadata.name + "' is created");
		
        return c;
    },

    /**
     * remove collection
     * @param collectionId - collection id
     */
    removeCollection: function(collectionId) {
        var f = this.findCollection(collectionId), items = this.getCollections();
        if (f) {
            items[f.index].el.addClass('to-remove');
            var newItems = [], i;
            for (i = 0; i < items.length; i++) {
                if (i != f.index) {
                    newItems[newItems.length] = items[i];
                } else {
                    this.log("Collection with id '" + items[i].data.id + "' and name '" + items[i].data.metadata.name + "' is removed");
                }
            }
            this.setCollections(newItems);
			if (this.options.onChangeCollectionsList) {
				this.options.onChangeCollectionsList(this.getCollections());
			}
			this.resize();
        }
    },

    /**
     * add image to collection
     * @param c - collection
     * @param hit - data like {id: "image_id", metadata: {...}}
     * @return boolean - true on success, false otherwise
     */
    addToCollection: function(c, hit) {
        if (this.isCollection(hit)) {
            this.log("Item with id '" + hit.id + "' is a collection");
            return false;
        } else if (!this.findInCollection(c, hit.id)) {
			// add reference to collection
			var newHit = $.extend(true, {}, hit);
			newHit.collection = c;
			c.hitRenderer.hits.push(newHit);
			c.hitRenderer.refresh();
            this.updateCollectionHeader(c);
            this.log("Item with id '" + hit.id + "' is added to collection with name '" + c.data.metadata.name + "'");
            return true;
        } else {
            this.log("Item with id '" + hit.id + "' is always present in collection with name '" + c.data.metadata.name + "'");
            return false;
        }
    },

    /**
     * remove item from collection
     * @param collectionId - collection id
     * @param itemId - item id
     */
    removeFromCollection: function(collectionId, itemId) {
		var self = this;
		var item = this.findCollection(collectionId);
		if (item) {
			c = item.item;
			var f = this.findInCollection(c, itemId);
			if (f) {
				var index = this._getHitIndex(c.hitRenderer.hits, itemId);
				if (index >= 0) {
					$('[hitIndex=' + index + ']', c.hitRenderer.hitsTarget).fadeOut("slow", (function(itemId){return function() {
						var index = self._getHitIndex(c.hitRenderer.hits, itemId);
						c.hitRenderer.hits.splice(index, 1);
						c.hitRenderer.refresh();
					}})(itemId));
					this.log("Item with id '" + itemId + "' is removed from collection with name '" + c.data.metadata.name + "'");
				}
				this.updateCollectionHeader(c);
			}
		}
    },

    /**
     * find collection
     * @param collectionId - collection id
     * @return object {item: collection, index: index} on success or false on failure
     */
    findCollection: function(collectionId) {
        var i, items = this.getCollections();
        for (i = 0; i < items.length; i++) {
            if (items[i].data.id === collectionId) {
                return {item: items[i], index: i};
            }
        }
        return false;
    },

    /**
     * find item in collection
     * @param c - collection
     * @param itemId - item id
     * @return object {item: item, index: index} on success or false on failure
     */
    findInCollection: function(c, itemId) {
        for (i = 0; i < c.hitRenderer.hits.length; i++) {
			if (c.hitRenderer.hits[i].id == itemId) {
				return true;
			}
		}
        return false;
    },
	
    /**
     * check if item is a collection
     * @param item - an item
     * @return true if item is a collection
     */
	isCollection: function(item) {
		return item.metadata && item.metadata.assetDomain && item.metadata.assetDomain === 'container';
	},

    /**
     * update html of collection header
     * @param c object - collection
     */
    updateCollectionHeader: function(c) {
        var headerEl = $(this.options.cHeaderSelector, c.el);
        if (headerEl.size() == 1) {
            $(".name", headerEl).html(c.data.metadata.name);
            $(".items-count", headerEl).html("(" + c.hitRenderer.hits.length + ")");
        } else {
            this.log("Can not find collection header html element for updating")
        }
    },

    isDefined: function(i) {
        return typeof i != "undefined";
    },

    generateId: function() {
        var date = new Date();
        return "id_" + date.getTime() + "_" + Math.round(Math.random() * 1000000);
    },

	createHitRenderer: function() {
		var hitRenderer = new DraggableHitRenderer();
		hitRenderer.squareThumbs = true;
		hitRenderer.metadataToDisplay = null;
		hitRenderer.selectable = true;
		hitRenderer.multiselect = this.options.multiSelect;
		return hitRenderer;
	},

    _htmlCreate: function(htmlVar, textsVar) {
        var texts = textsVar || this.options.texts,
            i, r,
            html = htmlVar;
        for (i in texts) {
            r = new RegExp("{" + i + "}", "gi");
            html = html.replace(r, texts[i]);
        }
        return $(html);
    },
	
	_getHitIndex: function(hits, itemId) {
		for (var i = 0; i < hits.length; i++) {
			if (hits[i].id == itemId) return i;
		}
		return -1;
	},
	
	_addDummyCollection: function(effect) {
		var self = this;
		// add dummy for new collection
		$('div', this.vars.listEl).removeClass('elvis-collection-box-dummy');
		var dummy = this._htmlCreate(this.options.cTpl).addClass('elvis-collection-box-dummy');
		$('.ec-collection-header-box', dummy).hide();
		$('.ec-collection-body', dummy).hide();
		$('.ec-create-new-box', dummy).hide();
		this.vars.listEl.prepend(dummy);
		if (effect) {
			dummy.height(0);
		} else {
			dummy.height(this.options.createNewBoxHeight + 'px');
			$('.ec-create-new-box', dummy).show();
		}
		$('.ec-create-new-box', dummy).droppable({
			accept: this.options.droppableAccept,
			activeClass: this.options.droppableActiveClass,
			hoverClass: this.options.droppableHoverClass,
			tolerance: this.options.droppableTolerance,
			drop: function(e, ui) {
				self.createCollectionHandle(e, ui);
			}
		});
		$("a.ec-icon", dummy).bind("click", function(){
			self.createCollectionHandle(null, null, true);
			return false;
		}).bind("mousedown", function(){
			$(this).addClass("ec-icon-pushed");
		}).bind("mouseup", function(){
			$(this).removeClass("ec-icon-pushed");
		});
	},
	
	resize: function() {
		var self = this;
		var dummyHeight = this.options.createNewBoxHeight;
		var margin = 7;
		var height = $(this.vars.listEl).height();
		var count = $(this.vars.listEl).children().length;
		count -= $('.to-remove', this.vars.listEl).length;
		var h = (height - dummyHeight - (count + 1) * margin) / (count - 1);
		$(this.vars.listEl).children().each(function() {
			if ($(this).hasClass('elvis-collection-box-dummy')) {
				$(this).animate({height: dummyHeight + 'px'}, {
					duration: self.options.animationDuration,
					complete: function() {
						$('.ec-create-new-box', $(this)).fadeIn(self.options.animationDuration);
					}
				});
			} else if ($(this).hasClass('to-remove')) {
				$(this).animate({height: '0px'}, {duration: self.options.animationDuration, complete: function() {	
					$(this).remove();
				}});
			} else {
				$(this).animate({height: h + 'px'}, {dutation: self.options.animationDuration});
			}
			
		});
	},

    /* debug methods */
    log: function(message, obj, error) {
        if ((this.options.debugMode || error) && console) {
            var prefix = "[Elvis collections tool] ";
            if (typeof obj != "undefined") {
                if (error) {
                    console.error(prefix + message);
                    console.error(obj);
                } else {
                    console.log(prefix + message);
                    console.log(obj);
                }
            } else {
                if (typeof message != "object" && typeof message != "function") {
                    error ? console.error(prefix + message) : console.log(prefix + message);
                } else {
                    error ? console.error(message) : console.log(message);
                }
            }
        }
    },
    
    logError: function(message, obj) {
        this.log(message, obj, true);
    }

});


var CollectionsToolExt = CollectionsTool.extend({

	init: function(options, elvisApi) {
		this.elvisApi = elvisApi;
		this._parent(options);
	},

	createCollectionHandle: function (e, ui) {
		var self = this, uiOld;
		if (ui) {
			uiOld = {
				draggable : ui.draggable,
				helper : ui.helper.clone(true)
			}
		}
		var metadata = {
			assetType : "collection",
			name : "Collection"
		};
		this.elvisApi.create(metadata, function (data) {
			var c = self.createCollection(data, data.metadata.name, true);
			if (c && uiOld) {
				self.addToCollectionHandle(c, e, uiOld);
				uiOld.helper.remove();
			}
		});
	},
	
	addToCollectionHandle: function (c, e, ui) {

	var hits = ui.helper.data("hits");

		if (!hits) return;
			
		for (i = 0; i < hits.length; i++) {
			var hit = hits[i]
			this.log("Link item with '" + c.data.id + "' to item '" + hit.id + "'");
			var metadata = {
				target1Id : c.data.id,
				target2Id : hit.id,
				relationType : "contains"
			};
			this.elvisApi.createRelation(metadata);
		}
		this._parent(c, e, ui);
	},
	
	removeFromCollection : function (collectionId, itemId) {
		this.log("Item with id '" + itemId + " removed from collection with id '" + collectionId + "'");
		var params = {
			q : "relatedTo:" + collectionId + " id:" + itemId,
			relationTarget : "child",
			relationType : "contains"
		};
		var self = this;
		this.elvisApi.search(params, function (data) {
			if (data.hits.length > 0) {
				var metadata = {
					relationIds : data.hits[0].relation.relationId
				};
				self.log(data);
				elvisApi.removeRelation(metadata);
			}
		});
		this._parent(collectionId, itemId);
	},
	
	addElvisCollections: function(collectionIds) {
		var self = this, items = [];
		if (collectionIds) {
			// prevent duplications
			for (var i = 0; i < collectionIds.length; i++) {
				if (!this.findCollection(collectionIds[i])) items.push(collectionIds[i]);
			}
			if (items.length > 0) {
				// create placeholders to keep order
				for (var i = 0; i < items.length; i++) {
					this.createCollection({id: items[i]}, "");
				}
				this.elvisApi.search({
					q : 'id:(' + items.join(' OR ') + ')',
					metadataToReturn : "all"
				}, function (data) {
					$.each(data.hits, function(i, hit){
						self._addElvisCollection(hit);
					});
				});
			}
		}
	},

	addElvisCollection: function(collectionId) {
		var self = this;
		if (!this.findCollection(collectionId)) {
			// create placeholder to keep order
			this.createCollection({id: collectionId}, "");
			this.elvisApi.search({
				q : 'id:' + collectionId,
				metadataToReturn : "all"
			}, function (data) {
				$.each(data.hits, function(i, hit){
					self._addElvisCollection(hit);
				});
			});
		}
	},

	_addElvisCollection: function(collection) {
		var self = this;
		this.elvisApi.search({
			q: "relatedTo:" + collection.id,
			sort : "assetCreated",
			metadataToReturn : "all"
		}, (function(collection) {
			return function(data) {
				var item = self.findCollection(collection.id);
				if (item) {
					var c = item.item;
					// update name
					c.data = collection;
					self.updateCollectionHeader(c);
					// load items
					$.each(data.hits, function(i, hit){
						self.addToCollection(c, hit);
					});
					c.hitRenderer.refresh();
				}
			}
		})(collection));
	},
	
});


var DraggableHitRenderer = HitRenderer.extend({
	// redefine method
	postProcessTarget: function (targetElement) {
		var self = this;
		// call super method
		this._parent(targetElement);
		
		$('.elvisHitBox', targetElement).addClass('collection-item-img');
		$('.elvisHitBox', targetElement).draggable({
			helper: function(e) {
				var hitBox = $(e.currentTarget);
				var helper = self.generateHelper(hitBox);
				helper.data('hits', self.selectedHits.slice(0));
				return helper;
			},
			cursor: "move",
			zIndex: 9999
		});
	},	
	
	generateHelper: function(sourceElement) {
		var self = this;
		var hitBox = $(sourceElement);
		var index = hitBox.attr('hitIndex');
		var hit = self.hits[index];
		if ($.inArray(hit, self.selectedHits) < 0) {
			// fix selection if gragged item out of selection
			self.toggleSelected({}, hitBox, hit, index);
		}
		var parentClass = hitBox.parent().attr('class');
		var helper = $('<div/>').addClass(parentClass).appendTo($('body'));
		var dragHitBox = hitBox.clone().removeClass('selected').appendTo(helper);
		if (self.selectedHits.length > 1) {
			var dragLabel = $('<div/>').addClass('drag-count-label').appendTo(dragHitBox);
			$('<div/>').text(self.selectedHits.length).appendTo(dragLabel);
		}
		return helper;
	}
	
});
