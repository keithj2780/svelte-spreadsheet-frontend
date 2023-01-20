<svelte:body on:click={onPageClick} />

<script>
	import { onMount, tick, createEventDispatcher } from 'svelte';
	import { fade } from 'svelte/transition';
	
	export let options;
	export let showMenu = false;
	export let x,y;

	let selectedIdx = -1;
	let menuEl;
	
	const dispatch = createEventDispatcher();

	function onPageClick(e) {
// 		console.log('onPageClick',menuEl,e.target);
// 		if ( ! menuEl || e.target === menuEl || menuEl.contains(e.target)) return; 
// 		closeMenu();
	}

	async function handleClick(e,idx) {
		console.log('handleClick',idx,options[idx]);
		if ( ! options[idx].isDisabled && options[idx].text) {
			dispatch('click',{idx:idx,option:options[idx]});
			closeMenu();
		}
	}
	function closeMenu() {
		showMenu = false;
	}
	
	function onMenuKeyPress(e,idx) {
		console.log('onMenuKeyPress',e,idx,selectedIdx);
		if (e.key=='ArrowUp') {
			selectedIdx--;
		} else if (e.key=='ArrowDown') {
			selectedIdx++;
		}
	}

	// whenever x and y is changed, restrict box to be within bounds
	$: (() => {
		if ( ! menuEl) return;
		const minWidth = 180;
		
		const rect = menuEl.getBoundingClientRect();
		if (rect.width < minWidth) rect.width = minWidth;
		x = Math.min(window.innerWidth - rect.width, x);
		if (y > window.innerHeight - rect.height) y -= rect.height;
	})(x, y);
	

</script>

{#if showMenu}
	<div class="menu" transition:fade={{ duration: 150 }} bind:this={menuEl} style="top: {y}px; left: {x}px;" on:mouseleave={()=>showMenu=false}>
			{#each options as opt,idx}
				{#if opt.text}
					<div class="opt" class:disabled={opt.isDisabled} on:click|preventDefault={(e)=>handleClick(e,idx)} class:isSelected={selectedIdx==idx} on:keydown|stopPropagation={(e)=>onMenuKeyPress(e,idx)} on:mouseenter={()=>selectedIdx=idx} on:mouseleave={()=>selectedIdx=-1}>
						{opt.text}
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

	</div>
{/if}

<style>
	.menu {
		position: absolute;
		display: grid;
		border: 1px solid #0003;
		box-shadow: 6px 6px 5px 0px #0002;
		background: white;
		z-index:1000;
		user-select:none;
	}
	.opt {
		padding: 4px 15px;
		cursor:pointer;
		font-size: 14px;
		display: flex;
		justify-content: space-between;
		align-items: center;
		grid-gap: 5px;
	}
	.isSelected {
		background: #0002;
	}
	.opt.disabled {
		color: #0006;
	}
	.opt.disabled:hover {
		background: white;
	}
	hr {
		border-top: 1px solid #0003;
		width: 100%;
		margin: 2px 0;
	}
</style>
