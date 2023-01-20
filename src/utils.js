
export let defaultCellFormat = {		//	if a data cell does not have a format, then this one is used
  "italics":  0,
  "bold":     0,
  "underline":0,
  "fontsize": 13,
  "align":    "left",
  "colour":   "#888",
  "background": "#fff",
  "border":   [false,false,false,false],				//	TLBR
  //"hidden":   false,        //  display format of None
  "readonly": false,
   displayFormat:'NUMBER2',							//	DATE,TIME, DURATION, CURRENCY2, CURRENCY, TEXT, NUMBER, NUMBER2
}

export function makeSampleData(data) {
	makeSampleCellData(data,1,1,'red');
	makeSampleCellData(data,1,2,'red');
	makeSampleCellData(data,1,3,'red');
	makeSampleCellData(data,2,1,'#AAA');
}

export function makeSampleCellData(data,r,c,col) {
	data[r][c].format.bold=true;
	data[r][c].format.colour=col;
	data[r][c].format.background='#EEE';
	data[r][c].format.align='center';
	data[r][c].format.border=[true,false,false,false];
	data[r][c].value=data[r][c].result=data[r][c].display=Math.random()*9999999|0;	
}

export function makeDefaultCell() {
  return {
    value:'',
    display:'',					//	what is displayed often isn't the same as the value. E.G. formulas, 12=>$12.00, -12=>(ý12.00). It is the parents responsibility to do this
    result:'',					//	the result of a formula or just the value as a string/number
    format:JSON.parse(JSON.stringify(defaultCellFormat)),
  };
}

export function minSelRow(config) {	return Math.min(config.selCells.row,config.selCells.row2)}
export function maxSelRow(config) {	return Math.max(config.selCells.row,config.selCells.row2)}
export function minSelCol(config) {	return Math.min(config.selCells.col,config.selCells.col2)}
export function maxSelCol(config) {	return Math.max(config.selCells.col,config.selCells.col2)}


export function getGridCellOrNull(config, data,r,c) {
  if (r >= data.length || r < 0) return null;
  if ( ! data[r]) {
    console.log('makeRow() at',r,c);
    data[r] = [];
  }
  if (c >= data[r].length || c < 0) return null;
  if ( ! data[r][c]) {
    data[r][c] = makeDefaultCell();
    console.log('makeDefaultCell()',r,c);
  }
  return data[r][c];
}

export function makeGridData(config) {
	let newData=[];
  for(let n=0;n<config.rowSetting.length;n++) {
    newData[n] = [];
    if ( ! config.rowSetting[n]) {  //  copy the most recent row
      config.rowSetting[n] = JSON.parse(JSON.stringify(config.rowSetting[n-1]));
    }
    for(let c=0;c<config.columnSetting.length;c++) {
      if ( ! config.columnSetting[c]) {  //  copy the most recent column
        config.columnSetting[c] = JSON.parse(JSON.stringify(config.columnSetting[c-1]));
      }
      let cell = makeDefaultCell();
      newData[n][c] = cell;
    } 
  }
  return newData;	
}


export let defaultGridConfig = {
		columnSetting: [
			{resizable:true, width: 20,},
			{resizable:true, width: 100,},
			{resizable:true, width: 200,},
			{resizable:true, width: 100,},
			{resizable:true, width: 100,},
			{resizable:true, width: 100,},
		],
		rowSetting: [
			{resizable:true, height: 20},
			{resizable:true, height: 24},
			{resizable:true, height: 34},
			{resizable:true, height: 24},
			{resizable:true, height: 24},
			{resizable:true, height: 24},
			{resizable:true, height: 24},
			{resizable:true, height: 24},
		],
    selCells:{row:0,col:0},
    editCell:{row:-1,col:-1},
		defaultFormat : defaultCellFormat,		//	if a data cell does not have a format, then this one is used
	};
	

export function makeStringRefFromRowCol(row,col,rowFixed=false,colFixed=false) {
	let str = colFixed?'$':'';
	if (col < 0) {
		console.error('makeStringRefFromRowCol()',row,col,rowFixed,colFixed);
	} else if (col<26) {		//	A
		str+=String.fromCharCode(65+col);
	} else {						//	ZZ
		str+=String.fromCharCode(65+(col-26)/26|0)+String.fromCharCode(65+col%26);
	}
	str+=rowFixed?'$':'';
	str+=(row+1);
	return str;
}

export function makeStringRef(ref) {
	let str="";
	if (ref.sheet) str = ref.sheet+'!';

	str += makeStringRefFromRowCol(ref.row,ref.col,ref.rowFixed,ref.colFixed);

	if (ref.row2!=undefined && ref.col2!=undefined
		 && (ref.row2!=ref.row || ref.col2!=ref.col)) {		//	and one of row & col are different
		str+=':';
		str += makeStringRefFromRowCol(ref.row2,ref.col2,ref.row2Fixed,ref.col2Fixed);
	}
	return str;
}

//console.log(parseRef("$Z$387:$BB456"));
export function parseRef(s) {
	let ref={str:s,error:'No string',rowCnt:0,colCnt:0};
	if (s==null) return ref;

	let idx=0;
	
	//	optional sheet name is in single quotes followed by !  eg 'CF2022'!A1
	
	//	single reference
	if (s[idx]=='$') {	ref.colFixed=true; idx++;	}
	if (s[idx]>='A' && s[idx] <='Z') {	ref.col=s.charCodeAt(idx) - 65; idx++;	}
	if (s[idx]>='A' && s[idx] <='Z') {	ref.col=26+ref.col*26+s.charCodeAt(idx) - 65; idx++;}
	if ( ref.col == undefined) {	ref.error='Bad column'; return ref;}

	if (s[idx]=='$') {	ref.rowFixed=true; idx++;	}
	let len = 0;
	while ( s[idx+len] >= '0' && s[idx+len] <= '9') {
		len++;
	}
	let strRow=s.substring(idx,idx+len);
	//console.log('parseRef',strRow,idx,len);
	ref.row = Number(strRow);
	if ( ! ref.row) {	ref.error='Bad row'; return ref;}

	ref.row--;		//	convert to zero based
	ref.rowCnt=1;
	ref.colCnt=1;
	ref.error=null;

	idx+=len;

	//	range
	if (s[idx]==':') {
		idx++;		//	skip :
		if (s[idx]=='$') {	ref.col2Fixed=true; idx++;	}
		if (s[idx]>='A' && s[idx] <='Z') {	ref.col2=s.charCodeAt(idx) - 65; idx++;	}
		if (s[idx]>='A' && s[idx] <='Z') {	ref.col2=26+ref.col2*26+s.charCodeAt(idx) - 65; idx++;}
		if ( ref.col2 == undefined) {	ref.error='Bad column2'; return ref;}

		if (s[idx]=='$') {	ref.row2Fixed=true; idx++;	}
		len = 0;
		while ( s[idx+len] >= '0' && s[idx+len] <= '9') {len++;}
		strRow=s.substring(idx,idx+len);
		//console.log(strRow,idx,len);
		ref.row2 = Number(strRow);
		if ( ! ref.row2) {	ref.error='Bad row2'; return ref;}
		ref.row2--;		//	convert to zero based

		idx+=len;

		//	rationalise
		if (ref.row2 < ref.row) {	let tmp = ref.row2; ref.row2 = ref.row; ref.row=tmp; }
		if (ref.col2 < ref.col) {	let tmp = ref.col2; ref.col2 = ref.col; ref.col=tmp; }
		ref.rowCnt=ref.row2-ref.row+1;
		ref.colCnt=ref.col2-ref.col+1;
	}
	ref.len=idx;
	return ref;
}
