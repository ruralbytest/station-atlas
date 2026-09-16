import {createRoot} from 'react-dom/client';
import Home from '../app/page';
import '../app/globals.css';
import {applyTheme,readTheme} from '../app/theme';
applyTheme(readTheme());
createRoot(document.getElementById('root')!).render(<Home/>);
