
export function calcAll(data) {
	
	//	set all results to null
		console.log('data.length=',data.length);
	for (let r=0;r<data.length;r++) {
			console.log('data[r].length=',data[r]?.length);
		for (let c=0;c<data[r]?.length;c++) {
			if (data[r] && data[r][c]) data[r][c].result = null;					
		}
	}
	//console.log('data.length=',data.length);
	for (let r=0;r<data.length;r++) {
		//console.log('data[r]?.length=',data[r]?.length);
		for (let c=0;c<data[r]?.length;c++) {
			if (data[r] && data[r][c] && data[r][c].result == null) {
				if (isFormula(r,c,data)) {
				let arrChainOfReferences=[];
					//	pass in arrChainOfReferences, so it can see if there is a circular reference.
					//	if arrChainOfReferences.length > 1, then it contains that circular chain

					doCalc(r,c,data,arrChainOfReferences);
					if (arrChainOfReferences.length) { 
						//console.log('arrChainOfReferences=',arrChainOfReferences,' for ',r,c,data[r][c]);
					}
				} else {
					data[r][c].result=data[r][c].value;
				}
			}
		}
	}
}

//	calculate a formula & recursively follow the chain of references
function doCalc(r,c,data,arrChainOfReferences) {
	let ourRef = {row:r,col:c};
	if (arrChainOfReferences.findIndex(ref=>{if (ref.row==ourRef.row && ref.col == ourRef.col) return true; return false;}) >= 0) return true;			//	we've found a circular reference

	arrChainOfReferences.push({row:r,col:c});
	let res = calcFormula(data[r][c].value,data); 
	//console.log('doCalc() res=',res,'arrChainOfReferences=', arrChainOfReferences);
	if (res.referencedCells.length) {
		console.log('Row/Col at',r,c,' nees to calc referenced cells..',res.referencedCells);
		//	make a list of cells that need to be calculated first
		for (let n=0;n<res.referencedCells.length;n++) {
			let refCell = res.referencedCells[n];
			let ret = doCalc(refCell.row,refCell.col,data,arrChainOfReferences); 
			if ( ! ret) {
				console.log('CIRC REF for',res);
				return false;		//	if we found a circular ref then break early
			} else {
				console.log('Recursive calc for ',data[refCell.row][refCell.col]);
			}
		}
		//	now we have resolved all the referenced cells.
		res = calcFormula(data[r][c].value,data);
		data[r][c].result = res.result;
		//console.log('doCalc() After calc referenced cells..',res,r,c,data[r][c].result);
	} else if ( ! res.error) {
		data[r][c].result = data[r][c].display = res.result;
		//console.log('No Error. doCalc() ',r,c,'Result of '+data[r][c].value+' is',res,r,c,data[r][c]);
	} else {
		//	it's an error. eg div by zero, bad formula formatting etc
		data[r][c].result = res.error;
	}
	return true;
}

export function calcFormula(str,data) {
	let res = {
		result:	0,
		referencedCells:[],		//	arrays of cells that need to be evaluated before we can evaluate. Hopefully it's empty!!
		error:	null,
	}

	// tokenise the formula to get any referenced cells
	var f = new Formula(str);		//	()'2/0.6 pcs of foo * pi bar + sqrt(4) A4');
	let ts=f.tokenise();
	
	let toks=ts.tokens;
 	//console.log('toks are',toks.length,JSON.stringify(toks));
	
	//	replace cell refs with the value
	for (let n=0;n<toks.length;n++) {
		if (toks[n].name == 'id' || toks[n].name == 'range') {		//	lookup references data (e.g. A1,AZ999)
			let s=toks[n].data;
			let ref = parseRef(s);
			
			//	remove the id.
			let strToReplaceId = "";

			//	convert cell reference(s) into value(s)
			for (let r=ref.row;r<=(ref.row2?ref.row2:ref.row);r++) {
				for (let c=ref.col;c<=(ref.col2?ref.col2:ref.col);c++) {
					if (data[r] && data[r][c] && data[r][c].value) {
						let cell = data[r][c];
						//	if the references cell already has been calculated (i.e. we have a result), then it's all good...
						if (cell.result) {
								//toks.splice(n,0,{data:cell.result,name:'float'});
								strToReplaceId+=","+cell.result;
// 							toks[n].data=cell.result;
// 							toks[n].name='float';
						} else if (cell.value.substring(0,1) == '=') {		//	hmmm... we're referring to an uncalculated cell (that's a problem)....
							res.referencedCells.push(ref);				//	let the caller know what are problems are (i.e. uncalculated referenced cells)
						} else {
								//toks.splice(n,0,{data:cell.value,name:'float'});
								strToReplaceId+=","+cell.value;
// 							toks[n].data= cell.value;				//	we use the fixed value (usually a number)
// 							toks[n].name='float';
						}
					} else {
						//toks.splice(n,0,{data:0,name:'int'});
						strToReplaceId+=",0";
// 						toks[n].data= 0;
// 						toks[n].name='int';
					}
				}
			}

			toks[n].data=strToReplaceId.substring(1);		//	ignore leading coma
			toks[n].name='float';
			//console.log('row,col=',s,cell.value);
		}
	}
	if (toks.length==0) {
		//	we should never get here
		return '';
	}
	//console.log('new expr is',JSON.stringify(toks));
	//console.log('2.new expr is',toks);
	
	//	Now see if we can evaluate any funcs. eg MAX, SUM, MIN, AVG etc
	for (let n=0;n<toks.length;n++) {
		//console.log('toks[n]=',toks[n]);

		if (toks[n].name == 'func' && toks[n+1].name=='l_paren') {
			let arrParams = toks[n+2].data.split(',');
			//console.log('Func ',toks[n],arrParams);
			let val;

			//	handle the funcs that take a single parameter between the parentheses
			if (toks[n+3].name=='r_paren') {
				switch (toks[n].data) {
				case 'SUM':		val = arrParams.reduce((acc, curr)=>acc+=parseFloat(curr),0); break;
				case 'COUNT':	val = arrParams.length;		break;
				case 'AVG':		val = val = arrParams.reduce((acc, curr)=>acc+=parseFloat(curr)) / arrParams.length;		break;
				}
			} else if(toks[n+3].name=='coma' && toks[n+5].name=='r_paren') {	//	2 params
			}
			if (val) {
				toks.splice(n,4,{name:'float',data:val});
				//console.log('spliced toks=',toks,val);
			}
		}
	}

	if (res.referencedCells.length == 0) {
		
		res.result = f.evaluate(ts);
		
		//console.log('calcFormula() res=',res);
		if (res.result==null) res.error='Eval error';
	}  
	return res;
}

//	When the user copies & pastes cells containing formulas, they expect any references to be offset. 
export function doOffsetCellRefs(str,rowDiff,colDiff) {
	// tokenise the formula to get any referenced cells
	var f = new Formula(str);
	let ts=f.tokenise();
	
	let toks=ts.tokens;
 	//console.log('toks are',toks.length,JSON.stringify(toks),'diffs=', rowDiff,colDiff);
	//	replace cell refs with the value
	for (let n=0;n<toks.length;n++) {
		//console.log('toks[n]=',toks[n]);
		if (toks[n].name == 'id' || toks[n].name == 'range') {		//	lookup references data (e.g. A1,AZ999)
			let s=toks[n].data;
			let ref = parseRef(s);
			console.log(s,ref);
			if ( ! ref.rowFixed) ref.row+=rowDiff;
			if ( ! ref.colFixed) ref.col+=colDiff;
			if ( ! ref.row2Fixed && ref.row2) ref.row2+=rowDiff;
			if ( ! ref.col2Fixed && ref.col2) ref.col2+=colDiff;
			toks[n].data = makeStringRef(ref);
			console.log(ref);
		}
	}
	let newStr = "=";
	for (let n=0;n<toks.length;n++) {
		newStr+=toks[n].data;
	}
	//console.log('NewStr is ',newStr);
	return newStr;
}

export function makeStringRef(ref) {
	let str = ref.colFixed?'$':'';
	if (ref.col<26) {		//	A
		str+=String.fromCharCode(65+ref.col);
	} else {						//	ZZ
		str+=String.fromCharCode(65+(ref.col-26)/26|0)+String.fromCharCode(65+ref.col%26);
	}
	str+=ref.rowFixed?'$':'';
	str+=(ref.row+1);

	if (ref.row2!=undefined && ref.col2!=undefined
		 && (ref.row2!=ref.row || ref.col2!=ref.col)) {		//	and one of row & col are different
		str+=':';
		if (ref.col2<26) {		//	A
			str+=String.fromCharCode(65+ref.col2);
		} else {						//	ZZ
			str+=String.fromCharCode(65+(ref.col2-26)/26|0)+String.fromCharCode(65+ref.col2%26);
		}
		str+=ref.row2Fixed?'$':'';
		str+=(ref.row2+1);
	}
	return str;
}

//console.log(parseRef("$Z$387:$BB456"));
function parseRef(s) {
	let ref={str:s};
	let idx=0;
	
			//	optional sheet name is in single quotes followed by !  eg 'CF2022'!A1
			
			//	single reference
			if (s[idx]=='$') {	ref.colFixed=true; idx++;	}
			if (s[idx]>='A' && s[idx] <='Z') {	ref.col=s.charCodeAt(idx) - 65; idx++;	}
			if (s[idx]>='A' && s[idx] <='Z') {	ref.col=26+ref.col*26+s.charCodeAt(idx) - 65; idx++;}
			if (s[idx]=='$') {	ref.rowFixed=true; idx++;	}
			let len = 0;
			while ( s[idx+len] >= '0' && s[idx+len] <= '9') {
				len++;
			}
			let strRow=s.substring(idx,idx+len);
			//console.log('parseRef',strRow,idx,len);
			ref.row = Number(strRow)-1;
			idx+=len;
	
			//	range
			if (s[idx]==':') {
				idx++;		//	skip :
				if (s[idx]=='$') {	ref.col2Fixed=true; idx++;	}
				if (s[idx]>='A' && s[idx] <='Z') {	ref.col2=s.charCodeAt(idx) - 65; idx++;	}
				if (s[idx]>='A' && s[idx] <='Z') {	ref.col2=26+ref.col2*26+s.charCodeAt(idx) - 65; idx++;}
				if (s[idx]=='$') {	ref.row2Fixed=true; idx++;	}
				let len = 0;
				while ( s[idx+len] >= '0' && s[idx+len] <= '9') {
					len++;
				}
				strRow=s.substring(idx,idx+len);
				//console.log(strRow,idx,len);
				ref.row2 = Number(strRow)-1;
				idx+=len;
			}
			ref.len=idx;
			return ref;
}

function isFormula(r,c,data) {
	if (data[r][c]
			&& ! data[r][c].result 
			&& data[r][c].value
			&& data[r][c].value.substring(0,1) == '=') return true;
	return false;
}

class TokenStream {
	constructor(tokens) {
    this.cursor = 0;
    this.tokens = tokens;
		//console.log(tokens);
	}
    next () {
        return this.tokens[this.cursor++];
    }
    peek (direction) {
        if (direction === undefined) {
            direction = 0;
        }
        return this.tokens[this.cursor + direction];
    }
}

class Tokenizer {
	constructor() {
    this.tokens = {};
    this.regex = null;
    this.tokenNames = [];
	}
	addToken(name, expression) {
        this.tokens[name] = expression;
    }

    tokenize(data) {
        this.buildExpression(data);
        var tokens = this.findTokens(data);
        return new TokenStream(tokens);
    }

    buildExpression (data) {
        var tokenRegex = [];
        for (var tokenName in this.tokens) {
            this.tokenNames.push(tokenName);
            tokenRegex.push('('+this.tokens[tokenName]+')');
        }
        
        this.regex = new RegExp(tokenRegex.join('|'), 'g');
    }

    findTokens(data) {
        var tokens = [];
        var match;

        while ((match = this.regex.exec(data)) !== null) {
            if (match == undefined) {
                continue;
            }

            for (var group = 1; group < match.length; group++) {
                if (!match[group]) continue;
                
                tokens.push({
                    name: this.tokenNames[group - 1],
                    data: match[group]
                });
            }
        }

        return tokens;
    }
}

//	see	https://regexlearn.com/playground
class  Formula {
	constructor (data) {
    this.data = data.toString();
    this.tokenizer = new Tokenizer();
    this.tokenizer.addToken('whitespace', '\\s+');
    this.tokenizer.addToken('l_paren', '\\(');
    this.tokenizer.addToken('r_paren', '\\)');
    this.tokenizer.addToken('float', '\\-?[0-9]+\\.[0-9]+');
    this.tokenizer.addToken('int', '\\-?[0-9]+');
    this.tokenizer.addToken('div', '\\/');
    this.tokenizer.addToken('mul', '\\*');
    this.tokenizer.addToken('add', '\\+');
    this.tokenizer.addToken('sub', '\\-');
    this.tokenizer.addToken('coma', '\\,');
    this.tokenizer.addToken('constant', 'pi|PI');
    this.tokenizer.addToken('range', '\\$?[A-Z]{1,2}\\$?[0-9]{1,3}\\:\\$?[A-Z]{1,2}\\$?[0-9]{1,3}');
    this.tokenizer.addToken('id', '\\$?[A-Z]{1,2}\\$?[0-9]{1,3}');		//	match an A then 1 or 2
		this.tokenizer.addToken('func', '[a-zA-Z][a-zA-Z0-9]+');		//	match any upper/lower case function name
}
    consumeConstant (ts, token) {
        return 'Math.' + token.data.toUpperCase();
    }

    consumeFunction (ts, token) {
        var a = [token.data.toLowerCase()];
        var t;
        while (t = ts.next()) {
            a.push(t.data);
            if (t.name == 'r_paren') {
                break;
            }
        }
        return 'Math.' + a.join('');
    }

	  tokenise () {
        var ts = this.tokenizer.tokenize(this.data);
        //console.log('Tokenising: ' + this.data+' to ',ts.tokens);
				return ts;
		}
    evaluate (ts) {
        //var ts = this.tokenizer.tokenize(this.data);
        //console.log('Evaluating: ' + this.data);

        var expr = [];
        var t;
        while (t = ts.next()) {
            switch (t.name) {
                case 'int':
                case 'float':
                case 'mul':
                case 'div':
                case 'sub':
                case 'add':
                    expr.push(t.data);
                    break;

                case 'constant':
                    expr.push(this.consumeConstant(ts, t));
                    break;

                case 'func':
                    var n = ts.peek();
                    if (n?.name == 'l_paren') {
                        expr.push(this.consumeFunction(ts, t));
                        continue;
                    }
                default:
                    break;
            }
        }

      var e = expr.join('');
      //console.log('Formula:evaluate() : ' + e);
			try {
      	let res = eval(e);
				return res;
			} catch (err) {
				console.log('Eval ERROR for ',e);
			}
			return null;
    }
}

//import Formula from 'fparser';
//		see https://fparser.alexi.ch/
//		see https://github.com/bylexus/fparse
// 		const fObj = new Formula(str);		//	'[A1]^x+sin(0.5)');
// 		let vars=fObj.getVariables();
// 		console.log(vars);
// 		let result = fObj.evaluate({x: 3,A1:5});
// 		console.log(result,fObj);
// 		return result;
// 	} catch (e) {
// 		console.log(e);
// 		return null;
// 	}
//}

