(function($){

	var now = new Date();
	var element;
	var dataTable = null;
	var options = {
		actionTypes: ',',
		category: {
			name: 'asset_domain_rs',
			index: 4
		},
		groupBy: {
			group_by_user_name: false,
			group_by_user_groups: false,
			group_by_client_type: false,
			group_by_asset_domain: true
		},
		periodicity: 'days',
		graphview: 'line'
	}

	$.fn.statActionReport = function(o) {
		element = this;
		options = $.extend(options, o);
		$(element).empty();
		_createLayout(element);
		_updateChart();
		_updateTable();
	};
	
	function _createLayout(element) {
		$('\
		<div id="reportChart">\
			<div id="reportMenu">\
				<div id="rangePicker">Period: <input id="period" name="period" type="text" size="20"/></div>\
				<div id="periodicity">\
					<input type="radio" id="periodicity_day" name="periodicity" value="day"/><label for="periodicity_day">Day</label>\
					<input type="radio" id="periodicity_week" name="periodicity" value="week"/><label for="periodicity_week">Week</label>\
					<input type="radio" id="periodicity_month" name="periodicity" value="month"/><label for="periodicity_month">Month</label>\
				</div>\
				<div id="graphview">\
					<input type="radio" id="graphview_line" name="graphview" value="line"/><label for="graphview_line">&nbsp;</label>\
					<input type="radio" id="graphview_bar" name="graphview" value="bar"/><label for="graphview_bar">&nbsp;</label>\
				</div>\
				<select id="category">\
					<option value="0">Total</option>\
					<option value="1">By user name</option>\
					<option value="2">By user groups</option>\
					<option value="3">By client type</option>\
					<option value="4">By kind</option>\
				</select>\
			</div>\
			<div id="chart" ></div>\
			<div id="chartError" class="error" ></div>\
		</div>\
		').appendTo(element);
		$('\
		<div id="reportTable">\
			<div id="grouping" style="margin: 0 10px">Group by: &nbsp;\
				<input id="group_by_user_name" type="checkbox" /> user name &nbsp;\
				<input id="group_by_user_groups" type="checkbox" /> user groups &nbsp;\
				<input id="group_by_client_type" type="checkbox" /> client type &nbsp;\
				<input id="group_by_asset_domain" type="checkbox" /> kind\
			</div>\
			<table id="responseTable" cellpadding="0" cellspacing="0" border="0" class="display" ></table>\
			<div id="tableError" class="error" ></div>\
		</div>\
		').appendTo(element);
		
		// init category select 
		$('#category').change(
			function() {
				options.category.index = parseInt($(this).val());
				switch(options.category.index) {
					case 0: options.category.name = 'total'; break;
					case 1: options.category.name = 'user_name_rs'; break;
					case 2: options.category.name = 'user_groups_rs'; break;
					case 3: options.category.name = 'client_type_rs'; break;
					case 4: options.category.name = 'asset_domain_rs'; break;
				}
				_updateChart();
			}
		);
		$('#category').val(options.category.index);
		// init grouping
		$('#grouping input:checkbox').attr('checked', true);
		$('#grouping input:checkbox').click(function() {
			options.groupBy[$(this).attr('id')] = $(this).is(':checked');
			_updateTable();
		});
		$.each(options.groupBy, function(index, value) {
			$('#' + index).attr('checked', value);
		})
		
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
		// graph view
		$('#graphview').buttonset();
		$('#graphview').change(function() {
			options.graphview = $('#graphview :checked').val();
			_updateChart();
		});
		$('#graphview_' + options.graphview).attr('checked', true);
		$("#graphview").buttonset("refresh");
		$("#graphview_line").button({icons: {primary:'ui-icon-custom-line-graph', secondary: null}});
		$("#graphview_bar").button({icons: {primary:'ui-icon-custom-bar-graph'}, secondary: null});
	}
	
	function _updateChart() {
		var onSuccess =  function() {
			$('#chartError').hide();
		};
		var onError = function(message) {
			$('#chartError').html(message);
			$('#chartError').show();
		}
		
		_load($.extend(options, {onError: onError}), function(chart, ticks, serieNames) {
			if (ticks.length > 0) {

				var chartOptions = {
					stackSeries: true,
					// Bar and line colors
					seriesColors: [ "#1F78B4","#A6CEE3", "#33A02C", "#B2DF8A",
						"#E31A1C", "#FB9A99", "#FF7F00", "#FDBF6F", "#CAB2D6",
						"#6A3D9A", "#E0E0E0", "#878787", "#000000"
					],
					seriesDefaults: {
						rendererOptions: {
							barPadding: 3,
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
							renderer: $.jqplot.CategoryAxisRenderer,
							ticks: ticks
						},
						yaxis:{
							pad: 0,
							tickOptions:{formatString:'%d'}
						}
					}
				};
				if (options.graphview == 'line') {
					chartOptions.seriesDefaults.fill = true;
					chartOptions.seriesDefaults.fillToZero = true;
					chartOptions.seriesDefaults.fillAndStroke = true;
					chartOptions.axes.xaxis.renderer = $.jqplot.LineCategoryAxisRenderer;
				} else {
					chartOptions.seriesDefaults.renderer =  $.jqplot.BarRenderer;
				}
				if (serieNames.length > 0) {
					chartOptions.series = serieNames;
					chartOptions.legend = {
						show: true,
						placement: 'outsideGrid'
					}
				}
				if (ticks.length > 10) {
					//chartOptions.axes.xaxis.tickRenderer = $.jqplot.CanvasAxisTickRenderer;
					//chartOptions.axes.xaxis.tickOptions = {angle: -30};
				}
				// empty chart element
				$('#chart').empty();
				
				$.jqplot('chart', chart, chartOptions);				
			
			} else {
				$('#chart').empty();
				$('<div style="height:300px;text-align:center;padding-top:130px" >No data available in graph</div>').appendTo($('#chart'));
			
			}
			
			onSuccess();
		});
	}
		
	function _updateTable() {
		var onSuccess =  function() {
			$('#tableError').hide();
		};
		var onError = function(message) {
			$('#tableError').html(message);
			$('#tableError').show();
		}
		
		// setup columns
		var columns = [];
		if (options.groupBy['group_by_user_name']) columns.push({mDataProp: 'user_name_rs', sTitle: 'User name', sWidth: '100px', sDefaultContent: ''});
		if (options.groupBy['group_by_user_groups']) columns.push({mDataProp: 'user_groups_rs', sTitle: 'User groups', sWidth: '100px', sDefaultContent: ''});
		if (options.groupBy['group_by_client_type']) columns.push({mDataProp: 'client_type_rs', sTitle: 'Client type', sWidth: '100px', sDefaultContent: ''});
		if (options.groupBy['group_by_asset_domain']) columns.push({mDataProp: 'asset_domain_rs', sTitle: 'Kind', sWidth: '100px', sDefaultContent: ''});
		columns.push({mDataProp: 'count_rs', sTitle: 'Count', sWidth: '100px'});

		//add one day, to include end period data
		var endDate = window.statsOptions.periodEnd; 
		endDate = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate() + 1);

		// gather parameters
		var params = [];
		params.push({name: 'queryFile', value: '${pluginId}/sql/usageLog.sql'});
		params.push({name: 'num', value: '10000'});
		params.push({name: 'action_type', value: options.actionTypes});
		params.push({name: 'period_start', value: jQuery.datepicker.formatDate(window.statsOptions.dbDateFormat, window.statsOptions.periodStart)});
		params.push({name: 'period_end', value: jQuery.datepicker.formatDate(window.statsOptions.dbDateFormat, endDate)});
		params.push({name: 'group_by_user_name', value: options.groupBy['group_by_user_name']});
		params.push({name: 'group_by_user_groups', value: options.groupBy['group_by_user_groups']});
		params.push({name: 'group_by_client_type', value: options.groupBy['group_by_client_type']});
		params.push({name: 'group_by_asset_domain', value: options.groupBy['group_by_asset_domain']});
		// empty data table
		if (dataTable) {
			dataTable.fnDestroy();
			$('#responseTable').empty();
		}
		// send request
		$.ajax({
			url: '${serverUrl}/services/queryStats',
			data: params,
			success: function(data, status) {
				if (typeof data.errorcode != 'undefined') {
					onError(data.message);
				} else {
					dataTable = $('#responseTable').dataTable( {
						bProcessing: false,
						aaData: data,
						aoColumns: columns,
						aaSorting: [[columns.length - 1, 'desc']],
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
					} );
					onSuccess();
				}
			},
			error: function(jqXHR, status, errorThrown) {
				onError(errorThrown);
			}
		});
	}

	function _load(options, _displayChart) {
		var params = [];

		//add one day, to include end period data
		var endDate = window.statsOptions.periodEnd; 
		endDate = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate() + 1);

		params.push({name: 'queryFile', value: '${pluginId}/sql/usageLogChart.sql'});
		params.push({name: 'num', value: '10000'});
		params.push({name: 'action_type', value: options.actionTypes});
		params.push({name: 'period_start', value: jQuery.datepicker.formatDate(window.statsOptions.dbDateFormat, window.statsOptions.periodStart)});
		params.push({name: 'period_end', value: jQuery.datepicker.formatDate(window.statsOptions.dbDateFormat, endDate)});
		params.push({name: 'group_by_user_name', value: options.category.index == 1});
		params.push({name: 'group_by_user_groups', value: options.category.index == 2});
		params.push({name: 'group_by_client_type', value: options.category.index == 3});
		params.push({name: 'group_by_asset_domain', value: options.category.index == 4});
		params.push({name: 'periodicity', value: options.periodicity});
		params.push({name: 'gs_periodicity', value: '1 ' + options.periodicity});
		
		var tickFormat;
		if (options.periodicity == 'month') {
			tickFormat = "MM";
		} else {
			tickFormat = "M d";
		}
		
		// send request
		$.ajax({
			url: '${serverUrl}/services/queryStats',
			data: params,
			success: function(data, status) {
				if (typeof data.errorcode != 'undefined') {
					options.onError(data.message);
				} else {
					if (data.length > 0) {
						var chart = [];
						var serieNames = [];
						var series = {};
						// enumerate series
						for (var i = 0; i < data.length; i++) {	
							var name = (options.category.index > 0) ? data[i][options.category.name] : 'total';
							if (name == undefined || name == '') {
								// need some name for serie
								name = 'unknown';
							}
							if (series[name] == undefined) {
								series[name] = [];	
							}
						}
						
						var ticks = [];
						var index = 0;
						var prev = data[0]['action_date_rs'];
						for (var i = 0; i < data.length; i++) {
							var date = data[i]['action_date_rs'];
							var count = data[i]['download_count'];
							var name = (options.category.index > 0) ? data[i][options.category.name] : 'total';
							if (name == undefined || name == '') {
								// need some name for serie
								name = 'unknown';
							}
							if (count == undefined || count == '') {
								count = 0;
							}
							if (prev != date) {
								// fill missed points
								for (var serie in series) {
									if (series[serie][index] == undefined) {
										series[serie][index] = 0;
									}
								}
								index++;
							}
							prev = date;
							
							ticks[index] = jQuery.datepicker.formatDate(tickFormat, new Date(date));
							series[name][index] = count;
						}
						// fill missed points						
						for (var serie in series) {
							if (series[serie][index] == undefined) {
								series[serie][index] = 0;
							} 
						}
						
						// decrease label amount for big period
						var xstep = Math.ceil(ticks.length / (options.periodicity == 'month' ? 28 : 40));
						for (var i = 0; i < ticks.length; i++) {
							if (i % xstep != 0) ticks[i] = '';
						}
						
						// get serie names
						for (var serie in series) {
							serieNames.push({label: serie});
						}
						// remove empty serie 'unknown' if necessary
						if (options.category.index > 0 && serieNames.length > 1) {
							delete series['unknown'];
							serieNames = [];
							for (var serie in series) {
								serieNames.push({label: serie});
							}
						}
						// put serie to chart
						for (var serie in series) {
							chart.push(series[serie]);
						}
						// don't display legend if only one in list
						if (serieNames.length < 2) {
							serieNames = [];
						}						
						_displayChart(chart, ticks, serieNames);
					} else {
						// display empty chart
						_displayChart([[null]], [], []);
					}	
				}
			},
			error: function(jqXHR, status, errorThrown) {
				options.onError(errorThrown);
			}
		});	
	};
	
})(jQuery);  
