<svelte:window on:mousemove={handleMousemove} 
							 on:mouseup={() => resizing = false}/>

<script>
	export let top;
	export let left;
	export let scale;

	let resizing = false
	
	function handleMousemove(event) {
		if (resizing) {
			left += event.movementX/scale;
			top += event.movementY/scale;
			//console.log('grab',left,top,scale);
		}
	}
</script>

<div class="grab-knob" on:mousedown|stopPropagation|preventDefault={() => resizing = true}></div>

<style>
	:root {
		--drag-handle-color :#777;
	}
	.grab-knob {
		position: absolute;
		top: 0px;
		left: 0px;
		width: 25px;
		height: 25px;
/*  		background-color: transparent; */
/*		border-radius: 100%; */
		cursor: move;
		z-index:100;
		 background-image:url('data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="darkgray" aria-hidden="true" %3E%3Cpath d="M10.5 6a1.5 1.5 0 113 0 1.5 1.5 0 01-3 0zm0 6a1.5 1.5 0 113 0 1.5 1.5 0 01-3 0zm0 6a1.5 1.5 0 113 0 1.5 1.5 0 01-3 0 M20.5 6a1.5 1.5 0 113 0 1.5 1.5 0 01-3 0zm0 6a1.5 1.5 0 113 0 1.5 1.5 0 01-3 0zm0 6a1.5 1.5 0 113 0 1.5 1.5 0 01-3 0z" clip-rule="evenodd"%3E%3C/path%3E%3C/svg%3E');
	}
</style>
