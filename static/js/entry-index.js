import Vue from "vue";
import BootsrapVue from "bootstrap-vue";

import 'bootstrap/dist/css/bootstrap.css'
import 'bootstrap-vue/dist/bootstrap-vue.css'


import PageIndex from "./page/index.vue";

Vue.use(BootsrapVue);

var app = new Vue({
	"el": "#container",
	"template": `<PageIndex />`,
	"components": {PageIndex},
	data(){
		return {

		}
	}
});