(function($){

	var element;
	var dataTable = null;
	var options = {
		periodicity: 'day'
	}

	$.fn.statAssetsGrowingReport = function() {
		element = this;
		$(element).empty();
		_createLayout(element);
		_update();
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
			<table id="growingTable" cellpadding="0" cellspacing="0" border="0" class="display" ></table>\
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
				_update();
			}
		});
		// periodicity
		$('#periodicity').buttonset();
		$('#periodicity').change(function() {
			options.periodicity = $('#periodicity :checked').val();
			_update();
		});
		$('#periodicity_' + options.periodicity).attr('checked', true);
		$("#periodicity").buttonset("refresh");
	}
	
	function _update() {
		var period_start = jQuery.datepicker.formatDate(window.statsOptions.dbDateFormat, window.statsOptions.periodStart);

		//add one day, to include end period data
		var endDate = window.statsOptions.periodEnd; 
		endDate = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate() + 1);
		var period_end = jQuery.datepicker.formatDate(window.statsOptions.dbDateFormat, endDate);

		var requestsCompleted = 0;
		var errors = 0;
		var lastErrorMessage = '';
		var serieAdded = [];
		var serieRemoved = [];
		var serie = null;
		var base = 0;
		var ticks = null;
		var tickFormat;
		var labelFormat;
		if (options.periodicity == 'month') {
			tickFormat = "MM";
			labelFormat = "MM, yy";
		} else {
			tickFormat = "M d";
			labelFormat = "MM d, yy";
		}
		var fillSerie = function(data, add) {
			if (data.length > 0) {
				if (serie == null) serie = [];
				if (ticks == null) ticks = [];
				for (var i = 0; i < data.length; i++) {
					var date = data[i]['log_date_rs'];
					var count = data[i]['actions_count'];
					if (count == undefined || count == '') count = 0;
					// columns:  date, total no. of assets, added, removed, growth net number and growth %
					if (serie[i] == undefined) serie[i] = [date, 0, 0, 0, 0, 0];
					if (add) {
						serie[i][1] += count;
						serie[i][2] += count;
						serie[i][4] += count;
					} else {
						serie[i][1] -= count;
						serie[i][3] += count;
						serie[i][4] -= count;
					}
					ticks[i] = jQuery.datepicker.formatDate(tickFormat, new Date(date));
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
		var display = function() {
			if (errors > 0) {
				$('#chartError').html(lastErrorMessage);
				$('#chartError').show();
			} else {
				if (serie != null) {
					// update total data incremetal 
					for (var i = 1; i < serie.length; i++) {
						serie[i][1] += serie[i - 1][1];
					}

					for (var i = 0; i < serie.length; i++) {
						// add total base
						serie[i][1] += base;
						// calculate growth in percents
						if (serie[i][1] > 0) {
							serie[i][5] = serie[i][4] / serie[i][1] * 100;
						}
						// fill series for graph
						serieAdded[i] = serie[i][2];
						serieRemoved[i] = -serie[i][3];						

					}

					// decrease label amount for big period
					var xstep = Math.ceil(ticks.length / (options.periodicity == 'month' ? 28 : 40));
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
							fill: true,
							fillToZero: true,
							fillAndStroke: true,
							rendererOptions: {
								shadowAlpha: 0.1,
								shadowOffset: 1,
								shadowDepth: 2
							}
						},
						grid: {
							// Grid styling options
							gridLineColor: '#cccccc',
							background: '#ffffff',
							borderColor: '#cccccc',
							borderWidth: 0.0,
							shadow: false
						},
						axes: {
							xaxis: {
								renderer: $.jqplot.LineCategoryAxisRenderer,
								ticks: ticks
							}
						},
						series: [
							{label: 'Added', color: '#1F78B4', fillColor: '#1F78B4'},
							{label: 'Removed', negativeColor: '#A6CEE3', fillColor: '#A6CEE3'}
						],
						legend: {show: true, placement: 'outsideGrid'}
					};
					$('#chartError').hide();
					// empty chart element
					$('#chart').empty();
					$.jqplot('chart', [serieAdded, serieRemoved], chartOptions);	
				
				} else {
					serie = [];
					$('#chart').empty();
					$('<div style="height:300px;text-align:center;padding-top:130px" >No data available in graph</div>').appendTo($('#chart'));
				
				}
				
				var columns = [
					{sTitle: 'Month', sWidth: '100px', sDefaultContent: '', fnRender: function(o, val) {return jQuery.datepicker.formatDate(labelFormat, new Date(val))}},
					{sTitle: 'Total', sWidth: '100px', sDefaultContent: ''},
					{sTitle: 'Added', sWidth: '100px', sDefaultContent: ''},
					{sTitle: 'Removed', sWidth: '100px', sDefaultContent: ''},
					{sTitle: 'Growth net number', sWidth: '100px', sDefaultContent: ''},
					{sTitle: 'Growth %', sWidth: '100px', sDefaultContent: '', fnRender: function(o, val) {return val.toFixed(2)}}
				];
				
				if (dataTable) {
					dataTable.fnDestroy();
					$('#growingTable').empty();
				}
				
				// table
				dataTable = $('#growingTable').dataTable( {
					bProcessing: false,
					aaData: serie,
					aoColumns: columns,
					bAutoWidth: false,
					bDestroy: true,
					bScrollInfinite: true,
					bScrollCollapse: true,
					bDeferRender: false,
					bPaginate: false,
					bInfo: true,
					bJQueryUI: true,
					fnInfoCallback: function( oSettings, iStart, iEnd, iMax, iTotal, sPre ) {
						return iTotal + ' items';
					}
				});
			}
		}
	
		$(requests).each(function() {
			var o = this;
			$.ajax({
				url: '${serverUrl}/services/queryStats',
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
						display();
					}
				}
			});
			
		});
		
	}

})(jQuery);  
