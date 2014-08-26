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
            $this.templates = $.extend($.fn.ajaxTable.templates);

            init($this);

            // setting buttons
			$this.wrap('<div class="ajaxtable-wrapper"></div>');
			if ($this.options.showSettingsButton) {
				attachSettingButton($this);
			}

            bindEvents($this);

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
		pagination : false,         // pagination element to be used or false to disable pagination
        paginationFunction: null,   // custom pagination function
        paginationInfo: true,       // pagination info element to be used or false to disable it
		page_size : 10
	};

    $.fn.ajaxTable.templates = {
        'table' : {
            'row_number' : '<td class="align-right">{row_no}</td>',
            'column' : '<td{class}>{value}</td>',
        },
        'setting_button' : {
            'label' : 'Show / hide columns'
        },
        'pagination' : {},
        'pagination_info' : 'Showing <b>{start}</b> to <b>{end}</b> of <b>{total}</b> entries'
    };

    function init($this) {
        $this.columns = parseColumns($this);
        console.log('columns: ', $this.columns);

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

        if ($this.options.sort) {
            updateSortableIcon($this);
        }
    }

    function parseColumns($table) {
		var columns = [];

		$.each($table.find('thead th'), function(idx, th) {
			var $th = $(th);
            var col_name = $th.data('col');
			var col_visible = ($th.attr('visible') == 'false') ? false : true;
            var col_align = $th.data('align');
            var col_sort = $th.data('sortable');

			columns.push({
                name: col_name,
                label: $th.text(),
                align: col_align,
                format: $th.data('format'),
                sort: col_sort,
                summary: initSummary($th.data('summary')),
                visible: col_visible,
                process_method: getCustomFunction($table.options['process_' + col_name]),
                format_method: getCustomFunction($table.options['format_' + col_name])
			});

            if (col_align) {
                $th.css('text-align', col_align);
            }

            if (col_sort || col_sort == '') {
                $th.html('<a href="#">'+$th.text()+'</a>');
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
        //var api_url = (page) ? ($this.options.url+'?page='+page) : $this.options.url;
        var api_url = makeApiUrl($this, page);

        // trigger loading data from api
        $this.trigger('loading');

        $.getJSON(api_url, function(results) {
            var meta = object_get(results, $this.options.meta);

            // trigger data loaded event, start processing
            $this.trigger('loaded');

            clearRows($this);

            var out = renderRow($this, results);
            //var out = renderRow($this, object_get(results, $this.options.key));
            $this.tbody.html(out);

            if ($this.options.showFooter) {
                $this.tfoot.html(renderFooter($this));
            }

            // hide columns that should not be visible
            hideInvisibleColumns($this);

            // pagination
            if ($this.options.pagination) {
                renderPagination($this, meta);
            }
            // pagination info
            if ($this.options.paginationInfo) {
                renderPaginationInfo($this, meta);
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

    function makeApiUrl($this, page)
    {
        var parameters = '';

        // sort
        parameters += $this.options.sort ? 'sort='+$this.options.sort : '';

        // filter
        parameters += $this.options.filter ? '&filter='+$this.options.filter : '';

        // search
        parameters += $this.options.search ? '&q='+$this.options.search : '';

        // per page
        parameters += $this.options.page_size ? '&per_page='+$this.options.page_size : '';

        // page
        parameters += (page) ? '&page='+page : '';

        return $this.options.url + '?' + parameters;
    }

    function bindEvents($this) {

        $this.find('th[data-sortable] a').on('click', function(e) {
            e.preventDefault();
            var $th = $(e.target).parent();

            // get current sort order
            var dir = $th.attr('data-sortable');
            // reverse the sort order
            dir = (dir === 'asc') ? 'desc' : 'asc';

            $this.options.sort = ((dir === 'desc') ? '-' : '') + $th.data('col');
            updateSortableIcon($this);
            load($this);
        });
    }

    function updateSortableIcon($this) {
        var sort = $this.options.sort;
        var dir = (sort[0] === '-') ? 'desc' : 'asc';
        var col = sort.replace('-', '');
        // remove direction value from all other th[data-sortable]
        $this.find('th').attr('data-sortable', '');
        // set it back to the th[data-sortable]
        $this.find('th[data-col='+col+']').attr('data-sortable', dir);
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
				out += (col.name == '_row_number')
                    ? renderRowNo($table, meta.pagination, key+1)
                    : renderColumn($table, col, rowData);
			});
			out += '</tr>\n';

			$table.trigger('after_row', this);
		});

		return out;
	}

    function renderRowNo($table, pagination, row) {
        var rowNo = (pagination.current_page - 1) * pagination.per_page + row;
        return $table.templates['table']['row_number'].replace('{row_no}', rowNo);
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
		btn += 	'<div class="dropdown">';
		btn += 		'<a class="dropdown-toggle" data-toggle="dropdown" href="#"><i class="icon-th-list"></i> '+$table.templates['setting_button']['label']+'</a>';
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

    function hideInvisibleColumns($this) {
        $.each($this.columns, function(idx, col) {
            if ( ! col.visible) {
                toggleColumn($this, idx+1);
            }
        });
    }

    function toggleColumn($table, nth) {
		$table.find('th:nth-child('+(nth)+')').toggle('fast', 'linear');
		$table.find('td:nth-child('+(nth)+')').toggle('fast', 'linear');
	}

    //
    // --- Pagination ---
    //
    function renderPagination($this, meta) {
        var customPagination = getCustomFunction($this.options.paginationFunction);
        var pagination = (customPagination === null)
            ? showDefaultPagination(meta)
            : customPagination(meta);

        if ($this.options.pagination === true || $($this.options.pagination).length === 0) {
            console.log('Pagination element ("'+ $this.options.pagination+'") not found. Please specify a correct pagination element.');
        } else {
            $($this.options.pagination).html(pagination);
            bindPaginationEvents($this);
        }
    }

    function renderPaginationInfo($this, meta) {
        if ($this.options.paginationInfo === false) return;

        var pg = meta.pagination;
        var start = (pg.current_page-1) * pg.per_page +1;
        var out = str_replace(
            ['{start}', '{end}', '{total}'],
            [start, start + pg.count -1, pg.total],
            $this.templates['pagination_info']
        );
        $($this.options.paginationInfo).html(out);
    }

    function bindPaginationEvents($this) {
        if ($this.options.pagination) {
            $($this.options.pagination+' .pagination').on('click', 'a', function(e) {
                var page = $(e.target).attr('href');
                load($this, page.replace('#',''));
                e.preventDefault();
            });
        }
    }

    // adapted from Laravel 4's Pagination features
    function showDefaultPagination(meta) {
        var out = '';
        var lastPage = meta.pagination.total_pages;

        if (lastPage < 13) {
            out = getPageRange(1, lastPage, meta);
        } else {
            out = getPageSlider(meta);
        }

        return '<ul class="pagination">' + getPrevious(meta) + out + getNext(meta) + '</ul>';
    }

    function getPageRange(start, end, meta) {
        var out = '';

        for (var page = start; page <= end; page++) {
            if (page == meta.pagination.current_page) {
                out += getActivePageWarpper(page);
            } else {
                out += getPageLinkWrapper(makeLink(meta, page), page);
            }
        }

        return out;
    }

    function getPageSlider(meta) {
        var window = 6;
        var currentPage = meta.pagination.current_page;
        var lastPage = meta.pagination.total_pages;
        var content = '';

        if (currentPage <= window) {
            var ending = getFinish(meta);
            return getPageRange(1, window + 2, meta) + ending;
        }
        else if (currentPage >= lastPage - window) {
            var start = lastPage - 8;
            content = getPageRange(start, lastPage, meta);
            return getStart(meta) + content;
        }
        else {
            content = getAdjacentRange(meta);
            return getStart(meta) + content + getFinish(meta);
        }
    }

    function getAdjacentRange(meta) {
        var currentPage = meta.pagination.current_page;

        return getPageRange(currentPage - 3, currentPage + 3, meta);
    }

    function getStart(meta) {
        return getPageRange(1, 2, meta) + getDots();
    }

    function getFinish(meta)
    {
        var lastPage = meta.pagination.total_pages;
        var content = getPageRange(lastPage - 1, lastPage, meta);

        return getDots() + content;
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

    function getDots() {
        return getDisabledTextWrapper("...");
    }

    function makeLink(meta, page) {
        var param = [];

        param['q']      = (meta.search == '') ? '' : 'q=' + meta.search;
        param['filter'] = (meta.filter == '') ? '' : 'filter=' + meta.filter;
        param['sort']   = (meta.sort == '') ? '' : 'sort=' + meta.sort;
        param['page']   = page;

        //return meta.base_url + '?' + makeAttributes(param, '=', '&');
        return '#'+page;
    }

    function getPageLinkWrapper(url, page, rel) {
        rel = (!rel) ? '' : ' rel="'+rel+'"';

        return '<li><a href="' + url + '">' + page + '</a></li>';
        // template: '<li><a href="{url}"{rel}>{page}</a></li>';
    }

    function getDisabledTextWrapper(text) {
        return '<li class="disabled"><span>' + text + '</span></li>';
    }

    function getActivePageWarpper(text) {
        return '<li class="active"><span>' + text + '</span></li>';
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

    function str_replace(search, replace, subject) {
        var result = subject;

        for (var i = 0; i < search.length; i++) {
            result = result.replace(search[i], replace[i]);
        }

        return result;
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
