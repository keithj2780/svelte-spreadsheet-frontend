<script>
	import { onMount, tick, createEventDispatcher } from 'svelte';
	import { fade } from 'svelte/transition';
	
	export let options;
	export let show = true;
	export let x=0,y=0;

	let selectedIdx = -1;
	let menuEl;

	const dispatch = createEventDispatcher(); 

	async function handleClick(e,idx) {
		//console.log('toolbar handleClick',idx,options[idx]);
		if ( ! options[idx].isDisabled && options[idx].text) {
			dispatch('click',{idx:idx,option:options[idx]});
		}
	}
	function closeMenu() {
		show = false;
	}
	
</script>

{#if show}
	<div class="menu" transition:fade={{ duration: 150 }} bind:this={menuEl} style="top: {y}px; left: {x}px;">
		<div>&nbsp;</div>
			{#each options as opt,idx}
				{#if opt.text}
					<div class="opt" class:disabled={opt.isDisabled} on:click|preventDefault={(e)=>handleClick(e,idx)} class:isSelected={selectedIdx==idx} on:keydown on:mouseenter={()=>selectedIdx=idx} on:mouseleave={()=>selectedIdx=-1}>
						{opt.text}
						<div>
							{#if opt.isChecked}
								
							{/if}
						</div>
					</div>
				{:else if opt.svg}
					<div class="opt svgBtn" class:disabled={opt.isDisabled} on:click|preventDefault={(e)=>handleClick(e,idx)} class:isSelected={selectedIdx==idx} on:keydown on:mouseenter={()=>selectedIdx=idx} on:mouseleave={()=>selectedIdx=-1}>
						{@html opt.svg}
						<div>
							{#if opt.isChecked}
								
							{/if}
						</div>
					</div>
				{:else}
					<hr>
				{/if}		
			{/each}
		<div>&nbsp;</div>
	</div>
{/if}

<style>
	.menu {
		position: absolute;
		display: flex;
		border: 1px solid #0003;
		border-radius:10px;
		box-shadow: 6px 6px 5px 0px #0002;
		background: #efefff;
		z-index:10;
		color:#333;
		user-select:none;
	}
	.opt {
		padding: 4px 6px;
		font-size: 14px;
		display: flex;
		justify-content: space-between;
		align-items: center;
		grid-gap: 5px;
		cursor:pointer;
	} 
	.isSelected {
		background: #cfcfff;
/* 		font-weight:600; */
/* 		border-radius:10px; */
	}
	.opt.disabled {
		color: #0006;
	}
	.opt.disabled:hover {
		background: inherit;
		cursor:no-drop;
	}
	hr {
		border: 1px solid #888;
		width: 0px;
		margin: 2px 0;
	}
	.svgBtn {
		width:24px;
		height:24px;
		padding:10px;
		margin:0px;
	}
</style>
