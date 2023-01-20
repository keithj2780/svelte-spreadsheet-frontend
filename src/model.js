export let model = {
	arrBlocks:[],
	dtCreated:	new Date(),	
};

export let defaultGridConfig = {
		columnSetting: [
			{resizable:true, width: 150,},
			{resizable:true, width: 140,},
			{resizable:true, width: 95},
			{resizable:true, width: 70},
			{resizable:true, width: 100},
			{resizable:true, width: 100},
			{resizable:true, width: 100},
			{resizable:true, width: 100},
		],
		rowSetting: [
			{resizable:true, height: 24},
			{resizable:true, height: 44},
			{resizable:true, height: 24},
			{resizable:true, height: 24},
			{resizable:true, height: 24},
			{resizable:true, height: 24},
			{resizable:true, height: 24},
			{resizable:true, height: 24},
			{resizable:true, height: 24},
			{resizable:true, height: 24},
		],
		 defaultFormat : {		//	if a data cell does not have a format, then this one is used
      "italics": 0,
      "bold": 0,
      "fontsize": 13,
      "align": "left",
      "color": "#888",
      "background": "#fff",
		 "border":[false,false,false,false],				//	TLBR
			 displayFormat:'NUMBER2',							//	DATE,TIME, DURATION, CURRENCY2, CURRENCY, TEXT, NUMBER, NUMBER2
    },
	};
	

export let defaultTextConfig = {

	markdown:	`
  # This is a header
  ## This is a sub-header

This is a paragraph.

* This is a list
* With two items
  1. And a sublist
  2. That is ordered
    * With another
    * Sublist inside
		* ![ref to image]()
		* [ref to link]()

| And this is | A table |
|-------------|---------|
| With two    | columns |
| With twoish    | columns |
`
};

