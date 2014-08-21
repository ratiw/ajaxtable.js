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

            init($this);

            // setting buttons
			$this.wrap('<div class="ajaxtable-wrapper"></div>');
			if ($this.options.showSettingsButton) {
				attachSettingButton($this);
			}

            load($this);

		});
	};

	$.fn.ajaxTable.defaults = {
		url : null,         // URL of the remote data request
        key : 'data',       // name of the data element in JSON data returned from the given URL
        meta: 'meta',       // name of the meta element in JSON data returned from the given URL
        search: null,
        filter: null,
        sort: null,
		showFooter : false,
		showSettingsButton : false,
		pagination : false, // pagination element to be used or false to disable pagination
        paginationFunction: null,   // custom pagination function
		page_size : 20
	};

    function init($this) {
        $this.columns = parseColumns($this);
        //console.log('columns: ', $this.columns);

        if (! $this.options.url) {
            $this.options.url = $this.data('url');
        }

        if (! $this.options.key) {
            $this.options.key = $this.data('key');
        }

        if (! $this.options.meta) {
            $this.options.meta = $this.data('meta');
        }

        $this.tfoot = $this.find('tfoot');
        if ($this.tfoot.length === 0) {
            $this.tfoot = $('<tfoot></tfoot>');
            $this.append($this.tfoot);
        }

        $this.tbody = $this.find('tbody');
        if ($this.tbody.length === 0) {
            $this.tbody = $('<tbody></tbody>');
            $this.append($this.tbody);
        }
    }

    function parseColumns($table) {
		var columns = [];

		$.each($table.find('thead th'), function(idx, th) {
			var $th = $(th);
            var col_name = $th.data('col');
			var col_visible = ($th.attr('visible') == 'false') ? false : true;
            var col_align = $th.data('align');

			columns.push({
                name: col_name,
                label: $th.text(),
                align: col_align,
                format: $th.data('format'),
                sort: $th.data('sort'),
                summary: initSummary($th.data('summary')),
                visible: col_visible,
                process_method: getCustomFunction($table.options['process_' + col_name]),
                format_method: getCustomFunction($table.options['format_' + col_name])
			});

            if (col_align) {
                $th.css('text-align', col_align);
            }
		});

		return columns;
	}

    function getCustomFunction(method) {
        return (method && typeof method === 'function') ? method : null;
    }

	function initSummary(func) {
		if (func === undefined) return func;

		return {
			'function': func,
			'sum': 0,
			'count': 0
		};
	}

    function load($this, page) {
        var api_url = (page) ? ($this.options.url+'?page='+page) : $this.options.url;

        // trigger loading data from api
        $this.trigger('loading');

        $.getJSON(api_url, function(results) {
            // trigger data loaded event, start processing
            $this.trigger('loaded');

            clearRows($this);

            var out = renderRow($this, results);
            //var out = renderRow($this, object_get(results, $this.options.key));
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

            // pagination
            if ($this.options.pagination) {
                renderPagination($this, object_get(results, $this.options.meta));
                bindEvents($this);
            }

            // trigger finish event
            $this.trigger('finished');

        }).fail(function(results) {
            // trigger error event when loading from api failed
            $this.trigger('error');

            var out = '<tr><td colspan="'+$this.columns.length+'">'+results.responseText+'</td></tr>';
            $this.find('tbody').html(out);
        });
    }

    function bindEvents($this) {
        if ($this.options.pagination) {
            $($this.options.pagination+' .pagination').on('click', 'a', function(e) {
                var page = $(e.target).attr('href');
                load($this, page.replace('#',''));
                e.preventDefault();
            });
        }
    }

    function clearRows($this) {
        $this.tbody.empty();
    }

    function renderRow($table, results) {
		var out = '';

        var data = object_get(results, $table.options.key);
        var meta = object_get(results, $table.options.meta);

		$.each(data, function(key, rowData) {

			// trigger processing event for each row of data,
			// passing the row data to the event listeners
			$table.trigger('before_row', rowData);

			out += '<tr>';
			$.each($table.columns, function(idx, col) {
				//out += (col.name == '_row_number') ? '<td class="align-right">'+(key+1)+'</td>' : renderColumn($table, col, rowData);
				out += (col.name == '_row_number')
                    ? renderRowNo(meta.pagination, key+1)
                    : renderColumn($table, col, rowData);
			});
			out += '</tr>\n';

			$table.trigger('after_row', this);
		});

		return out;
	}

    function renderRowNo(pagination, row) {
        var rowNo = (pagination.current_page - 1) * pagination.per_page + row;
        return '<td class="align-right">' + rowNo + '</td>';
    }

	function renderColumn($table, col, rowData) {
        var value = col.process_method ? col.process_method(col, rowData) : rowData[col.name];

		if (col.summary) {
			col.summary.sum += parseFloat(value);
			col.summary.count += 1;
		}

        ;value = col.format_method ? col.format_method(col, rowData) : formatValue(col.format, value);

		var cls = (typeof col.align === 'undefined') ? '' : ' class="align-'+col.align+'"';

		return '<td'+cls+'>'+value+'</td>';
	}

	function renderFooter($table) {
		var out = '<tr>';
		$.each($table.columns, function(idx, col) {
			var cls = (typeof col.align === 'undefined') ? '' : ' class="align-'+col.align+'"';
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
		}
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

    function renderPagination($this, meta) {
        var customPagination = getCustomFunction($this.options.paginationFunction);
        var pagination = (customPagination === null)
            ? showDefaultPagination(meta)
            : customPagination(meta);

        if ($this.options.pagination === true || $($this.options.pagination).length === 0) {
            console.log('Pagination element ("'+ $this.options.pagination+'") not found. Please specify a correct pagination element.');
        } else {
            $($this.options.pagination).html(pagination);
        }
    }

    function showDefaultPagination(meta) {
        var out = '';

        // Previous
        out += getPrevious(meta, page);

        for (var page = 1; page <= meta.pagination.total_pages; page++) {
            if (page == meta.pagination.current_page) {
                out += getDisabledTextWrapper(page);
            } else {
                out += getPageLinkWrapper(makeLink(meta, page), page);
            }
        }
        // Next
        out += getNext(meta);

        return '<ul class="pagination">' + out + '</ul>';
    }

    function makeLink(meta, page) {
        var param = [];

        param['q'] = (meta.search == '') ? '' : 'q='+meta.search;
        param['filter'] = (meta.filter == '') ? '' : 'filter='+meta.filter;
        param['sort'] = (meta.sort == '') ? '' : 'sort='+meta.sort;
        param['page'] = page;

        //return meta.base_url + '?' + makeAttributes(param, '=', '&');
        return '#'+page;
    }

    function makeAttributes(arr, connector, separator) {
        var out = '';

        if (!connector) connector = '=';
        if (!separator) separator = ' ';

        for (var k in arr) {
            out += (out === '') ? '' : separator;
            out += k + connector + arr[k];
        }
        return out;
    }

    function getPageLinkWrapper(url, page, rel) {
        rel = (!rel) ? '' : ' rel="'+rel+'"';

        return '<li><a href="' + url + '"' + rel + '>' + page + '</a></li>';
        // template: '<li><a href="{url}"{rel}>{page}</a></li>';
    }

    function getDisabledTextWrapper(text) {
        return '<li class="disabled"><span>' + text + '</span></li>';
    }

    function getActivePageWarpper(text) {
        return '<li class="active"><span>' + text + '</span></li>';
    }

    function getPrevious(meta) {
        var page = meta.pagination.current_page;
        if (page == 1) {
            return getDisabledTextWrapper('&laquo;')
        } else {
            return getPageLinkWrapper(makeLink(meta, page-1), '&laquo;');
        }

    }

    function getNext(meta) {
        var page = meta.pagination.current_page;
        if (page == meta.pagination.total_pages) {
            return getDisabledTextWrapper('&raquo;');
        } else {
            return getPageLinkWrapper(makeLink(meta, page+1), '&raquo;');
        }
    }

    function object_get(obj, key) {
        if (!key || $.trim(key) == '') return obj;
        $.each(key.split('.'), function(idx, seg) {
            if (typeof obj !== 'object' || obj[seg] === undefined) {
                obj = undefined;
                return obj;
            }
            obj = obj[seg];
        });
        return obj;
    }
})(jQuery);
/*
 * TODO:
 *  - Filters
 *  - Sort order
 *  - Paging via query string, also use it to display proper row number
 *  - The API should also send summary value (sum, count, avg) together
 *    with the data.
 *  - CRUD with form and additional API for them? -- will it add more complexity?
 *  - Column grouping?
 *  - Title and sub-title options
 *  - Table width 100% will not accommodate table with many columns (20+)
 *
 *  DONE:
 *  22/08/56
 *  - Options to select visible columns
 *  01/09/56
 *  - Column summary option: sum, count, avg
 *  04/09/56
 *  - Column visibility during initialization (parseColumn)
 *  20/08/57
 *  - Paging with custom pagination (can point to the existing div).
 *  21/08/57
 *  - Pagination event binding
 */
