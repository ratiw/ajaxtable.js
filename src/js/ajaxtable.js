/*
// required:
//	 - date.js -- for date functions
//   - accounting.js -- for number format functions
//
// $('table.report').ajaxTable({
// 	api: '...',
//  showFooter: true/(false),
//  showSettingsButton: true/(false)
//  pagination: true/(false)
//  page_size: 20
// });
//
// events:
//    - loading
//	  - loaded
//    - before_row
//	  - after_row
//    - finished
//	  - error
*/

;(function( $ )
{
	$.fn.ajaxTable = function(options) {

		return this.each(function() {

			var $this = $(this);	// this table

			$this.options = $.extend({}, $.fn.ajaxTable.defaults, options);

			$this.columns = parseColumns($this);
			console.log('columns: ', $this.columns);

			if (! $this.options.url) {
				$this.options.url = $this.data('url');
			}

            if (! $this.options.key) {
                $this.options.key = $this.data('key');
            }

            $this.tbody = $this.find('tbody');
            if ($this.tbody.length === 0) {
                $this.tbody = $('<tbody></tbody>');
                $this.append($this.tbody);
            }

			$this.wrap('<div class="ajaxtable-wrapper"></div>');
			if ($this.options.showSettingsButton) {
				attachSettingButton($this);
			}

			var out = '';
			var api_url = $this.options.url;
			if ($this.options.pagination) {

			}

			// trigger loading data from api
			$this.trigger('loading');

			$.getJSON(api_url, function(results) {
				// trigger data loaded event, start processing
				$this.trigger('loaded');

				//out = renderRow($this, results.items);
				out = renderRow($this, results[$this.options.key]);
                $this.tbody.html(out);

				if ($this.options.showFooter) {
					$this.tfoot = $this.find('tfoot');
					if ($this.tfoot.length === 0 ) {
						$this.tfoot = $('<tfoot>&nbsp;</tfoot>');
					}

					out = renderFooter($this);
					$this.tfoot.html(out);
				}

				// hide columns that should not be visible
				$.each($this.columns, function(idx, col) {
					if ( ! col.visible) {
						toggleColumn($this, idx+1);
					}
				});

				// trigger finish event
				$this.trigger('finished');

			}).fail(function(results) {
				// trigger error event when loading from api failed
				$this.trigger('error');

				out = '<tr><td colspan="'+$this.columns.length+'">'+results.responseText+'</td></tr>';
				$this.find('tbody').html(out);
			});
		});
	};

	$.fn.ajaxTable.defaults = {
		url : null,
        key : null,
		showFooter : false,
		showSettingsButton : false,
		pagination : false,
		page_size : 20
	};

	$.fn.ajaxTable.load = function(page) {

	}

	function parseColumns($table) {
		var columns = [];

		$.each($table.find('thead th'), function(idx, th) {
			var $th = $(th);
			var col_visible = ($th.attr('visible') == 'false') ? false : true;
            var col_align = $th.data('align');

			columns.push({
                name: $th.data('col'),
                label: $th.text(),
                align: col_align,
                format: $th.data('format'),
                sort: $th.data('sort'),
                summary: initSummary($th.data('summary')),
                visible: col_visible
			});

            if (col_align) {
                $th.css('text-align', col_align);
            }
		});

		return columns;
	}

	function initSummary(func) {
		if (func === undefined) return func;

		var obj = {
			'function': func,
			'sum': 0,
			'count': 0
		};

		return obj;
	}

	function renderRow($table, results) {
		var out = '';

		$.each(results, function(key, rowData) {

			// trigger processing event for each row of data,
			// passing the row data to the event listeners
			$table.trigger('before_row', rowData);

			out += '<tr>';
			$.each($table.columns, function(idx, col) {
				out += (col.name == '_row_number') ? '<td class="align-right">'+(key+1)+'</td>' : renderColumn($table, col, rowData);
			});
			out += '</tr>\n';

			$table.trigger('after_row', this);
		});

		return out;
	}

	function renderColumn($table, col, rowData) {
		var value = cls = '';

		var process_method = $table.options['process_' + col.name];
		value = (process_method && typeof process_method === 'function') ? process_method(col, rowData) : rowData[col.name];

		if (col.summary) {
			col.summary.sum += parseFloat(value);
			col.summary.count += 1;
		}

		var format_method = $table.options['format_' + col.name];
		value = (format_method && typeof format_method === 'function') ? format_method(col, value) : formatValue(col.format, value);

		cls = (typeof col.align === 'undefined') ? '' : ' class="align-'+col.align+'"';

		return '<td'+cls+'>'+value+'</td>';
	}

	function renderFooter($table) {
		var out = cls = '';

		out = '<tr>';
		$.each($table.columns, function(idx, col) {
			cls = (typeof col.align === 'undefined') ? '' : ' class="align-'+col.align+'"';
			out += '<td'+cls+'>' + (col.summary ? getSummaryValue(col.summary, col.format) : '&nbsp;') + '</td>';
		});
		out += '</tr>';

		return out;
	}

	function getSummaryValue(sum_col, format) {
		var value = '';
		switch (sum_col.function) {
			case 'sum':
				value = sum_col.sum;
				break;
			case 'count':
				value = sum_col.count;
				break;
			case 'avg':
				value = sum_col.sum / sum_col.count;
				break;
			default:
				return '';
		}
		return formatValue(format, value);
	}

	function formatValue(format, value) {
		var fmt = (format) ? format.split(':') : [undefined];
		switch (fmt[0]) {
			case 'money':
			case 'number':
				value = accounting.formatNumber(value, 2);
				break;
			case 'date':
				break;
			case 'time':
				value = Date.parse(value).toString('HH:mm');
				break;
			case 'hours':
				if (value == '00:00' || value == '00:00:00') {
					value = '';
				} else {
					var hr = value.split(':');
					value = hr[0]+':'+hr[1];
				}
				break;
			case 'datetime':
			case 'timestamp':
				break;
			default: 	// template with {value} in it
				if (fmt[0] && fmt[0] !== '') {
					value = fmt[0].replace('{value}', value);
				}
		}

		return value;
	}

	function attachSettingButton($table) {
		var btn = '<div class="ajaxtable-settings pull-right">';
		// btn += '<button type="button" class="btn btn-mini" data-toggle="button">';
		btn += 	'<div class="dropdown">';
		btn += 		'<a class="dropdown-toggle" data-toggle="dropdown" href="#"><i class="icon-th-list"></i> Settings</a>';
		btn += 		'<ul class="dropdown-menu pull-right" role="menu" aria-labelledby="dLabel">';
		for (var i = 0; i < $table.columns.length; i++) {
			if ($.trim($table.columns[i].label) == '') continue;
			btn += '<li><label class="checkbox">';
			btn += '<input type="checkbox" name="toggle-column-'+$table.columns[i].name+'" ';
			btn += 'class="toggle-column" col-id="'+i+'"'+($table.columns[i].visible ? ' checked' : '')+'>';
			btn += $table.columns[i].label;
			btn += '</label></li>';
		};
		btn += 		'</ul>';
		btn += 	'</div>';
		btn += '</div>';

		$table.before(btn);

		$('div.ajaxtable-settings input.toggle-column').on('click', function(e) {
			var nth = parseInt($(this).attr('col-id')) + 1;
			toggleColumn($table, nth);
		});
	}

	function toggleColumn($table, nth) {
		$table.find('th:nth-child('+(nth)+')').toggle('fast', 'linear');
		$table.find('td:nth-child('+(nth)+')').toggle('fast', 'linear');
	}

})(jQuery);
/*
 * TODO:
 *  - The API should also send summary value (sum, count, avg) together
 *    with the data.
 *  - Paging with custom pagination (can point to the existing div).
 *  - Paging via query string, also use it to display proper row number
 *  - Summary row in <tfoot>
 *  - CRUD with form and additional API for them? -- will it add more complexity?
 *  - Column grouping?
 *  - Title and sub-title options
 *  - Table width 100% will not accommodate table with many columns (20+)
 *  - Filters
 *  - Sort order
 *
 *  DONE:
 *  22/08/56
 *  - Options to select visible columns
 *  01/09/56
 *  - Column summary option: sum, count, avg
 *  04/09/56
 *  - Column visibility during initialization (parseColumn)
 */
