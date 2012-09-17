(function($){

	var element;
	var options = {
		periodicity: 'day'
	}
	
	$.fn.statAssetsAvailableReport = function() {
		element = this;
		$(element).empty();
		_createLayout(element);
		_updateChart();
		_updateTable();
	};
	
	function _createLayout(element) {
		$('\
		<div id="reportChart">\
			<div id="reportMenu">\
				<div id="rangePicker">Period: <input id="period" name="period" type="text" size="20" class="dd" /></div>\
				<div id="periodicity">\
					<input type="radio" id="periodicity_day" name="periodicity" value="day"/><label for="periodicity_day">Day</label>\
					<input type="radio" id="periodicity_week" name="periodicity" value="week"/><label for="periodicity_week">Week</label>\
					<input type="radio" id="periodicity_month" name="periodicity" value="month"/><label for="periodicity_month">Month</label>\
				</div>\
			</div>\
			<div id="chart" ></div>\
			<div id="chartError" class="error" ></div>\
		</div>\
		').appendTo(element);
		$('\
		<div id="reportTable">\
			<table id="factBoxes" cellpadding="0" cellspacing="0" class="display" >\
				<tr>\
					<td>Total no. of assets<div id="total"></div></td>\
					<td>Added this year <div id="thisYear"></div></td>\
					<td>Added this month <div id="thisMonth"></div></td>\
					<td>Added this week <div id="thisWeek"></div></td>\
				</tr>\
			</table>\
			<div id="tableError" class="error" ></div>\
		</div>\
		').appendTo(element);
		if (window.statsOptions.periodStart.getTime() == window.statsOptions.periodEnd.getTime()) {
			$('#period').val(jQuery.datepicker.formatDate(window.statsOptions.displayDateFormat, window.statsOptions.periodStart));
		} else {
			$('#period').val(jQuery.datepicker.formatDate(window.statsOptions.displayDateFormat, window.statsOptions.periodStart) + ' - ' + 
				jQuery.datepicker.formatDate(window.statsOptions.displayDateFormat, window.statsOptions.periodEnd));
		}
		// init date range picker
		$('#period').daterangepicker({
			dateFormat: window.statsOptions.displayDateFormat,
			appendTo: '#rangePicker',
			onClose: function() {
				window.statsOptions.periodStart = $('#rangePicker .range-start').datepicker('getDate');
				window.statsOptions.periodEnd = $('#rangePicker .range-end').datepicker('getDate');
				_updateChart();
				_updateTable();
			}
		});
		// periodicity
		$('#periodicity').buttonset();
		$('#periodicity').change(function() {
			options.periodicity = $('#periodicity :checked').val();
			_updateChart();
		});
		$('#periodicity_' + options.periodicity).attr('checked', true);
		$("#periodicity").buttonset("refresh");
	}
	
	function _updateChart() {
		var period_start = jQuery.datepicker.formatDate(window.statsOptions.dbDateFormat, window.statsOptions.periodStart);

		//add one day, to include end period data
		var endDate = window.statsOptions.periodEnd; 
		endDate = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate() + 1);
		var period_end = jQuery.datepicker.formatDate(window.statsOptions.dbDateFormat, endDate);

		var requestsCompleted = 0;
		var errors = 0;
		var lastErrorMessage = '';
		var base = 0;
		var serie = null;
		var ticks = null;
		var tickFormat;
		if (options.periodicity == 'month') {
			tickFormat = "MM";
		} else {
			tickFormat = "M d";
		}
		var fillSerie = function(data, add) {
			if (data.length > 0) {
				if (serie == null) serie = [];
				if (ticks == null) ticks = [];
				for (var i = 0; i < data.length; i++) {
					var date = data[i]['log_date_rs'];
					var count = data[i]['actions_count'];
					var prev = serie[i];
					if (count == undefined || count == '') count = 0;
					if (prev == undefined || prev == '') prev = 0;
					serie[i] = add ? prev + count : prev - count;
					ticks[i] = jQuery.datepicker.formatDate(tickFormat, new Date(date));//date; // TODO formatting
				}
			}
		} 
		var requests = [{
			params: [
				{name: 'queryFile', value: '${pluginId}/sql/actionsCount.sql'},
				{name: 'period_start', value: jQuery.datepicker.formatDate(window.statsOptions.dbDateFormat, new Date(1970, 0, 1, 0, 0, 0, 0))},
				{name: 'period_end', value: period_start},
				{name: 'action_types', value: 'CREATE,CREATE_VARIATION,COPY,COPY_VERSION,'}
			], onSuccess: function(data) {
				base += parseInt(data[0]['actions_count']); 
			}}, {
			params: [
				{name: 'queryFile', value: '${pluginId}/sql/actionsCount.sql'},
				{name: 'period_start', value: jQuery.datepicker.formatDate(window.statsOptions.dbDateFormat, new Date(1970, 0, 1, 0, 0, 0, 0))},
				{name: 'period_end', value: period_start},
				{name: 'action_types', value: 'REMOVE,'}
			], onSuccess: function(data) {
				base -= parseInt(data[0]['actions_count']); 
			}}, {
			params: [
				{name: 'queryFile', value: '${pluginId}/sql/actionsCountPeriodically.sql'},
				{name: 'period_start', value: period_start},
				{name: 'period_end', value: period_end},
				{name: 'action_types', value: 'CREATE,CREATE_VARIATION,COPY,COPY_VERSION,'},
				{name: 'periodicity', value: options.periodicity},
				{name: 'gs_periodicity', value: '1 ' + options.periodicity},
				{name: 'num', value: 1000}
			], onSuccess: function(data) {
				fillSerie(data, true);
			}}, {
			params: [
				{name: 'queryFile', value: '${pluginId}/sql/actionsCountPeriodically.sql'},
				{name: 'period_start', value: period_start},
				{name: 'period_end', value: period_end},
				{name: 'action_types', value: 'REMOVE,'},
				{name: 'periodicity', value: options.periodicity},
				{name: 'gs_periodicity', value: '1 ' + options.periodicity},
				{name: 'num', value: 1000}
			], onSuccess: function(data) {
				fillSerie(data, false);
			}}
		];
		var displayChart = function() {
			if (errors > 0) {
				$('#chartError').html(lastErrorMessage);
				$('#chartError').show();
			} else {
				if (serie != null) {
					// update data incrementally 
					for (var i = 1; i < serie.length; i++) {
						serie[i] += serie[i - 1];
					}
					for (var i = 0; i < serie.length; i++) {
						serie[i] += base;
					}
					// decrease label amount for big period
					var xstep = Math.ceil(ticks.length / (options.periodicity == 'month' ? 28 : 30));
					for (var i = 0; i < ticks.length; i++) {
						if (i % xstep != 0) ticks[i] = '';
					}

					var chartOptions = {
						// Bar and line colors
						seriesColors: [ "#1F78B4","#A6CEE3", "#33A02C", "#B2DF8A",
							"#E31A1C", "#FB9A99", "#FF7F00", "#FDBF6F", "#CAB2D6",
							"#6A3D9A", "#E0E0E0", "#878787", "#000000"
						],
						seriesDefaults: {
							rendererOptions: {
								shadowAlpha: 0.1,
								shadowOffset: 1,
								shadowDepth: 2
							}
						}, 
						grid:{
							// Grid styling options
							gridLineColor: '#cccccc',
							background: '#ffffff',
							borderColor: '#cccccc',
							borderWidth: 0.0,
							shadow: false
						},
						axes:{
							xaxis:{
								renderer: $.jqplot.LineCategoryAxisRenderer,
								ticks: ticks
							},
							yaxis:{
								pad: 0,//to start on "0"
								tickOptions:{formatString:'%d'}
							}
						}
					};
					$('#chartError').hide();
					// empty chart element
					$('#chart').empty();
					$.jqplot('chart', [serie], chartOptions);				
				} else {
					$('#chart').empty();
					$('<div style="height:300px;text-align:center;padding-top:130px" >No data available in graph</div>').appendTo($('#chart'));
				}
			}
		}
	
		$(requests).each(function() {
			var o = this;
			$.ajax({
				url: '/services/queryStats',
				data: o.params,
				success: function(data, status) {
					if (typeof data.errorcode != 'undefined') {
						errors += 1;
						lastErrorMessage = data.message;
					} else {
						o.onSuccess(data);
					}
				},
				error: function(jqXHR, status, errorThrown) {
					errors += 1;
					lastErrorMessage = errorThrown;
				},
				complete: function(jqXHR, textStatus) {
					requestsCompleted += 1;
					if (requestsCompleted == requests.length) {
						displayChart();
					}
				}
			});
			
		});
		
	}
		
	function _updateTable() {
		var requestsCompleted = 0;
		var errors = 0;
		var lastErrorMessage = '';
		var total = 0;
		var thisYear = 0;
		var thisMonth = 0;
		var thisWeek = 0;
		var thisWeekStart = new Date(now.getTime() - (now.getDay() * (1000*60*60*24)))

		//add one day, to include end period data
		var endDate = now; 
		endDate = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate() + 1);

		var requests = [{
			params: [
				{name: 'queryFile', value: '${pluginId}/sql/actionsCount.sql'},
				{name: 'period_start', value: jQuery.datepicker.formatDate(window.statsOptions.dbDateFormat, new Date(1970, 0, 1, 0, 0, 0, 0))},
				{name: 'period_end', value: jQuery.datepicker.formatDate(window.statsOptions.dbDateFormat, endDate)},
				{name: 'action_types', value: 'CREATE,CREATE_VARIATION,COPY,COPY_VERSION,'}
			], onSuccess: function(data) {
				total += parseInt(data[0]['actions_count']); 
			}}, {
			params: [
				{name: 'queryFile', value: '${pluginId}/sql/actionsCount.sql'},
				{name: 'period_start', value: jQuery.datepicker.formatDate(window.statsOptions.dbDateFormat, new Date(1970, 0, 1, 0, 0, 0, 0))},
				{name: 'period_end', value: jQuery.datepicker.formatDate(window.statsOptions.dbDateFormat, endDate)},
				{name: 'action_types', value: 'REMOVE,'}
			], onSuccess: function(data) {
				total -= parseInt(data[0]['actions_count']); 
			}} , {
			params: [
				{name: 'queryFile', value: '${pluginId}/sql/actionsCount.sql'},
				{name: 'period_start', value: jQuery.datepicker.formatDate(window.statsOptions.dbDateFormat, new Date(now.getFullYear(), 0, 1, 0, 0, 0, 0))},
				{name: 'period_end', value: jQuery.datepicker.formatDate(window.statsOptions.dbDateFormat, endDate)},
				{name: 'action_types', value: 'CREATE,CREATE_VARIATION,COPY,COPY_VERSION,'}
			], onSuccess: function(data) {
				thisYear += parseInt(data[0]['actions_count']); 
			}}, {
			params: [
				{name: 'queryFile', value: '${pluginId}/sql/actionsCount.sql'},
				{name: 'period_start', value: jQuery.datepicker.formatDate(window.statsOptions.dbDateFormat, new Date(now.getFullYear(), 0, 1, 0, 0, 0, 0))},
				{name: 'period_end', value: jQuery.datepicker.formatDate(window.statsOptions.dbDateFormat, endDate)},
				{name: 'action_types', value: 'REMOVE,'}
			], onSuccess: function(data) {
				thisYear -= parseInt(data[0]['actions_count']); 
			}}, {
			params: [
				{name: 'queryFile', value: '${pluginId}/sql/actionsCount.sql'},
				{name: 'period_start', value: jQuery.datepicker.formatDate(window.statsOptions.dbDateFormat, new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0))},
				{name: 'period_end', value: jQuery.datepicker.formatDate(window.statsOptions.dbDateFormat, endDate)},
				{name: 'action_types', value: 'CREATE,CREATE_VARIATION,COPY,COPY_VERSION,'},
			], onSuccess: function(data) {
				thisMonth += parseInt(data[0]['actions_count']); 
			}}, {
			params: [
				{name: 'queryFile', value: '${pluginId}/sql/actionsCount.sql'},
				{name: 'period_start', value: jQuery.datepicker.formatDate(window.statsOptions.dbDateFormat, new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0))},
				{name: 'period_end', value: jQuery.datepicker.formatDate(window.statsOptions.dbDateFormat, endDate)},
				{name: 'action_types', value: 'REMOVE,'}
			], onSuccess: function(data) {
				thisMonth -= parseInt(data[0]['actions_count']); 
			}}, {
			params: [
				{name: 'queryFile', value: '${pluginId}/sql/actionsCount.sql'},
				{name: 'period_start', value: jQuery.datepicker.formatDate(window.statsOptions.dbDateFormat, thisWeekStart)},
				{name: 'period_end', value: jQuery.datepicker.formatDate(window.statsOptions.dbDateFormat, endDate)},
				{name: 'action_types', value: 'CREATE,CREATE_VARIATION,COPY,COPY_VERSION,'}
			], onSuccess: function(data) {
				thisWeek += parseInt(data[0]['actions_count']); 
			}}, {
			params: [
				{name: 'queryFile', value: '${pluginId}/sql/actionsCount.sql'},
				{name: 'period_start', value: jQuery.datepicker.formatDate(window.statsOptions.dbDateFormat, thisWeekStart)},
				{name: 'period_end', value: jQuery.datepicker.formatDate(window.statsOptions.dbDateFormat, endDate)},
				{name: 'action_types', value: 'REMOVE,'}
			], onSuccess: function(data) {
				thisWeek -= parseInt(data[0]['actions_count']); 
			}}  
		];
		
		$(requests).each(function() {
			var o = this;
			$.ajax({
				url: '/services/queryStats',
				data: o.params,
				success: function(data, status) {
					if (typeof data.errorcode != 'undefined') {
						errors += 1;
						lastErrorMessage = data.message;
					} else {
						o.onSuccess(data);
					}
				},
				error: function(jqXHR, status, errorThrown) {
					errors += 1;
					lastErrorMessage = errorThrown;
				},
				complete: function(jqXHR, textStatus) {
					requestsCompleted += 1;
					if (requestsCompleted == requests.length) {
						if (errors > 0) {
							$('#tableError').html(lastErrorMessage);
							$('#tableError').show();
						} else {
							$('#tableError').hide();
							$('#total').text(total);
							$('#thisYear').text(thisYear);
							$('#thisMonth').text(thisMonth);
							$('#thisWeek').text(thisWeek);
						}
					}
				}
			});
			
		});
	}

})(jQuery);  
