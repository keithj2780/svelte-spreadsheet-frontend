<h3>Demo</h3>
[REPL](https://svelte.dev/repl/7d3cfaadb28c4f1e9324762c614ff440?version=3.55.1)

<h2>Svelte Standalone Table/Spreadsheet front end</h2>

<p>This is a spreadsheet front end written using [Svelte](https://svelte.dev). You need to implement any calculations yourself. You also need to supply a 2D array of cell values &amp; formats along with a config for rows &amp; columns info. The REPL has an example of all that.</p>

<p>Try dbl clicking (or hit Enter/F2)  on a cell to edit. Or select some with mouse or keyboard.</p>
<p>The buttons show how easy it is to format a cell or display something other than the raw cell value eg a currency.</p>

<h3>Features</h3>
<ul>
	<li>Cells are editable. F2 or = or Enter or just type alpha-numerics, or DblClick</li>
	<li>Cells each have their own format</li>
	<li>Each cell supports attributes for borders x 4, italics, bold, font-size, bg & fg colours. Other attributes can easily be added.</li>
	<li>Read Only cells supported</li>
	<li>Keyboard nav using Home,End, Arrows</li>
	<li>Ctrl+nav key moves to next full/empty cell boundary</li>
	<li>Select cells with mouse or shift+nav keys</li>
	<li>Tab/BackTab moves through selected cells</li>
	<li>Supports 3 cell data values... just like a spreadsheet.
		<ul>
			<li>cell.value is the raw content that the user enters</li>
			<li>cell.result is the result of any calc you may implement</li>
			<li>cell.display is what gets displayed. So setting cell.value will show nothing - you need to do a calc and populate cell.result/display or just copy cell.value to cell.display. Or make your own Formatter that takes cell.value/result and puts e.g. a currency/date string into cell.display
				</li>
				</ul>
			</li>
	<li>Row/Col select with mouse (+shift for multiple)</li>
	<li>Row/Col resize with mouse. (Can be disabled in config)</li>
	<li>^A selects all, so does click at top left</li>
	<li>Del deletes selected cells</li>
	<li>Rows/Cols can be added dynamically. data[ ] [ ] must be extended too!</li>
	<li>Copy/del/paste ^C ^X ^V using clipboard. (Some caveats apply!)</li>
	<li>Navigation scrolls the newly selected cell into view</li>
	<li>Edit of cell is highly visible</li>
	<li>Various user actions can be allowed/denied at the Table level. See <pre>allowedActions="EDIT RESIZE FORMAT DELETE COPY PASTE NAVIGATE"</pre></li>
	<li>Only 3 events that are dispatched are 
	<pre>
 onselchange(selectedCells) - when the user navigates somewhere
 startedit(selectedCells) - before the user edits a cell
 onendedit(selectedCells) - when the user changes a cells value
	</pre>
	Adding more for e.g. row/col resize would be straightforward</li>
	<li>Supports lots of row/cols with scrolling. Only limited by DOM and memory</li>
	<li>Compact data requirements. Config &amp; Data are easily JSONable.</li>
	<li>Multiple Tables can be in DOM at same time</li>
	<li>No dependencies - approx 1100 LOC inc styling</li>
</ul>
<h3>Usage</h3>
<p>Needs only 3 params - config, data (2D array) and a uid.</p>
<p>Two optional params - title (useful when displaying multiple Tables) and allowedActions (see above) - default is all allowed</p>
<p>defaultGridConfig is the default config. It contains row &amp; column initial configs sizings. It's self explanatory - see utils.js</p>
<p>data[ ][ ] is a 2D array of cell object. Each cell object looks like 
	<pre>
 let cell = {
    value:'', // raw string. Often what is entered by the user.
    display:'', // what is displayed often isn't the same as the value. E.G. formulas, 12=>$12.00, -12=>($12.00). It is the parents responsibility to populate this
    result:'', // the result of a formula or just the value as a string/number
    format:JSON.parse(JSON.stringify(defaultCellFormat)),
 };	
	</pre>
Each cell has its' own format. The format object looks like -
<pre>
 const defaultCellFormat = {
  "italics":  0,
  "bold":     0,
  "underline":0,
  "fontsize": 13,
  "align":    "left",
  "colour":   "#888",
  "background": "#fff",
  "border":   [false,false,false,false],  //	TLBR
  "readonly": false,
}
</pre>
Again, it's self explanatory, and straightforward to extend.

<h3>Notes</h3>
<p>In production uncomment the .focus() in onMount() of Table.svelte. It's highly irritating to keep having the focus ripped away when testing in the REPL.</p>

<h3>Licence</h3>
MIT