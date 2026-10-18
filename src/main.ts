import './style.css';
import { renderHome } from './telas/inicio';

const app = document.querySelector<HTMLDivElement>('#app');
if (app) renderHome(app);
