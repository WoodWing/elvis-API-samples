(
	function()
	{
		tinymce.create("tinymce.plugins.Elvis" ,
		{
			init:function(ed, url) {
				ed.addCommand('openElvisBrowser', function () {
					var windowSettings = {
						file : url + '/browse.html',
						width : -200,
						height : -200,
						inline : 1
					};
					
					if (typeof window.innerWidth != 'undefined') {
					 	// more standards compliant browsers (mozilla/netscape/opera/IE7)
					 	windowSettings.width += window.innerWidth,
						windowSettings.height += window.innerHeight
					}
					else if (typeof document.documentElement != 'undefined' && typeof document.documentElement.clientWidth != 'undefined' && document.documentElement.clientWidth != 0) {
						// IE6 in standards compliant mode
						viewportwidth += document.documentElement.clientWidth,
						viewportheight += document.documentElement.clientHeight
					} else {
						// older versions of IE
						viewportwidth += document.getElementsByTagName('body')[0].clientWidth,
						viewportheight += document.getElementsByTagName('body')[0].clientHeight
					}
					
					ed.windowManager.open(windowSettings, {
						plugin_url : url, // Plugin absolute URL
						editor : tinymce.activeEditor // Custom argument
					});
				});

				ed.addButton('elvisBrowse', {
					title : 'Insert media from Elvis',
					cmd : 'openElvisBrowser',
					image : url + '/img/browse.png'
				});
			}
		});
		tinymce.PluginManager.add("elvis",tinymce.plugins.Elvis)
	}
)();