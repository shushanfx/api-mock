import Vue from 'vue'
import Router from 'vue-router'

Vue.use(Router)

const MENU = [
    {
        path: "/index",
        name: "首页",
        component: () => {
            import('../pages/home')
        }
    }
]

const other = [

]

export default {
    menu: MENU,
    route: new Router({
        routes: [
            ...MENU,
            ...other
        ]
    })
}