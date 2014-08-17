AjaxTable.js
============

This is a jQuery plugin to render table using remote data via ajax request.

Usage
-----

Just provide the html table header with column name attribute `col` (with other optional attributes) as a template, then call `ajaxTable` inside your javascript tag for the specific selector.

html
```html
<table class="report">
<thead>
    <th data-col="_row_number">&nbsp;</th>
    <th data-col="emp_code">Code</th>
    <th data-col="emp_name">Name</th>
    <th data-col="emp_dept">Department</th>
</thead>
<tbody></tbody>
</table>
```


javascript  
```js
$('table.report').ajaxTable({
    url: 'url_to_request_table_data',
    showFooter: true/(false),
    showSettingsButton: true/(false)
});
```

Or you can specify the url to the API inside the `<table>` tag like so,

```html
<table class="report" data-url="http://api.example.com/report" data-key"items">
...
</table>

<script>
    $('table.report').ajaxTable();
</script>
```


Options
-------
- `url` | `data-url` -- the api url to request for the table data.

- `showFooter`

- `showSettingsButton`


Events
------
- `loading` -- occurs just before requesting the data from the given api url.
- `loaded` -- occurs after the requested data has been successfully retrieved and before the `processing` event.
- `error` -- occurs when the data could not be retrieved from the given api url.
- `before_row` -- occurs just before the processing of each data row. The current row of data is passing as an argument.
- `after_row` -- occurs just after every columns has been processed.
- `finished` -- occurs after the data has been completely rendered.

Special Columns
--------------

- `_row_number`
- `_checkbox`


Column Processing
-----------------
```js
$('table.report').ajaxTable({
    process_emp_dept: function(col, value) {
        return '<strong>'+value+'</strong>';
    }
});
```

Optional Attributes
--------------

- `data-align` : __left__ | center | right
- `data-format` : *see format options*
- `data-summary` : sum | count | avg
- `visible` : __true__ | false

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
$('table.report').ajaxTable({
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
<tr col="total" data-format="money">Total</tr>
...  
```

define the custom column processing callback function in `ajaxTable()` option.

```js
$('table.report').ajaxTable({
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
    $('table.report').on('after_row', function(event, data) {
        grand_total += data.total;
    });

    $('table.report').on('finished', function() {
        console.log('Grand Total = ' + grand_total);
    });
```

