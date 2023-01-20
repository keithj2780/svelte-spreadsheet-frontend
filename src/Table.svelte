<svelte:window
    on:mousemove={onMouseMove}
    on:mouseup={onMouseUp}
/>

<script>
// @ts-nocheck

    import { createEventDispatcher, onMount, tick } from 'svelte';

    import { defaultCellFormat } from './utils.js';
    import { getGridCellOrNull, minSelCol,minSelRow,maxSelCol,maxSelRow, makeStringRefFromRowCol, makeStringRef, parseRef } from './utils.js';

	//	all we need is a config & the data & a UID
    export let config;
    export let data;
    export let uid;
	
		//	optional params
    export let title="Sheet1";
		export let allowedActions="EDIT RESIZE FORMAT DELETE COPY PASTE NAVIGATE";

	//const focus = (node) => node.focus()

    let editCell = {col:-1,row:-1};			//	currently edited cell
    let selCells = {col:-1,row:-1, col2:-1,row2:-1};	//	currently selected rows & cols. Only a single range is supported.
	let currCell = {col:0,row:0};			//	cell that is currently selected (within the selCells)
	let copyBuff = {colCount:0,rowCount:0,cells:[]};				//	array of copied cell objects 

    let elInput;			//	we'll need to set Focus back to Input
    let elRowHeader;
    let elColHeader;
    let elContent;
		let elContentScroller;

    let resizing=null;				//  row/column resizer flag. One of null|COLUMN|ROW
    let selecting=null;			//	selecting using mouse
    let edited = {
        showInput:false,
        top:0,
        left:0,
        value:''
    };

	$: config.currCell = currCell;
	$: config.selCells = selCells;

	let isVerticalScrollbar,isHorizontalScrollbar;
	$: isVerticalScrollbar = elContentScroller?.scrollHeight != elContentScroller?.clientHeight, config;	//, console.log('isVerticalScrollbar='+isVerticalScrollbar,elContentScroller?.scrollHeight,elContentScroller?.clientHeight);
	$: isHorizontalScrollbar = elContentScroller?.scrollWidth != elContentScroller?.clientWidth, config;	//, console.log('isHorizontalScrollbar='+isHorizontalScrollbar);

    let dispatch = createEventDispatcher();

    onMount(()=>{
		//console.log('Table mounted '+title,config);
        //	give the parent access to this stuff
        config.editCell = config.editCell || editCell;
        config.selCells = config.selCells || selCells;
        config.copyBuff = config.copyBuff || copyBuff;
        config.currCell = config.currCell || currCell;
        config.edited = edited;					//	the caller may append a cell reference

        editCell = config.editCell;
        selCells = config.selCells;
        copyBuff = config.copyBuff;
			
				//	Uncomment this for live use. It is highly irritating when using the REPL.
				//elContent.focus();
    });

	function isActionOK(action) {
		if (allowedActions.search(action)>=0) return true;
		return false;
	}

    function onMouseUp(e) {
        resizemouseup(e);
        selectMouseUp(e);
    }
	function onMouseMove(e) {
		resizemousemove(e);
		selectMouseMove(e);
	}
    function resizemousedown(e,rowOrCol,i) {
        resizing=rowOrCol+':'+i;			//	either ROW or COLUMN 
		e.stopPropagation();
    }
    function resizemousemove(e) {
      if ( ! resizing) return;
			let x=resizing.split(':');
			let idx=Number(x[1]);
			if (x[0] == 'COLUMN') {
				config.columnSetting[idx].width += e.movementX;
        config.columnSetting[idx].width = Math.max(10,config.columnSetting[idx].width);        //  min of at least 10 pixels wide
			} else if(x[0] == 'ROW') { 
				config.rowSetting[idx].height += e.movementY;
        config.rowSetting[idx].height = Math.max(6,config.rowSetting[idx].height);        //  min of at least 6 pixels height
			}
		}
	function resizemouseup(e) {
    if ( ! resizing) return;
		dispatch('configChanged',resizing);
		resizing=null;
	}
	
	function dblClickResizer(e,rc,idx) {
		if (! isActionOK('RESIZE')) return;
// 		let max = 0;
// 		if (rc=='ROW') {
// 			for(let n=0;n<config.columnSetting.length;n++) {
// 				let el = tblEls[idx*config.columnSetting.length+n];
// 				let style=getComputedStyle(el);
// 				//if (style.height>max) max = style.height;
// 				//console.log(style.height,max);
// 			}
// 		}
	}

	function selectMouseMove(e) {
		if ( ! selecting) return;
		let id = e.target.getAttribute('id');
		if (id != null) {
			// selCells.row2=idx/config.columnSetting.length|0;
			// selCells.col2=idx%config.columnSetting.length;
			let idxSep=id.search('\\:');
			let ref=parseRef(id.substring(idxSep+1));		//	id is our sheet uid plus the row:col ref
			selCells.row2=ref.row;
			selCells.col2=ref.col;
		}
		if (selecting == 'forInput') {
			let strRef = makeStringRef(selCells);
			//	strip existing trailing reference;
			let len=edited.value.length-1;
			while (len) {
				let ch = edited.value.charAt(len);
				if (ch>='A'&&ch<='Z') {
				} else if (ch>='0'&&ch<='9') {
				} else if (ch==':') {
				} else break;
				len--;
			}
			edited.value=edited.value.substring(0,len+1);
			//console.log(len,strRef,edited.value);
			//	...and append new ref
			edited.value+=strRef;
			elInput.focus();
		}
	}
	function selectMouseUp(e) {
		if ( ! selecting) return;
		config.selCells=selCells;
		dispatch('selChange',selCells);
		selecting=false;
	}

	function clickCell(e, rowIdx, colIdx) {
        //console.log('clickCell id=',e.target.id,rowIdx,colIdx,editCell);
		if ( ! e.shiftKey) {
			selCells.row = rowIdx;
			selCells.col = colIdx;
		}
		currCell.row = selCells.row2 = rowIdx;
		currCell.col = selCells.col2 = colIdx;

		selecting=true;

		//	a click outside means we stop editing, unless....
		if (editCell.row != -1 && editCell.col != -1 && (editCell.row != rowIdx || editCell.col != colIdx)) {
			let lastCh = edited.value.charAt(edited.value.length-1);
			//	.... it's a formula & there's a trailing +-*/(,
			if (edited.value.charAt(0) == '=' && (lastCh=='+' || lastCh=='-' || lastCh=='*' || lastCh=='/' || lastCh=='(' || lastCh==',' || edited.value.length == 1)) {
				//	so append the selected cell reference into the formula
				let strRef = makeStringRef(selCells)
				edited.value+=strRef;		//	''+editCell.row+''+editCell.col;
				elInput.focus();
				e.preventDefault();
				selecting='forInput';
				return;
			}
			//	Don't send editEdit, because we cancelled the edit (by clicking outside)
			//dispatch('endedit',selCells);
			//dispatch('endedit',editCell);
			resetEditCell();
			edited.showInput=false;
		}
		//console.log('clickCell id=',e.target.id,rowIdx,colIdx,editCell);
		elContent.focus();
		config.selCells=selCells;
		dispatch('selChange',selCells);
	}
	function isEditing() {
		return (editCell.row != -1 && editCell.col != -1);
	}
	function resetEditCell() {
		editCell.row = editCell.col = -1;
	}
	async function dblClickCell(e, rowIdx, colIdx) {
		if ( ! isActionOK('EDIT')) return;
        //console.log('dblClickCell',e,rowIdx,colIdx);

		if ( ! isCellEditable(rowIdx, colIdx)) return;

		await startEdit(e, rowIdx, colIdx);
	}

	async function startEdit(e, rowIdx, colIdx) {
		ensureDataExists(rowIdx,colIdx);
		edited.showInput = true;
		edited.value = data[rowIdx][colIdx].value;

		//let rect = e.target.getBoundingClientRect();
		//console.log('getBoundingClientRect=',e,rect,e.clientY,e.target.clientY);
		
		//	make sure relevent parent has position:relative;

		//	Find the selected cell in the DOM (using it's ref eg C13).
		let strCellId = uid+':'+makeStringRefFromRowCol(rowIdx,colIdx);
		let target = document.getElementById(strCellId);
		console.log('editing at',strCellId,target);
		//if (elCell) elCell.focus();

		edited.top = Math.max(2,target.offsetTop);
		edited.left = Math.max(10,target.offsetLeft);
		console.log('edited=',edited,e.target);

		edited.origVal = data[rowIdx][colIdx].value; 

		selCells.row = rowIdx;
		selCells.col = colIdx;
		editCell.row = rowIdx;
		editCell.col = colIdx;

		await tick();			//	wait for elInput to appear

		//console.log(edited,e.target.offsetTop,e.target.offsetLeft,e.target);
		config.selCells=selCells;
		dispatch('selChange',selCells)
		dispatch('startedit',editCell);
	}

	function copyCells() {
		let text="";
		copyBuff.cells = [];
		copyBuff.sheet = title;
        for (let r=minSelRow(config);r<=maxSelRow(config);r++) {
            for (let c=minSelCol(config);c<=maxSelCol(config);c++) {
				let cell=getGridCellOrNull(config, data,r,c);
                if (cell) {
                    copyBuff.cells.push(JSON.parse(JSON.stringify(data[r][c])));
                    text += (data[r][c].display || data[r][c].result)+'\t';
                } else {
                    copyBuff.cells.push({value:''});
                    text += ' \t';
                }
            }
            text += '\n';
        }
        copyBuff.colCount=Math.abs(selCells.col-selCells.col2)+1;
        copyBuff.rowCount=Math.abs(selCells.row-selCells.row2)+1;
        //	we will need to start cell to work out offsets when pasted cell refs.
        copyBuff.row = minSelRow(config);
        copyBuff.col = minSelCol(config);

		if (navigator.clipboard) {
			//console.log(copyBuff);
			//console.log(text);
			//navigator.clipboard.writeText(text).then(function() {});
			const clipboardItem = new ClipboardItem({
				['text/plain']: new Blob([text], { type: 'text/plain' }),
				[`web application/json`]: new Blob([JSON.stringify(copyBuff)], { type: 'application/json'}),
			});
			console.log('clipboardItem=',clipboardItem);
			navigator.clipboard.write([clipboardItem]);
			console.log('text=',text);
			console.log('copBuff=',JSON.stringify(copyBuff));
		}
	}

	async function readClipboardToCopyBuff(pasteRow, pasteCol) {
		let bFoundCustomFormat = false;
		const clipboardItems = await navigator.clipboard.read();
		console.log('clipboardItem',clipboardItems);

		for (const clipboardItem of clipboardItems) {
			for (const type of clipboardItem.types) {
				// Discard any types that are not web custom formats.
				console.log('clipboardItem.types',type);
				if ( type.startsWith('text/html')) {
					const blobHTML = await clipboardItem.getType(type);
					const strHTML = await new Response(blobHTML).text()
					if (strHTML.substring(0,26) == '<google-sheets-html-origin'
						|| strHTML.substring(0,25) == '<span data-sheets-value="') {
						let copyBuffObj = parseGoogleSheets(strHTML,pasteRow, pasteCol);
						if (! copyBuffObj.error) {
							copyBuff = copyBuffObj;
							// copyBuff.cells = copyBuffObj.cells;
							// copyBuff.rowCount = copyBuffObj.rowCount;
							// copyBuff.colCount = copyBuffObj.colCount;
							// copyBuff.row = 0;
							// copyBuff.col = 0;
							copyBuff.sheet="clipboard";
							bFoundCustomFormat =true;
						}
						console.log(copyBuffObj);
					} else {
						console.log(strHTML.substring(0,27));
					}
				} else if ( type.startsWith('web application/json')) {
					const blob = await clipboardItem.getType(type);
					// Sanitize the blob if you need to, then process it in your app.
					bFoundCustomFormat =true;
					const jsonString = await new Response(blob).text();
					//console.log('jsonstr=',jsonString);
					copyBuff = JSON.parse(jsonString);
				}
				if (bFoundCustomFormat) break;
			}
			if (bFoundCustomFormat) break;
		}
		if ( ! bFoundCustomFormat) {
			let text = await navigator.clipboard.readText();
			let rows = text.split('\n');
			copyBuff.cells=[];
			for (let r=0;r<rows.length;r++) {
				let cells = rows[r].split('\t');
				for (let c=0;c<cells.length;c++) {
					//  sanitize it. remove '$,' from numbers
					let val = cells[c];
					val = val.trim();
					//console.log(ret);
					if ("¥$£¬?½©¹".search(val.substring(0,1)) >= 0) {   //  it is a currency
						val = cells[c].replace(/[^0-9\.-]+/g,"");   	//  get rid of anything except -.0-9
					} else if (val.substring(val.length-1) == '%') {	//	or a percentage
						val = cells[c].replace(/[^0-9\.-]+/g,"");   	//  get rid of anything except -.0-9
						val = '' + Number(val) / 100;					//	& convert to a percentage
					}
					//console.log(cells[c],val);
					copyBuff.cells.push({value:val});
				}
				if (r==0) {
					copyBuff.colCount = cells.length;
					copyBuff.rowCount = rows.length;
				}
			}
			//console.log(copyBuff);
		}
	}

	async function pasteFromClipboard(pasteType) {
		await navigator.permissions.query({ name: 'clipboard-read' }).then(async(result) =>  {
			// If permission to read the clipboard is granted or if the user will
			// be prompted to allow it, we proceed.
			if (result.state != 'granted' && result.state != 'prompt') {
				console.error('Failed to get permission to read clipboard');
				return false;
			}
		});

		await readClipboardToCopyBuff(currCell.row, currCell.col);
		//console.log(JSON.stringify(copyBuff,null,2));
		if (copyBuff.colCount == 0) return false;
		pasteCells(pasteType);
		return true;
	}

    //  we need to keep pasting cells from the copyBuff (modulo'd) into the selCells.
	function pasteCells(pasteType) {
		if ( ! isActionOK('PASTE')) return;

        let pasteRow=minSelRow(config);
        let pasteCol=minSelCol(config);
		//console.log('pasteCells('+pasteType,JSON.stringify(copyBuff,null,2),selCells,pasteRow,pasteCol);

		let rowDiff = pasteRow - copyBuff.row;
		let colDiff = pasteCol - copyBuff.col;

        //  if there is a single selected destination cell...
        if (selCells.row==selCells.row2 && selCells.col==selCells.col2) {   //  ...then copy the whole of the copyBuff
            for (let idx=0;idx<copyBuff.cells.length;idx++) {
                let destR = ((idx/copyBuff.colCount)|0)+minSelRow(config);
                let destC = (idx%copyBuff.colCount)+minSelCol(config);

                ensureDataExists(destR,destC);

                if (data[destR] && data[destR][destC]) {
					let srcCell = copyBuff.cells[idx];
					//console.log('srcCell=',srcCell);

                    if (pasteType.search('DISPLAY')>-1) {
						data[destR][destC].value = data[destR][destC].result = data[destR][destC].display = srcCell.display;
					} else if (pasteType.search('VAL') != -1) {
                        let val = srcCell.value;
                        if (srcCell.value[0] == '=') {
							//console.log('pasteCells()',copyBuff.row,copyBuff.col,'selCells=',selCells,'paste=',pasteRow,pasteCol);
							//console.log('1. row/colDiff=',rowDiff,colDiff,'destC=',destC,copyBuff.col,'destR=',destR ,copyBuff.row)

                            val = doOffsetCellRefs(srcCell.value,rowDiff,colDiff,copyBuff);
                        }
                        data[destR][destC].value = data[destR][destC].result =data[destR][destC].display = val;
                    }
                    if (pasteType.search('FORMAT')>-1 && srcCell.format) data[destR][destC].format = JSON.parse(JSON.stringify(srcCell.format));
                    //console.log('set',idx,destR,destC,data[destR][destC]);
                } else {
					console.log('dest does not exist',idx,destR,destC);
				}
            }
        } else {        //  ...else paste as much of the copyBuff into the selCells as possible - repeating the copyBuff if necessary
            for (let destR=minSelRow(config) ; destR <= maxSelRow(config); destR++) {
                for (let destC=minSelCol(config);destC <= maxSelCol(config); destC++) {

					ensureDataExists(destR,destC);

					if (data[destR] && data[destR][destC]) {
						let srcRowOffset = destR-minSelRow(config);
						let srcColOffset = destC-minSelCol(config);
                        let srcRow = (destR-selCells.row)/copyBuff.colCount|0;
                        let srcCol = (destC-selCells.col)%copyBuff.colCount;
                        let srcIdx = srcRow * copyBuff.rowCount * srcCol;
                        let srcCell = copyBuff.cells[srcIdx];

						if (pasteType.search('DISPLAY')>-1) {
							data[destR][destC].value = data[destR][destC].result = data[destR][destC].display = srcCell.display;
						} else if (pasteType.search('VAL')>-1) {
                            let val = srcCell.value;
                            if (val[0] == '=') {
                                //console.log('row/colDiff=',rowDiff,colDiff,'destC=',destC,copyBuff.col,'destR=',destR ,copyBuff.row)
                                val = doOffsetCellRefs(val,rowDiff+srcRowOffset,colDiff+srcColOffset, copyBuff);
                            }
                            data[destR][destC].value = data[destR][destC].result = data[destR][destC].display = val;
                        }
                        if (pasteType.search('FORMAT')>-1 && srcCell.format) data[destR][destC].format = JSON.parse(JSON.stringify(srcCell.format));
                    }
                }
            }
        }
    
        //	The pasted cells are automatically selected
        currCell.row = selCells.row=minSelRow(config); 
        selCells.row2=selCells.row+copyBuff.rowCount-1;
        currCell.col = selCells.col=minSelCol(config);
        selCells.col2=selCells.col+copyBuff.colCount-1;
        dispatch('endedit',selCells);
	}

	function ensureDataExists(destR,destC) {
		if ( ! data[destR]) data[destR]=[];
		if ( ! data[destR][destC]) data[destR][destC]={};
		if ( ! data[destR][destC]?.value) {
			//console.log('ensureDataExists()',destR,destC);
			data[destR][destC].value='';
		}
		if ( ! config.columnSetting[destC]) config.columnSetting[destC] = {	width:80, show: true, resizable:true,			}
		if ( ! config.rowSetting[destR]) config.rowSetting[destR] = {	height:24, show: true, resizable:true,			}
	}

	function deleteCells() {
		if ( ! isActionOK('DELETE')) return;

		dispatch('startedit',selCells);
		for (let r=minSelRow(config);r<=maxSelRow(config);r++) {
			for (let c=minSelCol(config);c<=maxSelCol(config);c++) {
				ensureDataExists(r,c);
				data[r][c].value = data[r][c].result = data[r][c].display = "";
				if ( ! data[r][c].format) 
					data[r][c].format = JSON.parse(JSON.stringify(defaultCellFormat));		//	TODO QUESTION? Should we delete the format? NO
			}
		}
		dispatch('endedit',selCells);
	}

	async function cellKeyDown(e) {
        //console.log('cellKeyDown(',e.target.id);
        //  some other grid (or block) has the focus
        if (e.target.id != "cellContent-"+uid) return;

		let bConsumed = cellNavKeyDown(e);
		if ( ! bConsumed ) bConsumed = await cellMutatingKeyDown(e);
		if (isEditing()) return;
	}

	function isCellEditable(r,c) {
		//	don't edit readonly cells
		if ( ! data[r] || ! data[r][c] ) return true;		//	no cell means we can edit
		if ( ! data[r][c].format) return true;				//	no format means we can edit
		return ! data[r][c].format.readonly;		//	) return true;		//	not readonly means we can edit
	}
	async function cellMutatingKeyDown(e) {

		//console.log(e);
		if ( ! isCellEditable(selCells.row, selCells.col)) return false;

		switch (e.key) {
		case 'Enter':	//	13:		//	ENTER
		case 'F2':		//	113:		//	F2
		case '=':		//	187:		//	=
			if ( ! isActionOK('EDIT')) return false;
			let rowIdx=currCell.row;
			let colIdx=currCell.col;

			ensureDataExists(rowIdx,colIdx);
			editCell.row = rowIdx;
			editCell.col = colIdx;
			await startEdit(e,rowIdx,colIdx);
			if (e.which==187) {
				edited.value='=';
			} else if ( ! data[rowIdx][colIdx].value) {
				edited.value='';
			} else {
				//	select all the content (unless it's an '=')
				elInput.selectionStart=0;
				elInput.selectionEnd=edited.value.length;
			}
			e.preventDefault();
			return true;
		}

		if (e.ctrlKey) {
			switch (e.key) {
			case 'g_unused':	//	^G		paste from clipboard
				if ( ! isActionOK('PASTE')) return false;
				//	parse TSV rows
				e.stopPropagation();
				e.preventDefault();

				return true;
			case 'c':	//	67:	^C		copy
				if ( ! isActionOK('COPY')) return false;
				copyCells();
				return true;
			case 'v':	//	86:	^V		paste
				if ( ! isActionOK('PASTE')) return false;
				if (e.shiftKey) pasteFromClipboard('DISPLAY FORMAT');		//	paste DISPLAY (i.e. whatever is displayed, and NOT the formula)
				else            pasteFromClipboard('VAL FORMAT');   		//	paste everything)
				return true;
			case 'x':	//	88	^X		copy, then delete
				if ( ! isActionOK('DELETE')) return false;
				copyCells();
				deleteCells();
				return true;
			}
			return false;
		}	//	Ctrlkey

		if (e.altKey) return false;

		switch (e.key) {
		case 'Delete':	//	46:	//	DEL		delete
			if ( ! isActionOK('DELETE')) return false;
			deleteCells();
			return true;
		default:
			//	allow various 'normal' keys to begin overwriting cell content
			if (e.key.length > 1) return false;
			if ((e.key >='A' && e.key<='Z') 
				|| (e.key >='a' && e.key<='z') 
				|| (e.key >='0' && e.key<='9')
				|| e.key=="'" || e.key=='"' || e.key=="`" || e.key=="-" || e.key=="+" ) {

				if ( ! isActionOK('EDIT')) return false;
				let rowIdx=selCells.row;
				let colIdx=selCells.col;
				ensureDataExists(rowIdx,colIdx);
				editCell.row = rowIdx;
				editCell.col = colIdx;
				//data[rowIdx][colIdx].value = e.key; 
				await startEdit(e,rowIdx,colIdx,e.key);
				edited.value=''+e.key;
				e.preventDefault();
				return true;
			}
			return true;
		}
	}

	function setSelCellsToCurrCell(shiftKey) {
		selCells.row2 = currCell.row;
		selCells.col2 = currCell.col;
		if ( ! shiftKey) {
			selCells.row = currCell.row;
			selCells.col = currCell.col;
		}
	}
	function cellNavKeyDown(e) {
		if ( ! isActionOK('NAVIGATE')) return false;
		switch (e.which) {
			case 9:			//	TAB
				let left=0,right=config.columnSetting.length,top=0,bottom=config.rowSetting.length;
				if (selCells.row != selCells.row2 || selCells.col != selCells.col2) {		//	if multiple cells selected
					left  =minSelCol(config);
					right =maxSelCol(config)+1;
					top   =minSelRow(config);
					bottom=maxSelRow(config)+1;
				}
				if (e.shiftKey) {			//	if GOTO Prev
					if (currCell.col == left) {
						if (currCell.row > top) {
							currCell.col = right-1;
							currCell.row--;
						} else {
							currCell.row= bottom-1;
							currCell.col= right-1;
						}
					} else
						currCell.col--;
				} else if (currCell.col < right-1) {		//	goto next cell to the right
					currCell.col++;
				} else {										//	go to next row (or if on bottom row gotoo cell[0][0])
					currCell.col=left;
					if (currCell.row < bottom-1) currCell.row++;
					else currCell.row=top;
				}
				if (selCells.row == selCells.row2 && selCells.col == selCells.col2) {
					setSelCellsToCurrCell(false);
				}
				break;
			case 36:		//	HOME
				currCell.col=0;
				if (e.ctrlKey) currCell.row = 0;
				setSelCellsToCurrCell(e.shiftKey);
				break;
			case 40:		//	DOWN
				if (e.ctrlKey) {
					let row = findNextFullCell(1,0);
					currCell.row=row;	//	config.rowSetting.length-1;
				} else if (currCell.row < config.rowSetting.length-1) currCell.row++;
				setSelCellsToCurrCell(e.shiftKey);
				break;
			case 38:		//	UP
				if (e.ctrlKey) {
					let rowUp = findNextFullCell(-1,0);
					currCell.row=rowUp;
				} else if (currCell.row > 0) currCell.row--;
				setSelCellsToCurrCell(e.shiftKey);
				break;
			case 39:		//	RIGHT
				if (e.ctrlKey) {
					let col = findNextFullCell(0,1);
					currCell.col=col;	//	config.columnSetting.length-1;
				} else if (currCell.col < config.columnSetting.length-1) currCell.col++;
				setSelCellsToCurrCell(e.shiftKey);
				break;
			case 37:		//	LEFT
				if (e.ctrlKey) {
					let col = findNextFullCell(0,-1);
					currCell.col=col;
				} else if (currCell.col>0) currCell.col--;
				setSelCellsToCurrCell(e.shiftKey);
				break;
			case 35:		//	END
				currCell.col = config.columnSetting.length-1;
				if (e.ctrlKey) currCell.row = config.rowSetting.length-1;
				setSelCellsToCurrCell(e.shiftKey);
				break;
			case 65:		//	^A		select all
				if (e.ctrlKey) {
					selectAll();
					config.selCells=selCells;
					dispatch('selChange',selCells);
					resetEditCell();
					e.preventDefault();     //  stop the content scrolling
					return true;
				}
				return false;				//	we didn't consume this 'A' key
			default:
				return false;
		}
		//console.log(selCells);
		if ( ! e.shiftKey && ! e.which == 9) {
			//	row2/col2 is the most recently selected
			selCells.col2=selCells.col;
			selCells.row2=selCells.row;
		}
		
		//	find DOM cell that has an ID corresponds with this row/col
		//	and set focus to it
		let strCellId = uid+':'+makeStringRefFromRowCol(selCells.row,selCells.col);
		let elCell = document.getElementById(strCellId);
		//console.log('cellNavKeyDown',strCellId,elCell);
		if (elCell) {
			//	trick to give a non-focusable element (cell) focus for long enough to scroll it into view.
			elCell.setAttribute('tabindex', '-1');
			elCell.focus();
			elCell.removeAttribute('tabindex');
			elContent.focus();
		}

		resetEditCell();
		config.selCells=selCells;
		dispatch('selChange',selCells);
		e.preventDefault();     //  stop the content scrolling
		return true;
	}

	function cellIsEmpty(r,c) {
		let cell = getGridCellOrNull(config, data,r,c);
		return cell ==null || cell.display == '' || cell.display == null || cell.display == undefined;		//	empty
	}

	//	This is used to move the currCell (using TAB key) in the selected area
	//	move 1 cell in direction
	//	find a full cell that is after a blank OR a full cell that preceedes a blank (or edge of sheet)
	function	findNextFullCell(rowInc,colInc) {
		let idx=0;
		let startCellEmpty = cellIsEmpty(selCells.row, selCells.col);
		let nextCellEmpty = cellIsEmpty(selCells.row+rowInc, selCells.col+colInc);
		if (rowInc) {
			idx=selCells.row+rowInc;
			if (startCellEmpty || nextCellEmpty)				//	go to next full cell
				while (idx >= 1 && idx<config.rowSetting.length-1 && cellIsEmpty(idx,selCells.col)) idx+=rowInc;
			else {		//	goto next full cell
				while (idx >= 0 && idx<config.rowSetting.length-0 && ! cellIsEmpty(idx,selCells.col)) idx+=rowInc;
				idx-=rowInc;
			}
		} else {
			idx = selCells.col + colInc;
			if (startCellEmpty || nextCellEmpty)
				while (idx >= 1 && idx<config.columnSetting.length-1 && cellIsEmpty(selCells.row,idx)) idx+=colInc;
			else {
				while (idx >= 0 && idx<config.columnSetting.length-0 && ! cellIsEmpty(selCells.row,idx)) idx+=colInc;
				idx-=colInc;
			}
		}
		return idx;
	}

	function clickColHeader(e,colIdx) {
		if ( ! e.shiftKey) selCells.col2=colIdx;
		currCell.col=selCells.col=colIdx;
		currCell.row=selCells.row=0;
		selCells.row2=config.rowSetting.length-1;
		elContent.focus();
		config.selCells=selCells;
		
		dispatch('selChange',selCells);
		//elContent.focus();      //  tblEls[colIdx].focus();
	}
	function clickRowHeader(e,rowIdx) {
		if ( ! e.shiftKey) selCells.row2=rowIdx;
		currCell.row=selCells.row=rowIdx;
		currCell.col=selCells.col=0;
		selCells.col2=config.columnSetting.length-1;
		elContent.focus();
		config.selCells=selCells;
		dispatch('selChange',selCells);
	}
	function selectAll() {
		currCell.row = selCells.row=0;
		selCells.row2=config.rowSetting.length-1;
		currCell.col = selCells.col=0;
		selCells.col2=config.columnSetting.length-1;
		
	}
	function clickRowColHeader(e) {
		selectAll();
		elContent.focus();
		config.selCells=selCells;
		dispatch('selChange',selCells);
	}
	function handleInputKeypress(e) {
		//console.log('handleInputKeypress',e.which);
		if (e.which==27) {			//	ESC
			//data[editCell.row][editCell.col].value = origVal; 
		}
		if ((e.which==13 && !e.shiftKey) || e.which==113 || e.which==27 || e.which==9 || e.which==38 || e.which==40) {	//	ENTER or F2 or ESC or TAB or UP or DOWN
			if (e.which != 27) {			//	If ESC then DON'T update value
				data[editCell.row][editCell.col].value = edited.value; 
				
				//	These next 2 lines should be commented out. YOU (the developer) should populate then... eg after a calc, or after formatting the value as a currency etc.
				data[editCell.row][editCell.col].result = edited.value;
				data[editCell.row][editCell.col].display = edited.value; 
		
				dispatch('endedit',selCells);
				//dispatch('endedit',editCell);
			}
			//	ENTER (or DOWN) means move down to next cell
			if ((e.which==13 || e.which ==40) && selCells.row < config.rowSetting.length-1)
				currCell.row = selCells.row2 = ++selCells.row;
			else if (e.which == 38 && selCells.row > 0)	
				currCell.row = selCells.row2 = --selCells.row; //	UP MEANS Go UP
			else {
				//	if caretPos==edited.value.length 
				//if (e.which == 39) selCells.col2 = ++selCells.col;
			}
			resetEditCell();
            elContent.focus();
			edited.showInput=false;
		}
		e.stopPropagation();
	}

	//	keep the scroll bars in sync with cell content
	function scrollY(e) {
		let width  = e.target.scrollWidth;
		let height = e.target.scrollHeight;
		if (isHorizontalScrollbar && isVerticalScrollbar) {
		 	height+=16;			//	16 is scroll bar width
			width+=16;
		}
		var percentageY = e.target.scrollTop / (height - e.target.offsetHeight);
		let scrollPosY = percentageY * (elRowHeader.scrollHeight - elRowHeader.offsetHeight);
		elRowHeader.scroll(0,scrollPosY);

		var percentageX = e.target.scrollLeft / (width - e.target.offsetWidth);
		//console.log('scrollY sl=',e.target.scrollLeft,'sw=',e.target.scrollWidth,'w=',e.target.offsetWidth);
		let scrollPosX = percentageX * (elColHeader.scrollWidth - elColHeader.offsetWidth);
		//console.log('scrollY',e.target.offsetWidth,percentageX,percentageY,scrollPosX,scrollPosY);
		elColHeader.scroll(scrollPosX,0);
	}

	function scrollX(e) {
	}

</script>
<div class="table">
	<div class="rowHeader rowColHeader" 
        on:mousedown|stopPropagation|preventDefault
        on:click={(e)=>clickRowColHeader(e)} 
        >
    </div>

	<div class="columnHeaderWrapper">
		<div class="columnHeader  { (isHorizontalScrollbar && isVerticalScrollbar)?'':'span2Cols'}"  bind:this={elColHeader}>
			{#each config.columnSetting as col,colIdx (colIdx)}
				{@const isSelected=colIdx>=minSelCol(config) && colIdx<=maxSelCol(config)}
				<div class="th resizableHeader" style={'min-width:'+col?.width+'px'}>
					<div class="colDesc 
						{isSelected?'colSel':''} " 
						on:mousedown|stopPropagation|preventDefault={(e)=>clickColHeader(e,colIdx)} 
						on:keydown
						>
						{#if colIdx >= 26}
							{String.fromCharCode(((colIdx/26-1)|0)+65)+
							String.fromCharCode((colIdx%26)+65)}
						{:else}
							{String.fromCharCode((colIdx%26)+65)}
						{/if}
					</div>
					{#if col?.resizable}
					<div class="colResizer  {isSelected?'colSel':''} "
						on:mousedown|stopPropagation|preventDefault={(e)=>resizemousedown(e,'COLUMN',colIdx)}
						/>
					{/if}
				</div>
			{/each}
		</div>		
		{#if isHorizontalScrollbar && isVerticalScrollbar}
			<div class="horzScrollBarFiller"></div>
		{/if}
	</div>

	<div class="rowHeaderWrapper">
		<div class="rowHeaderContainer  {isHorizontalScrollbar?'':'span2Rows'}" bind:this={elRowHeader} >
			{#each config.rowSetting as rowSetting, rowIdx (rowIdx)}
				{@const isRowSelected=(rowIdx>=minSelRow(config) && rowIdx<=maxSelRow(config))}
				<div class="tr" style= "height:{config.rowSetting[rowIdx]?.height}px;" >
					<div class="rowHeader {isRowSelected?'rowSel':''}"
							on:mousedown|stopPropagation|preventDefault
							on:click={(e)=>clickRowHeader(e,rowIdx)} on:keydown>
						<div class="rowNumber">{rowIdx+1}</div>
						{#if config.rowSetting[rowIdx]?.resizable}
							<div class="rowResizer  {isRowSelected?'colSel':''} "
								on:mousedown={(e)=>resizemousedown(e,'ROW',rowIdx)}
								on:dblclick={(e)=>dblClickResizer(e,'ROW',rowIdx)}
								/>
						{/if}
					</div>
				</div>
			{/each}
		</div>
		{#if isVerticalScrollbar && isHorizontalScrollbar}
			<div class="vertScrollBarFiller"></div>
		{/if}
	</div>
		
   <div class="cellContentWrapper" bind:this={elContentScroller} on:scroll={(e)=>scrollY(e)}>
	<div class="cellContent"
        id={"cellContent-"+uid}
        tabindex="-1"
        bind:this={elContent}
        on:keydown={cellKeyDown}
        >
		{#each config.rowSetting as rowSetting, rowIdx (rowIdx)}
			{@const isRowSelected=(rowIdx>=minSelRow(config) && rowIdx<=maxSelRow(config))}
            <div class="tr" style= "height:{config.rowSetting[rowIdx]?.height}px;" >
                {#each config.columnSetting as col,colIdx (colIdx)}
                    {@const fmt=data[rowIdx] && data[rowIdx][colIdx]?.format?data[rowIdx][colIdx].format:config.defaultFormat}
                    {@const isSelected = (rowIdx>=minSelRow(config) && rowIdx<=maxSelRow(config) && colIdx>=minSelCol(config) && colIdx<=maxSelCol(config))}
					<!-- tabindex={-1} -->
					<div id={uid+':'+makeStringRefFromRowCol(rowIdx,colIdx)}
						class="td {isSelected?'tdSelected':''} {rowIdx==currCell.row && colIdx==currCell.col?'tdFirstSelected':''} {fmt.underline?'underline':''} {fmt.italics?'italics':''} {fmt.bold?'bold':''} td{fmt.align}  {fmt.border[0]!=' '?'borderTop':''} {fmt.border[1]!=' '?'borderLeft':''} {fmt.border[2]!=' '?'borderBottom':''} {fmt.border[3]!=' '?'borderRight':''}"
                        style="font-size:{fmt.fontsize}px; color:{fmt.colour};{isSelected?'':'background:'+fmt.background+';'} width:{config.columnSetting[colIdx]?.width}px;" 
                        on:mousedown|preventDefault={(e)=>clickCell(e,rowIdx,colIdx)}
                        on:dblclick|preventDefault={(e)=>dblClickCell(e,rowIdx,colIdx)} 
                        >
                        <!-- on:keydown={(e)=>cellKeyDown(e,rowIdx,colIdx)} -->
                        {#if data[rowIdx] && data[rowIdx][colIdx]?.display != undefined }
                            {data[rowIdx][colIdx].display!=null?data[rowIdx][colIdx].display:data[rowIdx][colIdx].value} 
                        {/if}

                    </div>
                {/each}
			</div>
		{/each}

		{#if edited.showInput}
			<div class='absInput' style="left:{edited.left}px; top:{edited.top}px;">
				<!-- svelte-ignore a11y-autofocus -->
				<input bind:value={edited.value}  
                    bind:this={elInput} autofocus 
                    on:keydown={(e)=>handleInputKeypress(e)} />		
			</div>
		{/if}

			
		</div>
    </div>
</div>

<style>
	.absInput {
		position:absolute;
		transform:scale(1.1);
	}

	:root {
		--headerFG: #555;
		--headerBG: #eee;
		--selectedHeaderBG: #ddd;
		--selectedHeaderFG: #222;
		--cellBorderColor: #666;
		--cellSelectedBG: rgb(208,230,255,0.5);
		--resizerBG: #ccc;
	}

	.table {
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen-Sans, Ubuntu, Cantarell, "Helvetica Neue", sans-serif;
        border-collapse: collapse;
		user-select:none;
		color: var(--headerFG);
		display:grid;
		grid-template-rows:24px 1fr;
		grid-template-columns:40px 1fr;
		max-height:100%;
		max-width:100%;
		overflow:hidden;
    }

	.columnHeaderWrapper {
		display: grid;
		grid-template-columns: auto 16px;
		/* display:inline; */
		max-width: 100%;
		max-height: 100%; 
		overflow:hidden;
	}

	.columnHeader { 
		font-size: 16px;
		text-align: center;
		background-color: var(--headerBG);
		border: 1px solid lightgray;
		display:inline-flex; 
		overflow:hidden;
		height:100%;
	}

	.rowHeaderWrapper {
		display: grid;
		grid-template-rows: auto 16px;
		max-width: 100%;
		max-height: 100%; 
		overflow:hidden;
	}

	.rowHeaderContainer {
		display:inline-flex;
		flex-wrap:wrap;
		max-width: 100%;
    	max-height: 100%; 
		overflow:hidden;
	}
	.rowHeader {
		font-size: 16px;
		text-align: center;
		background-color: var(--headerBG);
/*     border: 1px solid lightgray; */
		min-width:40px;
	}
	.cellContentWrapper {
		display:inline;
		overflow:auto;
	}
	.cellContent {
		position:relative;
		background-color:#f8f8f8;
		display:inline-grid;
		flex-wrap:wrap;
		flex-direction:row;
/* 		border: 1px solid rgb(0,0,0,0.1); */
/* 		overflow-x:hidden; */
		overflow:hidden;
	}
	.rowColHeader {
		height:22px;
		border-right: 2px solid lightgray;
		border-bottom: 2px solid lightgray;
		border-top: none;
	}
	.rowNumber {
		height:100%;
		overflow:hidden;
	}
 
	.colSel {
		background-color: var(--selectedHeaderBG);
		color: var(--selectedHeaderFG);
		font-weight:600;
	}
	.rowSel {
		background-color: var(--selectedHeaderBG);
		color: var(--selectedHeaderFG);
		font-weight:600;
	}
    .resizableHeader {
        display:flex;
        height:100%;
    }
    .th {
        border-right: 2px solid rgb(0, 0, 0,0.0);
    }
    .colDesc {
        height:100%;
        width:100%;
		max-height:28px;
		overflow:hidden;
    }
	.tr {
		display:inline-flex;
		border-right: 2px solid rgb(170, 170, 170);
/* 			max-height:24px; */
	}
	.td {
/* 		border: 1px solid rgb(0,0,0,0.1); */
		border-left: 1px solid rgb(0,0,0,0.1);
		border-right: 1px solid rgb(0,0,0,0.0);
		border-top: 1px solid rgb(0,0,0,0.1);
		border-bottom: 1px solid rgb(0,0,0,0.0);
		user-select:none;
		overflow:hidden; 
		position:relative;
	}
	.td:focus {
       	outline: none;
	}
	.decorated {
		height:20px;
	}
	.italics {
		font-style: italic;
	}
	.underline {
		text-decoration: underline;
	}
	.bold {
		font-weight:700;
	}
	.borderTop {
		border-top:1px solid var(--cellBorderColor);
	}
	.borderLeft {
		border-left:1px solid var(--cellBorderColor);
	}
	.borderBottom {
		border-bottom:1px solid var(--cellBorderColor);
	}
	.borderRight {
		border-right:1px solid var(--cellBorderColor);
	}
	.tdSelected {
/* 		border: 1px solid #00d; */
		background-color: var(--cellSelectedBG);
	}
	.tdFirstSelected {
		border: 1px solid #00d;
		background-color: var(--cellSelectedBG);
	}
	.tdEdit {
		display:flex;
		border: 0px;
	}
    .tdleft {
        text-align: left;
    }
    .tdright {
        text-align: right;
    }
    .tdcenter {
        text-align: center;
    }
	/*
    textarea {
		padding:0px;
		margin:0px;
		border:1px solid red;
		height:100px;
	} */
    .colResizer {
		min-width:2px;
		transform: translate(1px, 0px);
		z-index:1;
		pointer-events: all;
		background: var(--resizerBG);
    }
    .rowResizer {
        min-height:3px;
        transform: translate(0px, -1px);
		z-index:1;
		background:var(--resizerBG);
		pointer-events: all;
    }
    .colResizer:hover {
        cursor:ew-resize;        
    }
    .rowResizer:hover {
        cursor:ns-resize;        
    }
	.vertScrollBarFiller {
		/* height:	16px;
		width:	16px;
		min-height:16px; */
		background-color: var(--headerBG);
	}
	.horzScrollBarFiller {
		/* width:		16px;
		min-width:	16px;
		height:		16px; */
		background-color: var(--headerBG);
	}
	.span2Cols {
		grid-column: span 2;
	}
	.span2Rows {
		grid-row: span 2;
	}
</style>
