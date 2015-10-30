var ContextMenu = $.Class({

	init: function() {
		this.items = [];
		this.onShow = null;
		this._id = '_' + new String(Math.floor(Math.random() * 99999)) + '_elvis_context_menu' ;
		var self = this;
		$(document).ready(function() {
			var box = $('<div/>').attr('id', self._id).css('display', 'block').appendTo($('body'));
			self.renderMenu(box, self.items);
			$(document).click(function() {
				self.hide();
			});
		});
	},

	bindContext: function(targetElement, context) {
		var self = this;
		$(targetElement).bind('contextmenu', context, function(e) {
			e.stopPropagation();
			e.preventDefault();
			self.show(e);
		});
	},
	
	show: function(e) {
		this.hide();
		this.context = e.data;
		if (this.onShow) this.onShow(e);
		this._updateItemsState($('#' + this._id + ' ul:first'));
		$('#' + this._id + ' ul:first').show().position({of: e, my: 'left top', at: 'right top'});
	},
	
	hide: function() {
		this.context = null;
		$('ul.elvis-context-menu').hide();
	},
	
	renderMenu: function(parent, items) {
		var menuEl = $('<ul/>').addClass('elvis-context-menu').appendTo(parent).bind('contextmenu', function(e) {
			e.preventDefault();
			return false;
		});
		var self = this;
		$.each(items, function(i, item) {
			self.renderItem(menuEl, item);
		});
	},
	
	renderItem: function(menu, item) {
		var self = this;
		var itemEl = $('<li/>').addClass('elvis-context-menu-item').appendTo(menu);
		if (item) {
			// menu item
			itemEl.data('item', item);
			$('<a href="#" />').text(item.label).appendTo(itemEl);
			$('a:first', itemEl).click(function() {
				if (item.action && typeof item.action === 'function' && !itemEl.hasClass('disabled')) {
					var context = self.context;
					setTimeout(function() {item.action(context)}, 50);
				}
				self.hide();
			});
			if (item.items) {
				self.renderMenu(itemEl, item.items);
				itemEl.click(function() {return false});
				$('a:first', itemEl).addClass('elvis-context-submenu-item');
			}
			itemEl.mouseenter(function(e) {
				$('ul', $(this).parent()).hide();
				var submenu = $('ul.elvis-context-menu:first', $(this));
				if (submenu.length > 0 && !$(this).hasClass('disabled')) {
					self._updateItemsState(submenu);
					submenu.show().position({of: $(this), my: 'left top', at: 'right top'});
				}
			}).mouseleave(function() {
				if ($('ul', $(this)).length == 0) {
					$('ul', $(this).parent()).hide();
				}
			});
		} else {
			// separator
			itemEl.addClass('separator');
		}
		return itemEl;
	},
	
	_updateItemsState: function(ul) {
		var self = this;
		$(ul).children().each(function() {
			var item = $(this).data('item');
			if (item) {
				var disabled = false;
				if (typeof item.disabled !== 'undefined') {
					if (typeof item.disabled === 'boolean') disabled = item.disabled;
					else if (typeof item.disabled === 'function') disabled = item.disabled(self.context);
				}
				if (disabled) $(this).addClass('disabled');
				else $(this).removeClass('disabled');
			}
		});
	}
	
});  

