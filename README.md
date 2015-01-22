AjaxTable.js
============

This is a jQuery plugin to render table using remote data via ajax request. Most of the works are done via data attributes tag.

Usage
-----

Just provide the html table header with column name attribute `data-col` (with other optional attributes) as a template, then call `ajaxTable` inside your javascript tag for the specific selector.

html
```html
<table class="ajaxtable">
<thead>
    <th data-col="_row_number">&nbsp;</th>
    <th data-col="emp_code">Code</th>
    <th data-col="emp_name">Name</th>
    <th data-col="emp_dept">Department</th>
</thead>
</table>
```


javascript  
```js
$('table.ajaxtable').ajaxTable({
    url: 'url_to_request_table_data',
    showFooter: true/(false),
    showSettingsButton: true/(false)
});
```

Or you can specify the url to the API inside the `<table>` tag like so,

```html
<table class="ajaxtable" data-url="http://api.example.com/report" data-key"items">
...
</table>

<script>
    $('table.ajaxtable').ajaxTable();
</script>
```


Data Structure
--------------
The data return from the server API should be in the following JSON format:

```
{
    data: [
        {..record1..},
        {..record2..}
    ],
    meta: {
        pagination: {
            count:          xx,     // number of records returned for this page
            current_page:   x,      // current page
            per_page:       xx,     // number of records per page
            total:          xx,     // total number of records
            total_pages:    xx,     // total calculated pages
        }
    }
}
```

The `data` key is the key name pointed to the data records from the returned JSON. This can be overridden by specifying the options `key`, or specify in the `data-key` attribute in the target table.

The `meta` key is the key name pointed to metadata info of the data records from the returned JSON. The can also be overridden by specifying the options `meta`, or specify in the `data-meta` attribute in the target table.


Options
-------
- `url` | `data-url` -- the api url to request for the table data.
- `key` | `data-key` -- key name of the data in the JSON returned from the url request
- `meta`

- `showFooter` : __false__ | true

- `showSettingsButton` : __false__ | true
- `pagination` : __false__ | true | 'element'
- `paginationFunction` : __null__ | function
- `paginationInfo` : __true__ | false | 'element'
- `page_size` : 10 -- default per page size
- `refreshButton` : __null__ | <element> to be used as Refresh button

Callbacks
---------
- `process_XXXX`
- `get_row_attributes`
- `appends_url`

Events
------
- `loading` -- occurs just before requesting the data from the given api url.
- `loaded` -- occurs after the requested data has been successfully retrieved and before the processing events.
- `error` -- occurs when the data could not be retrieved from the given api url.
- `before_row` -- occurs just before the processing of each data row. The current row of data is passing as an argument.
- `after_row` -- occurs just after every columns has been processed.
- `finished` -- occurs after the data has been completely rendered.

Special Columns
--------------

- `_row_number`



Column Processing
-----------------
```js
$('table.ajaxtable').ajaxTable({
    process_emp_dept: function(col, value) {
        return '<strong>'+value+'</strong>';
    }
});
```

Optional Attributes
--------------

- `data-align` : __left__ | center | right
- `data-format` : *see format options*
- `data-sortable` : [asc | desc]
- `data-sortkey` : *see below* 
- `data-summary` : sum | count | avg
- `visible` : __true__ | false

Sortable Options
----------------

> NOTE: In order to use this option, your remote API must also support sortable option. 
> The sorting is never done on the client side.

You can specify any column is sortable by specifying `data-sortable` attribute on the table column header `th` element like so,

```html
<table class="ajaxtable">
<thead>
    <th data-col="_row_number">&nbsp;</th>
    <th data-col="emp_code" data-sortable="asc">Code</th>
    <th data-col="emp_name" data-sortable>Name</th>
    <th data-col="emp_dept" data-sortable>Department</th>
</thead>
</table>
```

When the user clicks on that sortable column header, a request with sort option will be sent to the remote API. **It is expected that the remote API will return that data records with the given sort order.**

Sort optoin will be appended to the URL of the API like so,

```javascript
url = 'api.example.com?sort=-emp_code';
```

Please note the `-` sign in front of `emp_code`, this denotes that "descending sort order" of the `emp_code`. 

Default sort option can be specify as the value of `data-sortable` attribute in the HTML or it can be specify in the `sort` option in the JavaScript.

```javascript
$('table.ajaxtable').ajaxTable({ sort: -emp_code });
```

Sort Key Option
---------------
By default when sending sort option to the remote API, the column name specified in `data-col`
is used. But in case the sort key is different, you can manually specify it in the `data-sortkey`
option.

```html
<table class="ajaxtable">
<thead>
    <th data-col="_row_number">&nbsp;</th>
    <th data-col="emp_code" data-sortable="asc" data-sortkey="staff.code">Code</th>
    <th data-col="emp_name" data-sortable>Name</th>
    <th data-col="emp_dept" data-sortable data-sortkey="department">Department</th>
</thead>
</table>
```

Format Options
--------------
- `money`
- `number`
- `date`
- `time`
- `hours`
- `datetime`, `timestamp`
- default as template: `{value}`

Custom Column Format
-------------
You can define custom format for a given column as a javascript callback function by defining the option name as `format_<column_name>` and declare it as a function with two arguments. Both arguments will be passed to your custom function, the first one being the current column properties and the second one is the value of the current column of the current row.

```js
$('table.ajavtable').ajaxTable({
    format_emp_dept: function(col, value) {
        return '<strong>'+value+'</strong>';
    }
});
```

where `col` is the column properties, and `value` is the data value of the current row of the given column. Do some fancy thiings with it!

Calculated Column Example
-----
A calculated column is a column that does not exist in your data requested from the given url, but an additional column whose value is derived (calculated) from other existing columns.

This example shows how you can define, calculate, and display the calculated column in `ajaxtable.js`.

define calculated column in the html table as another column.

```html
...  
<tr data-col="total" data-format="money">Total</tr>
...  
```

define the custom column processing callback function in `ajaxTable()` option.

```js
$('table.ajaxtable').ajaxTable({
    ...
    process_total: function(col, data) {
        // calculate the value and store it in the row's data
        // object for later use.
        data.total = data.emp_wage * data.work_days;
        return data.total;
    }
});
```

additionally, you can easily calculate the grand total, like so.

```js
    var grand_total = 0;
    $('table.ajaxtable').on('after_row', function(event, data) {
        grand_total += data.total;
    });

    $('table.ajaxtable').on('finished', function() {
        console.log('Grand Total = ' + grand_total);
    });
```

Creating Buttons Column
----
You can use the custom column feature to create Buttons column as in the following example.
Please note that Twitter's `Bootstrap` and `FontAwesome` is used to display the button icons.

```html
...
<tr data-col="actions">&nbsp;</tr>
...
```

```js
$('table.ajaxtable').ajaxTable({
    ...
    process_actions: function(column, data) {
        var url = '/'+data.id;
        var btns = '<a href="'+url+'/edit'+'" class="btn btn-xs btn-icon btn-circle btn-warning">';
        btns += '<i class="fa fa-pencil"></i></a> ';
        btns += '<a class="btn btn-xs btn-danger btn-icon btn-circle"><i class="fa fa-close"></i></a>';
        return btns;
    }
});
```
