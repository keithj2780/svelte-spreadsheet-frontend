<script>
	import GrabHandle from './GrabHandle.svelte';
	import ResizeKnob from './ResizeKnob.svelte';

	export let scale=1;
	export let title;

	export let top=120;
	export let left=50;
	
	export let width=320;
	export let height=280;

</script>
	<div class="block" style="width:{width}px;height:{height}px;top:{top}px;left:{left}px">
	<div class="title" contenteditable >{title}</div>
		<GrabHandle bind:top bind:left {scale}/>
		<slot/>
		<ResizeKnob bind:width bind:height {scale}/>
</div>

<style>
	.title {
		margin-left:42px;
		font-weight:500;
		overflow:hidden;
		border-radius:5px;
		padding:2px;
		background-color:rgb(0,0,0,0.0);
		z-index:4;
	}
	.block {
		position:absolute;
		overflow:hidden;
		box-shadow: 6px 6px 5px 0px #0002;
		background-image: linear-gradient(rgb(215, 164, 188,0.9), rgb(198, 149, 28,0.9));
		z-index:4;
	}
	
</style>