<svelte:window on:mousemove={handleMousemove} on:mouseup={() => resizing = false}/>

<script>
	import ResizeKnob from './ResizeKnob.svelte'
	export let width;
	export let height;
	export let scale=1;
	
	let resizing = false
	function handleMousemove(event) {
		if (resizing) {
			width += event.movementX/scale;
			height += event.movementY/scale;
			width=Math.max(width,48);
			height=Math.max(height,24);
// 			console.log(width,height);
		}
	}
</script>

<div class="resize-knob" on:mousedown|stopPropagation|preventDefault={() => resizing = true}></div>

<style>
	.resize-knob {
		position: absolute;
		bottom: 0px;
		right: 0px;
/* 		transform:translate(2px,2px); */
		overflow:visible;
		width: 24px;
		height: 24px;
    background-color:transparent;
/* 		border-radius: 100%; */
		cursor: nw-resize;
    background-image:url("data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAYAAABzenr0AAAAiklEQVRYR+WUwQ3AIAwDm3UzUNZtxQ8hhBpIbGhZIKezsVzkJ4z7ZnaXu6oq/wSorVMMwAHqzNvOQQzQAUY/DWIADjBSXmDSd4AO4FnXb3TAozxlB+gAnsxTDMABVpSH7AAdYEX5mR2IVD5lgA4QmfmUAThApvJXO0AHyFS+ZweQyrsG6ADIzNtbD4OSoCHdTWtaAAAAAElFTkSuQmCC");
		z-index:1000;
	}
</style>
