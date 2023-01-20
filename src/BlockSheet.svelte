<script>
	import {onMount} from 'svelte';
	
  import {model, defaultGridConfig} from './model.js'

	import Block from './Block.svelte';
	import Table from './Table.svelte';
	import Toolbar from './Toolbar.svelte';
	import Menu from './Menu.svelte';
	import {makeData} from './utils.js';
	import {calcAll, calcFormula} from './calc.js';

	export let scale;

	let arrBlocks=[];
	add();
	add();
	function add() {
		let len = arrBlocks.length;
		let block= {
			title:'Grid '+(len+1),
			type:	'grid',
			top: 120+len*272,
			left:50+len*332,
			width:500,
			height:750,
		}
		arrBlocks=[...arrBlocks, block];
	}
	
	let data = makeData();
	
	let config = JSON.parse(JSON.stringify(defaultGridConfig));
	
		const toolOptions = [
			{id:0,text:'F+'},
			{id:1,text:'F-'},
			{id:2,text:'Italic'},
			{id:3,text:'Bold'},
			{},
			{id:4,text:'FG'},
			{id:5,text:'BG'},
			{},
			{id:1002,text:'Align'},
			{id:1000,text:'Borders'},
			{id:1001,text:'Format'},
			{},
			{id:15,text:'AddRow'},
			{id:16,text:'AddCol'},
			{id:9,text:'Export'},
			{id:10,text:'Reset'},
		];

	let bordersMenu = [	{id:11,text:'Top'},	{id:12,text:'Left'},			{id:13,text:'Bottom'},			{id:14,text:'Right'},	{id:40,text:'All'},	{id:41,text:'None'},];
	let alignMenu = [			{id:6,text:'Left'},			{id:7,text:'Center'},			{id:8,text:'Right'},
];
	let displayFormatMenu = [
			{id:130,text:'Text'},
			{id:100,text:'$12,345.67'},
			{id:101,text:'$12,345'},
			{id:102,text:'12,345'},
			{id:103,text:'12,345.00'},
			{id:104,text:'12345.00'},
			{id:105,text:'12345'},
			{id:106,text:'12.43%'},
			{id:107,text:'12%'},
			{id:110,text:'DD/MM/YY'},
			{id:111,text:'YYYY-MM-DD'},
			{id:120,text:'HH:MM:SS'},
			{id:121,text:'YYYYMMDDzHH:MM:SS'},
			{id:122,text:'Monday 3rd April 2022 HH:MM:SS'},
	];

	let bg;
	let fg;
	let showFG=false;
	let showBG=false;
	let showMenu=false;
	let menuX=0;
	let menuOptions=false;
	let selChanged=false;

	let dirty=false;

	onMount(()=>{
		for (let n=0;config.rowSetting.length<21;n++) {
			config.rowSetting.push({resizable:true, height: 24});
			//config.columnSetting.push({resizable:true, width: 54});
		}
		calcAll(data);
		formatAllResults();
	});
	
	//	Events triggered
	function onStartEdit(e) {
// 		console.log('start edit',e.detail);
	}
	
	function onEndEdit(e) {
		dirty=true;
	}
	
	setInterval(()=>{
		if (dirty) {
			dirty = false;
			calcAll(data);
			formatAllResults();
		}
	},500);
	
	function recalcEditedCell(e) {
		let r = e.detail.row;

		let c = e.detail.col;
		console.log('end edit ',e.detail);
		let str = data[r][c].value;
		
		//	If it's just a number, 
		if ( ! str || str.length == 0) return;
		if (str[0] != '=') {		//	it's NOT a formula
			data[r][c].display=makeDisplayFromResult(data[r][c].format?.displayFormat, data[r][c].value);
			return;
		}

		str=str.substring(1);		//	strip the '='

		let res = calcFormula(str,data);
		if ( ! res.err) {
			data[r][c].result = res.result;

			data[r][c].display=makeDisplayFromResult(data[r][c].format?.displayFormat, data[r][c].result);
		} else {
			data[r][c].display = 'Error:'+res.error;
		}
	}
	
	function formatAllResults() {
		for (let r=0;r<data.length;r++) {
			for (let c=0;c<data[r]?.length;c++) {
				if (data[r] && data[r][c]) {
					if (data[r][c].format)
						data[r][c].display = makeDisplayFromResult(data[r][c].format?.displayFormat, data[r][c].result);
					else 
						data[r][c].display=data[r][c].result;
				} else {
					//data[r][c].display='';
				}
			}
		}
	}
	function onSelectionChange(e) {
// 		console.log('selChange ',e.detail);
		selChanged=!selChanged;
	}

	function makeDisplayFromResult(fmt,val) {
		if (! fmt ) return val;
		
		let result=Number(val);
		
		//	It's not a number or there's no format, it just stays as Text
		if (isNaN(result)) return val;
		
		let locale='en-US'; 

		let display=result;		//	default to whatever number came in
		
		switch (fmt) {
			case 'CURRENCY2':	display=new Intl.NumberFormat(locale, { style: 'currency', currency: 'USD' }).format(result.toFixed(2)); 	break; // $12,345.67
			case 'CURRENCY':	display=new Intl.NumberFormat(locale, { style: 'currency', currency: 'USD' }).format(result).slice(0,-3); 	break;  // $12,345
			case 'NUMBERC2':	display=new Intl.NumberFormat(locale, { style: 'decimal'}).format(result.toFixed(2)); 	break;  // 12,345.67
			case 'NUMBER':	display=result.toFixed(0); 	break;
			case 'NUMBER2':	display=result.toFixed(2); 	break;
			case 'PERCENT2':	display= (result*100).toFixed(2)+'%'; 	break;
			case 'PERCENT':	display= (result*100).toFixed(0)+'%'; 	break;
			case 'DATE': display=new Date(result).toLocaleDateString(); 	break;
			case 'DD/MM/YY': display= new Date(result).toISOString().slice(0,10); 	break;
			case 'YYYY-MM-DD': display= new Date(result).toISOString().slice(0,10); 	break;
			case 'HH:MM:SS': display=new Date(result).toISOString().slice(11,19); 	break;
			case 'DATETIME': display=new Date(result).toLocaleString(); 	break;
			case 'ISODATE': display=new Date(result).toISOString(); 	break;
			case 'FULLDATE': display=new Date(result).toLocaleDateString(); 	break;
		}
		//console.log('makeDisp','fmt=',fmt,'res=',result,'display=',display);

		return display;
	}
	
	//	This is all 'glue' to connect the tool bar to the data.
	//
	
		function setAttrForSelCells(attr,op) {
			let cb=config.selCells;
			for (let r=Math.min(cb.row2,cb.row);r<=Math.max(cb.row2,cb.row);r++) {
				for (let c=Math.min(cb.col2,cb.col);c<=Math.max(cb.col2,cb.col);c++) {
					setCellAttribute(r,c,attr,op);
				}
			}
		}

	function setCellAttribute(r,c,attr,op) {
		if ( ! data[r] ) data[r]=[];
		if ( ! data[r][c] ) data[r][c]={value:''}
			if ( ! data[r][c].format) 
				data[r][c].format = JSON.parse(JSON.stringify(config.defaultFormat));

		switch (op) {
			case 'inc':	data[r][c].format[attr]++;		break;
			case 'dec':	data[r][c].format[attr]--;		break;
			case 'not':	data[r][c].format[attr] = ! data[r][c].format[attr];		break;
			case 'notBorder':
				//console.log(data[r][c].format.border)
				data[r][c].format.border[attr]=((data[r][c].format.border[attr]==0)?1:0);
				break;
			case 'setBorder':	data[r][c].format.border=[1,1,1,1];				break;
			case 'noBorder':	data[r][c].format.border=[0,0,0,0];				break;
			case 'reset': data[r][c].format=null;		break;
			case 'disp' : data[r][c].format.displayFormat=attr;
				data[r][c].display=makeDisplayFromResult(attr, data[r][c].result || data[r][c].value);
				break;
			default:	data[r][c].format[attr]=op;		break;
		}

		console.log(data[r][c].format);
	}
	function toolbarClick(e,detail) {
		console.log(e.detail);
		
		switch(e.detail.option.id) {
				case 9:		//	Export to console
					console.log(config);
					console.log(data);
					console.log(JSON.stringify(data,null,2));
					return;
			case 15: config.rowSetting = [...config.rowSetting,{resizable:true, height: 24}];	break;
			case 16: config.columnSetting = [...config.columnSetting,{resizable:true, width: 100}];	break;
		}

		if ( config.selCells.row < 0) return;
				
		let attr;
		let op;
		switch(e.detail.option.id) {
        case 0: attr='fontsize';  op='inc';  break;
        case 1: attr='fontsize';  op='dec';  break;
        case 2: attr='italics';   op='not';  break;
        case 3: attr='bold';      op='not';  break;
        case 4: showBG=false; showFG=true; break;
        case 5: showFG=false; showBG=true; break;
        case 6: attr='align'; op='left'; break;
        case 7: attr='align'; op='center'; break;
        case 8: attr='align'; op='right';  break;
        case 10:  attr='';  op='reset';  break;
        case 11:  attr=0;   op='notBorder';  break;
        case 12:  attr=1;   op='notBorder';  break;
        case 13:  attr=2;   op='notBorder';  break;
        case 14:  attr=3;   op='notBorder';  break;

        case 40:  attr='';	op='setBorder';  break;
        case 41:  attr='';  op='noBorder';  break;

        case 100: op='disp';  attr='CURRENCY2';  break;
        case 101: op='disp';  attr='CURRENCY';  break;
        case 102: op='disp';  attr='NUMBERC2';   break;
        case 103: op='disp';  attr='NUMBER2';    break;
        case 104: op='disp';  attr='NUMBER2';     break;
        case 105: op='disp';  attr='NUMBER';     break;
        case 106: op='disp';  attr='PERCENT2';    break;
        case 107: op='disp';  attr='PERCENT';   break;
        case 110: op='disp';  attr='DD/MM/YY';   break;
        case 111: op='disp';  attr='YYYY-MM-DD';   break;
        case 120: op='disp';  attr='HH:MM:SS';   break;
        case 121: op='disp';  attr='ISODATE';    break;
        case 122: op='disp';  attr='FULLDATE';   break;
        case 130: op='disp';  attr='TEXT';       break;

				case 1000: menuOptions=bordersMenu; 			menuX=355;	showMenu=true;	break;
				case 1001: menuOptions=displayFormatMenu; menuX=425;	showMenu=true;	break;
				case 1002: menuOptions=alignMenu; menuX=275;	showMenu=true;	break;
		}
		e.stopPropagation();
		e.preventDefault();
		if (op) setAttrForSelCells(attr,op);
	}
	function setFG(e) {
		setAttrForSelCells('color',fg);
		showFG=showBG=false;
	}
	function setBG() {
		setAttrForSelCells('background',bg);
		showFG=showBG=false;
	}
</script>
	<Menu bind:showMenu={showMenu} x={menuX} y={30} options={menuOptions} on:click={toolbarClick}/>

	<Toolbar options={toolOptions} on:click={toolbarClick} show={true} y={40}/>
	<div class="colorInput">
		{#if showBG}<input type="color" bind:value={bg} on:change={setBG}/>{/if}
		{#if showFG}<input type="color" bind:value={fg} on:change={setFG}/>{/if}
	</div>

<div class="zoomableBackground" >

		{#each arrBlocks as b}
			<Block title={b.title} scale={scale} bind:left={b.left} bind:top={b.top} bind:width={b.width} bind:height={b.height}>

			<Table
						 bind:config={config}
						 bind:data={data}
						 on:startedit={onStartEdit}
						 on:endedit={onEndEdit}
						 on:selChange={onSelectionChange}
						 on:configChanged={(e)=>
				console.log('Config changed',e.detail)}
				/>
			</Block>
		{/each}		
</div>

	<button on:click={(e)=>{calcAll(data); formatAllResults(); }}>Recalc	</button>
	<button on:click={(e)=>formatAllResults()}>Format</button>
	{#key selChanged}
		Sel:{config.selCells?.row},{config.selCells?.col} {data.length}
		{#if config.selCells?.row >= 0 && config.selCells?.col >= 0 
	&& data.length>config.selCells.row && data[config.selCells.row]?.length > config.selCells.col
	}
			Val='{data[config.selCells.row][config.selCells?.col]?.value}'
			Res='{data[config.selCells.row][config.selCells?.col]?.result}'
			Disp='{data[config.selCells.row][config.selCells?.col]?.display}'
		{/if}
	{/key}
	<!-- 	<hr>
		<pre>
			{JSON.stringify(myData,null,2)}
		</pre> -->

<style>
	.colorInput {
		position:absolute;
		left:150px;
		top:32px;
		width:48px;
		height:24px;
		z-index:10;
	}
</style>
	