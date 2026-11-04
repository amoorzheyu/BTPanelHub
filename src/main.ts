import {createApp} from 'vue'
import App from './popup/App.vue'
import './style.css'
if(typeof chrome!=='undefined'&&chrome.runtime?.id)document.documentElement.classList.add('extension-popup')
createApp(App).mount('#app')
