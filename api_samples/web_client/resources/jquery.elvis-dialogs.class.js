var SelectFolderDialog = $.Class({

	init: function(elvisApi) {

		this.dialogTitle = 'Select folder';
		this.okButtonTitle = 'Ok';
		this.folderPath = null;
		this.onOk = null;
		
		this._elvisApi = elvisApi;
		this._id = '_' + new String(Math.floor(Math.random() * 99999)) + '_select_folder_dialog';
		this._columnTreeId = this._id + '_column_tree';
		this._columnTree = null;
		
	},
	
	render: function() {
		var self = this;
		var dialog = $('<div/>').attr('id', this._id).addClass('elvis-dialog').appendTo($('body'));
		var toolbar = $('<div/>').addClass('toolbar-wrapper').appendTo(dialog);
		$('<span/>').text('To destination:').appendTo(toolbar);
		var createFolder = $('<a href="#"/>').text('Create folder').appendTo(toolbar);
		var columnTree = $('<div/>').attr('id', this._columnTreeId).appendTo(dialog);
		
		var buttons = {};
		buttons['Cancel'] = function() {$(this).dialog('close'); }
		buttons[this.okButtonTitle] = function() {$(this).dialog('close'); if (self.onOk) self.onOk(); }
		dialog.dialog({
			width: 600,
			title: this.dialogTitle,
			autoOpen: false,
			resizable: false,
			modal: true,			
			buttons: buttons
		});
		// TODO revise why keypress doesn't work here
		dialog.keypress(function(e) {
			if (e.keyCode == $.ui.keyCode.ENTER) {$(this).dialog('close'); if (self.onOk) self.onOk(); }
		});
		
		createFolder.button().click(function() {
			createFolderDialog.name = '';
			createFolderDialog.show();
		});

		this._columnTree = new ColumnTree(columnTree, this._elvisApi);
		this._columnTree.foldersOnly = true;
		this._columnTree.pathChange = function () {
			self.folderPath = self._columnTree.folderPath;
		};
		
		var createFolderDialog = new CreateFolderDialog();
		createFolderDialog.onOk = function() {
			if (createFolderDialog.name) {
				var folderPath = self._columnTree.folderPath + '/' + createFolderDialog.name;
				var params = {path: folderPath};
				self._elvisApi.createFolder(params, function() {
					self.folderPath = folderPath;
					self._columnTree.folderPath = folderPath;
					self._columnTree.refresh();
				});
			}
		}

	},
	
	show: function() {
		if (this.folderPath) {
			this._columnTree.folderPath = this.folderPath;
			this._columnTree.refresh();
		}
		$('#' + this._id).dialog('open');
	}

});

var CopyFolderDialog = SelectFolderDialog.extend({
	init: function(elvisApi) {
		this._parent(elvisApi);
		this.dialogTitle = 'Copy folder...';
		this.okButtonTitle = 'Copy';
		var self = this;
		$(document).ready(function() {
			self.render();
		});
	}
});

var MoveFolderDialog = SelectFolderDialog.extend({
	init: function(elvisApi) {
		this._parent(elvisApi);
		this.dialogTitle = 'Move folder...';
		this.okButtonTitle = 'Move';
		var self = this;
		$(document).ready(function() {
			self.render();
		});
	}
});

var CopyFilesDialog = SelectFolderDialog.extend({
	init: function(elvisApi) {
		this._parent(elvisApi);
		this.dialogTitle = 'Copy file(s)...';
		this.okButtonTitle = 'Copy';
		var self = this;
		$(document).ready(function() {
			self.render();
		});
	}
});

var MoveFilesDialog = SelectFolderDialog.extend({
	init: function(elvisApi) {
		this._parent(elvisApi);
		this.dialogTitle = 'Move file(s)...';
		this.okButtonTitle = 'Move';
		var self = this;
		$(document).ready(function() {
			self.render();
		});
	}
});

var EnterNameDialog = $.Class({

	init: function() {
		this.dialogTitle = 'Enter name';
		this.okButtonTitle = 'Ok';
		this.name = '';
		this.onOk = null;
		
		this._id = '_' + new String(Math.floor(Math.random() * 99999)) + '_enter_name_dialog';
	}, 
	
	render: function() {
		var self = this;
		var dialog = $('<div/>').attr('id', this._id).addClass('elvis-dialog').appendTo($('body'));
		var wrapper = $('<div/>').addClass('input-wrapper').appendTo(dialog);
		$('<input type="text" />').appendTo(wrapper);

		var buttons = {};
		buttons['Cancel'] = function() {$(this).dialog('close'); }
		buttons[this.okButtonTitle] = function() {$(this).dialog('close'); self.name = $('input:first', $(this)).val(); if (self.onOk) self.onOk(); }
		//this._onOk;
		dialog.dialog({
			title: this.dialogTitle,
			autoOpen: false,
			resizable: false,
			modal: true,			
			buttons: buttons
		});
		dialog.keypress(function(e) {
			if (e.keyCode == $.ui.keyCode.ENTER) {$(this).dialog('close'); self.name = $('input:first', $(this)).val(); if (self.onOk) self.onOk(); }
		});

	}, 
	
	show: function() {
		var name = this.name || '';
		$('input:first', $('#' + this._id)).val(name);
		$('#' + this._id).dialog('open');
	},
	
});

var CreateFolderDialog = EnterNameDialog.extend({
	init: function() {
		this._parent();
		this.dialogTitle = 'Create folder';
		this.okButtonTitle = 'Create';
		var self = this;
		$(document).ready(function() {
			self.render();
		});
	}
});

var CreateCollectionDialog = EnterNameDialog.extend({
	init: function() {
		this._parent();
		this.dialogTitle = 'Create collection';
		this.okButtonTitle = 'Create';
		var self = this;
		$(document).ready(function() {
			self.render();
		});
	}
});

var RenameFolderDialog = EnterNameDialog.extend({
	init: function() {
		this._parent();
		this.dialogTitle = 'Rename folder';
		this.okButtonTitle = 'Rename';
		var self = this;
		$(document).ready(function() {
			self.render();
		});
	}
});

var ConfirmDialog = $.Class({

	init: function() {

		this.dialogTitle = 'Confirm';
		this.cancelButtonTitle = 'No';
		this.okButtonTitle = 'Yes';
		this.message = '';
		this.onOk = null;

		this._id = '_' + new String(Math.floor(Math.random() * 99999)) + '_select_folder_dialog';
	},
	
	render: function() {
		var self = this;
		var dialog = $('<div/>').attr('id', this._id).addClass('elvis-dialog').appendTo($('body'));	
		$('<p/>').appendTo(dialog);
		
		var buttons = {};
		buttons[this.cancelButtonTitle] = function() {$(this).dialog('close'); }
		buttons[this.okButtonTitle] = function() {$(this).dialog('close'); if (self.onOk) self.onOk(); }
		dialog.dialog({
			title: this.dialogTitle,
			width: 400,
			autoOpen: false,
			resizable: false,
			modal: true,			
			buttons: buttons
		});
		dialog.keypress(function(e) {
			if (e.keyCode == $.ui.keyCode.ENTER) {$(this).dialog('close'); if (self.onOk) self.onOk(); }
		});
		
	},
	
	show: function() {
		var message = this.message || '';
		$('p:first', $('#' + this._id)).text(message);
		$('#' + this._id).dialog('open');
	},
	
});

var DeleteCollectionDialog = ConfirmDialog.extend({
	init: function() {
		this._parent();
		this.dialogTitle = 'Delete collection';
		var self = this;
		$(document).ready(function() {
			self.render();
		});
	}
});

var DeleteFolderDialog = ConfirmDialog.extend({
	init: function() {
		this._parent();
		this.dialogTitle = 'Delete folder';
		var self = this;
		$(document).ready(function() {
			self.render();
		});
	}
});

var DeleteFilesDialog = ConfirmDialog.extend({
	init: function() {
		this._parent();
		this.dialogTitle = 'Delete file(s)...';
		var self = this;
		$(document).ready(function() {
			self.render();
		});
	}
});

var FoldersBar = $.Class({
	init: function(elvisApi) {
		this.target = null;
		this.folderPath = null;
	},
	render: function() {
		if (this.target) {
			$(this.target).empty();
			var wrapper = $('<div/>').addClass('foldersbar').appendTo($(this.target));
			if (this.folderPath) {
				this.folderPath = this.folderPath.replace(/^\/|\/$/g, '');
				var folders = this.folderPath.split('/');
				for (var i = 0; i < folders.length; i++) {
					this.renderFolder(wrapper, folders[i]);
					if (i < folders.length - 1) {
						this.renderSeparator(wrapper) ;
					}
				}
			}
		}
	},
	renderFolder: function(element, name) {
		var folder = $('<div/>').addClass('foldersbar-folder').appendTo(element);
		$('<div/>').addClass('foldersbar-folder-icon').appendTo(folder);
		$('<div/>').addClass('foldersbar-folder-name').text(name).appendTo(folder);
	},
	renderSeparator: function(element) {
		$('<div/>').addClass('foldersbar-separator-icon').appendTo(element);
	}
});