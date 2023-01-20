<svelte:window on:mousewheel={mouseWheelEvent}
							 on:mousedown={mouseEvent}
							 on:mousemove={mouseEvent}
							 on:mouseup={mouseEvent}
							 />

<script>
// 	export let zoom;
	export let elToBeZoomed;
  export var scale = 1;              // current scale 
	 
  const matrix = [1, 0, 0, 1, 0, 0]; // current view transform
  var m = matrix;             // alias 
  const pos = { x: 0, y: 0 }; // current position of origin
  var dirty = true;

	const mouse = {x: 0, y: 0, oldX: 0, oldY: 0, button: false};
	
  function applyTo(el) {
      if (dirty) { update() }
      el.style.transform = `matrix(${m[0]},${m[1]},${m[2]},${m[3]},${m[4]},${m[5]})`;
		//console.log('el.style.transform=',el.style.transform,pos,'scale',scale);
    }
  function update() {
      dirty = false;
      m[3] = m[0] = scale;
      m[2] = m[1] = 0;
      m[4] = pos.x;
      m[5] = pos.y;
    }
	function pan(amount) {
      if (dirty) { update() }
       pos.x += amount.x;
       pos.y += amount.y;
       dirty = true;
    }
	function scaleAt(at, amount) { // at in screen coords
      if (dirty) { update() }
      scale *= amount;
      pos.x = at.x - (at.x - pos.x) * amount;
      pos.y = at.y - (at.y - pos.y) * amount;
      dirty = true;
  }

	function mouseEvent(event) {
//		console.log(event);
 		if (event.target.id != 'zoomableBG') {
 			//console.log(event.target.id , elToBeZoomed);
 			return;
 		}
    if (event.type === "mousedown") { mouse.button = true }
    if (event.type === "mouseup" || event.type === "mouseout") { mouse.button = false }
    mouse.oldX = mouse.x;
    mouse.oldY = mouse.y;
    mouse.x = event.pageX;
    mouse.y = event.pageY;
    if(mouse.button) { // pan
        //pan({x: mouse.movementX, y: mouse.movementY});
        pan({x: mouse.x - mouse.oldX, y: mouse.y - mouse.oldY});
        applyTo(elToBeZoomed);
    }
    //event.preventDefault();
}
function mouseWheelEvent(event) {
	//let pos=elToBeZoomed.getBoundingClientRect();
	if ( ! event.ctrlKey) return;
    const x = event.pageX - (elToBeZoomed.offsetWidth / 2);
    const y = event.pageY - (elToBeZoomed.offsetHeight / 2);
//     const x = event.pageX - (pos.width / 2);
//     const y = event.pageY - (pos.height / 2);
//	console.log(pos,'x,y=',x,y,'page=',event.pageX,event.pageY);
    if (event.deltaY < 0) {
        scaleAt({x, y}, 1.1);
        applyTo(elToBeZoomed);
    } else { 
        scaleAt({x, y}, 1 / 1.1);
        applyTo(elToBeZoomed);
    }
//     event.preventDefault();
//     event.stopPropagation();
}
	
</script>

