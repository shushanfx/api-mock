<template>
	<Nav :title="title"></Nav>
</template>
<script>
import Nav from "../component/nav.vue";

export default {
	name: "PageIndex",
	components: {Nav},
	data(){
		return {
			title: "Value"
		}
	}
}
</script>
