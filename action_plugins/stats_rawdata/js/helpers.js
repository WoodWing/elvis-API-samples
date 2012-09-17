function fieldToString(name, obj) {
	if (typeof obj == 'undefined') return '';

	if (isTimestamp(name)) {
		var tp = parseInt(obj);
		// TODO check why SSS pattern return noting
		return isNaN(tp) ? '' : $.format.date(new Date(tp), 'yyyy/MM/dd HH:mm:ss');
	}
	return obj; // convert object to string?
}

function isTimestamp(name) {
	return name == 'log_date' ||
		name == 'assetModified' ||
		name == 'assetCreated' ||
		name == 'assetFileModified' ||
		name == 'fileCreated';
}