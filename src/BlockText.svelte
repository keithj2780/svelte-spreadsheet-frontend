<script>
	// Import markdown conversion library
  import {marked} from 'marked'
  import {model, defaultTextConfig} from './model.js'
  
	// Declare a variable to store the markdown data
  let config = JSON.parse(JSON.stringify(defaultTextConfig));
  let markdown = config.markdown;
	let viewType = 0;
	$: viewType %= 3;
</script>

<div class="mdContainer" >
	<button on:click={()=>viewType++}>
		<svg aria-hidden="true" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="24px"><g transform="translate(5 5)" stroke-width="10" stroke="currentColor" stroke-linejoin="round" stroke-linecap="round" fill="none"><path d="M 73 0 l 17 17 -45 45 -17 0 0 -17 45 -45"></path><path d="M 35 10 h -25 a 10 10 0 0 0 -10 10 v 60 a 10 10 0 0 0 10 10 h 60 a 10 10 0 0 0 10 -10 v -25"></path></g></svg>		
	</button>{viewType}
	<div class="view{viewType}">
		<textarea bind:value={markdown} placeholder="Enter markdown here" rows={10} style="{viewType==1?'visibility:hidden':''}"/>
		<div class="md" style="{viewType==2?'visibility:hidden':''}">{@html marked(markdown)}</div>
	</div>
</div>
<style>
	.mdContainer {
		background:white;
	}
	textarea, .preview {
		box-sizing: border-box;
/* 		display: block; */
		width: 100%;
	}
	
	textarea {
		font-family: monospace, Roboto;
		height: 100%;
		border: none;
		margin: 0;
		padding: 1rem;
	}
	
	.md {
		height: 100%;
		padding: 2rem;
		border-top: solid 2px #888;
		overflow:auto;
	}
	.view0 {
		display:grid;
		grid-template-rows:50% 50%;
	}
	.view1 {
		display:grid;
		grid-template-rows:0% 100%;
	}
	.view2 {
		display:grid;
		grid-template-rows:100% 0%;
	}

</style>