(function($) {

	$.fn.makeReport = function(options) {

		defaults = {
			limit : 10
		}
		var opts = jQuery.extend(defaults, options);

		var $t = $(this);

		//clean content
		$t.empty();		
		$t.append('<div class="searchresult-content"><div class="searchresult-load">Loading...</div></div>');

		$t.loadReport(opts);

		// allow jQuery chaining
		return this;
	};

	$.fn.loadReport = function(options) {

		defaults = {
			limit : 10
		}
		var opts = jQuery.extend(defaults, options);

		var $t = $(this);
		var params = [];
		params.push({name:'queryFile', value:'${pluginId}/sql/popularsearches.sql'});
		params.push({name: 'num', value: opts.limit});
		params.push({name: 'period_start', value: jQuery.datepicker.formatDate(window.statsOptions.dbDateFormat, window.statsOptions.periodStart)});
		params.push({name: 'period_end', value: jQuery.datepicker.formatDate(window.statsOptions.dbDateFormat, window.statsOptions.periodEnd)});

		$.ajax({
			url:'/services/queryStats',
			data:params,
			dataType:'json',		
			success:function (d, status) {
				$t.empty();


				//load main content
				$t.append('<div id="popular-search-report"><div id="reportMenu"><div id="rangePicker">Period: <input id="period" name="period" type="text" size="20" class="dd" /></div></div>\<div class="searchresult-content"><div id="search-result-title">Popular search results</div><div id="search-content"><div id="search-queries"></div><div id="search-details"></div></div></div></div>');

				if (window.statsOptions.periodStart.getTime() == window.statsOptions.periodEnd.getTime()) {
					$('#period').val(jQuery.datepicker.formatDate(window.statsOptions.displayDateFormat, window.statsOptions.periodStart));
				} else {
					$('#period').val(jQuery.datepicker.formatDate(window.statsOptions.displayDateFormat, window.statsOptions.periodStart) + ' - ' + 
						jQuery.datepicker.formatDate(window.statsOptions.displayDateFormat, window.statsOptions.periodEnd));
				}
						
						

				$datePicker = $('#period');
				$datePicker.daterangepicker({
					dateFormat: window.statsOptions.displayDateFormat,
					appendTo: '#rangePicker',
					onClose: function() {
						window.statsOptions.periodStart = $('#rangePicker .range-start').datepicker('getDate');
						window.statsOptions.periodEnd = $('#rangePicker .range-end').datepicker('getDate');
						$t.loadReport();
					}
				});

				$content = $('#search-queries');

				for (var x = 0; x < d.length; x++) {
					$content.append('<div class="result-item"><a class="search-link" href="#" onclick="$(this).loadDetails(\'' + d[x].text + '\'); return false;">' + d[x].text + '&nbsp;(' + d[x].weight +')</a></div>');			
				}

				$('#search-details').append('<div id="search-cloud"></div>');
				$('#search-cloud').jQCloud(d);
			},
			error:function (jqXHR, status, errorThrown) {
				alert('Error');
			}
		});
		return this;
	}

	$.fn.loadDetails = function(tag) {
		var $t = $('#search-details');
		$t.empty();

		var params = [];
		params.push({name:'queryFile', value:'${pluginId}/sql/popularsearche-details-users.sql'});
		params.push({name: 'num', value: 5});
		params.push({name: 'query', value: tag});
		params.push({name: 'period_start', value: jQuery.datepicker.formatDate(window.statsOptions.dbDateFormat, window.statsOptions.periodStart)});
		params.push({name: 'period_end', value: jQuery.datepicker.formatDate(window.statsOptions.dbDateFormat, window.statsOptions.periodEnd)});

		$.ajax({
			url:'/services/queryStats',
			data:params,
			dataType:'json',		
			success:function (d, status) {
				$t.empty();
				$t.append('\
				<div id="searchresult-item-detail">\
					<div class="details-title">Average no. results: (max / average / min):</div>\
					<div id="details-average"/>\
					<div class="details-title">Hot dates:</div>\
					<div id="details-hotdates"/>\
					<div class="details-title">Top 5 users:</div>\
					<div id="details-users"/>\
				</div>');

				<!--build top users-->
				$('#details-users').empty();			   
				for (var x = 0; x < d.length; x++) {
					$('#details-users').append('<div class="details-item">' + d[x].name + '&nbsp;(' +  d[x].weight +')</div>');			
				}

				var paramsHotDates = [];
				paramsHotDates.push({name:'queryFile', value:'${pluginId}/sql/popularsearche-details-hotdates.sql'});
				paramsHotDates.push({name: 'num', value: 5});
				paramsHotDates.push({name: 'query', value: tag});
				paramsHotDates.push({name: 'period_start', value: jQuery.datepicker.formatDate(window.statsOptions.dbDateFormat, window.statsOptions.periodStart)});
				paramsHotDates.push({name: 'period_end', value: jQuery.datepicker.formatDate(window.statsOptions.dbDateFormat, window.statsOptions.periodEnd)});

				<!--load hot dates-->
				$.ajax({
					url:'/services/queryStats',
					data:paramsHotDates,
					dataType:'json',		
					success:function (d, status) {

						<!--build top hotdates-->
						for (var x = 0; x < d.length; x++) {
							$('#details-hotdates').append('<div class="details-item">' + d[x].log_date + '&nbsp;(' +  d[x].weight +')</div>');			
						}

						var paramsHotDates = [];
						paramsHotDates.push({name:'queryFile', value:'${pluginId}/sql/popularsearche-details-average.sql'});
						paramsHotDates.push({name: 'query', value: tag});
						paramsHotDates.push({name: 'period_start', value: jQuery.datepicker.formatDate(window.statsOptions.dbDateFormat, window.statsOptions.periodStart)});
						paramsHotDates.push({name: 'period_end', value: jQuery.datepicker.formatDate(window.statsOptions.dbDateFormat, window.statsOptions.periodEnd)});

						 <!--load average-->
						 $.ajax({
							url:'/services/queryStats',
							data:paramsHotDates,
							dataType:'json',		
							success:function (d, status) {

								<!--build average-->
								for (var x = 0; x < d.length; x++) {
									$('#details-average').append('<div class="details-item">' + d[x].max + '&nbsp;/&nbsp;' +  d[x].avg +'&nbsp;/&nbsp;' + d[x].min + '</div>');			
								}

							},
							error:function (jqXHR, status, errorThrown) {
								alert('Error');
							}
						});

					},
					error:function (jqXHR, status, errorThrown) {
						alert('Error');
					}
				});

			},
			error:function (jqXHR, status, errorThrown) {
				alert('Error');
			}
		});
		return this;

	}
})(jQuery);
