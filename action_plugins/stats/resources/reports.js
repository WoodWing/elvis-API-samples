
var dataTable = null;

function updateTable(parameters, tableElementId, onSuccess, onError) {
	// setup columns
	var columns = [];
	if (groupBy['group_by_user_name']) columns.push({mDataProp: 'user_name_rs', sTitle: 'User name', sWidth: '100px', sDefaultContent: ''});
	if (groupBy['group_by_user_groups']) columns.push({mDataProp: 'user_groups_rs', sTitle: 'User groups', sWidth: '100px', sDefaultContent: ''});
	if (groupBy['group_by_client_type']) columns.push({mDataProp: 'client_type_rs', sTitle: 'Client type', sWidth: '100px', sDefaultContent: ''});
	if (groupBy['group_by_asset_type']) columns.push({mDataProp: 'asset_type_rs', sTitle: 'Asset type', sWidth: '100px', sDefaultContent: ''});
	columns.push({mDataProp: 'count_rs', sTitle: 'Count', sWidth: '100px'});
	// gether parameters
	var params = [];
	params.push({name: 'queryFile', value: '${pluginId}/sql/usageLog.sql'});
	params.push({name: 'num', value: '10000'});
	params.push({name: 'action_type', value: actionTypes});
	params.push({name: 'period_start', value: jQuery.datepicker.formatDate(dbDateFormat, periodStart)});
	params.push({name: 'period_end', value: jQuery.datepicker.formatDate(dbDateFormat, periodEnd)});
	params.push({name: 'group_by_user_name', value: groupBy['group_by_user_name']});
	params.push({name: 'group_by_user_groups', value: groupBy['group_by_user_groups']});
	params.push({name: 'group_by_client_type', value: groupBy['group_by_client_type']});
	params.push({name: 'group_by_asset_type', value: groupBy['group_by_asset_type']});
	// empty data table
	if (dataTable) {
		dataTable.fnDestroy();
		$(tableElementId).empty();
	}
	// send request
	$.ajax({
		url: '${serverUrl}/services/queryStats',
		data: params,
		success: function(d, status) {
			if (typeof d.errorcode != 'undefined') {
				if (onError) {
					onError(d.message);
				}
			} else {
				data = d;
				dataTable = $('#responseTable').dataTable( {
					bProcessing: false,
					aaData: data,
					aoColumns: columns,
					aaSorting: [[columns.length - 1, 'desc']],
					bAutoWidth: false,
					bDestroy: true,
					bScrollInfinite: true,
					bScrollCollapse: true,
					sScrollY: '250px',
					bDeferRender: false,
					bPaginate: false,
					bInfo: true,
					bJQueryUI: true,
					fnInfoCallback: function( oSettings, iStart, iEnd, iMax, iTotal, sPre ) {
						return iTotal + ' items';
					}
				} );
				if (onSuccess) {
					onSuccess();
				}
			}
		},
		error: function(jqXHR, status, errorThrown) {
			if (onError) {
				onError(d.message);
			}
		}
	});
}
